import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TrendingUp,
  Layers,
  Globe,
  BarChart3,
  Activity,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowLeft,
  RotateCcw,
  Target,
  GitBranch,
  Shield,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  buyReport,
  fetchConfig,
  fetchReports,
  fetchProducts,
  fetchPricing,
  fetchSuppliers,
  fetchPredictions,
  fetchProcurementOrders,
  fetchEscrow,
  formatUsd,
  tokenLabel,
  toNum,
  type Report,
  type AgentConfig,
  type Product,
  type PricingState,
  type Supplier,
  type Prediction,
  type ProcurementOrder,
  type EscrowEntry,
} from "../api";
import { ConfidenceBar } from "../components/DecisionCard";

const AFFILIATE_STORAGE_KEY = "marketmind-referred-by";
const PRICE_RECENT_MS = 60 * 60 * 1000;

interface TopicCard {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  sales?: number;
}

/** Picks an icon for a product from its name and topic. */
function topicIcon(text: string): LucideIcon {
  const t = text.toLowerCase();
  if (/btc|bitcoin/.test(t)) return TrendingUp;
  if (/eth|defi/.test(t)) return Layers;
  if (/near|ecosystem/.test(t)) return Globe;
  if (/alt|coin|token/.test(t)) return BarChart3;
  if (/sentiment|fear|social/.test(t)) return Activity;
  return Sparkles;
}

const OUTCOME_STYLE: Record<string, string> = {
  correct: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
  incorrect: "bg-rose-500/10 border-rose-500/20 text-rose-500",
  pending: "bg-slate-500/10 border-slate-500/20 text-slate-400",
};

// Shown only when the product catalogue can't be loaded.
const FALLBACK_TOPICS: TopicCard[] = [
  { id: "btc", label: "BTC Weekly Outlook", desc: "Bitcoin price action and market structure", icon: TrendingUp },
  { id: "eth", label: "ETH DeFi Landscape", desc: "Ethereum ecosystem and DeFi protocols", icon: Layers },
  { id: "near", label: "NEAR Ecosystem Update", desc: "NEAR protocol developments and metrics", icon: Globe },
  { id: "alts", label: "Top Altcoins Analysis", desc: "High-momentum altcoin picks", icon: BarChart3 },
  { id: "sentiment", label: "Crypto Market Sentiment", desc: "Fear & greed, social signals, whale movements", icon: Activity },
];

function StepIndicator({ current }: { current: number }) {
  const steps = ["Choose Topic", "Confirm", "Report Ready"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8 animate-fade-in-up">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              i <= current
                ? "btn-gradient text-white"
                : "glass text-text-secondary"
            }`}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:inline transition-colors ${
              i <= current ? "text-text-primary" : "text-text-secondary"
            }`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-all duration-500 ${
              i < current ? "bg-gradient-to-r from-accent-violet to-accent-blue" : "bg-border"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function BuyReport() {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [pricing, setPricing] = useState<PricingState | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [affiliateCode, setAffiliateCode] = useState(
    () => searchParams.get("ref") || localStorage.getItem(AFFILIATE_STORAGE_KEY) || "",
  );
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [escrow, setEscrow] = useState<EscrowEntry | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [step, setStep] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [buyer, setBuyer] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Report | null>(null);

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        setConfig(c);
        if (c.pricing.accepted_tokens.length > 0) setSelectedToken(c.pricing.accepted_tokens[0]);
      })
      .catch(() => {});
    fetchReports().then(setReports).catch(() => {});
    fetchProducts().then(setProducts).catch(() => setProducts([]));
    fetchSuppliers().then(setSuppliers).catch(() => {});

    const loadPricing = () => fetchPricing().then(setPricing).catch(() => {});
    loadPricing();
    const id = setInterval(loadPricing, 5000);
    return () => clearInterval(id);
  }, []);

  // Remember who referred this visitor so the code survives a page reload.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem(AFFILIATE_STORAGE_KEY, ref);
  }, [searchParams]);

  // Once a report is on screen, load what the agent did to produce it.
  const resultId = result?.id;
  useEffect(() => {
    setPredictions([]);
    setOrders([]);
    setEscrow(null);
    if (!resultId) return;
    let cancelled = false;
    const load = () => {
      fetchPredictions(resultId).then((p) => !cancelled && setPredictions(p)).catch(() => {});
      fetchProcurementOrders(resultId).then((o) => !cancelled && setOrders(o)).catch(() => {});
      fetchEscrow()
        .then((list) => !cancelled && setEscrow(list.find((e) => e.reportId === resultId) ?? null))
        .catch(() => {});
    };
    load();
    // The agent may still be writing these records just after the sale; check once more.
    const retry = setTimeout(load, 3000);
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [resultId]);

  const finalTopic = useCustom ? customTopic.trim() : selectedTopic;

  const activeProducts = (products ?? []).filter((p) => p.status === "active");
  const topics: TopicCard[] =
    activeProducts.length > 0
      ? activeProducts.map((p) => ({
          id: p.id,
          label: p.topic || p.name,
          desc: p.description,
          icon: topicIcon(`${p.name} ${p.topic}`),
          sales: p.totalSales,
        }))
      : products === null
      ? []
      : FALLBACK_TOPICS;

  const price = pricing?.currentPrice ?? config?.pricing.default_price_usd;
  const lastAdjustmentAt = pricing?.lastAdjustment ? new Date(pricing.lastAdjustment).getTime() : NaN;
  const priceUpdated =
    !!pricing &&
    (pricing.adjustmentHistory?.length ?? 0) > 0 &&
    Number.isFinite(lastAdjustmentAt) &&
    Date.now() - lastAdjustmentAt < PRICE_RECENT_MS;
  const priceDelta = pricing ? toNum(pricing.currentPrice) - toNum(pricing.basePrice) : 0;
  const ordersTotal = orders.reduce((sum, o) => sum + toNum(o.cost), 0);

  const handleBuy = async () => {
    setError("");
    if (!buyer.trim()) { setError("Please enter your NEAR account."); return; }
    setPurchasing(true);
    try {
      const report = await buyReport(finalTopic, buyer.trim(), selectedToken || undefined, affiliateCode.trim() || undefined);
      setResult(report);
      setStep(2);
      fetchReports().then(setReports).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const reset = () => {
    setStep(0);
    setSelectedTopic("");
    setCustomTopic("");
    setUseCustom(false);
    setBuyer("");
    setError("");
    setResult(null);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <div className="inline-flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-accent-violet" />
          <span className="text-xs uppercase tracking-widest text-accent-violet font-semibold">AI-Powered</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Get a Market Report</h1>
        <p className="text-text-secondary">AI-generated crypto analysis, delivered instantly</p>
      </div>

      {config?.kill_switch && (
        <div className="flex items-center gap-3 px-5 py-4 glass rounded-2xl border-accent-rose/25 animate-fade-in-up">
          <AlertTriangle className="w-5 h-5 text-accent-rose flex-shrink-0" />
          <div>
            <p className="font-semibold text-accent-rose">Agent is offline</p>
            <p className="text-sm text-text-secondary">The kill switch is active. Reports can't be purchased right now.</p>
          </div>
        </div>
      )}

      <StepIndicator current={step} />

      {/* Step 1: Choose Topic */}
      {step === 0 && (
        <div className="animate-fade-in-up space-y-6">
          {/* Live price */}
          <div className="glass rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">Price right now</p>
              <p className="text-xs text-text-secondary/70 mt-0.5">MarketMind sets this itself based on demand</p>
            </div>
            <div className="flex items-center gap-3">
              {priceUpdated && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-violet-500/10 border-violet-500/20 text-violet-500 animate-scale-in"
                  title={pricing?.adjustmentHistory?.[pricing.adjustmentHistory.length - 1]?.reason}
                >
                  <Zap className="w-3 h-3" />
                  Price updated
                </span>
              )}
              <div className="text-right">
                <span className="text-2xl font-bold font-mono gradient-text">{price ? formatUsd(price) : "—"}</span>
                {pricing && Math.abs(priceDelta) >= 0.005 && (
                  <p className="text-xs text-text-secondary font-mono">
                    usually {formatUsd(pricing.basePrice)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {products === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl h-[84px] animate-pulse" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map((t) => {
              const selected = !useCustom && selectedTopic === t.label;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTopic(t.label); setUseCustom(false); }}
                  className={`glass rounded-2xl p-5 text-left transition-all duration-200 group ${
                    selected
                      ? "ring-2 ring-accent-violet animate-pulse-glow"
                      : "hover:border-accent-violet/20 hover:scale-[1.01]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? "bg-accent-violet/20" : "bg-accent-violet/5 group-hover:bg-accent-violet/10"
                    }`}>
                      <t.icon className={`w-5 h-5 ${selected ? "text-accent-violet" : "text-text-secondary group-hover:text-accent-violet"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm mb-0.5 ${selected ? "gradient-text" : ""}`}>{t.label}</p>
                      <p className="text-xs text-text-secondary">{t.desc}</p>
                      {t.sales !== undefined && t.sales > 0 && (
                        <p className="text-[11px] text-text-secondary/70 mt-1 font-mono">
                          {t.sales} sold
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <button
              onClick={() => setUseCustom(!useCustom)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${useCustom ? "rotate-180" : ""}`} />
              Or write your own topic
            </button>
            {useCustom && (
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g., Layer 2 scaling solutions comparison"
                className="mt-3 w-full px-4 py-3 rounded-xl glass border-none text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet"
              />
            )}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!finalTopic || config?.kill_switch}
            className="btn-gradient w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 1 && (
        <div className="animate-fade-in-up space-y-6">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Topic</span>
              <span className="text-sm font-semibold">{finalTopic}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Price</span>
              <span className="flex items-center gap-2">
                {priceUpdated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-violet-500/10 border-violet-500/20 text-violet-500">
                    <Zap className="w-3 h-3" />
                    Price updated
                  </span>
                )}
                <span className="text-lg font-bold font-mono gradient-text">{price ? formatUsd(price) : "—"}</span>
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Payment</span>
              <span className="text-sm font-mono">{selectedToken ? tokenLabel(selectedToken) : "USDC"}</span>
            </div>
          </div>

          {/* Procurement preview */}
          {suppliers.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    MarketMind will consult {suppliers.length} data {suppliers.length === 1 ? "provider" : "providers"} for this report
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {suppliers.map((s) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 border-blue-500/20 text-blue-500"
                        title={s.type}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-text-secondary mb-2 block">Your NEAR Account</label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="your-name.testnet"
              className="w-full px-4 py-3 rounded-xl glass text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-violet"
            />
            <p className="text-xs text-text-secondary/60 mt-2">
              Don't worry — in demo mode, no real payment is needed
            </p>
          </div>

          <div>
            <label htmlFor="affiliate-code" className="text-sm text-text-secondary mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Referral code <span className="text-text-secondary/60">(optional)</span>
            </label>
            <input
              id="affiliate-code"
              type="text"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value)}
              placeholder="Got a code from a friend?"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl glass text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-violet"
            />
          </div>

          {config && config.pricing.accepted_tokens.length > 1 && (
            <div>
              <label className="text-sm text-text-secondary mb-2 block">Pay with</label>
              <div className="flex flex-wrap gap-2">
                {config.pricing.accepted_tokens.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedToken(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-mono transition-all ${
                      selectedToken === t
                        ? "btn-gradient text-white"
                        : "glass text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tokenLabel(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-sm text-accent-rose">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="glass px-4 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleBuy}
              disabled={purchasing || config?.kill_switch || !buyer.trim()}
              className="btn-gradient flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  MarketMind is cooking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Report Ready */}
      {step === 2 && result && (
        <div className="animate-fade-in-up space-y-6">
          <div className="text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full btn-gradient flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Report Ready!</h2>
            <p className="text-text-secondary text-sm">Your AI-generated market analysis is ready</p>
          </div>

          <div className="glass rounded-2xl p-6 animate-fade-in-up delay-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-accent-violet" />
              <h3 className="font-bold">{result.title}</h3>
            </div>
            <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-wrap text-sm">
              {result.content}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 animate-fade-in-up delay-300">
            <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-3">Cost Breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Price paid</span>
                <span className="font-mono font-semibold">{formatUsd(result.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">AI inference cost</span>
                <span className="font-mono text-amber-500">{formatUsd(result.inferenceCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Buyer</span>
                <span className="font-mono text-xs">{result.buyer}</span>
              </div>
            </div>
          </div>

          {/* Predictions */}
          {predictions.length > 0 && (
            <div className="glass rounded-2xl p-5 animate-fade-in-up delay-300">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-accent-violet" />
                <p className="text-sm font-semibold">Predictions in this report</p>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Each one is fingerprinted the moment it's made, so it can't be quietly changed later.
              </p>
              <ul className="space-y-3">
                {predictions.map((p) => (
                  <li key={p.id} className="rounded-xl bg-bg-card border border-border p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        <span className="gradient-text">{p.asset}</span>
                        <span className="ml-2">{p.prediction}</span>
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${OUTCOME_STYLE[p.outcome] ?? OUTCOME_STYLE.pending}`}>
                        {p.outcome}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {p.priceTarget && <>Target <span className="font-mono">{p.priceTarget}</span></>}
                      {p.priceTarget && p.timeframe && <span className="mx-1.5">·</span>}
                      {p.timeframe}
                    </p>
                    <ConfidenceBar value={p.confidence} className="mt-2.5" />
                    {p.hash && (
                      <p className="text-[11px] font-mono text-text-secondary/70 mt-2 truncate" title={p.hash}>
                        Fingerprint: {p.hash}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Procurement breakdown */}
          {orders.length > 0 && (
            <div className="glass rounded-2xl p-5 animate-fade-in-up delay-400">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-accent-blue" />
                <p className="text-sm font-semibold">Data providers consulted</p>
              </div>
              <div className="space-y-2 text-sm">
                {orders.map((o) => (
                  <div key={o.id} className="flex justify-between gap-3">
                    <span className="text-text-secondary min-w-0 truncate">
                      {o.supplierName}
                      {o.type && <span className="text-text-secondary/60"> · {o.type}</span>}
                    </span>
                    <span className="font-mono text-amber-500 flex-shrink-0">${toNum(o.cost).toFixed(4)}</span>
                  </div>
                ))}
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total data cost</span>
                  <span className="font-mono font-semibold">${ordersTotal.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Escrow */}
          <div className="glass rounded-2xl p-5 flex items-start gap-3 animate-fade-in-up delay-500">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {escrow?.status === "released"
                  ? "Payment released to MarketMind"
                  : escrow?.status === "refunded"
                  ? "Payment refunded to you"
                  : "Payment held in escrow for 7 days"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {escrow?.status === "released"
                  ? "The predictions held up, so the payment went through."
                  : escrow?.status === "refunded"
                  ? escrow.reason || "The predictions missed, so you got your money back."
                  : "You get an automatic refund if the predictions miss."}
              </p>
              {escrow && (
                <p className="text-xs font-mono text-text-secondary mt-1.5">
                  {escrow.amount} {tokenLabel(escrow.token)}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={reset}
            className="btn-gradient w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Buy Another Report
          </button>
        </div>
      )}

      {/* Previous reports */}
      {reports.length > 0 && step === 0 && (
        <div className="space-y-4 animate-fade-in-up delay-500">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Previous Reports
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => { setResult(r); setStep(2); }}
                className="glass rounded-2xl p-4 text-left hover:scale-[1.01] transition-all"
              >
                <h4 className="font-semibold text-sm mb-1 truncate">{r.title}</h4>
                <p className="text-xs text-text-secondary line-clamp-2">{r.content?.slice(0, 120) || "..."}…</p>
                <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-mono">{formatUsd(r.price)}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
