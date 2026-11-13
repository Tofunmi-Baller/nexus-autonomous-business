import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { getConfig, isDemoMode } from "../config.js";
import { executeTransfer } from "../near/intents.js";
import { getAgentAccountId } from "../near/account.js";
import type { Affiliate, Referral } from "../types.js";
import { addDecision } from "./decision-engine.js";
import { addEntry } from "./ledger.js";

const affiliatesByCode = new Map<string, Affiliate>();
const referrals: Referral[] = [];

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateCode(nearAccount: string): string {
  const prefix =
    nearAccount
      .split(".")[0]
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase() || "REF";

  for (;;) {
    const code = `${prefix}-${randomBytes(2).toString("hex").toUpperCase()}`;
    if (!affiliatesByCode.has(code)) return code;
  }
}

export function createAffiliate(nearAccount: string): Affiliate {
  const account = nearAccount.trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,64}$/.test(account)) {
    throw new Error("nearAccount must be a valid NEAR account id");
  }

  const existing = [...affiliatesByCode.values()].find(
    (a) => a.nearAccount === account,
  );
  if (existing) return existing;

  const affiliate: Affiliate = {
    id: uuidv4(),
    code: generateCode(account),
    nearAccount: account,
    commissionPct: getConfig().affiliates.commission_pct,
    totalReferrals: 0,
    totalEarned: "0.00",
    createdAt: new Date().toISOString(),
  };
  affiliatesByCode.set(affiliate.code, affiliate);

  addDecision({
    type: "general",
    action: `Onboarded affiliate ${account} with code ${affiliate.code}`,
    reasoning: `Referral partners extend reach at zero fixed cost; commission is only paid on completed sales`,
    impact: `${affiliate.commissionPct}% of each referred sale shared with ${account}`,
    confidence: 0.9,
    metadata: { affiliateId: affiliate.id, code: affiliate.code },
  });

  return affiliate;
}

export async function recordReferral(
  affiliateCode: string,
  reportId: string,
  saleAmount: string,
  token: string,
  buyer?: string,
): Promise<Referral | null> {
  if (!getConfig().affiliates.enabled) return null;

  const affiliate = affiliatesByCode.get(normalizeCode(affiliateCode));
  if (!affiliate) {
    addDecision({
      type: "general",
      action: `Ignored unknown affiliate code "${affiliateCode.slice(0, 32)}"`,
      reasoning: "Code does not match any registered affiliate; sale proceeds with no commission",
      impact: "$0.00 commission",
      confidence: 1,
      metadata: { reportId },
    });
    return null;
  }

  if (buyer && buyer.trim().toLowerCase() === affiliate.nearAccount) {
    addDecision({
      type: "general",
      action: `Withheld commission on self-referral by ${affiliate.nearAccount}`,
      reasoning: "Buyer and affiliate are the same account; paying commission would be a self-dealt discount",
      impact: "$0.00 commission",
      confidence: 0.95,
      metadata: { reportId, code: affiliate.code },
    });
    return null;
  }

  const sale = parseFloat(saleAmount);
  if (!Number.isFinite(sale) || sale <= 0) {
    throw new Error(`Invalid sale amount for referral: ${saleAmount}`);
  }
  const commission = ((sale * affiliate.commissionPct) / 100).toFixed(4);

  const referral: Referral = {
    id: uuidv4(),
    affiliateId: affiliate.id,
    reportId,
    commission,
    token,
    status: "pending",
    timestamp: new Date().toISOString(),
  };
  referrals.push(referral);
  affiliate.totalReferrals += 1;

  let txHash: string | null = null;
  try {
    if (isDemoMode()) {
      txHash = `demo-tx-affiliate-${referral.id.slice(0, 8)}`;
      referral.status = "paid";
    } else if (process.env.AGENT_ID) {
      const transfer = await executeTransfer(
        process.env.AGENT_ID,
        token,
        commission,
        affiliate.nearAccount,
      );
      txHash = transfer.correlation_id;
      referral.status = "paid";
    }
  } catch (err) {
    console.error(
      `  [affiliates] commission transfer failed, left pending: ${(err as Error).message}`,
    );
  }

  if (referral.status === "paid") {
    affiliate.totalEarned = (
      parseFloat(affiliate.totalEarned) + parseFloat(commission)
    ).toFixed(4);

    addEntry({
      type: "payout",
      amount: commission,
      token,
      from: getAgentAccountId(),
      to: affiliate.nearAccount,
      txHash,
      reportId,
      description: `Affiliate commission (${affiliate.commissionPct}%) for code ${affiliate.code}`,
    });
  }

  addDecision({
    type: "general",
    action:
      referral.status === "paid"
        ? `Paid $${commission} commission to affiliate ${affiliate.code}`
        : `Recorded $${commission} commission owed to affiliate ${affiliate.code}`,
    reasoning: `Sale of $${sale.toFixed(2)} was referred by ${affiliate.nearAccount}; ${affiliate.commissionPct}% commission is funded from the agent's treasury share`,
    impact: `-$${commission} treasury; ${affiliate.totalReferrals} referrals from this partner to date`,
    confidence: 0.95,
    metadata: { referralId: referral.id, reportId, status: referral.status },
  });

  return referral;
}

export function getAffiliates(): Affiliate[] {
  return [...affiliatesByCode.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getAffiliate(code: string): Affiliate | undefined {
  return affiliatesByCode.get(normalizeCode(code));
}

export function getReferrals(affiliateId?: string): Referral[] {
  const list = affiliateId
    ? referrals.filter((r) => r.affiliateId === affiliateId)
    : referrals;
  return [...list].reverse();
}
