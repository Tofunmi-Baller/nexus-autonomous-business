import { getConfig } from "../config.js";
import { addEntry, getDailyInferenceCosts, getInferenceCostsForDate } from "./ledger.js";

export function recordSpend(amount: string, reportId: string): void {
  const config = getConfig();

  addEntry({
    type: "inference_cost",
    amount,
    token: "USD",
    from: config.near.agent_account || "agent",
    to: "near-ai-cloud",
    txHash: null,
    reportId,
    description: `AI inference cost for report ${reportId}`,
  });
}

export function getDailySpend(): string {
  return getDailyInferenceCosts();
}

export function canSpend(amount: string): boolean {
  const config = getConfig();
  const currentSpend = parseFloat(getDailySpend());
  const proposed = parseFloat(amount);
  const cap = parseFloat(config.spending.max_daily_inference_usd);

  return currentSpend + proposed <= cap;
}

export function getSpendHistory(
  days: number,
): Array<{ date: string; total: string }> {
  const history: Array<{ date: string; total: string }> = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    history.push({ date: dateStr, total: getInferenceCostsForDate(dateStr) });
  }

  return history;
}
