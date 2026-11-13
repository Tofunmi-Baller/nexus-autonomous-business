import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Wallet,
  ScrollText,
  PieChart,
  FileText,
  GitBranch,
  Landmark,
  Target,
  Shield,
  Brain,
  ArrowRight,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { DemoStep } from "../api";
import { AnimatedCounter } from "../components/AnimatedCounter";

const STEP_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /provider|procure|supplier|consult|data source/i, icon: GitBranch },
  { match: /treasur|rebalanc/i, icon: Landmark },
  { match: /predict|lock/i, icon: Target },
  { match: /escrow|secur/i, icon: Shield },
  { match: /deposit|payment|receiv/i, icon: Wallet },
  { match: /report|generat/i, icon: FileText },
  { match: /log|ledger|sale/i, icon: ScrollText },
  { match: /split|revenue|payout/i, icon: PieChart },
  { match: /complete|done|cycle/i, icon: CheckCircle2 },
];

function getStepIcon(label: string): LucideIcon {
  return STEP_ICONS.find((s) => s.match.test(label))?.icon ?? Zap;
}

// --- Detail panel renderers for each step type ---

function PaymentDetail({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between glass rounded-xl p-4">
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">From</p>
          <p className="font-mono text-sm">{String(payload.from)}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-accent-violet mx-4 flex-shrink-0" />
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">To</p>
          <p className="font-mono text-sm">{String(payload.to)}</p>
        </div>
      </div>
      <div className="text-center">
        <p className="text-4xl font-bold gradient-text">${String(payload.amount)}</p>
        <p className="text-text-secondary text-sm mt-1">{String(payload.token)}</p>
      </div>
    </div>
  );
}

function SuppliersDetail({ payload }: { payload: Record<string, unknown> }) {
  const suppliers = (payload.suppliers as Array<{ name: string; cost: string; type: string }>) || [];
  return (
    <div className="space-y-3 animate-fade-in-up">
      {suppliers.map((s, i) => (
        <div key={i} className="glass rounded-xl p-4 flex items-center justify-between animate-slide-in-right" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-accent-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="text-xs text-text-secondary capitalize">{s.type} provider</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-bold">${s.cost}</p>
            <p className="text-xs text-accent-green">Paid</p>
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-2 border-t border-border text-sm">
        <span className="text-text-secondary">Total procurement cost</span>
        <span className="font-mono font-bold">${String(payload.totalCost)}</span>
      </div>
    </div>
  );
}

function ReportDetail({ payload }: { payload: Record<string, unknown> }) {
  const content = String(payload.content || "");
  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-accent-violet" />
        <h4 className="font-semibold text-sm">{String(payload.title)}</h4>
      </div>
      <div className="glass rounded-xl p-4 max-h-[320px] overflow-y-auto text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>AI inference cost: <span className="font-mono text-accent-amber">${String(payload.inferenceCost)}</span></span>
        <span className="font-mono text-text-secondary/50">ID: {String(payload.reportId).slice(0, 8)}...</span>
      </div>
    </div>
  );
}

function PredictionsDetail({ payload }: { payload: Record<string, unknown> }) {
  const predictions = (payload.predictions as Array<{ asset: string; prediction: string; priceTarget: string; timeframe: string; confidence: number; hash: string }>) || [];
  return (
    <div className="space-y-3 animate-fade-in-up">
      {predictions.map((p, i) => (
        <div key={i} className="glass rounded-xl p-4 animate-slide-in-right" style={{ animationDelay: `${i * 120}ms` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{p.asset}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                p.prediction === "bullish" ? "bg-accent-green/10 text-accent-green" :
                p.prediction === "bearish" ? "bg-accent-rose/10 text-accent-rose" :
                "bg-accent-amber/10 text-accent-amber"
              }`}>
                {p.prediction}
              </span>
            </div>
            <span className="text-xs text-text-secondary">{p.timeframe}</span>
          </div>
          <p className="text-sm text-text-secondary mb-2">Target: <span className="font-mono font-semibold text-text-primary">{p.priceTarget}</span></p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan transition-all duration-500" style={{ width: `${p.confidence * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-text-secondary">{(p.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-[10px] font-mono text-text-secondary/40 mt-2 truncate">SHA-256: {p.hash}</p>
        </div>
      ))}
    </div>
  );
}

function EscrowDetail({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="animate-fade-in-up">
      <div className="glass rounded-xl p-6 text-center">
        <Shield className="w-10 h-10 text-accent-violet mx-auto mb-3" />
        <p className="text-3xl font-bold gradient-text mb-1">${String(payload.amount)}</p>
        <p className="text-text-secondary text-sm">held in escrow for <span className="font-bold text-text-primary">{String(payload.escrowDays)} days</span></p>
        <div className="mt-4 glass rounded-lg p-3 text-xs text-text-secondary">
          If predictions miss the accuracy threshold, the customer gets an automatic refund — no support ticket needed.
        </div>
      </div>
    </div>
  );
}

function RevenueDetail({ payload }: { payload: Record<string, unknown> }) {
  const owner = payload.owner as { amount: string; pct: number; account: string };
  const contributors = payload.contributors as { amount: string; pct: number; account: string };
  const treasury = payload.treasury as { amount: string; pct: number };
  const items = [
    { label: "Owner", ...owner, color: "bg-accent-violet", textColor: "text-accent-violet" },
    { label: "Contributors", ...contributors, color: "bg-accent-blue", textColor: "text-accent-blue" },
    { label: "Treasury", ...treasury, account: "agent (self)", color: "bg-accent-cyan", textColor: "text-accent-cyan" },
  ];
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex h-4 rounded-full overflow-hidden">
        {items.map((item) => (
          <div key={item.label} className={`${item.color} transition-all duration-700`} style={{ width: `${item.pct}%` }} />
        ))}
      </div>
      {items.map((item, i) => (
        <div key={item.label} className="glass rounded-xl p-4 flex items-center justify-between animate-slide-in-right" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <div>
              <p className="text-sm font-semibold">{item.label} <span className="text-text-secondary font-normal">({item.pct}%)</span></p>
              <p className="text-xs text-text-secondary font-mono">{item.account}</p>
            </div>
          </div>
          <p className={`text-lg font-bold font-mono ${item.textColor}`}>${item.amount}</p>
        </div>
      ))}
    </div>
  );
}

function TreasuryDetail({ payload }: { payload: Record<string, unknown> }) {
  const positions = (payload.positions as Array<{ token: string; amount: string; valueUsd: string; allocation: number }>) || [];
  const stablePct = Number(payload.stablecoinPct) * 100;
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-text-secondary mb-1">Total Value</p>
          <p className="text-lg font-bold gradient-text">${String(payload.totalValue)}</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-text-secondary mb-1">Runway</p>
          <p className="text-lg font-bold text-accent-green">{String(payload.runwayDays)}d</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xs text-text-secondary mb-1">Stablecoins</p>
          <p className="text-lg font-bold">{stablePct.toFixed(0)}%</p>
        </div>
      </div>
      {positions.length > 0 && (
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-3">Holdings</p>
          {positions.map((pos, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-violet" />
                <span className="text-sm">{pos.token.includes("usdc") ? "USDC" : pos.token.includes("usdt") ? "USDT" : pos.token.includes("wrap") ? "wNEAR" : pos.token}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono">{pos.amount}</span>
                <span className="text-xs text-text-secondary ml-2">(${pos.valueUsd})</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {Boolean(payload.rebalanced) && Boolean(payload.swap) && (
        <div className="glass rounded-xl p-3 text-xs text-accent-cyan flex items-center gap-2">
          <Landmark className="w-4 h-4 flex-shrink-0" />
          Auto-swapped volatile tokens to maintain the 70% stablecoin target
        </div>
      )}
    </div>
  );
}

function CompleteDetail({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="animate-scale-in text-center">
      <div className="w-20 h-20 rounded-full btn-gradient flex items-center justify-center mx-auto mb-4">
        <Zap className="w-10 h-10 text-white" />
      </div>
      <p className="text-lg font-bold mb-2">One payment just triggered</p>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="glass rounded-xl p-3">
          <p className="text-2xl font-bold gradient-text">{String(payload.totalSuppliers)}</p>
          <p className="text-xs text-text-secondary">suppliers paid</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-2xl font-bold gradient-text">{String(payload.totalPredictions)}</p>
          <p className="text-xs text-text-secondary">predictions locked</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-2xl font-bold gradient-text">8</p>
          <p className="text-xs text-text-secondary">autonomous steps</p>
        </div>
      </div>
    </div>
  );
}

function StepDetailPanel({ step }: { step: DemoStep }) {
  if (!step.payload) return null;
  const p = step.payload;
  const label = step.label.toLowerCase();
  if (label.includes("payment") || label.includes("deposit") || label.includes("receiv")) return <PaymentDetail payload={p} />;
  if (label.includes("provider") || label.includes("supplier") || label.includes("consult")) return <SuppliersDetail payload={p} />;
  if (label.includes("report") || label.includes("generat")) return <ReportDetail payload={p} />;
  if (label.includes("predict") || label.includes("lock")) return <PredictionsDetail payload={p} />;
  if (label.includes("escrow") || label.includes("secur")) return <EscrowDetail payload={p} />;
  if (label.includes("split") || label.includes("revenue")) return <RevenueDetail payload={p} />;
  if (label.includes("treasur") || label.includes("rebalanc")) return <TreasuryDetail payload={p} />;
  if (label.includes("complete") || label.includes("cycle")) return <CompleteDetail payload={p} />;
  return null;
}

export function Demo() {
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [totalTime, setTotalTime] = useState(0);
  const [reportId, setReportId] = useState("");
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const startRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  const run = useCallback(() => {
    setSteps([]);
    setRunning(true);
    setDone(false);
    setError("");
    setReportId("");
    setActiveStep(null);
    startRef.current = Date.now();

    const ctrl = new AbortController();
    esRef.current = ctrl as unknown as EventSource;

    (async () => {
      try {
        const res = await fetch("/api/demo/run", { method: "POST", signal: ctrl.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `Demo failed (${res.status})`);
          setRunning(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buf += decoder.decode(value, { stream: true });

          const parts = buf.split("\n\n");
          buf = parts.pop()!;

          for (const part of parts) {
            let eventType = "";
            let eventData = "";
            for (const line of part.split("\n")) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              else if (line.startsWith("data: ")) eventData = line.slice(6);
            }
            if (!eventData) continue;

            if (eventType === "step") {
              const step: DemoStep = JSON.parse(eventData);
              setSteps((prev) => {
                const existing = prev.findIndex((s) => s.step === step.step);
                if (existing >= 0) {
                  const copy = [...prev];
                  copy[existing] = step;
                  return copy;
                }
                return [...prev, step];
              });
              if (step.status === "complete" && step.payload) {
                setActiveStep(step.step);
              }
            } else if (eventType === "complete") {
              const data = JSON.parse(eventData);
              setTotalTime(data.totalTime || (Date.now() - startRef.current) / 1000);
              setReportId(data.reportId || "");
              setDone(true);
              setRunning(false);
            } else if (eventType === "error") {
              const data = JSON.parse(eventData);
              setError(data.error || "Demo failed");
              setRunning(false);
            }
          }
        }

        setRunning(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Connection lost");
          setRunning(false);
        }
      }
    })();
  }, []);

  const reset = () => {
    if (esRef.current) {
      const ref = esRef.current as unknown as AbortController;
      if (typeof ref.abort === "function") ref.abort();
    }
    setSteps([]);
    setRunning(false);
    setDone(false);
    setError("");
    setReportId("");
    setTotalTime(0);
    setActiveStep(null);
  };

  const activeStepData = activeStep !== null ? steps.find(s => s.step === activeStep) : null;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center animate-fade-in-up">
        <div className="inline-flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-accent-violet" />
          <span className="text-xs uppercase tracking-widest text-accent-violet font-semibold">Live Demo</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Watch <span className="gradient-text">MarketMind</span> Work
        </h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          One customer payment triggers an 8-step autonomous business cycle. Click each completed step to see exactly what happened.
        </p>
      </div>

      {/* Launch button (idle state) */}
      {!running && !done && !error && (
        <div className="space-y-6 animate-scale-in">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={run}
              className="group relative w-32 h-32 rounded-full btn-gradient flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform animate-pulse-glow"
            >
              <Play className="w-12 h-12 text-white ml-1" />
            </button>
            <p className="text-text-secondary text-sm font-medium">Start Demo</p>
          </div>

          <div className="glass rounded-2xl p-6 max-w-2xl mx-auto">
            <p className="text-sm text-text-secondary mb-4 text-center">Here's what will happen when you press play:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              {[
                { icon: Wallet, label: "Payment received", desc: "Customer pays in any token" },
                { icon: GitBranch, label: "Data sourced", desc: "Buys from supplier agents" },
                { icon: FileText, label: "Report written", desc: "AI generates analysis" },
                { icon: Target, label: "Predictions locked", desc: "Hashed for accountability" },
                { icon: Shield, label: "Escrow set", desc: "Money-back guarantee" },
                { icon: PieChart, label: "Revenue split", desc: "Owner, contributors, treasury" },
                { icon: Landmark, label: "Treasury managed", desc: "Auto-rebalance portfolio" },
                { icon: CheckCircle2, label: "Cycle complete", desc: "All in under 60 seconds" },
              ].map((item, i) => (
                <div key={item.label} className="flex flex-col items-center text-center gap-2 py-2 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="w-9 h-9 rounded-lg bg-accent-violet/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-accent-violet" />
                  </div>
                  <p className="font-semibold text-text-primary">{item.label}</p>
                  <p className="text-text-secondary leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two-panel layout: Timeline + Detail */}
      {(steps.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Timeline */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-5 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-accent-violet" />
                <h3 className="text-sm font-semibold">Progress</h3>
                {running && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                    Running
                  </span>
                )}
              </div>
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const StepIcon = getStepIcon(step.label);
                  const isLast = i === steps.length - 1 && !running;
                  const isSelected = activeStep === step.step;

                  return (
                    <div key={step.step}>
                      <button
                        onClick={() => step.status === "complete" && step.payload && setActiveStep(step.step)}
                        disabled={step.status !== "complete" || !step.payload}
                        className={`flex gap-3 w-full text-left p-2 rounded-xl transition-all ${
                          isSelected ? "bg-accent-violet/10" :
                          step.status === "complete" && step.payload ? "hover:bg-white/[0.03] cursor-pointer" :
                          ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          step.status === "complete"
                            ? "bg-accent-green/15"
                            : step.status === "error"
                            ? "bg-accent-rose/15"
                            : step.status === "running"
                            ? "bg-accent-violet/15 animate-pulse-glow"
                            : "glass"
                        }`}>
                          {step.status === "complete" ? (
                            <CheckCircle2 className="w-4 h-4 text-accent-green" />
                          ) : step.status === "error" ? (
                            <XCircle className="w-4 h-4 text-accent-rose" />
                          ) : step.status === "running" ? (
                            <Loader2 className="w-4 h-4 text-accent-violet animate-spin" />
                          ) : (
                            <StepIcon className="w-4 h-4 text-text-secondary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className={`text-sm font-medium ${
                            step.status === "complete" ? "text-accent-green" :
                            step.status === "running" ? "text-text-primary" :
                            step.status === "error" ? "text-accent-rose" :
                            "text-text-secondary"
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-text-secondary truncate">{step.detail}</p>
                        </div>
                      </button>
                      {!isLast && (
                        <div className={`w-0.5 h-3 ml-[18px] rounded-full transition-all duration-500 ${
                          step.status === "complete" ? "bg-gradient-to-b from-accent-green/50 to-accent-violet/30" : "bg-border"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="lg:col-span-3">
            {activeStepData && activeStepData.payload ? (
              <div className="glass rounded-2xl p-6 animate-fade-in" key={activeStep}>
                <div className="flex items-center gap-2 mb-1">
                  {(() => { const I = getStepIcon(activeStepData.label); return <I className="w-4 h-4 text-accent-violet" />; })()}
                  <h3 className="text-sm font-semibold">{activeStepData.label}</h3>
                </div>
                {activeStepData.payload.explanation != null && (
                  <div className="flex items-start gap-2 mb-5 mt-2 text-xs text-text-secondary bg-accent-violet/5 rounded-lg p-3">
                    <Info className="w-4 h-4 text-accent-violet flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{String(activeStepData.payload.explanation)}</p>
                  </div>
                )}
                <StepDetailPanel step={activeStepData} />
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <Brain className="w-12 h-12 text-text-secondary/15 mb-3 animate-bounce-subtle" />
                <p className="text-text-secondary font-medium">
                  {running ? "Processing..." : "Click a completed step to see what happened"}
                </p>
                <p className="text-xs text-text-secondary/50 mt-1">
                  Each step shows the actual data and results
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success banner */}
      {done && !error && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="glass rounded-2xl p-8 text-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/5 via-transparent to-accent-cyan/5" />
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-accent-green/15 flex items-center justify-center mx-auto mb-4 animate-bounce-subtle">
                <Zap className="w-8 h-8 text-accent-green" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Autonomous Cycle Complete</h2>
              <p className="text-text-secondary text-sm mb-4">
                8 autonomous business steps executed in
              </p>
              <div className="text-4xl font-bold gradient-text mb-2">
                <AnimatedCounter value={totalTime} suffix="s" decimals={1} />
              </div>
              <p className="text-sm text-text-secondary">
                No humans involved. Click any step above to review what happened.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/intelligence" className="glass rounded-2xl p-4 text-center hover:scale-[1.02] transition-all group">
              <Brain className="w-6 h-6 text-accent-violet mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold">Agent Decisions</p>
            </Link>
            {reportId && (
              <Link to="/buy" className="glass rounded-2xl p-4 text-center hover:scale-[1.02] transition-all group">
                <FileText className="w-6 h-6 text-accent-blue mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">View Report</p>
              </Link>
            )}
            <Link to="/ledger" className="glass rounded-2xl p-4 text-center hover:scale-[1.02] transition-all group">
              <ScrollText className="w-6 h-6 text-accent-cyan mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold">Full Ledger</p>
            </Link>
            <button onClick={reset} className="glass rounded-2xl p-4 text-center hover:scale-[1.02] transition-all group">
              <RotateCcw className="w-6 h-6 text-accent-amber mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold">Run Again</p>
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="space-y-4 max-w-2xl mx-auto animate-fade-in-up">
          <div className="glass rounded-2xl p-8 text-center">
            <XCircle className="w-12 h-12 text-accent-rose mx-auto mb-3" />
            <h3 className="text-lg font-bold text-accent-rose mb-2">Something went wrong</h3>
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
          <button onClick={reset} className="btn-gradient w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
