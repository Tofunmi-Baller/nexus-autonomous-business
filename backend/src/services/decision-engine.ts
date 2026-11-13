import { v4 as uuidv4 } from "uuid";
import type { Decision, DecisionType } from "../types.js";

const MAX_DECISIONS = 500;
const DECISION_TYPES: readonly DecisionType[] = [
  "pricing",
  "procurement",
  "treasury",
  "product",
  "refund",
  "general",
];

const decisions: Decision[] = [];
// Monotonic count of every decision ever logged; stream cursors stay valid after the cap trims old entries.
let sequence = 0;

export function isDecisionType(value: unknown): value is DecisionType {
  return (
    typeof value === "string" &&
    (DECISION_TYPES as readonly string[]).includes(value)
  );
}

export function addDecision(
  input: Omit<Decision, "id" | "timestamp">,
): Decision {
  const confidence = Number.isFinite(input.confidence)
    ? Math.min(1, Math.max(0, input.confidence))
    : 0;

  const decision: Decision = {
    ...input,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    confidence: Math.round(confidence * 100) / 100,
  };

  decisions.push(decision);
  sequence += 1;
  if (decisions.length > MAX_DECISIONS) {
    decisions.splice(0, decisions.length - MAX_DECISIONS);
  }

  console.log(`  [decision:${decision.type}] ${decision.action}`);
  return decision;
}

export function getDecisions(limit = 50, type?: DecisionType): Decision[] {
  const filtered = type ? decisions.filter((d) => d.type === type) : decisions;
  const capped = Math.min(Math.max(1, Math.floor(limit)), MAX_DECISIONS);
  return filtered.slice(-capped).reverse();
}

export function getDecisionCursor(): number {
  return sequence;
}

export function getDecisionStream(cursor = 0): {
  decisions: Decision[];
  cursor: number;
} {
  const missed = Math.min(Math.max(0, sequence - cursor), decisions.length);
  return {
    decisions: missed > 0 ? decisions.slice(-missed) : [],
    cursor: sequence,
  };
}
