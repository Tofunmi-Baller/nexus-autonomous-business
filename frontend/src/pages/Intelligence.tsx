import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BarChart3, Brain, ChevronRight, Sparkles, Target, Zap } from "lucide-react";
import { fetchDecisions, subscribeDecisions, toPct, type Decision } from "../api";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { DecisionCard, decisionStyle } from "../components/DecisionCard";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pricing", label: "Pricing" },
  { id: "procurement", label: "Procurement" },
  { id: "treasury", label: "Treasury" },
  { id: "product", label: "Products" },
];

const MAX_DECISIONS = 200;
const POLL_MS = 3000;

function isDecision(value: unknown): value is Decision {
  return !!value && typeof value === "object" && typeof (value as Decision).id === "string" && "action" in value;
}

/** Merges incoming decisions into the list, newest first, without duplicates. */
function mergeDecisions(current: Decision[], incoming: Decision[]): Decision[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((d) => [d.id, d]));
  let changed = false;
  for (const d of incoming) {
    if (!byId.has(d.id)) changed = true;
    byId.set(d.id, d);
  }
  if (!changed) return current;
  return [...byId.values()]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_DECISIONS);
}

export function Intelligence() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"connecting" | "live" | "polling">("connecting");
  // Ids present on the first render get a staggered entrance; later arrivals slide in immediately.
  const initialIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const load = () =>
      fetchDecisions(100)
        .then((list) => {
          if (cancelled) return;
          setDecisions((prev) => mergeDecisions(prev, list.filter(isDecision)));
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });

    const startPolling = () => {
      if (cancelled || pollId) return;
      setMode("polling");
      pollId = setInterval(load, POLL_MS);
    };

    load();

    let es: EventSource | null = null;
    try {
      es = subscribeDecisions();
    } catch {
      startPolling();
    }

    if (es) {
      const source = es;
      const onDecision = (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data);
          const items: unknown[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.decisions)
            ? data.decisions
            : [data?.decision ?? data];
          const valid = items.filter(isDecision);
          if (valid.length > 0 && !cancelled) setDecisions((prev) => mergeDecisions(prev, valid));
        } catch {
          // Ignore keep-alive pings and anything that isn't JSON.
        }
      };
      source.onopen = () => {
        if (!cancelled) setMode("live");
      };
      source.onmessage = onDecision;
      source.addEventListener("decision", onDecision as EventListener);
      source.onerror = () => {
        // Stream unavailable or dropped: stop retrying it and poll instead.
        source.close();
        startPolling();
      };
    }

    return () => {
      cancelled = true;
      es?.close();
      if (pollId) clearInterval(pollId);
    };
  }, []);

  if (loaded && initialIds.current === null) {
    initialIds.current = new Set(decisions.map((d) => d.id));
  }

  const visible = useMemo(
    () => (filter === "all" ? decisions : decisions.filter((d) => d.type === filter)),
    [decisions, filter],
  );

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = decisions.filter((d) => new Date(d.timestamp).toDateString() === today).length;
    const avgConfidence =
      decisions.length > 0 ? decisions.reduce((sum, d) => sum + toPct(d.confidence), 0) / decisions.length : 0;
    const counts = new Map<string, number>();
    for (const d of decisions) counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return { todayCount, avgConfidence, ranked };
  }, [decisions]);

  const top = stats.ranked[0];
  const topStyle = top ? decisionStyle(top[0]) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            Agent <span className="gradient-text">Intelligence</span>
          </h1>
          <span className="flex items-center gap-1.5 glass px-2.5 py-1 rounded-full text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === "live" ? "bg-accent-green animate-pulse" : mode === "polling" ? "bg-accent-amber animate-pulse" : "bg-slate-400"
              }`}
            />
            {mode === "live" ? "Live" : mode === "polling" ? "Checking every 3s" : "Connecting…"}
          </span>
        </div>
        <p className="text-text-secondary text-sm sm:text-base">Watch Nexus make decisions in real-time</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 animate-fade-in-up delay-100">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? decisions.length : decisions.filter((d) => d.type === f.id).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                active ? "btn-gradient text-white" : "glass text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
              <span className={`text-xs font-mono tabular-nums ${active ? "text-white/80" : "text-text-secondary/70"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-3 order-2 lg:order-1">
          {visible.length > 0 ? (
            visible.map((d, i) => (
              <DecisionCard
                key={d.id}
                decision={d}
                delayMs={initialIds.current?.has(d.id) ? Math.min(i, 8) * 60 : 0}
              />
            ))
          ) : !loaded ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass rounded-2xl h-28 animate-pulse" />
              ))}
            </div>
          ) : decisions.length > 0 ? (
            <div className="glass rounded-2xl px-6 py-14 text-center animate-fade-in">
              <Sparkles className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No decisions in this category yet</p>
              <button onClick={() => setFilter("all")} className="text-sm text-accent-violet mt-2 hover:underline">
                Show all decisions
              </button>
            </div>
          ) : (
            <div className="glass rounded-2xl px-6 py-16 text-center animate-fade-in-up delay-200">
              <Brain className="w-12 h-12 text-text-secondary/20 mx-auto mb-4 animate-bounce-subtle" />
              <p className="text-text-secondary font-medium max-w-sm mx-auto">
                Nexus hasn't made any decisions yet. Run the demo to see the AI think!
              </p>
              <Link
                to="/app/demo"
                className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm mt-5"
              >
                <Zap className="w-4 h-4" />
                Run the demo
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <aside className="order-1 lg:order-2">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:sticky lg:top-24">
            <div className="glass rounded-2xl p-5 animate-fade-in-up delay-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Decisions today</span>
              </div>
              <div className="text-3xl font-bold">
                <AnimatedCounter value={stats.todayCount} decimals={0} className="gradient-text" />
              </div>
              <p className="text-xs text-text-secondary mt-1">{decisions.length} loaded in total</p>
            </div>

            <div className="glass rounded-2xl p-5 animate-fade-in-up delay-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-cyan-500" />
                </div>
                <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Avg. confidence</span>
              </div>
              <div className="text-3xl font-bold">
                <AnimatedCounter value={stats.avgConfidence} decimals={0} suffix="%" />
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-violet via-accent-blue to-accent-cyan transition-all duration-700"
                  style={{ width: `${stats.avgConfidence}%` }}
                />
              </div>
            </div>

            <div className="glass rounded-2xl p-5 animate-fade-in-up delay-400 col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Most active area</span>
              </div>
              {top && topStyle ? (
                <>
                  <p className="text-xl font-bold">{topStyle.label}</p>
                  <div className="space-y-2 mt-4">
                    {stats.ranked.map(([type, count]) => {
                      const s = decisionStyle(type);
                      return (
                        <div key={type} className="flex items-center gap-3 text-xs">
                          <span className="w-24 text-text-secondary flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                          <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.dot} transition-all duration-700`}
                              style={{ width: `${(count / top[1]) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary">Nothing yet</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
