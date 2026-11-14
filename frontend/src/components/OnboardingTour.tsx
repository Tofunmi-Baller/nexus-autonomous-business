import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  FileText,
  CreditCard,
  PieChart,
  LayoutDashboard,
  ScrollText,
  Play,
  ChevronRight,
  X,
} from "lucide-react";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Zap,
    title: "Meet Nexus",
    description:
      "An AI agent that runs its own research business. It generates crypto market reports, handles payments, and splits revenue — all autonomously.",
    sub: "No blockchain experience needed. Let's show you around.",
    visual: null as null | "how-it-works",
  },
  {
    icon: null,
    title: "Simple as 1-2-3",
    description: "",
    sub: "",
    visual: "how-it-works" as const,
  },
  {
    icon: LayoutDashboard,
    title: "Your Command Center",
    description:
      "See real-time stats: sales, spending, balances, and agent health. Everything updates live — no refresh needed.",
    sub: "The dashboard gives you a bird's-eye view of the entire operation.",
    visual: null,
  },
  {
    icon: ScrollText,
    title: "Full Transparency",
    description:
      "Every transaction is publicly logged — sales, AI inference costs, and revenue payouts. Nothing hidden, ever.",
    sub: "Think of it as an open book for the agent's finances.",
    visual: null,
  },
  {
    icon: Play,
    title: "See It Live",
    description:
      "Hit the demo button to watch a complete business cycle in under 2 minutes. Payment → Report → Revenue Split — all visible in real-time.",
    sub: "Ready to see the magic?",
    visual: null,
  },
];

const HOW_IT_WORKS_CARDS = [
  { num: "1", label: "Request", desc: "Choose a topic and the AI generates a real market report", icon: FileText, color: "#8B5CF6" },
  { num: "2", label: "Pay", desc: "Payment accepted in any token, automatically converted via NEAR", icon: CreditCard, color: "#3B82F6" },
  { num: "3", label: "Earn", desc: "Revenue splits instantly — owner, contributors, and treasury", icon: PieChart, color: "#06B6D4" },
];

export function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const navigate = useNavigate();

  const next = useCallback(() => {
    if (step === STEPS.length - 1) {
      onComplete();
      navigate("/app/demo");
      return;
    }
    setDirection("next");
    setStep((s) => s + 1);
  }, [step, onComplete, navigate]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Gradient mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full animate-float"
          style={{ top: "-10%", left: "-5%", background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full animate-float"
          style={{ bottom: "-10%", right: "-5%", background: "radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%)", filter: "blur(80px)", animationDelay: "-3s" }}
        />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-xl mx-4">
        {/* Skip button */}
        <button
          onClick={onComplete}
          className="absolute -top-12 right-0 flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          Skip tour
          <X className="w-4 h-4" />
        </button>

        {/* Card */}
        <div
          key={step}
          className={`glass rounded-3xl p-8 sm:p-10 text-center ${
            direction === "next" ? "animate-slide-in-right" : "animate-scale-in"
          }`}
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {/* Icon or visual */}
          {current.visual === "how-it-works" ? (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Simple as 1-2-3</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {HOW_IT_WORKS_CARDS.map((card, i) => (
                  <div
                    key={card.num}
                    className="rounded-2xl p-5 text-center animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 150}ms`,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `${card.color}20` }}
                    >
                      <card.icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div className="text-xs font-bold text-white/40 mb-1">{card.num}</div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{card.label}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {current.icon && (
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl animate-bounce-subtle"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))" }}
                >
                  <current.icon className="w-8 h-8 text-white" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
              <p className="text-white/70 leading-relaxed mb-2">{current.description}</p>
              {current.sub && (
                <p className="text-sm text-white/50">{current.sub}</p>
              )}
            </>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={next}
              className="btn-gradient px-6 py-3 rounded-xl text-sm flex items-center gap-2"
            >
              {isLast ? "Get Started" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > step ? "next" : "prev"); setStep(i); }}
                className="transition-all duration-300"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step
                    ? "linear-gradient(90deg, #8B5CF6, #06B6D4)"
                    : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
