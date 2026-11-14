import { isKilled, isDemoMode } from "../config.js";
import { v4 as uuidv4 } from "uuid";

const ONECLICK_BASE = "https://1click.chaindefuser.com/v0";

function getAgentApiBase(): string {
  return (
    process.env.NEAR_INTENTS_AGENT_API_URL ||
    "https://api.agentsonintents.com"
  );
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.NEAR_INTENTS_AGENT_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const grantToken = process.env.GRANT_TOKEN;
  if (grantToken) headers["X-Grant-Token"] = grantToken;

  return headers;
}

function guardKillSwitch(): void {
  if (isKilled()) {
    throw new Error("Agent is shut down — kill switch is active");
  }
}

export async function getTokens(): Promise<unknown[]> {
  guardKillSwitch();

  if (isDemoMode()) {
    return [
      { asset_id: "nep141:wrap.near", symbol: "wNEAR", decimals: 24 },
      {
        asset_id: "nep141:usdt.tether-token.near",
        symbol: "USDT",
        decimals: 6,
      },
      { asset_id: "nep141:usdc.near", symbol: "USDC", decimals: 6 },
    ];
  }

  const res = await fetch(`${ONECLICK_BASE}/tokens`);
  if (!res.ok) throw new Error(`Failed to fetch tokens: ${res.status}`);
  return (await res.json()) as unknown[];
}

export async function getQuote(
  originAsset: string,
  destinationAsset: string,
  amount: string,
): Promise<unknown> {
  guardKillSwitch();

  if (isDemoMode()) {
    return {
      quote_id: `demo-quote-${uuidv4().slice(0, 8)}`,
      origin_asset: originAsset,
      destination_asset: destinationAsset,
      amount_in: amount,
      amount_out: amount,
      fee: "0",
    };
  }

  const res = await fetch(`${ONECLICK_BASE}/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEAR_INTENTS_AGENT_API_KEY}`,
    },
    body: JSON.stringify({
      swapType: "EXACT_INPUT",
      originAsset,
      depositType: "ORIGIN_CHAIN",
      destinationAsset,
      amount,
    }),
  });

  if (!res.ok) throw new Error(`Failed to get quote: ${res.status}`);
  return res.json();
}

export async function requestDeposit(
  agentId: string,
  originAsset: string,
  amount?: string,
): Promise<{
  correlation_id: string;
  deposit_address: string;
  status: string;
}> {
  guardKillSwitch();

  if (isDemoMode()) {
    return {
      correlation_id: `demo-deposit-${uuidv4().slice(0, 8)}`,
      deposit_address: "nexus-agent.testnet",
      status: "SUCCESS",
    };
  }

  const res = await fetch(
    `${getAgentApiBase()}/v1/agents/${agentId}/deposit`,
    {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Idempotency-Key": `deposit-${uuidv4()}`,
      },
      body: JSON.stringify({
        origin_asset: originAsset,
        ...(amount ? { amount } : {}),
      }),
    },
  );

  if (!res.ok) throw new Error(`Deposit request failed: ${res.status}`);
  return (await res.json()) as {
    correlation_id: string;
    deposit_address: string;
    status: string;
  };
}

export async function executeSwap(
  agentId: string,
  originAsset: string,
  destinationAsset: string,
  amount: string,
): Promise<{ correlation_id: string; status: string }> {
  guardKillSwitch();

  if (isDemoMode()) {
    return {
      correlation_id: `demo-swap-${uuidv4().slice(0, 8)}`,
      status: "SUCCESS",
    };
  }

  const res = await fetch(
    `${getAgentApiBase()}/v1/agents/${agentId}/swap`,
    {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Idempotency-Key": `swap-${uuidv4()}`,
      },
      body: JSON.stringify({
        origin_asset: originAsset,
        destination_asset: destinationAsset,
        amount,
      }),
    },
  );

  if (!res.ok) throw new Error(`Swap failed: ${res.status}`);
  return (await res.json()) as { correlation_id: string; status: string };
}

export async function executeTransfer(
  agentId: string,
  asset: string,
  amount: string,
  recipient: string,
): Promise<{ correlation_id: string; status: string }> {
  guardKillSwitch();

  if (isDemoMode()) {
    return {
      correlation_id: `demo-transfer-${uuidv4().slice(0, 8)}`,
      status: "SUCCESS",
    };
  }

  const res = await fetch(
    `${getAgentApiBase()}/v1/agents/${agentId}/transfer`,
    {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Idempotency-Key": `transfer-${uuidv4()}`,
      },
      body: JSON.stringify({ asset, amount, recipient }),
    },
  );

  if (!res.ok) throw new Error(`Transfer failed: ${res.status}`);
  return (await res.json()) as { correlation_id: string; status: string };
}
