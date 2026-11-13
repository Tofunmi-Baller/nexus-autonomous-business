import { v4 as uuidv4 } from "uuid";
import { getConfig, isDemoMode } from "../config.js";
import { executeTransfer } from "../near/intents.js";
import { getAgentAccountId } from "../near/account.js";
import type { EscrowEntry } from "../types.js";
import { addDecision } from "./decision-engine.js";
import { addEntry } from "./ledger.js";
import { getPredictions, getScore } from "./predictions.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const entries = new Map<string, EscrowEntry>();
const settling = new Set<string>();
let checking = false;

function requireHeld(escrowId: string): EscrowEntry {
  const entry = entries.get(escrowId);
  if (!entry) throw new Error(`Escrow entry not found: ${escrowId}`);
  if (entry.status !== "held") {
    throw new Error(`Escrow entry ${escrowId} is already ${entry.status}`);
  }
  if (settling.has(escrowId)) {
    throw new Error(`Escrow entry ${escrowId} is already being settled`);
  }
  return entry;
}

export function holdPayment(
  reportId: string,
  buyer: string,
  amount: string,
  token: string,
): EscrowEntry {
  const entry: EscrowEntry = {
    id: uuidv4(),
    reportId,
    buyer,
    amount,
    token,
    status: "held",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  entries.set(entry.id, entry);

  const { escrow } = getConfig();
  addDecision({
    type: "general",
    action: `Placed $${amount} from ${buyer} under money-back guarantee`,
    reasoning: `Buyers are refunded automatically if this report's predictions score below ${(escrow.auto_refund_threshold * 100).toFixed(0)}% accuracy`,
    impact: `$${amount} at risk for up to ${escrow.hold_period_days} days`,
    confidence: 1,
    metadata: { escrowId: entry.id, reportId },
  });

  return entry;
}

export function releasePayment(escrowId: string, reason?: string): EscrowEntry {
  const entry = requireHeld(escrowId);
  entry.status = "released";
  entry.resolvedAt = new Date().toISOString();
  entry.reason = reason ?? "Released to agent";

  addDecision({
    type: "general",
    action: `Released $${entry.amount} guarantee hold for report ${entry.reportId.slice(0, 8)}`,
    reasoning: entry.reason,
    impact: `+$${entry.amount} no longer subject to refund`,
    confidence: 0.95,
    metadata: { escrowId, reportId: entry.reportId },
  });

  return entry;
}

export async function refundPayment(
  escrowId: string,
  reason: string,
): Promise<EscrowEntry> {
  const entry = requireHeld(escrowId);
  settling.add(escrowId);

  try {
    let txHash: string | null = isDemoMode()
      ? `demo-tx-refund-${escrowId.slice(0, 8)}`
      : null;

    const agentId = process.env.AGENT_ID;
    if (!isDemoMode() && agentId) {
      const transfer = await executeTransfer(
        agentId,
        entry.token,
        entry.amount,
        entry.buyer,
      );
      txHash = transfer.correlation_id;
    }

    entry.status = "refunded";
    entry.resolvedAt = new Date().toISOString();
    entry.reason = reason;

    addEntry({
      type: "refund",
      amount: entry.amount,
      token: entry.token,
      from: getAgentAccountId(),
      to: entry.buyer,
      txHash,
      reportId: entry.reportId,
      description: `Money-back guarantee refund: ${reason}`,
    });

    addDecision({
      type: "refund",
      action: `Refunded $${entry.amount} to ${entry.buyer}`,
      reasoning: reason,
      impact: `-$${entry.amount} revenue; guarantee honoured without the buyer asking`,
      confidence: 0.95,
      metadata: { escrowId, reportId: entry.reportId },
    });

    return entry;
  } finally {
    settling.delete(escrowId);
  }
}

export function getEscrowEntries(status?: EscrowEntry["status"]): EscrowEntry[] {
  const list = [...entries.values()];
  const filtered = status ? list.filter((e) => e.status === status) : list;
  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function checkEscrows(): Promise<EscrowEntry[]> {
  if (checking) return [];
  checking = true;

  const settled: EscrowEntry[] = [];
  try {
    const { escrow } = getConfig();
    const holdMs = escrow.hold_period_days * DAY_MS;

    for (const entry of getEscrowEntries("held")) {
      try {
        const predictions = getPredictions(entry.reportId);
        const allResolved =
          predictions.length > 0 &&
          predictions.every((p) => p.outcome !== "pending");

        if (allResolved) {
          const score = getScore(entry.reportId);
          const pct = `${(score.accuracy * 100).toFixed(0)}%`;
          const detail = `${score.correct} of ${score.total} predictions correct (${pct})`;

          if (score.accuracy < escrow.auto_refund_threshold) {
            settled.push(
              await refundPayment(
                entry.id,
                `${detail}, below the ${(escrow.auto_refund_threshold * 100).toFixed(0)}% guarantee threshold`,
              ),
            );
          } else {
            settled.push(
              releasePayment(entry.id, `${detail}, guarantee threshold met`),
            );
          }
        } else if (Date.now() - new Date(entry.createdAt).getTime() >= holdMs) {
          settled.push(
            releasePayment(
              entry.id,
              `${escrow.hold_period_days}-day hold period elapsed without a failing score`,
            ),
          );
        }
      } catch (err) {
        console.error(
          `  [escrow] failed to settle ${entry.id}: ${(err as Error).message}`,
        );
      }
    }
  } finally {
    checking = false;
  }

  return settled;
}
