const STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  sale:           { dot: "bg-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500" },
  inference_cost: { dot: "bg-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   text: "text-amber-500" },
  payout:         { dot: "bg-violet-400",  bg: "bg-violet-500/10 border-violet-500/20",  text: "text-violet-500" },
  deposit:        { dot: "bg-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      text: "text-blue-500" },
  refund:         { dot: "bg-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",      text: "text-rose-500" },
  procurement:    { dot: "bg-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",      text: "text-cyan-500" },
  swap:           { dot: "bg-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20",  text: "text-indigo-500" },
  commission:     { dot: "bg-pink-400",   bg: "bg-pink-500/10 border-pink-500/20",      text: "text-pink-500" },
};

const LABELS: Record<string, string> = {
  sale: "Sale",
  inference_cost: "AI Cost",
  payout: "Payout",
  deposit: "Deposit",
  refund: "Refund",
  procurement: "Procurement",
  swap: "Swap",
  commission: "Commission",
};

export function StatusBadge({
  type,
  label,
  className = "",
}: {
  type?: string;
  label?: string;
  className?: string;
}) {
  const s = (type && STYLES[type]) || { dot: "bg-slate-400", bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400" };
  const text = label || (type && LABELS[type]) || type || "Unknown";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {text}
    </span>
  );
}
