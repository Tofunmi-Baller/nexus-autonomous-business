import { getConfig, isDemoMode } from "../config.js";
import type { RevenueSplit } from "../types.js";
import { addEntry } from "./ledger.js";
import { executeTransfer } from "../near/intents.js";

export async function splitRevenue(
  saleAmount: string,
  token: string,
  reportId: string,
): Promise<RevenueSplit> {
  const config = getConfig();
  const amount = parseFloat(saleAmount);

  const ownerAmount = ((amount * config.revenue.owner_pct) / 100).toFixed(4);
  const contributorsAmount = (
    (amount * config.revenue.contributors_pct) / 100
  ).toFixed(4);
  const treasuryAmount = (
    (amount * config.revenue.treasury_pct) / 100
  ).toFixed(4);

  const agentAccount = config.near.agent_account || "agent.testnet";

  addEntry({
    type: "payout",
    amount: ownerAmount,
    token,
    from: agentAccount,
    to: config.near.owner_account,
    txHash: isDemoMode() ? `demo-tx-owner-${reportId.slice(0, 8)}` : null,
    reportId,
    description: `Owner payout (${config.revenue.owner_pct}%)`,
  });

  addEntry({
    type: "payout",
    amount: contributorsAmount,
    token,
    from: agentAccount,
    to: config.near.contributors_account,
    txHash: isDemoMode()
      ? `demo-tx-contributors-${reportId.slice(0, 8)}`
      : null,
    reportId,
    description: `Contributors payout (${config.revenue.contributors_pct}%)`,
  });

  if (!isDemoMode()) {
    const agentId = process.env.AGENT_ID;
    if (agentId) {
      await executeTransfer(
        agentId,
        token,
        ownerAmount,
        config.near.owner_account,
      );
      await executeTransfer(
        agentId,
        token,
        contributorsAmount,
        config.near.contributors_account,
      );
    }
  }

  return {
    owner: ownerAmount,
    contributors: contributorsAmount,
    treasury: treasuryAmount,
  };
}
