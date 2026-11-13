import { getConfig, isDemoMode } from "../config.js";

const DEMO_BALANCES: Record<string, string> = {
  "nep141:wrap.near": "50.0000",
  "nep141:usdt.tether-token.near": "100.0000",
  "nep141:usdc.near": "75.0000",
};

export function getAgentAccountId(): string {
  const config = getConfig();
  return config.near.agent_account || "marketmind-agent.testnet";
}

export async function getBalance(): Promise<Record<string, string>> {
  if (isDemoMode()) {
    return { ...DEMO_BALANCES };
  }

  const apiKey = process.env.NEAR_INTENTS_AGENT_API_KEY;
  const agentId = process.env.AGENT_ID;
  const baseUrl =
    process.env.NEAR_INTENTS_AGENT_API_URL ||
    "https://api.agentsonintents.com";

  if (!apiKey || !agentId) {
    return {};
  }

  const res = await fetch(`${baseUrl}/v1/agents/${agentId}`, {
    headers: { "X-API-Key": apiKey },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch agent balance: ${res.status}`);
  }

  const data = (await res.json()) as {
    wallet: { balances: Record<string, string> };
  };
  return data.wallet.balances;
}

export async function getAccountInfo(): Promise<{
  accountId: string;
  network: string;
  agentId: string;
  balance: Record<string, string>;
}> {
  const config = getConfig();
  const balance = await getBalance();

  return {
    accountId: getAgentAccountId(),
    network: config.near.network,
    agentId: process.env.AGENT_ID || "demo-agent",
    balance,
  };
}
