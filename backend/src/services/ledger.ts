import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { LedgerEntry, LedgerSummary } from "../types.js";

const DB_DIR = path.resolve(import.meta.dirname, "../../data");
const DB_PATH = path.join(DB_DIR, "ledger.db");

let db: Database.Database;

export function initLedger(): void {
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      token TEXT NOT NULL,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      txHash TEXT,
      reportId TEXT,
      description TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger(type);
    CREATE INDEX IF NOT EXISTS idx_ledger_reportId ON ledger(reportId);
    CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON ledger(timestamp DESC);
  `);
}

export function addEntry(
  entry: Omit<LedgerEntry, "id" | "timestamp">,
): LedgerEntry {
  const full: LedgerEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const stmt = db.prepare(`
    INSERT INTO ledger (id, timestamp, type, amount, token, "from", "to", txHash, reportId, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    full.id,
    full.timestamp,
    full.type,
    full.amount,
    full.token,
    full.from,
    full.to,
    full.txHash,
    full.reportId,
    full.description,
  );

  return full;
}

export function getEntries(limit = 100, offset = 0): LedgerEntry[] {
  const stmt = db.prepare(
    `SELECT id, timestamp, type, amount, token, "from", "to", txHash, reportId, description
     FROM ledger ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
  );
  return stmt.all(limit, offset) as LedgerEntry[];
}

export function getEntriesByType(type: string): LedgerEntry[] {
  const stmt = db.prepare(
    `SELECT id, timestamp, type, amount, token, "from", "to", txHash, reportId, description
     FROM ledger WHERE type = ? ORDER BY timestamp DESC`,
  );
  return stmt.all(type) as LedgerEntry[];
}

export function getEntriesByReport(reportId: string): LedgerEntry[] {
  const stmt = db.prepare(
    `SELECT id, timestamp, type, amount, token, "from", "to", txHash, reportId, description
     FROM ledger WHERE reportId = ? ORDER BY timestamp ASC`,
  );
  return stmt.all(reportId) as LedgerEntry[];
}

export function getSummary(): LedgerSummary {
  const row = db
    .prepare(
      `SELECT
      COALESCE(SUM(CASE WHEN type = 'sale' THEN CAST(amount AS REAL) ELSE 0 END), 0) as totalSales,
      COALESCE(SUM(CASE WHEN type IN ('inference_cost', 'procurement') THEN CAST(amount AS REAL) ELSE 0 END), 0) as totalCosts,
      COALESCE(SUM(CASE WHEN type = 'payout' THEN CAST(amount AS REAL) ELSE 0 END), 0) as totalPayouts,
      COALESCE(SUM(CASE WHEN type = 'refund' THEN CAST(amount AS REAL) ELSE 0 END), 0) as totalRefunds,
      COUNT(*) as entryCount
    FROM ledger`,
    )
    .get() as {
    totalSales: number;
    totalCosts: number;
    totalPayouts: number;
    totalRefunds: number;
    entryCount: number;
  };

  return {
    totalSales: row.totalSales.toFixed(2),
    totalCosts: row.totalCosts.toFixed(2),
    totalPayouts: row.totalPayouts.toFixed(2),
    netRevenue: (
      row.totalSales -
      row.totalCosts -
      row.totalPayouts -
      row.totalRefunds
    ).toFixed(2),
    entryCount: row.entryCount,
  };
}

export function getDailyInferenceCosts(): string {
  const today = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
     FROM ledger
     WHERE type = 'inference_cost' AND timestamp >= ?`,
    )
    .get(today + "T00:00:00.000Z") as { total: number };

  return row.total.toFixed(4);
}

export function getOperatingCostsSince(sinceIso: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
     FROM ledger
     WHERE type IN ('inference_cost', 'procurement') AND timestamp >= ?`,
    )
    .get(sinceIso) as { total: number };

  return row.total;
}
