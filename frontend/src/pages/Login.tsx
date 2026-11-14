import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { Zap, ArrowRight, Eye, EyeOff } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: Location } | null)?.from;
  const [isSignUp, setIsSignUp] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!account.trim()) {
      setError("Please enter your NEAR account.");
      return;
    }

    setLoading(true);

    // Demo auth — stores the account and redirects to dashboard
    setTimeout(() => {
      localStorage.setItem("nexus-user", JSON.stringify({
        account: account.trim(),
        loggedInAt: new Date().toISOString(),
      }));
      setLoading(false);
      navigate(from ? `${from.pathname}${from.search}` : "/app", { replace: true });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[700px] h-[700px] rounded-full animate-float"
          style={{ top: "-20%", right: "-10%", background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full animate-float"
          style={{ bottom: "-15%", left: "-10%", background: "radial-gradient(circle, rgba(6,182,212,0.1), transparent 70%)", filter: "blur(100px)", animationDelay: "-3s" }}
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md mx-4 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight gradient-text">Nexus</span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-sm text-text-secondary">
              {isSignUp
                ? "Connect your NEAR account to get started"
                : "Sign in to access the Nexus dashboard"
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="account" className="text-sm font-medium mb-2 block">
                NEAR Account
              </label>
              <input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="your-name.testnet"
                autoComplete="username"
                className="w-full px-4 py-3.5 rounded-xl bg-bg-card border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium mb-2 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter any password for demo"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="w-full px-4 py-3.5 rounded-xl bg-bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text-secondary/60 mt-2">
                Demo mode — any password works
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-accent-rose/10 border border-accent-rose/25 text-sm text-accent-rose animate-scale-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-4 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button onClick={() => { setIsSignUp(false); setError(""); }} className="text-accent-violet hover:underline font-medium">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button onClick={() => { setIsSignUp(true); setError(""); }} className="text-accent-violet hover:underline font-medium">
                  Create one
                </button>
              </>
            )}
          </div>
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
