import { getConfig, isKilled } from "../config.js";
import type { PriceAdjustment, PricingState } from "../types.js";
import { addDecision } from "./decision-engine.js";

const MARGIN_TARGET = 0.6;
const MAX_STEP = 0.1;
const DEMAND_WINDOW_MS = 5 * 60 * 1000;
const DEMAND_SATURATION_SALES = 6;
const HIGH_DEMAND = 0.5;
const LOW_DEMAND = 0.2;
const SALES_PER_CHECK = 3;
const COST_SAMPLE_SIZE = 20;
const MAX_HISTORY = 100;

let currentPrice: number | null = null;
let lastAdjustment = new Date().toISOString();
let totalSales = 0;
let salesSinceCheck = 0;
const saleTimestamps: number[] = [];
const recentUnitCosts: number[] = [];
const adjustmentHistory: PriceAdjustment[] = [];

function getBounds(): { base: number; min: number; max: number } {
  const { pricing } = getConfig();
  const base = parseFloat(pricing.default_price_usd);
  const min = parseFloat(pricing.min_price_usd);
  const configuredMax = parseFloat(pricing.max_price_usd ?? "");
  const max = Number.isFinite(configuredMax) ? configuredMax : base * 3;
  return { base, min, max };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function priceNow(): number {
  const { base, min, max } = getBounds();
  if (currentPrice === null) currentPrice = base;
  // Bounds hot-reload from config.yaml, so re-clamp on every read.
  currentPrice = clamp(currentPrice, min, max);
  return currentPrice;
}

function getDemandScore(): number {
  const cutoff = Date.now() - DEMAND_WINDOW_MS;
  while (saleTimestamps.length > 0 && saleTimestamps[0] < cutoff) {
    saleTimestamps.shift();
  }
  return Math.min(1, saleTimestamps.length / DEMAND_SATURATION_SALES);
}

function getAverageUnitCost(): number | null {
  if (recentUnitCosts.length === 0) return null;
  return recentUnitCosts.reduce((a, b) => a + b, 0) / recentUnitCosts.length;
}

function getMargin(price: number): number {
  const unitCost = getAverageUnitCost();
  if (unitCost === null || price <= 0) return 1;
  return (price - unitCost) / price;
}

export function getCurrentPrice(): string {
  return priceNow().toFixed(2);
}

export function recordSale(unitCostUsd?: string): void {
  saleTimestamps.push(Date.now());
  totalSales += 1;
  salesSinceCheck += 1;

  const cost = parseFloat(unitCostUsd ?? "");
  if (Number.isFinite(cost) && cost >= 0) {
    recentUnitCosts.push(cost);
    if (recentUnitCosts.length > COST_SAMPLE_SIZE) recentUnitCosts.shift();
  }

  if (salesSinceCheck >= SALES_PER_CHECK) {
    adjustPrice();
  }
}

export function adjustPrice(): PriceAdjustment | null {
  salesSinceCheck = 0;
  if (isKilled()) return null;

  const { base, min, max } = getBounds();
  const oldPrice = priceNow();
  const demand = getDemandScore();
  const margin = getMargin(oldPrice);
  const windowMinutes = DEMAND_WINDOW_MS / 60000;

  let step = 0;
  let reason = "";
  let confidence = 0.6;

  if (margin < MARGIN_TARGET) {
    step = MAX_STEP;
    reason = `Margin ${(margin * 100).toFixed(1)}% is below the ${MARGIN_TARGET * 100}% target; raising price to recover unit economics`;
    confidence = 0.85;
  } else if (demand >= HIGH_DEMAND) {
    step = MAX_STEP * (0.5 + demand / 2);
    reason = `Demand score ${demand.toFixed(2)} (${saleTimestamps.length} sales in the last ${windowMinutes} min) is above the ${HIGH_DEMAND} threshold; buyers are not price-sensitive at this level`;
    confidence = 0.55 + demand * 0.35;
  } else if (demand <= LOW_DEMAND && oldPrice > base) {
    step = -MAX_STEP * (1 - demand);
    reason = `Demand cooled to ${demand.toFixed(2)} while price sits above the $${base.toFixed(2)} base; easing back toward base to win volume`;
    confidence = 0.7;
  } else if (demand === 0 && totalSales > 0 && oldPrice > min) {
    step = -MAX_STEP / 2;
    reason = `No sales in the last ${windowMinutes} min; discounting below base to restart demand`;
    confidence = 0.5;
  }

  if (step === 0) return null;

  let target = oldPrice * (1 + step);
  // A cooling-demand cut stops at base; only a full stall is allowed to go below it.
  if (step < 0 && oldPrice > base) target = Math.max(target, base);
  const newPrice = Math.round(clamp(target, min, max) * 100) / 100;

  if (newPrice.toFixed(2) === oldPrice.toFixed(2)) return null;

  currentPrice = newPrice;
  lastAdjustment = new Date().toISOString();

  const adjustment: PriceAdjustment = {
    timestamp: lastAdjustment,
    oldPrice: oldPrice.toFixed(2),
    newPrice: newPrice.toFixed(2),
    reason,
    demandScore: Math.round(demand * 100) / 100,
  };
  adjustmentHistory.push(adjustment);
  if (adjustmentHistory.length > MAX_HISTORY) adjustmentHistory.shift();

  const delta = newPrice - oldPrice;
  addDecision({
    type: "pricing",
    action: `${delta > 0 ? "Raised" : "Lowered"} report price from $${adjustment.oldPrice} to $${adjustment.newPrice}`,
    reasoning: reason,
    impact: `${delta > 0 ? "+" : "-"}$${Math.abs(delta).toFixed(2)}/report revenue`,
    confidence,
    metadata: {
      oldPrice: adjustment.oldPrice,
      newPrice: adjustment.newPrice,
      demandScore: adjustment.demandScore,
      margin: Math.round(margin * 1000) / 1000,
      bounds: { min: min.toFixed(2), max: max.toFixed(2) },
    },
  });

  return adjustment;
}

export function getPricingState(): PricingState {
  const { base, min, max } = getBounds();
  const price = priceNow();

  return {
    currentPrice: price.toFixed(2),
    basePrice: base.toFixed(2),
    minPrice: min.toFixed(2),
    maxPrice: max.toFixed(2),
    demandScore: Math.round(getDemandScore() * 100) / 100,
    marginTarget: MARGIN_TARGET,
    currentMargin: Math.round(getMargin(price) * 1000) / 1000,
    lastAdjustment,
    adjustmentHistory: [...adjustmentHistory].reverse(),
  };
}
