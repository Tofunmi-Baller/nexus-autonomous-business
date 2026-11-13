import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Cpu,
  Zap,
  Play,
  ShoppingCart,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  fetchStatus,
  fetchLedger,
  fetchLedgerSummary,
  formatUsd,
  tokenLabel,
  type AgentStatus,
  type LedgerEntry,
  type LedgerSummary,
} from "../api";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { ProgressRing } from "../components/ProgressRing";
import { TransactionRow } from "../components/TransactionRow";

export function Dashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);

  useEffect(() => {
    const load = () => {
      fetchStatus().then(setStatus).catch(() => {});
      fetchLedger({ limit: 5 }).then((r) => setEntries(r.entries)).catch(() => {});
      fetchLedgerSummary().then(setSummary).catch(() => {});
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const dailySpend = status ? parseFloat(status.dailySpend) : 0;
  const maxDailySpend = status ? parseFloat(status.maxDailySpend) : 50;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="gradient-text">{status?.name || "MarketMind"}</span>
          </h1>
          <span className="flex items-center gap-1.5 glass px-2.5 py-1 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            Running
          </span>
        </div>
        <p className="text-text-secondary">
          An AI agent that runs its own research business on NEAR — no humans in the loop.
        </p>
      </div>

      {/* Stats — the only numbers you need at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Sales</span>
          </div>
          <div className="text-2xl font-bold">
            <AnimatedCounter value={status?.totalSales || 0} decimals={0} />
          </div>
          {summary && (
            <p className="text-xs text-text-secondary mt-1 font-mono">
              <AnimatedCounter value={parseFloat(summary.totalSales)} prefix="$" /> revenue
            </p>
          )}
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">AI Spend</span>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing value={dailySpend} max={maxDailySpend} size={48} stroke={4} />
            <div>
              <div className="text-lg font-bold font-mono">
                <AnimatedCounter value={dailySpend} prefix="$" decimals={4} />
              </div>
              <p className="text-xs text-text-secondary">of {formatUsd(status?.maxDailySpend || "50.00")}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Balance</span>
          </div>
          {status && Object.keys(status.balances).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(status.balances).map(([token, amount]) => (
                <div key={token} className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                    {tokenLabel(token)}
                  </span>
                  <span className="text-sm font-mono font-semibold">{amount}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-2xl font-bold font-mono">$0.00</p>
          )}
        </div>

        <div className="glass rounded-2xl p-5 animate-fade-in-up delay-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Net Revenue</span>
          </div>
          <div className="text-2xl font-bold">
            {summary ? (
              <AnimatedCounter value={parseFloat(summary.netRevenue)} prefix="$" className="gradient-text" />
            ) : (
              <span className="text-text-secondary">—</span>
            )}
          </div>
          {summary && (
            <p className="text-xs text-text-secondary mt-1">{summary.entryCount} transactions</p>
          )}
        </div>
      </div>

      {/* Two clear CTAs — the most important actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up delay-500">
        <Link
          to="/demo"
          className="glass rounded-2xl p-6 flex items-center gap-4 hover:scale-[1.01] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl btn-gradient flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold mb-0.5">Watch the Demo</h3>
            <p className="text-sm text-text-secondary">See a full autonomous business cycle in under 60 seconds</p>
          </div>
          <ArrowRight className="w-5 h-5 text-text-secondary flex-shrink-0 ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/buy"
          className="glass rounded-2xl p-6 flex items-center gap-4 hover:scale-[1.01] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-green/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-6 h-6 text-accent-green" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold mb-0.5">Buy a Report</h3>
            <p className="text-sm text-text-secondary">Get AI-generated crypto market analysis instantly</p>
          </div>
          <ArrowRight className="w-5 h-5 text-text-secondary flex-shrink-0 ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Recent activity — compact, just 5 rows */}
      <div className="glass rounded-2xl overflow-hidden animate-fade-in-up delay-600">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-violet" />
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Live
            </div>
          </div>
          <Link to="/ledger" className="text-xs text-accent-violet hover:underline flex items-center gap-1">
            Full ledger <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary uppercase tracking-wider">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <TransactionRow key={e.id} entry={e} index={i} compact />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Zap className="w-8 h-8 text-text-secondary/20 mx-auto mb-2 animate-bounce-subtle" />
            <p className="text-text-secondary text-sm">No activity yet — run the demo to see MarketMind in action</p>
          </div>
        )}
      </div>
    </div>
  );
}
