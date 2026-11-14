import { useState, useEffect, useRef, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScrollText,
  ShoppingCart,
  Play,
  Menu,
  X,
  Zap,
  AlertOctagon,
  Sun,
  Moon,
  HelpCircle,
  ChevronDown,
  Brain,
  Landmark,
  Users,
  LogOut,
} from "lucide-react";
import { fetchStatus, type AgentStatus } from "../api";
import { AnimatedBackground } from "./AnimatedBackground";
import { useTheme } from "./ThemeProvider";

const PRIMARY_NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/demo", label: "Demo", icon: Play },
  { to: "/app/buy", label: "Buy Report", icon: ShoppingCart },
  { to: "/app/ledger", label: "Ledger", icon: ScrollText },
];

const MORE_NAV = [
  { to: "/app/intelligence", label: "Agent Decisions", icon: Brain, desc: "See the agent's reasoning" },
  { to: "/app/treasury", label: "Treasury", icon: Landmark, desc: "Portfolio and balance sheet" },
  { to: "/app/affiliates", label: "Affiliates", icon: Users, desc: "Referral program" },
];

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV];

export function Layout({ children, onShowTour }: { children: ReactNode; onShowTour?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem("nexus-user");
    navigate("/");
  };

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => {});
    const id = setInterval(() => {
      fetchStatus().then(setStatus).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isOnline = status && !status.isKilled;

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />
      <header className="sticky top-0 z-50 glass gradient-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight gradient-text hidden sm:inline">Nexus</span>
            <span className="font-bold text-lg tracking-tight sm:hidden">NX</span>
            <span className={`w-2 h-2 rounded-full ml-1 ${isOnline ? "bg-accent-green animate-pulse" : "bg-accent-rose"}`} />
          </div>

          {/* Desktop nav — 4 primary + More dropdown */}
          <nav className="hidden md:flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-accent-violet/15 text-accent-violet"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/[0.06]"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}

            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-white/[0.06] ${moreOpen ? "bg-white/[0.06] text-text-primary" : ""}`}
              >
                More
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden shadow-xl animate-scale-in z-50 bg-bg-secondary border border-border backdrop-blur-none">
                  {MORE_NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 transition-colors ${
                          isActive
                            ? "bg-accent-violet/10 text-accent-violet"
                            : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-text-secondary/60">{item.desc}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {status?.isKilled && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-accent-rose/15 border border-accent-rose/30 animate-pulse">
                <AlertOctagon className="w-3.5 h-3.5 text-accent-rose" />
                <span className="text-xs font-semibold text-accent-rose">KILLED</span>
              </div>
            )}

            {status && (
              <span className="hidden sm:inline text-xs font-mono text-text-secondary glass px-2.5 py-1.5 rounded-lg">
                {status.network}
              </span>
            )}

            <button
              onClick={() => onShowTour ? onShowTour() : (() => { localStorage.removeItem("nexus-tour-seen"); window.location.reload(); })()}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
              title="Restart tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-secondary hover:text-accent-rose hover:bg-accent-rose/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-bg-secondary/95 backdrop-blur-lg p-3 animate-fade-in">
            {ALL_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent-violet/10 text-accent-violet"
                      : "text-text-secondary hover:text-text-primary"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-8">{children}</main>

      <footer className="relative z-10 gradient-border" style={{ borderBottom: "none" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-accent-violet" />
            <span>Powered by NEAR Protocol</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-accent-green" : "bg-accent-rose"}`} />
            <span className="font-mono">{status?.network || "testnet"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
