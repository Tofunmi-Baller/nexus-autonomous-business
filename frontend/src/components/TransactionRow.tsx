import { ArrowRight, ExternalLink } from "lucide-react";
import type { LedgerEntry } from "../api";
import { timeAgo, truncateAddress, tokenLabel } from "../api";
import { StatusBadge } from "./StatusBadge";

const AMOUNT_COLORS: Record<string, string> = {
  sale: "text-emerald-500",
  deposit: "text-blue-500",
  inference_cost: "text-amber-500",
  payout: "text-violet-500",
  refund: "text-rose-500",
  procurement: "text-cyan-500",
  swap: "text-indigo-500",
};

export function TransactionRow({ entry, index = 0, compact = false }: { entry: LedgerEntry; index?: number; compact?: boolean }) {
  const amountColor = AMOUNT_COLORS[entry.type] || "text-text-primary";
  const sign = ["inference_cost", "payout", "procurement", "swap"].includes(entry.type) ? "-" : "+";
  const explorerBase = "https://testnet.nearblocks.io/txns/";

  if (compact) {
    return (
      <tr
        className="border-b border-border hover:bg-white/[0.02] transition-all duration-200 animate-slide-in-right"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <td className="px-4 py-2.5 text-xs text-text-secondary whitespace-nowrap">
          {timeAgo(entry.timestamp)}
        </td>
        <td className="px-4 py-2.5">
          <StatusBadge type={entry.type} />
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap">
          <span className={`text-sm font-semibold font-mono ${amountColor}`}>
            {sign}{entry.amount}
          </span>
          <span className="text-text-secondary ml-1 text-xs font-mono">{tokenLabel(entry.token)}</span>
        </td>
        <td className="px-4 py-2.5 text-xs text-text-secondary max-w-[280px] truncate">
          {entry.description}
        </td>
      </tr>
    );
  }

  return (
    <tr
      className="border-b border-border hover:bg-white/[0.02] transition-all duration-200 animate-slide-in-right"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="px-4 py-3.5 text-sm text-text-secondary whitespace-nowrap">
        {timeAgo(entry.timestamp)}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge type={entry.type} />
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={`text-sm font-semibold font-mono ${amountColor}`}>
          {sign}{entry.amount}
        </span>
        <span className="text-text-secondary ml-1.5 text-xs font-mono">
          {tokenLabel(entry.token)}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm font-mono text-text-secondary whitespace-nowrap">
        <span title={entry.from}>{truncateAddress(entry.from, 6)}</span>
        <ArrowRight className="inline w-3 h-3 mx-1.5 text-text-secondary/40" />
        <span title={entry.to}>{truncateAddress(entry.to, 6)}</span>
      </td>
      <td className="px-4 py-3.5 text-sm text-text-secondary max-w-[240px] truncate">
        {entry.description}
      </td>
      <td className="px-4 py-3.5 text-sm font-mono whitespace-nowrap">
        {entry.txHash ? (
          <a
            href={`${explorerBase}${entry.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-text hover:opacity-80 inline-flex items-center gap-1 transition-opacity"
          >
            {entry.txHash.slice(0, 8)}…
            <ExternalLink className="w-3 h-3 text-accent-violet" />
          </a>
        ) : (
          <span className="text-text-secondary/30">—</span>
        )}
      </td>
    </tr>
  );
}
