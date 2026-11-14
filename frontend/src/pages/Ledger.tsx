import { useEffect, useState, useCallback } from "react";
import { ScrollText, DollarSign, Cpu, ArrowUpRight, TrendingUp, Zap, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchLedger,
  fetchLedgerSummary,
  formatUsd,
  type LedgerEntry,
  type LedgerSummary,
} from "../api";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { TransactionRow } from "../components/TransactionRow";

const FILTERS = [
  { key: "", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "inference_cost", label: "AI Costs" },
  { key: "payout", label: "Payouts" },
  { key: "deposit", label: "Deposits" },
] as const;

const PAGE_SIZE = 10;

export function Ledger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      fetchLedger({ type: filter || undefined, limit: PAGE_SIZE, offset: p * PAGE_SIZE })
        .then((r) => {
          setEntries(r.entries);
          setTotal(r.total);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [filter],
  );

  useEffect(() => {
    setPage(0);
    load(0);
    fetchLedgerSummary().then(setSummary).catch(() => {});
  }, [filter, load]);

  useEffect(() => {
    const id = setInterval(() => {
      load(page);
      fetchLedgerSummary().then(setSummary).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [filter, page, load]);

  const goToPage = (p: number) => {
    const clamped = Math.max(0, Math.min(p, totalPages - 1));
    setPage(clamped);
    load(clamped);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-6 h-6 text-accent-violet" />
          <h1 className="text-3xl font-bold">Public Ledger</h1>
        </div>
        <p className="text-text-secondary">Every transaction, fully transparent</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Sales", value: parseFloat(summary.totalSales), icon: DollarSign, color: "emerald" },
            { label: "AI Costs", value: parseFloat(summary.totalCosts), icon: Cpu, color: "amber" },
            { label: "Payouts", value: parseFloat(summary.totalPayouts), icon: ArrowUpRight, color: "violet" },
            { label: "Net Revenue", value: parseFloat(summary.netRevenue), icon: TrendingUp, color: "blue" },
          ].map((s, i) => (
            <div key={s.label} className={`glass rounded-2xl p-5 animate-fade-in-up delay-${(i + 1) * 100}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg bg-${s.color}-500/10 flex items-center justify-center`}>
                  <s.icon className={`w-3.5 h-3.5 text-${s.color}-500`} />
                </div>
                <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">{s.label}</span>
              </div>
              <AnimatedCounter value={s.value} prefix="$" className="text-xl font-bold" />
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-fade-in-up delay-300">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === tab.key
                ? "btn-gradient text-white shadow-lg"
                : "glass text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction table */}
      <div className="glass rounded-2xl overflow-hidden animate-fade-in-up delay-400">
        {entries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs text-text-secondary uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">From / To</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <TransactionRow key={e.id} entry={e} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 0 || loading}
                    className="p-2 rounded-lg glass text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                    .reduce<(number | "...")[]>((acc, i, idx, arr) => {
                      if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(i);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-text-secondary text-sm">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => goToPage(item as number)}
                          disabled={loading}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            page === item
                              ? "btn-gradient text-white"
                              : "glass text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {(item as number) + 1}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages - 1 || loading}
                    className="p-2 rounded-lg glass text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-20 text-center">
            <Zap className="w-12 h-12 text-text-secondary/15 mx-auto mb-4 animate-bounce-subtle" />
            <p className="text-lg font-medium text-text-secondary mb-2">No transactions yet</p>
            <p className="text-sm text-text-secondary/60 mb-5">
              Run the demo to see Nexus in action
            </p>
            <Link
              to="/app/demo"
              className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
            >
              <Play className="w-4 h-4" />
              Run Demo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
