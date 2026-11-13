import { DollarSign, GitBranch, Landmark, Layers, RefreshCw, Sparkles, type LucideIcon } from "lucide-react";
import { timeAgo, toPct, type Decision } from "../api";

interface DecisionStyle {
  label: string;
  icon: LucideIcon;
  badge: string;
  iconWrap: string;
  dot: string;
}

export const DECISION_STYLES: Record<string, DecisionStyle> = {
  pricing: {
    label: "Pricing",
    icon: DollarSign,
    badge: "bg-violet-500/10 border-violet-500/20 text-violet-500",
    iconWrap: "bg-violet-500/10 text-violet-500",
    dot: "bg-violet-400",
  },
  procurement: {
    label: "Procurement",
    icon: GitBranch,
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-500",
    iconWrap: "bg-blue-500/10 text-blue-500",
    dot: "bg-blue-400",
  },
  treasury: {
    label: "Treasury",
    icon: Landmark,
    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
    iconWrap: "bg-cyan-500/10 text-cyan-500",
    dot: "bg-cyan-400",
  },
  product: {
    label: "Product",
    icon: Layers,
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    iconWrap: "bg-amber-500/10 text-amber-500",
    dot: "bg-amber-400",
  },
  refund: {
    label: "Refund",
    icon: RefreshCw,
    badge: "bg-rose-500/10 border-rose-500/20 text-rose-500",
    iconWrap: "bg-rose-500/10 text-rose-500",
    dot: "bg-rose-400",
  },
  general: {
    label: "General",
    icon: Sparkles,
    badge: "bg-slate-500/10 border-slate-500/20 text-slate-400",
    iconWrap: "bg-slate-500/10 text-slate-400",
    dot: "bg-slate-400",
  },
};

export function decisionStyle(type: string): DecisionStyle {
  return DECISION_STYLES[type] ?? DECISION_STYLES.general;
}

/** Rough read of whether an impact line describes a gain, a loss, or neither. */
export function impactTone(impact: string): "positive" | "negative" | "neutral" {
  const text = impact.trim().toLowerCase();
  if (!text) return "neutral";
  if (/^[-−–]\s*[$\d]/.test(text) || /\b(loss|lost|lower margin|decline|missed|refunded)\b/.test(text)) return "negative";
  if (/^\+/.test(text) || /\b(sav|gain|increas|improv|higher|boost|earn|protect|extend)\w*/.test(text)) return "positive";
  return "neutral";
}

const TONE_CLASS = {
  positive: "text-accent-green",
  negative: "text-accent-rose",
  neutral: "text-text-secondary",
};

export function ConfidenceBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = toPct(value);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-violet via-accent-blue to-accent-cyan transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-text-secondary w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export function DecisionTypeBadge({ type }: { type: string }) {
  const s = decisionStyle(type);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function DecisionCard({
  decision,
  compact = false,
  delayMs = 0,
}: {
  decision: Decision;
  compact?: boolean;
  delayMs?: number;
}) {
  const s = decisionStyle(decision.type);
  const Icon = s.icon;
  const tone = impactTone(decision.impact || "");

  if (compact) {
    return (
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl bg-bg-card border border-border animate-slide-in-right"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconWrap}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold truncate">{decision.action}</p>
            <span className="text-xs text-text-secondary flex-shrink-0">{timeAgo(decision.timestamp)}</span>
          </div>
          <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{decision.reasoning}</p>
        </div>
      </div>
    );
  }

  return (
    <article
      className="glass rounded-2xl p-5 animate-slide-in-right"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconWrap}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <DecisionTypeBadge type={decision.type} />
            <span className="text-xs text-text-secondary">{timeAgo(decision.timestamp)}</span>
          </div>
          <p className="font-bold text-sm sm:text-base leading-snug">{decision.action}</p>
          {decision.reasoning && (
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{decision.reasoning}</p>
          )}
          {decision.impact && (
            <p className={`text-xs mt-2 font-medium ${TONE_CLASS[tone]}`}>{decision.impact}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-text-secondary">Confidence</span>
            <ConfidenceBar value={decision.confidence} className="flex-1 max-w-[220px]" />
          </div>
        </div>
      </div>
    </article>
  );
}
