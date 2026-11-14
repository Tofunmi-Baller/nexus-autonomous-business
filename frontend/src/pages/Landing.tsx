import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  PieChart,
  Brain,
  Wallet,
  FileText,
  Target,
  RefreshCw,
  ChevronDown,
  Layers,
  Users,
  BarChart3,
  Lock,
  Globe,
  Check,
  Menu,
  X,
  Sun,
  Moon,
  User,
  Bot,
} from "lucide-react";
import { useTheme } from "../components/ThemeProvider";
import {
  fetchConfig,
  fetchLedger,
  fetchLedgerSummary,
  formatUsd,
  type LedgerEntry,
  type LedgerSummary,
} from "../api";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimatedNumber({ value, suffix = "", duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, value, duration]);
  return <span ref={ref}>{display}{suffix}</span>;
}

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Wallet,
    title: "Customer Pays",
    desc: "A customer picks a topic and pays in any crypto token they want. NEAR Intents handles the conversion automatically — no manual swaps needed.",
    color: "#8B5CF6",
  },
  {
    step: "02",
    icon: Brain,
    title: "AI Generates the Report",
    desc: "Nexus buys data from other AI agents, then uses Claude to write a real market analysis. Every cost is tracked against a daily spending cap.",
    color: "#3B82F6",
  },
  {
    step: "03",
    icon: PieChart,
    title: "Revenue Splits Instantly",
    desc: "The moment the report is delivered, revenue is automatically divided — owner, contributors, and treasury. No invoices, no delays.",
    color: "#06B6D4",
  },
  {
    step: "04",
    icon: ShieldCheck,
    title: "Money-Back Guarantee",
    desc: "Payments are held in escrow for 7 days. If the AI's predictions miss badly, the customer gets an automatic refund — no support tickets.",
    color: "#10B981",
  },
];

const FEATURES = [
  { icon: FileText, title: "AI Market Reports", desc: "Real crypto analysis with key metrics, market drivers, risk factors, and price predictions — not generic filler." },
  { icon: Target, title: "Verifiable Predictions", desc: "Every prediction is SHA-256 hashed the moment it's made. The agent scores itself — no one can change the record." },
  { icon: Layers, title: "Multi-Agent Supply Chain", desc: "Nexus buys data from specialized supplier agents — chart analysis, sentiment data, whale tracking — and pays them automatically." },
  { icon: RefreshCw, title: "Self-Managing Treasury", desc: "The agent manages its own balance sheet, keeping 70% in stablecoins and auto-rebalancing when the ratio drifts." },
  { icon: BarChart3, title: "Dynamic Pricing", desc: "Prices adjust automatically based on demand and profit margins. High demand? Price goes up. The agent optimizes itself." },
  { icon: Users, title: "Built-in Affiliate Program", desc: "Anyone can generate a referral link and earn 5% commission on every sale they bring in. Fully automated payouts." },
  { icon: Lock, title: "Owner Kill Switch", desc: "One toggle in config.yaml halts all agent operations immediately. Full control, zero code changes needed." },
  { icon: Globe, title: "NEAR Intents Powered", desc: "Accept payment in any token. Cross-chain swaps, agent-to-agent transfers, and scoped function-call keys — all built in." },
];

const PREVIEW_TYPES = new Set(["sale", "payout", "inference_cost", "commission", "procurement", "refund"]);

const STATS = [
  { value: 8, suffix: "", label: "Autonomous Steps Per Sale" },
  { value: 100, suffix: "%", label: "Transparent Ledger" },
  { value: 3, suffix: "s", label: "Average Cycle Time" },
  { value: 0, suffix: "", label: "Humans In The Loop", special: true },
];

export function Landing() {
  const heroSection = useInView(0.1);
  const howSection = useInView(0.1);
  const featuresSection = useInView(0.1);
  const statsSection = useInView(0.1);
  const ctaSection = useInView(0.1);
  const moneySection = useInView(0.25);
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [split, setSplit] = useState({ owner: 70, contributors: 20, treasury: 10, price: 10 });

  useEffect(() => {
    fetchLedgerSummary().then(setSummary).catch(() => {});
    fetchLedger({ limit: 20 })
      .then((r) => setRecent(r.entries.filter((e) => PREVIEW_TYPES.has(e.type)).slice(0, 3))).catch(() => {});
    fetchConfig()
      .then((c) =>
        setSplit({
          owner: c.revenue.owner_pct,
          contributors: c.revenue.contributors_pct,
          treasury: c.revenue.treasury_pct,
          price: parseFloat(c.pricing.default_price_usd),
        }),
      )
      .catch(() => {});
  }, []);

  const isLive = !!summary && summary.saleCount > 0;
  const previewStats = isLive
    ? [
        { label: "Sales", value: String(summary.saleCount), color: "text-accent-green" },
        { label: "Revenue", value: formatUsd(summary.totalSales), color: "gradient-text" },
        { label: "AI Spend", value: formatUsd(summary.totalCosts), color: "text-accent-amber" },
        { label: "Net", value: formatUsd(summary.netRevenue), color: "text-accent-cyan" },
      ]
    : [
        { label: "Sales", value: "24", color: "text-accent-green" },
        { label: "Revenue", value: "$240", color: "gradient-text" },
        { label: "AI Spend", value: "$4.32", color: "text-accent-amber" },
        { label: "Net", value: "$195", color: "text-accent-cyan" },
      ];
  const incoming = new Set(["sale"]);
  const previewTxs =
    isLive && recent.length > 0
      ? recent.map((e) => ({
          key: e.id,
          type: e.type,
          desc: e.description,
          amount: `${incoming.has(e.type) ? "+" : "-"}${formatUsd(e.amount)}`,
        }))
      : [
          { key: "s", type: "sale", desc: "Report sold: BTC Weekly Outlook", amount: "+$10.00" },
          { key: "p", type: "payout", desc: "Owner payout (70%)", amount: "-$7.00" },
          { key: "c", type: "inference_cost", desc: "AI inference cost", amount: "-$0.02" },
        ];
  const txColor = (type: string) =>
    incoming.has(type)
      ? { dot: "bg-accent-green", text: "text-accent-green" }
      : type === "payout"
      ? { dot: "bg-accent-violet", text: "text-accent-violet" }
      : { dot: "bg-accent-amber", text: "text-accent-amber" };

  const splits = [
    { label: "Owner", desc: "The person who set up Nexus", pct: split.owner, color: "#8B5CF6", icon: User },
    { label: "Contributors", desc: "The team that built it", pct: split.contributors, color: "#3B82F6", icon: Users },
    { label: "Treasury", desc: "Nexus keeps this to pay its own bills", pct: split.treasury, color: "#06B6D4", icon: Bot },
  ];

  const navLinks = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "#follow-the-money", label: "Follow the Money" },
    { href: "#features", label: "Features" },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight gradient-text">Nexus</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-text-primary transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/login" className="hidden sm:block text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2">
              Log In
            </Link>
            <Link to="/login" className="hidden sm:block btn-gradient px-5 py-2 rounded-xl text-sm">
              Get Started
            </Link>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-bg-secondary animate-fade-in">
            <div className="px-6 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <Link to="/login" className="glass text-center py-3 rounded-xl text-sm">Log In</Link>
                <Link to="/login" className="btn-gradient text-center py-3 rounded-xl text-sm">Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section
        ref={heroSection.ref}
        className="relative min-h-screen flex items-center justify-center pt-32 pb-16"
      >
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-[800px] h-[800px] rounded-full animate-float"
            style={{ top: "-20%", left: "-10%", background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)", filter: "blur(100px)" }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full animate-float"
            style={{ bottom: "-15%", right: "-5%", background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)", filter: "blur(100px)", animationDelay: "-4s" }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full animate-float"
            style={{ top: "30%", right: "20%", background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)", filter: "blur(80px)", animationDelay: "-2s" }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className={`relative w-full min-w-0 max-w-5xl mx-auto px-5 sm:px-6 text-center ${heroSection.visible ? "animate-fade-in-up" : "opacity-0"}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs sm:text-sm text-text-secondary mb-8 animate-scale-in">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse flex-shrink-0" />
            NEAR Hackathon 2026 — Track 04: Autonomous Business
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            An AI That Runs Its
            <br />
            <span className="gradient-text">Own Business</span>
          </h1>

          <p className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Nexus is an autonomous AI agent that sells crypto market reports,
            buys its own intelligence, splits revenue, and manages its own treasury.
            No humans in the loop.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/login"
              className="btn-gradient px-8 py-4 rounded-2xl text-base flex items-center gap-3 shadow-xl"
            >
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="glass px-8 py-4 rounded-2xl text-base flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors"
            >
              See How It Works
              <ChevronDown className="w-5 h-5" />
            </a>
          </div>

          {/* Floating demo preview */}
          <div className="relative max-w-3xl mx-auto">
            <div className="glass rounded-3xl p-1 shadow-2xl">
              <div className="bg-bg-secondary rounded-[20px] p-4 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-accent-rose/60" />
                  <div className="w-3 h-3 rounded-full bg-accent-amber/60" />
                  <div className="w-3 h-3 rounded-full bg-accent-green/60" />
                  <span className="text-xs text-text-secondary ml-3 font-mono">nexus-agent.testnet</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-secondary">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-accent-green animate-pulse" : "bg-slate-400"}`} />
                    {isLive ? "Live" : "Sample"}
                  </span>
                </div>

                {/* Mini demo visualization */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {previewStats.map((s) => (
                    <div key={s.label} className="glass rounded-xl p-3 text-center">
                      <p className="text-xs text-text-secondary mb-1">{s.label}</p>
                      <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Animated transaction feed */}
                <div className="space-y-2">
                  {previewTxs.map((tx, i) => (
                    <div
                      key={tx.key}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-bg-card animate-slide-in-right"
                      style={{ animationDelay: `${800 + i * 200}ms` }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${txColor(tx.type).dot}`} />
                        <span className="text-xs text-text-secondary truncate">{tx.desc}</span>
                      </div>
                      <span className={`text-xs font-mono font-bold flex-shrink-0 ${txColor(tx.type).text}`}>{tx.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow behind the preview */}
            <div
              className="absolute -inset-4 -z-10 rounded-3xl"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.15))", filter: "blur(40px)" }}
            />
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-32 relative" ref={howSection.ref}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-20 ${howSection.visible ? "animate-fade-in-up" : "opacity-0"}`}>
            <span className="text-xs uppercase tracking-widest text-accent-violet font-semibold">How It Works</span>
            <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-6">
              One Payment. <span className="gradient-text">Eight Autonomous Steps.</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              When a customer buys a report, Nexus handles everything — from purchasing data to splitting revenue. Here's what happens behind the scenes.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className={`relative glass rounded-3xl p-7 group hover:scale-[1.02] transition-all duration-300 ${
                  howSection.visible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Step number */}
                <span
                  className="text-[80px] font-black leading-none absolute top-4 right-6 pointer-events-none select-none"
                  style={{ color: item.color, opacity: 0.07 }}
                >
                  {item.step}
                </span>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ background: `${item.color}15` }}
                >
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>

                <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Follow the Money ─── */}
      <section id="follow-the-money" className="py-32 relative" ref={moneySection.ref}>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-green/30 to-transparent" />
        <div className="max-w-5xl mx-auto px-6">
          <div className={`text-center mb-16 ${moneySection.visible ? "animate-fade-in-up" : "opacity-0"}`}>
            <span className="text-xs uppercase tracking-widest text-accent-green font-semibold">Follow the Money</span>
            <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-6">
              Where Does Your <span className="gradient-text">{formatUsd(split.price)}</span> Go?
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Think of Nexus like a shop with no shopkeeper. You pay, it does the work, and it shares the money
              out on its own, straight away, in public.
            </p>
          </div>

          {/* Flow: customer → Nexus */}
          <div className={`flex flex-col sm:flex-row items-stretch gap-4 sm:gap-0 mb-10 ${moneySection.visible ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
            <div className="glass rounded-2xl p-5 flex items-center gap-4 sm:w-56">
              <div className="w-11 h-11 rounded-xl bg-accent-green/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">You pay</p>
                <p className="text-xl font-bold font-mono">{formatUsd(split.price)}</p>
              </div>
            </div>

            <div className="relative flex-1 h-8 sm:h-auto mx-6 hidden sm:block" aria-hidden>
              <div className="absolute top-1/2 inset-x-0 h-px bg-gradient-to-r from-accent-green/40 via-accent-violet/40 to-accent-cyan/40" />
              {[0, 0.8, 1.6].map((d) => (
                <span
                  key={d}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-accent-violet to-accent-cyan shadow-[0_0_12px_rgba(139,92,246,0.8)] animate-flow-x"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>

            <div className="glass rounded-2xl p-5 flex items-center gap-4 sm:w-64">
              <div className="w-11 h-11 rounded-xl btn-gradient flex items-center justify-center animate-pulse-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Nexus writes your report</p>
                <p className="text-sm font-semibold">then splits the money</p>
              </div>
            </div>
          </div>

          {/* Split bars */}
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
            {splits.map((s, i) => (
              <div
                key={s.label}
                className={moneySection.visible ? "animate-fade-in-up" : "opacity-0"}
                style={{ animationDelay: `${400 + i * 150}ms` }}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}1A` }}>
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{s.label}</p>
                      <p className="text-xs text-text-secondary truncate">{s.desc}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold">{formatUsd((split.price * s.pct) / 100)}</p>
                    <p className="text-xs text-text-secondary">{s.pct}%</p>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-[1400ms] ease-out"
                    style={{
                      width: moneySection.visible ? `${s.pct}%` : "0%",
                      transitionDelay: `${600 + i * 200}ms`,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}AA)`,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-text-secondary pt-2 border-t border-border">
              Every one of these payments is written to a public ledger you can check yourself. If the report's
              predictions turn out badly wrong, you get your money back automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-32 relative" ref={featuresSection.ref}>
        {/* Subtle divider gradient */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-violet/30 to-transparent" />

        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center mb-20 ${featuresSection.visible ? "animate-fade-in-up" : "opacity-0"}`}>
            <span className="text-xs uppercase tracking-widest text-accent-cyan font-semibold">Features</span>
            <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-6">
              Everything a Business Needs. <span className="gradient-text">Fully Automated.</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Nexus isn't a chatbot — it's an entire business that runs on code and config files. Change the rules, the agent adapts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300 ${
                  featuresSection.visible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center mb-4 group-hover:bg-accent-violet/20 transition-colors">
                  <f.icon className="w-5 h-5 text-accent-violet" />
                </div>
                <h3 className="font-bold text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section id="stats" className="py-32 relative" ref={statsSection.ref}>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent" />

        <div className="max-w-4xl mx-auto px-6">
          <div className={`text-center mb-16 ${statsSection.visible ? "animate-fade-in-up" : "opacity-0"}`}>
            <span className="text-xs uppercase tracking-widest text-accent-green font-semibold">By The Numbers</span>
            <h2 className="text-4xl sm:text-5xl font-bold mt-4">
              Built to <span className="gradient-text">Run Itself</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`glass rounded-3xl p-8 text-center ${
                  statsSection.visible ? "animate-fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="text-5xl font-black gradient-text mb-3">
                  {s.special ? "0" : <AnimatedNumber value={s.value} suffix={s.suffix} />}
                </div>
                <p className="text-sm text-text-secondary">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack Ribbon ─── */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-violet/20 to-transparent" />
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-text-secondary mb-8 font-medium">Powered By</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-text-secondary">
            {["NEAR Protocol", "NEAR Intents", "Anthropic Claude", "TypeScript", "React", "SQLite"].map((tech) => (
              <span key={tech} className="text-sm font-medium glass px-4 py-2 rounded-full">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── config.yaml showcase ─── */}
      <section className="py-32 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs uppercase tracking-widest text-accent-amber font-semibold">Full Control</span>
              <h2 className="text-4xl font-bold mt-4 mb-6">
                One Config File. <span className="gradient-text">Infinite Control.</span>
              </h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Every business rule lives in a single YAML file. Change revenue splits, pricing bounds, spending caps, or flip the kill switch — the agent picks up changes instantly. No redeploys, no downtime.
              </p>
              <ul className="space-y-3">
                {[
                  "Change revenue splits without touching code",
                  "Set daily spending caps to control costs",
                  "Adjust pricing bounds as the market shifts",
                  "Kill switch halts everything in one toggle",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Code block */}
            <div className="glass rounded-3xl p-1">
              <div className="bg-bg-secondary rounded-[20px] p-6 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-accent-rose/60" />
                  <div className="w-3 h-3 rounded-full bg-accent-amber/60" />
                  <div className="w-3 h-3 rounded-full bg-accent-green/60" />
                  <span className="text-xs text-text-secondary ml-3">config.yaml</span>
                </div>
                <pre className="text-text-secondary leading-relaxed overflow-x-auto"><code>{`revenue:
  owner_pct: 70        # your cut
  contributors_pct: 20 # team share
  treasury_pct: 10     # agent keeps

pricing:
  min_price_usd: "5.00"
  default_price_usd: "10.00"
  max_price_usd: "30.00"

spending:
  max_daily_inference_usd: "50.00"
  max_per_report_usd: "2.00"

kill_switch: false  # flip to halt`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-32 relative" ref={ctaSection.ref}>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-[600px] h-[600px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)", filter: "blur(80px)" }}
          />
        </div>

        <div className={`relative max-w-3xl mx-auto px-6 text-center ${ctaSection.visible ? "animate-fade-in-up" : "opacity-0"}`}>
          <div className="w-20 h-20 rounded-3xl btn-gradient flex items-center justify-center mx-auto mb-8 animate-bounce-subtle">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to See It <span className="gradient-text">In Action?</span>
          </h2>
          <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
            Watch Nexus complete an entire business cycle — from payment to revenue split — in under 60 seconds. No setup required.
          </p>
          <Link
            to="/login"
            className="btn-gradient inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg shadow-xl"
          >
            Launch the Demo
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent-violet" />
            <span className="font-semibold text-text-primary">Nexus</span>
            <span>— NEAR Hackathon 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-medium text-text-primary">NEAR Protocol</span>
            <span>&</span>
            <span className="font-medium text-text-primary">Anthropic Claude</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
