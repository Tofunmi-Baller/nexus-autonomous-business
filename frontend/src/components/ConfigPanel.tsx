import { useEffect, useState } from "react";
import { Settings, AlertOctagon, Coins, Shield, CheckCircle2 } from "lucide-react";
import type { AgentConfig } from "../api";
import { fetchConfig, formatUsd, tokenLabel } from "../api";

export function ConfigPanel() {
  const [config, setConfig] = useState<AgentConfig | null>(null);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => {});
    const id = setInterval(() => {
      fetchConfig().then(setConfig).catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  if (!config) {
    return (
      <div className="glass rounded-2xl p-6 animate-fade-in-up">
        <div className="h-5 rounded-lg animate-shimmer w-40 mb-4" />
        <div className="space-y-3">
          <div className="h-4 rounded-lg animate-shimmer w-full" />
          <div className="h-4 rounded-lg animate-shimmer w-3/4" />
          <div className="h-4 rounded-lg animate-shimmer w-1/2" />
        </div>
      </div>
    );
  }

  const splits = [
    { label: "Owner", pct: config.revenue.owner_pct, color: "bg-accent-violet" },
    { label: "Contributors", pct: config.revenue.contributors_pct, color: "bg-accent-cyan" },
    { label: "Treasury", pct: config.revenue.treasury_pct, color: "bg-accent-amber" },
  ];

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in-up delay-200">
      <div className="flex items-center gap-2 mb-5">
        <Settings className="w-4 h-4 text-accent-violet" />
        <h3 className="text-sm font-semibold">Agent Settings</h3>
      </div>

      {config.kill_switch && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-accent-rose/10 border border-accent-rose/25 animate-pulse">
          <AlertOctagon className="w-4 h-4 text-accent-rose" />
          <span className="text-sm text-accent-rose font-semibold">Kill switch ACTIVE</span>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <p className="text-xs text-text-secondary mb-2.5 uppercase tracking-wider font-medium">Revenue Split</p>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {splits.map((s) => (
              <div key={s.label} className={`${s.color} transition-all duration-500`} style={{ width: `${s.pct}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {splits.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                <span className="text-text-secondary">{s.label}</span>
                <span className="font-mono font-semibold">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-xs text-text-secondary mb-2.5 uppercase tracking-wider font-medium">Spending Caps</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Daily AI max</span>
              <span className="font-mono font-semibold">{formatUsd(config.spending.max_daily_inference_usd)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Per-report max</span>
              <span className="font-mono font-semibold">{formatUsd(config.spending.max_per_report_usd)}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-xs text-text-secondary mb-2.5 uppercase tracking-wider font-medium">Pricing</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-secondary">Report price</span>
            <span className="font-mono font-bold gradient-text text-base">{formatUsd(config.pricing.default_price_usd)}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-xs text-text-secondary mb-2.5 uppercase tracking-wider font-medium">Accepted Tokens</p>
          <div className="flex flex-wrap gap-2">
            {config.pricing.accepted_tokens.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 glass px-2.5 py-1.5 rounded-lg text-xs font-mono">
                <Coins className="w-3 h-3 text-accent-violet" />
                {tokenLabel(t)}
              </span>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center gap-2">
          {config.kill_switch ? (
            <AlertOctagon className="w-4 h-4 text-accent-rose" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-accent-green" />
          )}
          <span className="text-sm text-text-secondary">
            {config.kill_switch ? "Agent is stopped" : "Agent is running"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-text-secondary/60">
          <Shield className="w-3.5 h-3.5" />
          <span className="text-xs">Secured by scoped function-call keys</span>
        </div>
      </div>
    </div>
  );
}
