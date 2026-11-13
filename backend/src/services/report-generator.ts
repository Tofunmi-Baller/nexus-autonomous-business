import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { getConfig, isKilled, isDemoMode } from "../config.js";
import type { Report } from "../types.js";
import { canSpend, recordSpend } from "./spending-tracker.js";

const SYSTEM_PROMPT = `You are a crypto market analyst. Generate a concise market brief (~500 words) with these sections:

## Executive Summary
2-3 sentences with the key takeaway.

## Key Metrics
Bullet points with specific numbers, percentage changes, and price levels.

## Market Drivers
Top 3 factors moving the market right now.

## Risk Factors
Top 3 risks to watch.

## Short-Term Outlook
1-week forward look with specific scenarios.

Use real market analysis patterns. Be specific with percentage ranges and price levels even if approximate. Format in clean markdown.`;

const reports = new Map<string, Report>();

function estimateInferenceCost(inputTokens: number, outputTokens: number): string {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return (inputCost + outputCost).toFixed(4);
}

function generateDemoContent(topic: string): { content: string; summary: string; cost: string } {
  const date = new Date().toISOString().slice(0, 10);
  const content = `## Executive Summary

The ${topic} market shows mixed signals this week with a cautious bullish bias. Trading volumes have increased 12% over the past 7 days while volatility metrics remain contained within historical norms, suggesting accumulation rather than speculative fervor.

## Key Metrics

- **Price**: Trading in the $94,200–$97,800 range (7d), current at $96,450
- **Volume**: $38.2B daily average (+12.3% WoW)
- **Market Cap Dominance**: 54.8% (+0.3% WoW)
- **Fear & Greed Index**: 68 (Greed), up from 61 last week
- **Open Interest**: $18.7B across major derivatives venues
- **Funding Rates**: Slightly positive at 0.012%, indicating mild long bias

## Market Drivers

1. **Institutional inflows**: Spot ETF products saw $1.2B in net inflows over the past week, marking the third consecutive week of positive flows. BlackRock's IBIT alone accounted for $540M.

2. **Macro environment**: The Fed's latest FOMC minutes signaled a patient stance on rate adjustments, with the market pricing in a 72% probability of unchanged rates at the next meeting. Dollar weakness (DXY -0.8% WoW) provides a tailwind.

3. **On-chain fundamentals**: Long-term holder supply continues to increase, now at 14.2M BTC. Exchange reserves dropped to 2.35M BTC, the lowest since March 2018, indicating reduced selling pressure.

## Risk Factors

1. **Regulatory overhang**: Upcoming congressional hearing on digital asset taxation (${date}) could introduce short-term volatility. Market participants should monitor for any proposals affecting staking or DeFi activities.

2. **Technical resistance**: The $98,000–$100,000 zone represents significant overhead supply from previous distribution. Multiple failed attempts at this level could trigger a retracement to the $90,000–$92,000 support zone.

3. **Correlation risk**: 30-day correlation with NASDAQ remains elevated at 0.72. A tech sector correction could drag crypto markets lower despite positive crypto-native fundamentals.

## Short-Term Outlook

**Base case (60% probability)**: Continued consolidation between $94,000–$98,000 before an attempt at the $100K psychological level. Key catalyst: sustained ETF inflows above $500M/week.

**Bull case (25% probability)**: Break above $100K with strong volume, targeting $108,000–$112,000. Requires: favorable regulatory developments + macro tailwind.

**Bear case (15% probability)**: Rejection at current levels leading to a test of the $88,000–$90,000 demand zone. Trigger: unexpected hawkish Fed commentary or major exchange incident.

*Report generated on ${date} by MarketMind AI. This is not financial advice.*`;

  const summary = `The ${topic} market shows mixed signals with a cautious bullish bias. Trading volumes increased 12% while volatility remains contained, suggesting accumulation.`;
  return { content, summary, cost: "0.0180" };
}

export interface GenerateReportOptions {
  reportId?: string;
  supplierContext?: string;
}

export async function generateReport(
  topic: string,
  buyer: string,
  options: GenerateReportOptions = {},
): Promise<Report> {
  if (isKilled()) {
    throw new Error("Agent is shut down — kill switch is active");
  }

  const config = getConfig();
  const maxPerReport = config.spending.max_per_report_usd;

  if (!canSpend(maxPerReport)) {
    throw new Error(
      `Daily inference spend cap reached (${config.spending.max_daily_inference_usd} USD)`,
    );
  }

  const reportId = options.reportId ?? uuidv4();
  const report: Report = {
    id: reportId,
    title: `Market Brief: ${topic}`,
    topic,
    content: "",
    summary: "",
    createdAt: new Date().toISOString(),
    price: config.pricing.default_price_usd,
    token: "USD",
    buyer,
    inferenceCost: "0",
    status: "generating",
  };
  reports.set(reportId, report);

  try {
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    if (hasApiKey) {
      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate a market brief for: ${topic}. Today's date is ${new Date().toISOString().slice(0, 10)}.${
              options.supplierContext
                ? `\n\nInputs purchased from supplier agents:\n${options.supplierContext}`
                : ""
            }`,
          },
        ],
      });

      const content =
        message.content[0].type === "text" ? message.content[0].text : "";
      const cost = estimateInferenceCost(
        message.usage.input_tokens,
        message.usage.output_tokens,
      );

      const summaryMatch = content.match(
        /## Executive Summary\n+([\s\S]*?)(?=\n## |$)/,
      );
      const summary = summaryMatch
        ? summaryMatch[1].trim().slice(0, 200)
        : content.slice(0, 200);

      report.content = content;
      report.summary = summary;
      report.inferenceCost = cost;
    } else {
      const demo = generateDemoContent(topic);
      report.content = demo.content;
      report.summary = demo.summary;
      report.inferenceCost = demo.cost;
    }

    report.status = "complete";
    recordSpend(report.inferenceCost, reportId);
    return report;
  } catch (err) {
    report.status = "failed";
    throw err;
  }
}

export function getReport(id: string): Report | undefined {
  return reports.get(id);
}

export function getAllReports(): Report[] {
  return Array.from(reports.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
