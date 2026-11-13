import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { AgentConfig } from "./types.js";

const CONFIG_PATH = path.resolve(
  import.meta.dirname,
  "../../config.yaml",
);

let cached: AgentConfig | null = null;
let cachedMtime = 0;

function validate(config: AgentConfig): void {
  const { owner_pct, contributors_pct, treasury_pct } = config.revenue;
  const sum = owner_pct + contributors_pct + treasury_pct;
  if (sum !== 100) {
    throw new Error(
      `Revenue splits must sum to 100, got ${sum} (${owner_pct} + ${contributors_pct} + ${treasury_pct})`,
    );
  }

  if (parseFloat(config.spending.max_daily_inference_usd) <= 0) {
    throw new Error("max_daily_inference_usd must be positive");
  }

  if (parseFloat(config.pricing.min_price_usd) <= 0) {
    throw new Error("min_price_usd must be positive");
  }

  if (
    parseFloat(config.pricing.default_price_usd) <
    parseFloat(config.pricing.min_price_usd)
  ) {
    throw new Error("default_price_usd cannot be less than min_price_usd");
  }

  if (
    parseFloat(config.pricing.max_price_usd as string) <
    parseFloat(config.pricing.default_price_usd)
  ) {
    throw new Error("max_price_usd cannot be less than default_price_usd");
  }

  const stablePct = config.treasury.target_stablecoin_pct;
  if (!(stablePct >= 0 && stablePct <= 100)) {
    throw new Error("treasury.target_stablecoin_pct must be between 0 and 100");
  }

  if (!(config.treasury.target_runway_days > 0)) {
    throw new Error("treasury.target_runway_days must be positive");
  }

  const commission = config.affiliates.commission_pct;
  if (!(commission >= 0 && commission <= 50)) {
    throw new Error("affiliates.commission_pct must be between 0 and 50");
  }

  if (!(config.escrow.hold_period_days > 0)) {
    throw new Error("escrow.hold_period_days must be positive");
  }

  const threshold = config.escrow.auto_refund_threshold;
  if (!(threshold >= 0 && threshold <= 1)) {
    throw new Error("escrow.auto_refund_threshold must be between 0 and 1");
  }
}

// Sections added after launch are optional in config.yaml so an older file still boots.
function withDefaults(raw: AgentConfig): AgentConfig {
  const basePrice = parseFloat(raw.pricing.default_price_usd);
  return {
    ...raw,
    pricing: {
      ...raw.pricing,
      max_price_usd: raw.pricing.max_price_usd ?? (basePrice * 3).toFixed(2),
    },
    treasury: {
      target_runway_days: 30,
      target_stablecoin_pct: 70,
      ...(raw.treasury as Partial<AgentConfig["treasury"]> | undefined),
    },
    affiliates: {
      commission_pct: 5,
      enabled: true,
      ...(raw.affiliates as Partial<AgentConfig["affiliates"]> | undefined),
    },
    escrow: {
      hold_period_days: 7,
      auto_refund_threshold: 0.4,
      ...(raw.escrow as Partial<AgentConfig["escrow"]> | undefined),
    },
  };
}

export function loadConfig(): AgentConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config = withDefaults(parse(raw) as AgentConfig);
  validate(config);
  return config;
}

export function getConfig(): AgentConfig {
  const stat = fs.statSync(CONFIG_PATH);
  const mtime = stat.mtimeMs;

  if (cached && mtime === cachedMtime) {
    return cached;
  }

  cached = loadConfig();
  cachedMtime = mtime;
  return cached;
}

export function isKilled(): boolean {
  return getConfig().kill_switch;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
