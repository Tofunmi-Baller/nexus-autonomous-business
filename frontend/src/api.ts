export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: "sale" | "inference_cost" | "payout" | "deposit" | "refund" | "procurement" | "swap" | "commission";
  amount: string;
  token: string;
  from: string;
  to: string;
  txHash?: string;
  reportId?: string;
  description: string;
}

export interface Report {
  id: string;
  title: string;
  topic: string;
  content: string;
  createdAt: string;
  price: string;
  token: string;
  buyer: string;
  inferenceCost: string;
}

export interface AgentStatus {
  name: string;
  agentId: string;
  nearAccount: string;
  network: string;
  isKilled: boolean;
  balances: Record<string, string>;
  dailySpend: string;
  maxDailySpend: string;
  totalSales: number;
  totalRevenue: string;
  uptime: string;
}

export interface DemoStep {
  step: number;
  label: string;
  status: "pending" | "running" | "complete" | "error";
  detail?: string;
  elapsed?: number;
  payload?: Record<string, unknown>;
}

export interface LedgerSummary {
  totalSales: string;
  totalCosts: string;
  totalPayouts: string;
  netRevenue: string;
  saleCount: number;
  entryCount: number;
}

export interface AgentConfig {
  agent: { name: string; description: string };
  near: { network: string; agent_account: string; contributors_account: string; owner_account: string };
  revenue: { owner_pct: number; contributors_pct: number; treasury_pct: number };
  pricing: { min_price_usd: string; default_price_usd: string; accepted_tokens: string[] };
  spending: { max_daily_inference_usd: string; max_per_report_usd: string };
  kill_switch: boolean;
}

// ─── Autonomous business types ───

export type DecisionType = "pricing" | "procurement" | "treasury" | "product" | "refund" | "general";

export interface Decision {
  id: string;
  timestamp: string;
  type: DecisionType;
  action: string;
  reasoning: string;
  impact: string;
  confidence: number;
}

export interface PriceAdjustment {
  timestamp: string;
  oldPrice: string;
  newPrice: string;
  reason: string;
  demandScore: number;
}

export interface PricingState {
  currentPrice: string;
  basePrice: string;
  minPrice: string;
  maxPrice: string;
  demandScore: number;
  marginTarget: number;
  currentMargin: number;
  lastAdjustment: string;
  adjustmentHistory: PriceAdjustment[];
}

export interface Prediction {
  id: string;
  reportId: string;
  asset: string;
  prediction: string;
  priceTarget: string;
  timeframe: string;
  confidence: number;
  createdAt: string;
  resolvedAt: string | null;
  outcome: "correct" | "incorrect" | "pending";
  hash: string;
}

export interface PredictionScore {
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracy: number;
}

export interface Supplier {
  id: string;
  name: string;
  type: string;
  nearAccount: string;
  pricePerCall: string;
  reliability: number;
  avgLatency: number;
}

export interface ProcurementOrder {
  id: string;
  reportId: string;
  supplierId: string;
  supplierName: string;
  type: string;
  cost: string;
  status: string;
  timestamp: string;
}

export interface SupplierStats {
  supplierId: string;
  supplierName: string;
  orders: number;
  fulfilled: number;
  failed: number;
  totalSpent: string;
}

export interface TreasuryPosition {
  token: string;
  amount: string;
  valueUsd: string;
  allocation: number;
}

export interface TreasuryAction {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  amount: string;
  token: string;
}

export interface TreasuryState {
  totalValue: string;
  runwayDays: number;
  targetRunwayDays: number;
  stablecoinPct: number;
  targetStablePct: number;
  lastRebalance: string;
  positions: TreasuryPosition[];
  actions: TreasuryAction[];
}

export interface EscrowEntry {
  id: string;
  reportId: string;
  buyer: string;
  amount: string;
  token: string;
  status: "held" | "released" | "refunded";
  createdAt: string;
  resolvedAt: string | null;
  reason?: string;
}

export interface Affiliate {
  id: string;
  code: string;
  nearAccount: string;
  commissionPct: number;
  totalReferrals: number;
  totalEarned: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  affiliateId: string;
  reportId: string;
  commission: string;
  token: string;
  status: "pending" | "paid" | string;
  timestamp: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  topic: string;
  price: string;
  status: "active" | "evaluating" | "retired";
  totalSales: number;
  totalRevenue: string;
  profitMargin: number;
  launchedAt: string;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const fetchStatus = () => request<AgentStatus>("/api/status");

export const fetchLedger = (params?: { type?: string; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<{ entries: LedgerEntry[]; total: number }>(`/api/ledger${q ? `?${q}` : ""}`);
};

export const fetchLedgerSummary = () => request<LedgerSummary>("/api/ledger/summary");

export const fetchConfig = () => request<AgentConfig>("/api/config");

export const fetchReports = (): Promise<Report[]> => request<Report[]>("/api/reports");

export const fetchReport = (id: string) => request<Report>(`/api/reports/${id}`);

export const buyReport = (topic: string, buyer: string, token?: string, affiliateCode?: string) =>
  request<Report>("/api/reports/buy", {
    method: "POST",
    // The backend reads the referral code from `affiliate`.
    body: JSON.stringify({ topic, buyer, token, ...(affiliateCode ? { affiliate: affiliateCode } : {}) }),
  });

// ─── Autonomous business endpoints ───

/** Accepts either a bare array or an object wrapping one (e.g. `{ decisions: [...] }`). */
function asList<T>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (key && Array.isArray(obj[key])) return obj[key] as T[];
    const first = Object.values(obj).find(Array.isArray);
    if (first) return first as T[];
  }
  return [];
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const q = qs.toString();
  return q ? `${path}?${q}` : path;
}

export const fetchDecisions = (limit?: number, type?: string): Promise<Decision[]> =>
  request<unknown>(withQuery("/api/decisions", { limit, type })).then((d) => asList<Decision>(d, "decisions"));

export function subscribeDecisions(): EventSource {
  return new EventSource("/api/decisions/stream");
}

export const fetchPricing = () => request<PricingState>("/api/pricing");

export const fetchPredictions = (reportId?: string): Promise<Prediction[]> =>
  request<unknown>(reportId ? `/api/predictions/${encodeURIComponent(reportId)}` : "/api/predictions").then((d) =>
    asList<Prediction>(d, "predictions"),
  );

export const fetchPredictionScore = () => request<PredictionScore>("/api/predictions/score");

export const fetchSuppliers = (): Promise<Supplier[]> =>
  request<unknown>("/api/procurement/suppliers").then((d) => asList<Supplier>(d, "suppliers"));

export const fetchProcurementOrders = (reportId?: string): Promise<ProcurementOrder[]> =>
  request<unknown>(withQuery("/api/procurement/orders", { reportId })).then((d) => {
    const orders = asList<ProcurementOrder>(d, "orders");
    // Filter client-side too, in case the backend ignores the query param.
    return reportId ? orders.filter((o) => o.reportId === reportId) : orders;
  });

export const fetchProcurementStats = (): Promise<SupplierStats[]> =>
  request<unknown>("/api/procurement/stats").then((d) => asList<SupplierStats>(d, "bySupplier"));

export const fetchTreasury = () => request<TreasuryState>("/api/treasury");

export const fetchTreasuryActions = (): Promise<TreasuryAction[]> =>
  request<unknown>("/api/treasury/actions").then((d) => asList<TreasuryAction>(d, "actions"));

export const fetchEscrow = (status?: string): Promise<EscrowEntry[]> =>
  request<unknown>(withQuery("/api/escrow", { status })).then((d) => asList<EscrowEntry>(d, "entries"));

export const fetchAffiliates = (): Promise<Affiliate[]> =>
  request<unknown>("/api/affiliates").then((d) => asList<Affiliate>(d, "affiliates"));

export const createAffiliate = (nearAccount: string) =>
  request<Affiliate>("/api/affiliates", {
    method: "POST",
    body: JSON.stringify({ nearAccount }),
  });

export const fetchAffiliate = (code: string) => request<Affiliate>(`/api/affiliates/${encodeURIComponent(code)}`);

export const fetchAffiliateReferrals = (code: string): Promise<Referral[]> =>
  request<unknown>(`/api/affiliates/${encodeURIComponent(code)}/referrals`).then((d) =>
    asList<Referral>(d, "referrals"),
  );

export const fetchProducts = (): Promise<Product[]> =>
  request<unknown>("/api/products").then((d) => asList<Product>(d, "products"));

/** Normalises a ratio that may arrive as 0–1 or 0–100 into a 0–100 percentage. */
export function toPct(n: number | undefined | null): number {
  if (n === undefined || n === null || !Number.isFinite(n)) return 0;
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, pct));
}

export function toNum(v: string | number | undefined | null): number {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

export function runDemo(): EventSource {
  return new EventSource("/api/demo/run");
}

export interface DemoCallbacks {
  onStep: (step: DemoStep) => void;
  onComplete: (data: { reportId: string; totalTime: number }) => void;
  onError: (msg: string) => void;
}

export function startDemo(callbacks: DemoCallbacks): { cancel: () => void } {
  let completed = false;
  const es = new EventSource("/api/demo/run");

  es.addEventListener("step", (ev) => {
    callbacks.onStep(JSON.parse(ev.data));
  });

  es.addEventListener("complete", (ev) => {
    completed = true;
    callbacks.onComplete(JSON.parse(ev.data));
    es.close();
  });

  es.addEventListener("error", (ev) => {
    completed = true;
    if (ev instanceof MessageEvent) {
      const data = JSON.parse(ev.data);
      callbacks.onError(data.error || "Demo failed");
    }
    es.close();
  });

  es.onerror = () => {
    if (!completed) {
      callbacks.onError("Connection lost");
    }
    es.close();
  };

  return { cancel: () => { completed = true; es.close(); } };
}

export function timeAgo(dateStr: string | null | undefined): string {
  const t = dateStr ? new Date(dateStr).getTime() : NaN;
  if (!Number.isFinite(t)) return "never";
  const seconds = Math.floor((Date.now() - t) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncateAddress(addr: string, chars = 8): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function formatUsd(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${n.toFixed(2)}`;
}

export function tokenLabel(token: string): string {
  if (token.includes("usdc")) return "USDC";
  if (token.includes("usdt")) return "USDT";
  if (token.includes("wrap.near")) return "wNEAR";
  if (token === "NEAR" || token === "near") return "NEAR";
  const parts = token.split(":");
  const last = parts[parts.length - 1];
  return last.split(".")[0].toUpperCase();
}
