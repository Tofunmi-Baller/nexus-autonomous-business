import { useState, useEffect, useCallback, Component, type ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OnboardingTour } from "./components/OnboardingTour";
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
    console.error("[MarketMind] React error:", error, info.componentStack);
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

export function App() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("marketmind-tour-seen");
    if (!seen) setShowTour(true);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem("marketmind-tour-seen", "1");
    setShowTour(false);
  }, []);

  const openTour = useCallback(() => {
    setShowTour(true);
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
