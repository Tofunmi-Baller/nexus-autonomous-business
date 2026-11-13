export interface AgentConfig {
  agent: {
    name: string;
    description: string;
  };
  near: {
    network: "testnet" | "mainnet";
    agent_account: string;
    contributors_account: string;
    owner_account: string;
  };
  revenue: {
    owner_pct: number;
    contributors_pct: number;
    treasury_pct: number;
  };
  pricing: {
    min_price_usd: string;
    default_price_usd: string;
    max_price_usd?: string;
    accepted_tokens: string[];
  };
  spending: {
    max_daily_inference_usd: string;
    max_per_report_usd: string;
  };
  treasury: {
    target_runway_days: number;
    target_stablecoin_pct: number;
  };
  affiliates: {
    commission_pct: number;
    enabled: boolean;
  };
  escrow: {
    hold_period_days: number;
    auto_refund_threshold: number;
  };
  kill_switch: boolean;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type:
    | "sale"
    | "inference_cost"
    | "payout"
    | "deposit"
    | "refund"
    | "procurement"
    | "swap";
  amount: string;
  token: string;
  from: string;
  to: string;
  txHash: string | null;
  reportId: string | null;
  description: string;
}

export interface Report {
  id: string;
  title: string;
  topic: string;
  content: string;
  summary: string;
  createdAt: string;
  price: string;
  token: string;
  buyer: string;
  inferenceCost: string;
  status: "pending" | "generating" | "complete" | "failed";
}

export interface AgentStatus {
  agentName: string;
  nearAccount: string;
  network: string;
  balance: Record<string, string>;
  dailyInferenceSpend: string;
  maxDailySpend: string;
  isKilled: boolean;
  totalSales: number;
  totalRevenue: string;
  uptime: number;
}

export interface DemoStep {
  step: number;
  label: string;
  status: "pending" | "running" | "complete" | "error";
  detail: string;
  timestamp: string;
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

export interface RevenueSplit {
  owner: string;
  contributors: string;
  treasury: string;
}

export type DecisionType =
  | "pricing"
  | "procurement"
  | "treasury"
  | "product"
  | "refund"
  | "general";

export interface Decision {
  id: string;
  timestamp: string;
  type: DecisionType;
  action: string;
  reasoning: string;
  impact: string;
  confidence: number;
  metadata?: Record<string, unknown>;
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
  prediction: "bullish" | "bearish" | "neutral";
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
  type: "data" | "sentiment" | "charts" | "news";
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
  status: "pending" | "fulfilled" | "failed";
  timestamp: string;
  data?: string;
}

export interface ProcurementResult {
  orders: ProcurementOrder[];
  totalCost: string;
  context: string;
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
  type: "swap" | "stake" | "unstake" | "rebalance";
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

export interface RebalancePlan {
  needed: boolean;
  reason: string;
  fromToken: string | null;
  toToken: string | null;
  amountUsd: string;
  runwayShortfall: boolean;
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
  status: "pending" | "paid";
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
  retiredAt: string | null;
}
