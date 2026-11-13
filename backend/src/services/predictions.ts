import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { isDemoMode } from "../config.js";
import type { Prediction, PredictionScore } from "../types.js";
import { addDecision } from "./decision-engine.js";

const DEMO_CORRECT_RATE = 0.7;
const DEMO_MIN_AGE_MS = 20_000;
const DEFAULT_TIMEFRAME = "7d";
const MIN_PER_REPORT = 2;
const MAX_PER_REPORT = 3;

const ASSETS: Array<{ symbol: string; pattern: RegExp; referencePrice: number }> = [
  { symbol: "BTC", pattern: /\b(btc|bitcoin)\b/i, referencePrice: 96450 },
  { symbol: "ETH", pattern: /\b(eth|ethereum|defi)\b/i, referencePrice: 3420 },
  { symbol: "NEAR", pattern: /\bnear\b/i, referencePrice: 5.2 },
  { symbol: "SOL", pattern: /\b(sol|solana|altcoins?)\b/i, referencePrice: 182 },
];

const predictions: Prediction[] = [];

type HashablePrediction = Pick<
  Prediction,
  | "reportId"
  | "asset"
  | "prediction"
  | "priceTarget"
  | "timeframe"
  | "confidence"
  | "createdAt"
>;

export function getPredictionHash(prediction: HashablePrediction): string {
  // Fixed field order so the commitment is reproducible by anyone verifying it on-chain.
  const canonical = JSON.stringify([
    prediction.reportId,
    prediction.asset,
    prediction.prediction,
    prediction.priceTarget,
    prediction.timeframe,
    prediction.confidence,
    prediction.createdAt,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function detectBias(content: string): Prediction["prediction"] {
  const bullish = countMatches(
    content,
    /\b(bullish|inflows?|accumulation|upside|breakout|tailwind|rally)\b/gi,
  );
  const bearish = countMatches(
    content,
    /\b(bearish|outflows?|distribution|downside|rejection|headwind|sell-?off|correction)\b/gi,
  );
  if (bullish > bearish * 1.25) return "bullish";
  if (bearish > bullish * 1.25) return "bearish";
  return "neutral";
}

function formatUsd(value: number): string {
  const digits = value >= 1000 ? 0 : 2;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function selectAssets(text: string): typeof ASSETS {
  const mentioned = ASSETS.filter((a) => a.pattern.test(text));
  const rest = ASSETS.filter((a) => !mentioned.includes(a));
  const count = Math.min(
    MAX_PER_REPORT,
    Math.max(MIN_PER_REPORT, mentioned.length),
  );
  return [...mentioned, ...rest].slice(0, count);
}

export function extractPredictions(
  reportContent: string,
  reportId: string,
  topic = "",
): Prediction[] {
  const bias = detectBias(reportContent);
  const assets = selectAssets(`${topic}\n${reportContent}`);
  const createdAt = new Date().toISOString();

  const created = assets.map((asset, index) => {
    // The report's headline bias applies to its primary asset; secondary calls vary around it.
    const direction: Prediction["prediction"] =
      index === 0
        ? bias
        : (["bullish", "neutral", "bearish"] as const)[
            Math.floor(Math.random() * 3)
          ];
    const move =
      direction === "neutral" ? 0 : 0.03 + Math.random() * 0.05;
    const target =
      asset.referencePrice * (1 + (direction === "bearish" ? -move : move));

    const base: HashablePrediction = {
      reportId,
      asset: asset.symbol,
      prediction: direction,
      priceTarget: formatUsd(target),
      timeframe: DEFAULT_TIMEFRAME,
      confidence: Math.round((0.55 + Math.random() * 0.3) * 100) / 100,
      createdAt,
    };

    const prediction: Prediction = {
      id: uuidv4(),
      ...base,
      resolvedAt: null,
      outcome: "pending",
      hash: getPredictionHash(base),
    };
    predictions.push(prediction);
    return prediction;
  });

  addDecision({
    type: "general",
    action: `Committed ${created.length} scoreable predictions for report ${reportId.slice(0, 8)}`,
    reasoning: `Every report carries falsifiable calls (${created.map((p) => `${p.asset} ${p.prediction} ${p.priceTarget}`).join(", ")}) hashed with SHA-256 so they cannot be edited after the fact`,
    impact: "Buyer refund eligibility now tied to prediction accuracy",
    confidence: created.reduce((sum, p) => sum + p.confidence, 0) / created.length,
    metadata: { reportId, hashes: created.map((p) => p.hash) },
  });

  return created;
}

export function resolvePredictions(): Prediction[] {
  // Without a live price oracle there is nothing truthful to score against, so only demo mode resolves.
  if (!isDemoMode()) return [];

  const now = Date.now();
  const due = predictions.filter(
    (p) =>
      p.outcome === "pending" &&
      now - new Date(p.createdAt).getTime() >= DEMO_MIN_AGE_MS,
  );
  if (due.length === 0) return [];

  const resolvedAt = new Date().toISOString();
  for (const prediction of due) {
    prediction.outcome =
      Math.random() < DEMO_CORRECT_RATE ? "correct" : "incorrect";
    prediction.resolvedAt = resolvedAt;
  }

  const correct = due.filter((p) => p.outcome === "correct").length;
  const score = getScore();
  addDecision({
    type: "general",
    action: `Scored ${due.length} predictions: ${correct} correct, ${due.length - correct} incorrect`,
    reasoning: `Prediction timeframes elapsed (simulated in demo mode); outcomes recorded against the original SHA-256 commitments`,
    impact: `Lifetime accuracy now ${(score.accuracy * 100).toFixed(1)}% across ${score.correct + score.incorrect} resolved calls`,
    confidence: 1,
    metadata: {
      resolved: due.map((p) => ({ id: p.id, asset: p.asset, outcome: p.outcome })),
    },
  });

  return due;
}

export function getPredictions(reportId?: string): Prediction[] {
  const list = reportId
    ? predictions.filter((p) => p.reportId === reportId)
    : predictions;
  return [...list].reverse();
}

export function getScore(reportId?: string): PredictionScore {
  const list = reportId
    ? predictions.filter((p) => p.reportId === reportId)
    : predictions;
  const correct = list.filter((p) => p.outcome === "correct").length;
  const incorrect = list.filter((p) => p.outcome === "incorrect").length;
  const resolved = correct + incorrect;

  return {
    total: list.length,
    correct,
    incorrect,
    pending: list.length - resolved,
    accuracy: resolved === 0 ? 0 : Math.round((correct / resolved) * 1000) / 1000,
  };
}
