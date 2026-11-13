import { v4 as uuidv4 } from "uuid";
import { getConfig } from "../config.js";
import type { Product } from "../types.js";
import { addDecision } from "./decision-engine.js";
import { getCurrentPrice } from "./pricing-engine.js";

const LAUNCH_THRESHOLD_REQUESTS = 2;
const RETIRE_AFTER_IDLE_CYCLES = 3;
const PROMOTE_AFTER_SALES = 2;
const MIN_ACTIVE_PRODUCTS = 3;

const PRESETS: Array<{ name: string; description: string }> = [
  { name: "BTC Weekly Outlook", description: "Bitcoin price action and market structure" },
  { name: "ETH DeFi Landscape", description: "Ethereum ecosystem and DeFi protocols" },
  { name: "NEAR Ecosystem Update", description: "NEAR protocol developments and metrics" },
  { name: "Top Altcoins Analysis", description: "High-momentum altcoin picks" },
  { name: "Crypto Market Sentiment", description: "Fear & greed, social signals, whale movements" },
];

interface ProductRecord {
  product: Product;
  totalCost: number;
  salesThisCycle: number;
  idleCycles: number;
}

const records = new Map<string, ProductRecord>();
const unlistedDemand = new Map<string, { topic: string; requests: number }>();
let seeded = false;

function normalize(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

function createRecord(
  name: string,
  description: string,
  topic: string,
  price: string,
  status: Product["status"],
): ProductRecord {
  const record: ProductRecord = {
    product: {
      id: uuidv4(),
      name,
      description,
      topic,
      price,
      status,
      totalSales: 0,
      totalRevenue: "0.00",
      profitMargin: 0,
      launchedAt: new Date().toISOString(),
      retiredAt: null,
    },
    totalCost: 0,
    salesThisCycle: 0,
    idleCycles: 0,
  };
  records.set(record.product.id, record);
  return record;
}

// Seeded lazily because config is not readable at module load in every entry point.
function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  const price = getConfig().pricing.default_price_usd;
  for (const preset of PRESETS) {
    createRecord(preset.name, preset.description, preset.name, price, "active");
  }
}

function findLiveByTopic(topic: string): ProductRecord | undefined {
  const key = normalize(topic);
  return [...records.values()].find(
    (r) => r.product.status !== "retired" && normalize(r.product.topic) === key,
  );
}

function liveCount(): number {
  return [...records.values()].filter((r) => r.product.status !== "retired")
    .length;
}

export function launchProduct(
  name: string,
  description: string,
  topic: string,
  price: string,
  reasoning = "Launched on request",
): Product {
  ensureSeeded();

  const existing = findLiveByTopic(topic);
  if (existing) return existing.product;

  if (!(parseFloat(price) > 0)) {
    throw new Error(`Invalid product price: ${price}`);
  }

  const record = createRecord(name, description, topic, price, "evaluating");

  addDecision({
    type: "product",
    action: `Launched new product "${name}" at $${price}`,
    reasoning,
    impact: `Catalogue grows to ${liveCount()} products; "${name}" is on trial until it reaches ${PROMOTE_AFTER_SALES} sales`,
    confidence: 0.7,
    metadata: { productId: record.product.id, topic },
  });

  return record.product;
}

export function retireProduct(id: string, reason: string): Product {
  ensureSeeded();

  const record = records.get(id);
  if (!record) throw new Error(`Product not found: ${id}`);
  if (record.product.status === "retired") return record.product;

  record.product.status = "retired";
  record.product.retiredAt = new Date().toISOString();

  addDecision({
    type: "product",
    action: `Retired product "${record.product.name}"`,
    reasoning: reason,
    impact: `Catalogue shrinks to ${liveCount()} products; lifetime revenue $${record.product.totalRevenue} from ${record.product.totalSales} sales`,
    confidence: 0.75,
    metadata: { productId: id },
  });

  return record.product;
}

export function recordProductSale(
  topic: string,
  revenue: string,
  cost: string,
): void {
  ensureSeeded();

  const record = findLiveByTopic(topic);
  if (!record) {
    const key = normalize(topic);
    const demand = unlistedDemand.get(key) ?? { topic: topic.trim(), requests: 0 };
    demand.requests += 1;
    unlistedDemand.set(key, demand);
    return;
  }

  const { product } = record;
  const totalRevenue = parseFloat(product.totalRevenue) + (parseFloat(revenue) || 0);
  record.totalCost += parseFloat(cost) || 0;
  record.salesThisCycle += 1;
  product.totalSales += 1;
  product.totalRevenue = totalRevenue.toFixed(2);
  product.profitMargin =
    totalRevenue > 0
      ? Math.round(((totalRevenue - record.totalCost) / totalRevenue) * 1000) / 1000
      : 0;

  if (product.status === "evaluating" && product.totalSales >= PROMOTE_AFTER_SALES) {
    product.status = "active";
    addDecision({
      type: "product",
      action: `Promoted "${product.name}" from trial to the permanent catalogue`,
      reasoning: `Reached ${product.totalSales} sales at a ${(product.profitMargin * 100).toFixed(1)}% margin during evaluation`,
      impact: `$${product.totalRevenue} revenue to date from a self-commissioned product`,
      confidence: 0.8,
      metadata: { productId: product.id },
    });
  }
}

export function evaluateTrends(): { launched: Product[]; retired: Product[] } {
  ensureSeeded();

  const launched: Product[] = [];
  const retired: Product[] = [];

  for (const [key, demand] of unlistedDemand) {
    if (demand.requests < LAUNCH_THRESHOLD_REQUESTS) continue;
    unlistedDemand.delete(key);
    launched.push(
      launchProduct(
        demand.topic,
        `Self-commissioned brief on ${demand.topic}, created from repeat buyer demand`,
        demand.topic,
        getCurrentPrice(),
        `Buyers requested "${demand.topic}" ${demand.requests} times as a custom topic and no catalogue product covers it`,
      ),
    );
  }

  const live = [...records.values()].filter(
    (r) => r.product.status !== "retired",
  );
  const shopHadSales = live.some((r) => r.salesThisCycle > 0);

  for (const record of live) {
    // A quiet shop says nothing about one product, so idle cycles only count while something else is selling.
    if (record.salesThisCycle > 0) record.idleCycles = 0;
    else if (shopHadSales) record.idleCycles += 1;
    record.salesThisCycle = 0;
  }

  const stale = live
    .filter((r) => r.idleCycles >= RETIRE_AFTER_IDLE_CYCLES)
    .sort((a, b) => b.idleCycles - a.idleCycles);

  for (const record of stale) {
    if (liveCount() <= MIN_ACTIVE_PRODUCTS) break;
    retired.push(
      retireProduct(
        record.product.id,
        `No sales in ${record.idleCycles} consecutive evaluation cycles while other products kept selling`,
      ),
    );
  }

  return { launched, retired };
}

export function getProducts(): Product[] {
  ensureSeeded();
  return [...records.values()]
    .map((r) => r.product)
    .filter((p) => p.status !== "retired");
}

export function getAllProducts(): Product[] {
  ensureSeeded();
  return [...records.values()].map((r) => r.product);
}

export function getProduct(id: string): Product | undefined {
  ensureSeeded();
  return records.get(id)?.product;
}
