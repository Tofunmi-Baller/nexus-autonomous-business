import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Copy, DollarSign, Plus, RefreshCw, Sparkles, TrendingUp, Users } from "lucide-react";
import {
  createAffiliate,
  fetchAffiliate,
  fetchAffiliateReferrals,
  fetchAffiliates,
  formatUsd,
  timeAgo,
  toNum,
  truncateAddress,
  type Affiliate,
  type Referral,
} from "../api";
import { AnimatedCounter } from "../components/AnimatedCounter";

const STORAGE_KEY = "nexus-affiliate-code";

/** Commission may arrive as 0.05 or 5; both mean five percent. */
function commissionPct(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return 5;
  return n < 1 ? n * 100 : n;
}

function referralLink(code: string): string {
  return `${window.location.origin}/app/buy?ref=${encodeURIComponent(code)}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the text stays selectable on screen.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="glass px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 text-text-secondary hover:text-text-primary flex-shrink-0"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Affiliates() {
  const [searchParams] = useSearchParams();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [nearAccount, setNearAccount] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Affiliate | null>(null);
  const [myCode, setMyCode] = useState(
    () => searchParams.get("code") || searchParams.get("ref") || localStorage.getItem(STORAGE_KEY) || "",
  );
  const [mine, setMine] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchAffiliates()
        .then((list) => !cancelled && setAffiliates(list))
        .catch(() => {});
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!myCode) {
      setMine(null);
      setReferrals([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      fetchAffiliate(myCode)
        .then((a) => !cancelled && setMine(a))
        .catch(() => {});
      fetchAffiliateReferrals(myCode)
        .then((r) => !cancelled && setReferrals(r))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [myCode]);

  const leaderboard = useMemo(
    () => [...affiliates].sort((a, b) => toNum(b.totalEarned) - toNum(a.totalEarned)),
    [affiliates],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const account = nearAccount.trim();
    if (!account) {
      setError("Enter your NEAR account so we know where to send your earnings.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const affiliate = await createAffiliate(account);
      setCreated(affiliate);
      setMine(affiliate);
      setMyCode(affiliate.code);
      localStorage.setItem(STORAGE_KEY, affiliate.code);
      setNearAccount("");
      fetchAffiliates().then(setAffiliates).catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't create your link. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const forgetCode = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMyCode("");
    setCreated(null);
  };

  const active = created ?? mine;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center animate-fade-in-up">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Affiliate <span className="gradient-text">Program</span>
        </h1>
        <p className="text-text-secondary">Earn 5% commission on every referral</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in-up delay-100">
        {[
          { icon: Plus, title: "Get your link", text: "Enter your NEAR account below" },
          { icon: Users, title: "Share it", text: "Send it to anyone who wants a report" },
          { icon: DollarSign, title: "Get paid", text: "Earn a cut of every sale you bring in" },
        ].map((s, i) => (
          <div key={s.title} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-violet/10 flex items-center justify-center flex-shrink-0">
              <s.icon className="w-4 h-4 text-accent-violet" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {i + 1}. {s.title}
              </p>
              <p className="text-xs text-text-secondary">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      <form onSubmit={submit} className="glass rounded-2xl p-6 animate-fade-in-up delay-200">
        <label htmlFor="affiliate-account" className="text-sm font-semibold mb-1 block">
          Your NEAR account
        </label>
        <p className="text-xs text-text-secondary mb-3">Commissions are paid to this account.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="affiliate-account"
            type="text"
            value={nearAccount}
            onChange={(e) => setNearAccount(e.target.value)}
            placeholder="your-name.testnet"
            autoComplete="off"
            className="flex-1 px-4 py-3 rounded-xl glass text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-violet"
          />
          <button
            type="submit"
            disabled={creating}
            className="btn-gradient px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {creating ? "Generating…" : "Generate Link"}
          </button>
        </div>
        {error && (
          <div role="alert" className="mt-3 px-4 py-3 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-sm text-accent-rose">
            {error}
          </div>
        )}
      </form>

      {/* Link + code */}
      {active && (
        <div className="glass rounded-2xl p-6 ring-2 ring-accent-violet/40 animate-scale-in">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-accent-green" />
            <h2 className="font-bold">{created ? "Your link is ready" : "Your referral link"}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-1.5">Referral link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-bg-card border border-border text-sm font-mono truncate">
                  {referralLink(active.code)}
                </code>
                <CopyButton text={referralLink(active.code)} label="Copy referral link" />
              </div>
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-1.5">Your code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-bg-card border border-border text-xl font-mono font-bold gradient-text tracking-wider truncate">
                  {active.code}
                </code>
                <CopyButton text={active.code} label="Copy referral code" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your stats */}
      {myCode && (
        <section className="space-y-4 animate-fade-in-up delay-300">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Your Stats</h2>
            <button onClick={forgetCode} className="text-xs text-text-secondary hover:text-text-primary">
              Not you? Clear this code
            </button>
          </div>
          {mine ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-2xl p-4 sm:p-5">
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-2">Referrals</p>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={mine.totalReferrals || 0} decimals={0} />
                  </div>
                </div>
                <div className="glass rounded-2xl p-4 sm:p-5">
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-2">Earned</p>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={toNum(mine.totalEarned)} prefix="$" className="gradient-text" />
                  </div>
                </div>
                <div className="glass rounded-2xl p-4 sm:p-5">
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-medium mb-2">Your cut</p>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={commissionPct(mine.commissionPct)} decimals={0} suffix="%" />
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
                  <TrendingUp className="w-4 h-4 text-accent-violet" />
                  <h3 className="text-sm font-semibold">Your referrals</h3>
                </div>
                {referrals.length > 0 ? (
                  <ul>
                    {referrals.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border last:border-b-0 text-sm">
                        <div className="min-w-0">
                          <p className="text-xs truncate">
                            Report <span className="font-mono">{truncateAddress(r.reportId || r.id, 6)}</span>
                          </p>
                          <p className="text-xs text-text-secondary">{timeAgo(r.timestamp)}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono font-semibold text-accent-green">+{formatUsd(toNum(r.commission))}</span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                              r.status === "paid"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            }`}
                          >
                            {r.status || "pending"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-6 py-8 text-center text-sm text-text-secondary">
                    No referrals yet. Share your link to get started.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl px-6 py-8 text-center text-sm text-text-secondary">
              We couldn't find stats for code <span className="font-mono font-semibold">{myCode}</span> yet.
            </div>
          )}
        </section>
      )}

      {/* Leaderboard */}
      <section className="glass rounded-2xl overflow-hidden animate-fade-in-up delay-400">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Users className="w-4 h-4 text-accent-violet" />
          <h3 className="text-sm font-semibold">Top affiliates</h3>
        </div>
        {leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">NEAR Account</th>
                  <th className="px-4 py-2.5 font-medium text-right">Referrals</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Earned</th>
                  <th className="px-6 py-2.5 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((a, i) => (
                  <tr
                    key={a.id || a.code}
                    className={`border-b border-border last:border-b-0 ${a.code === myCode ? "bg-accent-violet/5" : ""}`}
                  >
                    <td className="px-6 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "btn-gradient text-white" : "bg-bg-card border border-border text-text-secondary"
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-mono text-sm font-semibold">{a.code}</span>
                        {a.code === myCode && <span className="text-xs text-accent-violet font-medium">You</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-mono text-text-secondary">{truncateAddress(a.nearAccount, 10)}</td>
                    <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-right">{a.totalReferrals}</td>
                    <td className="px-4 py-3.5 text-sm font-mono tabular-nums text-right font-semibold">{formatUsd(toNum(a.totalEarned))}</td>
                    <td className="px-6 py-3.5 text-xs text-text-secondary text-right whitespace-nowrap">{timeAgo(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <Users className="w-10 h-10 text-text-secondary/20 mx-auto mb-3 animate-bounce-subtle" />
            <p className="text-text-secondary font-medium">No affiliates yet</p>
            <p className="text-sm text-text-secondary/60 mt-1">Generate a link and be the first on the board</p>
          </div>
        )}
      </section>
    </div>
  );
}
