import { v4 as uuidv4 } from "uuid";
import { getConfig, isDemoMode, isKilled } from "../config.js";
import { getAgentAccountId, getBalance } from "../near/account.js";
import type {
  RebalancePlan,
  TreasuryAction,
  TreasuryPosition,
  TreasuryState,
} from "../types.js";
import { addDecision } from "./decision-engine.js";
import { addEntry, getOperatingCostsSince } from "./ledger.js";

const STABLECOINS = new Set([
  "nep141:usdc.near",
  "nep141:usdt.tether-token.near",
]);
const PREFERRED_STABLE = "nep141:usdc.near";
const TOKEN_LABELS: Record<string, string> = {
  "nep141:wrap.near": "wNEAR",
  "nep141:usdc.near": "USDC",
  "nep141:usdt.tether-token.near": "USDT",
};
const DEFAULT_NEAR_PRICE_USD = 5.2;
const REBALANCE_TOLERANCE = 0.02;
const GAP_FRACTION_PER_REBALANCE = 0.5;
const MIN_SWAP_USD = 1;
const MAX_RUNWAY_DAYS = 9999;
const MAX_ACTIONS = 200;
const NOTICE_INTERVAL_MS = 10 * 60 * 1000;

const actions: TreasuryAction[] = [];
// getBalance() returns a fixed snapshot in demo mode, so simulated flows are layered on top of it here.
const demoDeltas = new Map<string, number>();
let lastRebalance = "";
let lastRunwayNotice = 0;
let lastLiveNotice = 0;

function label(token: string): string {
  return TOKEN_LABELS[token] ?? token;
}

function priceOf(token: string): number {
  if (STABLECOINS.has(token)) return 1;
  if (token === "nep141:wrap.near") {
    const configured = parseFloat(process.env.NEAR_PRICE_USD ?? "");
    return configured > 0 ? configured : DEFAULT_NEAR_PRICE_USD;
  }
  return 0;
}

function pushAction(action: Omit<TreasuryAction, "id" | "timestamp">): TreasuryAction {
  const full: TreasuryAction = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...action,
  };
  actions.push(full);
  if (actions.length > MAX_ACTIONS) actions.shift();
  return full;
}

async function loadPositions(): Promise<TreasuryPosition[]> {
  const balances = await getBalance();
  const tokens = new Set([
    ...Object.keys(balances),
    ...(isDemoMode() ? demoDeltas.keys() : []),
  ]);

  const raw = [...tokens].map((token) => {
    const base = parseFloat(balances[token] ?? "0") || 0;
    const delta = isDemoMode() ? (demoDeltas.get(token) ?? 0) : 0;
    const amount = Math.max(0, base + delta);
    return { token, amount, valueUsd: amount * priceOf(token) };
  });

  const total = raw.reduce((sum, p) => sum + p.valueUsd, 0);
  return raw
    .map((p) => ({
      token: p.token,
      amount: p.amount.toFixed(4),
      valueUsd: p.valueUsd.toFixed(2),
      allocation: total > 0 ? Math.round((p.valueUsd / total) * 1000) / 1000 : 0,
    }))
    .sort((a, b) => parseFloat(b.valueUsd) - parseFloat(a.valueUsd));
}

function computeRunway(totalValue: number): number {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dailyBurn = getOperatingCostsSince(since);
  if (dailyBurn <= 0) return MAX_RUNWAY_DAYS;
  return Math.min(MAX_RUNWAY_DAYS, Math.floor(totalValue / dailyBurn));
}

export async function getTreasuryState(): Promise<TreasuryState> {
  const { treasury } = getConfig();
  const positions = await loadPositions();
  const total = positions.reduce((sum, p) => sum + parseFloat(p.valueUsd), 0);
  const stable = positions
    .filter((p) => STABLECOINS.has(p.token))
    .reduce((sum, p) => sum + parseFloat(p.valueUsd), 0);

  return {
    totalValue: total.toFixed(2),
    runwayDays: computeRunway(total),
    targetRunwayDays: treasury.target_runway_days,
    stablecoinPct: total > 0 ? Math.round((stable / total) * 1000) / 1000 : 0,
    targetStablePct: treasury.target_stablecoin_pct / 100,
    lastRebalance,
    positions,
    actions: getActions(),
  };
}

export function recordTreasuryInflow(token: string, amount: string): void {
  if (!isDemoMode()) return;
  const value = parseFloat(amount);
  if (!Number.isFinite(value) || value === 0) return;
  const price = priceOf(token);
  if (price <= 0) return;
  demoDeltas.set(token, (demoDeltas.get(token) ?? 0) + value / price);
}

export async function checkRebalance(): Promise<RebalancePlan> {
  const state = await getTreasuryState();
  const total = parseFloat(state.totalValue);
  const runwayShortfall = state.runwayDays < state.targetRunwayDays;

  if (
    runwayShortfall &&
    Date.now() - lastRunwayNotice > NOTICE_INTERVAL_MS
  ) {
    lastRunwayNotice = Date.now();
    addDecision({
      type: "treasury",
      action: `Flagged runway shortfall: ${state.runwayDays} days vs ${state.targetRunwayDays}-day target`,
      reasoning: `Treasury of $${state.totalValue} covers only ${state.runwayDays} days at the trailing 24h operating burn`,
      impact: "Prioritising stablecoin reserves; owner should review spending caps",
      confidence: 0.8,
      metadata: { runwayDays: state.runwayDays, totalValue: state.totalValue },
    });
  }

  const gap = state.targetStablePct - state.stablecoinPct;
  const noSwap = (reason: string): RebalancePlan => ({
    needed: false,
    reason,
    fromToken: null,
    toToken: null,
    amountUsd: "0.00",
    runwayShortfall,
  });

  if (total <= 0) return noSwap("Treasury is empty");
  if (gap <= REBALANCE_TOLERANCE) {
    return noSwap(
      `Stablecoin allocation ${(state.stablecoinPct * 100).toFixed(1)}% is within tolerance of the ${(state.targetStablePct * 100).toFixed(0)}% target`,
    );
  }

  const source = state.positions.find(
    (p) => !STABLECOINS.has(p.token) && parseFloat(p.valueUsd) > 0,
  );
  if (!source) return noSwap("No volatile holdings available to convert");

  const amountUsd = Math.min(
    gap * total * GAP_FRACTION_PER_REBALANCE,
    parseFloat(source.valueUsd),
  );
  if (amountUsd < MIN_SWAP_USD) {
    return noSwap("Required swap is below the minimum trade size");
  }

  const plan: RebalancePlan = {
    needed: true,
    reason: `Stablecoins are ${(state.stablecoinPct * 100).toFixed(1)}% of treasury vs ${(state.targetStablePct * 100).toFixed(0)}% target`,
    fromToken: source.token,
    toToken: PREFERRED_STABLE,
    amountUsd: amountUsd.toFixed(2),
    runwayShortfall,
  };

  addDecision({
    type: "treasury",
    action: `Planned swap of $${plan.amountUsd} ${label(source.token)} into ${label(PREFERRED_STABLE)}`,
    reasoning: `${plan.reason}. Closing half the gap per rebalance limits slippage and timing risk`,
    impact: `Stablecoin share rises by ~${((amountUsd / total) * 100).toFixed(1)} points; less exposure to ${label(source.token)} volatility`,
    confidence: 0.8,
    metadata: { ...plan },
  });

  return plan;
}

export async function executeRebalance(
  plan?: RebalancePlan,
): Promise<TreasuryAction | null> {
  if (isKilled()) return null;

  const active = plan ?? (await checkRebalance());
  if (!active.needed || !active.fromToken || !active.toToken) return null;

  // Live swaps move real funds on a price assumption this service cannot verify, so they stay owner-initiated.
  if (!isDemoMode()) {
    if (Date.now() - lastLiveNotice > NOTICE_INTERVAL_MS) {
      lastLiveNotice = Date.now();
      addDecision({
        type: "treasury",
        action: `Deferred $${active.amountUsd} rebalance to owner approval`,
        reasoning:
          "Automatic swap execution is limited to demo mode; on a live network the plan is recorded but no funds move",
        impact: "No change to treasury positions",
        confidence: 1,
        metadata: { ...active },
      });
    }
    return null;
  }

  const usd = parseFloat(active.amountUsd);
  const fromAmount = usd / priceOf(active.fromToken);
  const toAmount = usd / priceOf(active.toToken);

  demoDeltas.set(
    active.fromToken,
    (demoDeltas.get(active.fromToken) ?? 0) - fromAmount,
  );
  demoDeltas.set(
    active.toToken,
    (demoDeltas.get(active.toToken) ?? 0) + toAmount,
  );
  lastRebalance = new Date().toISOString();

  const description = `Swapped ${fromAmount.toFixed(4)} ${label(active.fromToken)} for ${toAmount.toFixed(2)} ${label(active.toToken)}`;
  const action = pushAction({
    type: "swap",
    description,
    amount: active.amountUsd,
    token: active.fromToken,
  });

  const agent = getAgentAccountId();
  addEntry({
    type: "swap",
    amount: active.amountUsd,
    token: active.fromToken,
    from: agent,
    to: agent,
    txHash: `demo-tx-swap-${action.id.slice(0, 8)}`,
    reportId: null,
    description: `Treasury rebalance: ${description}`,
  });

  const state = await getTreasuryState();
  addDecision({
    type: "treasury",
    action: `Executed rebalance: ${description}`,
    reasoning: active.reason,
    impact: `Stablecoins now ${(state.stablecoinPct * 100).toFixed(1)}% of a $${state.totalValue} treasury`,
    confidence: 0.9,
    metadata: { actionId: action.id, stablecoinPct: state.stablecoinPct },
  });

  return action;
}

export function getActions(): TreasuryAction[] {
  return [...actions].reverse();
}
