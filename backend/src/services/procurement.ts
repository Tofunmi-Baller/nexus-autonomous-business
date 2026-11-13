import { v4 as uuidv4 } from "uuid";
import { isDemoMode, isKilled } from "../config.js";
import { getAgentAccountId } from "../near/account.js";
import type {
  ProcurementOrder,
  ProcurementResult,
  Supplier,
  SupplierStats,
} from "../types.js";
import { addDecision } from "./decision-engine.js";
import { addEntry } from "./ledger.js";

const MAX_SUPPLIERS_PER_REPORT = 3;
const MIN_SUPPLIERS_PER_REPORT = 2;
const MAX_ORDERS = 1000;

interface SupplierProfile extends Supplier {
  keywords: RegExp;
  sample: (topic: string) => string;
}

const SUPPLIERS: SupplierProfile[] = [
  {
    id: "chainpulse",
    name: "ChainPulse",
    type: "data",
    nearAccount: "chainpulse.testnet",
    pricePerCall: "0.02",
    reliability: 0.98,
    avgLatency: 320,
    keywords: /\b(btc|bitcoin|eth|ethereum|near|on-?chain|defi|ecosystem|outlook)\b/i,
    sample: (topic) =>
      `On-chain snapshot for ${topic}: active addresses +6.4% WoW, exchange reserves -1.1%`,
  },
  {
    id: "sentimentai",
    name: "SentimentAI",
    type: "sentiment",
    nearAccount: "sentimentai.testnet",
    pricePerCall: "0.03",
    reliability: 0.94,
    avgLatency: 540,
    keywords: /\b(sentiment|fear|greed|social|market|altcoins?|momentum)\b/i,
    sample: (topic) =>
      `Sentiment for ${topic}: 64/100 (greed), social volume +18% over 24h`,
  },
  {
    id: "chartbot",
    name: "ChartBot",
    type: "charts",
    nearAccount: "chartbot.testnet",
    pricePerCall: "0.01",
    reliability: 0.99,
    avgLatency: 210,
    keywords: /\b(weekly|outlook|price|analysis|technical|chart|altcoins?)\b/i,
    sample: (topic) =>
      `Technical levels for ${topic}: support and resistance bands with 7d/30d moving averages`,
  },
  {
    id: "newswire",
    name: "NewsWire",
    type: "news",
    nearAccount: "newswire.testnet",
    pricePerCall: "0.02",
    reliability: 0.96,
    avgLatency: 410,
    keywords: /\b(update|ecosystem|landscape|news|regulat\w*|defi|near)\b/i,
    sample: (topic) =>
      `12 headlines relevant to ${topic} in the last 24h, 3 flagged high-impact`,
  },
  {
    id: "whalewatch",
    name: "WhaleWatch",
    type: "data",
    nearAccount: "whalewatch.testnet",
    pricePerCall: "0.04",
    reliability: 0.91,
    avgLatency: 680,
    keywords: /\b(whales?|btc|bitcoin|sentiment|flows?|accumulation)\b/i,
    sample: (topic) =>
      `Whale flows for ${topic}: 14 transfers above $10M, net exchange outflow $212M`,
  },
];

const orders: ProcurementOrder[] = [];

function toPublic(profile: SupplierProfile): Supplier {
  const { keywords: _keywords, sample: _sample, ...supplier } = profile;
  return supplier;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreSupplier(supplier: SupplierProfile, topic: string): number {
  const relevance = supplier.keywords.test(topic) ? 1 : 0.25;
  const price = parseFloat(supplier.pricePerCall);
  // Relevance dominates; reliability-per-dollar breaks ties between equally relevant suppliers.
  return relevance * 10 + supplier.reliability / (price * 100);
}

function selectSuppliers(topic: string): SupplierProfile[] {
  const ranked = [...SUPPLIERS].sort(
    (a, b) => scoreSupplier(b, topic) - scoreSupplier(a, topic),
  );
  const relevant = ranked.filter((s) => s.keywords.test(topic)).length;
  const count = Math.min(
    MAX_SUPPLIERS_PER_REPORT,
    Math.max(MIN_SUPPLIERS_PER_REPORT, relevant),
  );
  return ranked.slice(0, count);
}

async function fulfil(
  supplier: SupplierProfile,
  reportId: string,
  topic: string,
): Promise<ProcurementOrder> {
  const order: ProcurementOrder = {
    id: uuidv4(),
    reportId,
    supplierId: supplier.id,
    supplierName: supplier.name,
    type: supplier.type,
    cost: "0.00",
    status: "pending",
    timestamp: new Date().toISOString(),
  };
  orders.push(order);
  if (orders.length > MAX_ORDERS) orders.shift();

  await sleep(supplier.avgLatency * (0.6 + Math.random() * 0.8));

  if (Math.random() > supplier.reliability) {
    order.status = "failed";
    order.data = `${supplier.name} did not respond; no charge`;
    return order;
  }

  order.status = "fulfilled";
  order.cost = supplier.pricePerCall;
  order.data = supplier.sample(topic);

  addEntry({
    type: "procurement",
    amount: supplier.pricePerCall,
    token: "USD",
    from: getAgentAccountId(),
    to: supplier.nearAccount,
    txHash: `demo-tx-procure-${order.id.slice(0, 8)}`,
    reportId,
    description: `Bought ${supplier.type} input from ${supplier.name}`,
  });

  return order;
}

export async function procureForReport(
  reportId: string,
  topic: string,
): Promise<ProcurementResult> {
  if (isKilled()) {
    throw new Error("Agent is shut down — kill switch is active");
  }

  // The supplier agents are simulated; paying them outside demo mode would write fictional costs to a real ledger.
  if (!isDemoMode()) {
    addDecision({
      type: "procurement",
      action: `Skipped supplier procurement for report ${reportId.slice(0, 8)}`,
      reasoning:
        "No live supplier agents are registered on this network; generating the report from first-party inference only",
      impact: "$0.00 procurement cost",
      confidence: 1,
      metadata: { reportId, topic },
    });
    return { orders: [], totalCost: "0.00", context: "" };
  }

  const selected = selectSuppliers(topic);
  const skipped = SUPPLIERS.filter((s) => !selected.includes(s));
  const budget = selected.reduce(
    (sum, s) => sum + parseFloat(s.pricePerCall),
    0,
  );

  addDecision({
    type: "procurement",
    action: `Selected ${selected.map((s) => s.name).join(", ")} as suppliers for "${topic}"`,
    reasoning: `Ranked ${SUPPLIERS.length} supplier agents by topic relevance, then reliability per dollar. Passed on ${skipped.map((s) => s.name).join(", ")} as lower relevance for this topic`,
    impact: `-$${budget.toFixed(2)} input cost for this report`,
    confidence:
      selected.reduce((sum, s) => sum + s.reliability, 0) / selected.length,
    metadata: {
      reportId,
      topic,
      selected: selected.map((s) => ({ id: s.id, price: s.pricePerCall })),
    },
  });

  const results = await Promise.all(
    selected.map((supplier) => fulfil(supplier, reportId, topic)),
  );

  const fulfilled = results.filter((o) => o.status === "fulfilled");
  const failed = results.filter((o) => o.status === "failed");
  const totalCost = fulfilled
    .reduce((sum, o) => sum + parseFloat(o.cost), 0)
    .toFixed(2);

  if (failed.length > 0) {
    addDecision({
      type: "procurement",
      action: `Proceeding without ${failed.map((o) => o.supplierName).join(", ")}`,
      reasoning: `${failed.length} of ${results.length} supplier calls failed; remaining inputs are sufficient and retrying would delay delivery`,
      impact: `Saved $${failed
        .reduce((sum, o) => {
          const supplier = SUPPLIERS.find((s) => s.id === o.supplierId);
          return sum + parseFloat(supplier?.pricePerCall ?? "0");
        }, 0)
        .toFixed(2)}; report built on ${fulfilled.length} inputs`,
      confidence: fulfilled.length > 0 ? 0.75 : 0.5,
      metadata: { reportId, failed: failed.map((o) => o.supplierId) },
    });
  }

  return {
    orders: results,
    totalCost,
    context: fulfilled
      .map((o) => `[${o.supplierName}] ${o.data ?? ""}`)
      .join("\n"),
  };
}

export function getSuppliers(): Supplier[] {
  return SUPPLIERS.map(toPublic);
}

export function getOrders(reportId?: string): ProcurementOrder[] {
  const list = reportId ? orders.filter((o) => o.reportId === reportId) : orders;
  return [...list].reverse();
}

export function getSupplierStats(): SupplierStats[] {
  return SUPPLIERS.map((supplier) => {
    const own = orders.filter((o) => o.supplierId === supplier.id);
    const fulfilled = own.filter((o) => o.status === "fulfilled");
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      orders: own.length,
      fulfilled: fulfilled.length,
      failed: own.filter((o) => o.status === "failed").length,
      totalSpent: fulfilled
        .reduce((sum, o) => sum + parseFloat(o.cost), 0)
        .toFixed(2),
    };
  });
}
