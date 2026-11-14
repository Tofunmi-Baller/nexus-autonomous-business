import { useEffect, useState } from "react";
import { Clock, Landmark, Layers, PieChart, RefreshCw, Shield, TrendingUp, Wallet, Zap, type LucideIcon } from "lucide-react";
import {
  fetchTreasury,
  fetchTreasuryActions,
  timeAgo,
  toNum,
  toPct,
  tokenLabel,
  type TreasuryAction,
  type TreasuryState,
} from "../api";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { ProgressRing } from "../components/ProgressRing";

const TOKEN_COLORS = ["#8B5CF6", "#06B6D4", "#3B82F6", "#F59E0B", "#10B981", "#F43F5E"];

const ACTION_ICONS: { match: RegExp; icon: LucideIcon; wrap: string }[] = [
  { match: /swap|convert/i, icon: RefreshCw, wrap: "bg-blue-500/10 text-blue-500" },
  { match: /stake|yield/i, icon: Layers, wrap: "bg-violet-500/10 text-violet-500" },
  { match: /rebalanc/i, icon: PieChart, wrap: "bg-cyan-500/10 text-cyan-500" },
  { match: /deposit|receive|revenue/i, icon: TrendingUp, wrap: "bg-emerald-500/10 text-emerald-500" },
  { match: /reserve|hold|protect/i, icon: Shield, wrap: "bg-amber-500/10 text-amber-500" },
];

function actionVisual(type: string) {
  return ACTION_ICONS.find((a) => a.match.test(type)) ?? { icon: Zap, wrap: "bg-slate-500/10 text-slate-400" };
}

function runwayTone(days: number, funded: boolean) {
  if (!funded) return { text: "text-text-secondary", label: "No funds yet" };
  if (days > 20) return { text: "text-accent-green", label: "Healthy" };
  if (days >= 10) return { text: "text-accent-amber", label: "Getting short" };
  return { text: "text-accent-rose", label: "Running low" };
}

export function Treasury() {
  const [treasury, setTreasury] = useState<TreasuryState | null>(null);
  const [actions, setActions] = useState<TreasuryAction[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTreasury()
        .then((t) => !cancelled && setTreasury(t))
        .catch(() => {})
        .finally(() => !cancelled && setLoaded(true));
      fetchTreasuryActions()
        .then((a) => !cancelled && setActions(a))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const positions = treasury?.positions ?? [];
  const totalValue = toNum(treasury?.totalValue);
  // Allocation may arrive as 0–1 or 0–100; decide once from the sum rather than per row.
  const allocSum = positions.reduce((sum, p) => sum + (p.allocation || 0), 0);
  const allocScale = allocSum > 0 && allocSum <= 1.5 ? 100 : 1;
  const rows = positions.map((p, i) => ({
    ...p,
    label: tokenLabel(p.token),
    pct: Math.max(0, Math.min(100, (p.allocation || 0) * allocScale)),
    color: TOKEN_COLORS[i % TOKEN_COLORS.length],
  }));

  const feed = [...(actions && actions.length > 0 ? actions : treasury?.actions ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const runway = treasury?.runwayDays ?? 0;
  const tone = runwayTone(runway, totalValue > 0);
  const stablePct = toPct(treasury?.stablecoinPct);
  const targetStable = toPct(treasury?.targetStablePct);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="gradient-text">Treasury</span>
          </h1>
          <span className="flex items-center gap-1.5 glass px-2.5 py-1 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            Auto-refresh
          </span>
        </div>
        <p className="text-text-secondary text-sm sm:text-base">
          How Nexus looks after its own money so it can keep running
        </p>
      </div>

      {loaded && !treasury && (
        <div className="glass rounded-2xl px-6 py-14 text-center animate-fade-in-up delay-100">
          <Landmark className="w-12 h-12 text-text-secondary/20 mx-auto mb-4 animate-bounce-subtle" />
          <p className="text-text-secondary font-medium">Treasury data isn't available yet</p>
          <p className="text-sm text-text-secondary/60 mt-1">Run the demo to give Nexus some funds to manage</p>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Total Value</span>
          </div>
          <div className="text-2xl font-bold">
            <AnimatedCounter value={totalValue} prefix="$" className="gradient-text" />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            across {positions.length} {positions.length === 1 ? "token" : "tokens"}
          </p>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Runway</span>
          </div>
          <div className={`text-2xl font-bold ${treasury ? tone.text : "text-text-secondary"}`}>
            {treasury ? <AnimatedCounter value={runway} decimals={0} suffix=" days" /> : "—"}
          </div>
          {treasury && (
            <p className="text-xs text-text-secondary mt-1">
              {tone.label}
              {treasury.targetRunwayDays ? ` · goal ${treasury.targetRunwayDays} days` : ""}
            </p>
          )}
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Stablecoin Ratio</span>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing value={stablePct} max={100} size={48} stroke={4} color="#06B6D4" />
            <div>
              <div className="text-lg font-bold">
                <AnimatedCounter value={stablePct} decimals={0} suffix="%" />
              </div>
              <p className="text-xs text-text-secondary">{targetStable > 0 ? `goal ${targetStable.toFixed(0)}%` : "held in stable tokens"}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Last Rebalance</span>
          </div>
          <div className="text-2xl font-bold">{treasury ? timeAgo(treasury.lastRebalance) : "—"}</div>
          <p className="text-xs text-text-secondary mt-1">Nexus adjusts its holdings on its own</p>
        </div>
      </div>

      {/* Allocation chart */}
      {rows.length > 0 && (
        <div className="glass rounded-2xl p-6 animate-fade-in-up delay-500">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-accent-violet" />
            <h3 className="text-sm font-semibold">Where the money sits</h3>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-border gap-0.5" role="img" aria-label="Token allocation">
            {rows.map((r) => (
              <div
                key={r.token}
                className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                title={`${r.label} ${r.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
            {rows.map((r) => (
              <div key={r.token} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-text-secondary">{r.label}</span>
                <span className="font-mono font-semibold tabular-nums">{r.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl overflow-hidden animate-fade-in-up delay-600">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
              <Wallet className="w-4 h-4 text-accent-violet" />
              <h3 className="text-sm font-semibold">Holdings</h3>
            </div>
            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-xs text-text-secondary uppercase tracking-wider">
                      <th className="px-6 py-2.5 font-medium">Token</th>
                      <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                      <th className="px-4 py-2.5 font-medium text-right">Value (USD)</th>
                      <th className="px-6 py-2.5 font-medium w-[38%]">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.token}
                        className="border-b border-border last:border-b-0 animate-fade-in-up"
                        style={{ animationDelay: `${600 + i * 60}ms` }}
                      >
                        <td className="px-6 py-3.5">
                          <span className="flex items-center gap-2.5 text-sm font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                            {r.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-right">{r.amount}</td>
                        <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-right font-semibold">
                          ${toNum(r.valueUsd).toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 rounded-full bg-border overflow-hidden min-w-[60px]">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                              />
                            </div>
                            <span className="text-xs font-mono tabular-nums w-12 text-right">{r.pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <Wallet className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
                <p className="text-text-secondary font-medium">No holdings yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions feed */}
        <div className="animate-fade-in-up delay-700">
          <div className="flex items-center gap-2 mb-3 px-1">
            <RefreshCw className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-semibold">Recent moves</h3>
          </div>
          {feed.length > 0 ? (
            <div className="space-y-2.5">
              {feed.slice(0, 12).map((a, i) => {
                const v = actionVisual(a.type);
                const Icon = v.icon;
                return (
                  <div
                    key={a.id}
                    className="glass rounded-xl p-3.5 flex items-start gap-3 animate-slide-in-right"
                    style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${v.wrap}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold capitalize">{a.type.replace(/_/g, " ")}</span>
                        <span className="text-xs text-text-secondary flex-shrink-0">{timeAgo(a.timestamp)}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{a.description}</p>
                      {a.amount && (
                        <p className="text-xs font-mono font-semibold mt-1">
                          {a.amount} {a.token ? tokenLabel(a.token) : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass rounded-2xl px-6 py-10 text-center">
              <RefreshCw className="w-8 h-8 text-text-secondary/20 mx-auto mb-3" />
              <p className="text-sm text-text-secondary font-medium">No moves yet</p>
              <p className="text-xs text-text-secondary/60 mt-1">Swaps and rebalances will show up here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
