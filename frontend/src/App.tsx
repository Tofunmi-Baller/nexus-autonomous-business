import { useState, useEffect, useCallback, Component, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OnboardingTour } from "./components/OnboardingTour";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Ledger } from "./pages/Ledger";
import { BuyReport } from "./pages/BuyReport";
import { Demo } from "./pages/Demo";
import { Intelligence } from "./pages/Intelligence";
import { Treasury } from "./pages/Treasury";
import { Affiliates } from "./pages/Affiliates";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[Nexus] React error:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#f1f5f9", background: "#0B0D1A", minHeight: "100vh" }}>
          <h1 style={{ color: "#F43F5E", marginBottom: 16 }}>Something broke</h1>
          <pre style={{ color: "#94A3B8", whiteSpace: "pre-wrap", fontSize: 14 }}>{this.state.error.message}</pre>
          <pre style={{ color: "#64748B", whiteSpace: "pre-wrap", fontSize: 12, marginTop: 12 }}>{this.state.error.stack}</pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 24, padding: "10px 20px", background: "#8B5CF6", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function isLoggedIn(): boolean {
  return !!localStorage.getItem("nexus-user");
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AppShell() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("nexus-tour-seen")) return;
    const timer = setTimeout(() => setShowTour(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem("nexus-tour-seen", "1");
    setShowTour(false);
  }, []);

  const openTour = useCallback(() => {
    setShowTour(true);
  }, []);

  return (
    <>
      {showTour && <OnboardingTour onComplete={completeTour} />}
      <Layout onShowTour={openTour}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/treasury" element={<Treasury />} />
          <Route path="/buy" element={<BuyReport />} />
          <Route path="/affiliates" element={<Affiliates />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected dashboard routes */}
        <Route
          path="/app/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />

        {/* Catch-all: redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
