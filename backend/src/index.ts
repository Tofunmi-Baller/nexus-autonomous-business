import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { loadConfig } from "./config.js";
import { initLedger } from "./services/ledger.js";
import { startAutonomousLoops } from "./services/scheduler.js";
import apiRouter from "./routes/api.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

function boot(): void {
  const config = loadConfig();
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║  ${config.agent.name.padEnd(34)} ║`);
  console.log(`  ║  Autonomous Research Shop             ║`);
  console.log(`  ╠══════════════════════════════════════╣`);
  console.log(`  ║  Network:    ${config.near.network.padEnd(23)} ║`);
  console.log(`  ║  Demo mode:  ${(process.env.DEMO_MODE === "true" ? "ON" : "OFF").padEnd(23)} ║`);
  console.log(`  ║  Kill switch: ${(config.kill_switch ? "ACTIVE" : "off").padEnd(22)} ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);

  initLedger();
  startAutonomousLoops();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", apiRouter);

  if (process.env.NODE_ENV === "production") {
    const frontendDist = path.resolve(import.meta.dirname, "../../frontend/dist");
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  API:    http://localhost:${PORT}/api/status`);
    console.log(`  Ledger: http://localhost:${PORT}/api/ledger\n`);
  });
}

boot();
