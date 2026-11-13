# MarketMind — Autonomous AI Research Shop

> **NEAR Hackathon 2026 · Track 04: Autonomous Business**

An AI agent that runs as an autonomous micro-business. It sells short crypto market reports, accepts payment in any token via NEAR Intents, buys its own inference, and automatically splits revenue between owner and contributors — all controlled through a single `config.yaml`.

## Demo

**Run a complete sale → payout loop in under 60 seconds:**

```bash
npm install
npm run dev
# Open http://localhost:5173/demo and click "Run Full Demo Loop"
```

The demo executes a real end-to-end business cycle:
1. Customer deposits payment (testnet simulation)
2. Agent receives the order and generates a market report using AI
3. Sale logged to the public ledger
4. Revenue automatically split: 70% owner / 20% contributors / 10% treasury
5. All transactions visible in real-time on the ledger page

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  config.yaml                     │
│   spend caps · pricing · revenue splits · kill   │
└────────────────────┬────────────────────────────┘
                     │ hot-reload
┌────────────────────▼────────────────────────────┐
│              Agent Backend (Express)             │
│                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  NEAR    │  │  Report   │  │   Revenue    │  │
│  │ Intents  │  │ Generator │  │   Splitter   │  │
│  │  API     │  │ (Claude)  │  │              │  │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│  ┌────▼──────────────▼───────────────▼───────┐   │
│  │           SQLite Ledger (public)          │   │
│  └───────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────┘
                       │ REST API
┌──────────────────────▼───────────────────────────┐
│            React Dashboard (Vite)                 │
│                                                   │
│  Dashboard · Public Ledger · Buy Reports · Demo   │
└───────────────────────────────────────────────────┘
```

## Key Features

### Owner-Controlled Config (`config.yaml`)
- **Revenue splits** — change percentages without code deploys
- **Spending caps** — max daily inference spend enforced before every AI call
- **Minimum pricing** — price floors that protect margins
- **Kill switch** — one boolean to halt all operations instantly
- **Hot-reload** — changes take effect on the next request

### Security-First Design
- No full-access keys stored in plain text
- Scoped function-call keys via NEAR Intents Agent API
- Spending caps enforced at both config and API policy level
- Kill switch halts all agent operations immediately
- All transactions immutably logged

### Public Ledger
Every sale, inference cost, and payout is logged with:
- Timestamp, amount, token, from/to addresses
- Transaction hash (links to NEAR Explorer)
- Associated report ID for full audit trail

### AI-Generated Reports
Real crypto market briefs with:
- Executive summary
- Key metrics with actual numbers
- Market drivers and risk factors
- Short-term outlook

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | TypeScript, Express, SQLite (better-sqlite3) |
| Frontend | React 18, Vite, Tailwind CSS v4, Lucide icons |
| AI Inference | Anthropic Claude API |
| Payments | NEAR Intents Agent API, 1Click swap routing |
| Network | NEAR Testnet (demo) / Mainnet (production) |

## Setup

### Prerequisites
- Node.js 20+
- An Anthropic API key (for AI inference)
- NEAR testnet account (for demo mode)

### Install & Run

```bash
# Clone and install
cd autonomous-business
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run in development (backend + frontend)
npm run dev

# Or run demo mode directly
npm run demo
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Claude inference |
| `NEAR_INTENTS_AGENT_API_KEY` | Agent API partner key |
| `AGENT_ID` | NEAR Intents agent ID (set after creation) |
| `GRANT_TOKEN` | Agent grant token (set after issuance) |
| `DEMO_MODE` | Enable testnet simulation (default: true) |

## Config Reference

```yaml
# Revenue split — must sum to 100
revenue:
  owner_pct: 70
  contributors_pct: 20
  treasury_pct: 10

# Spending caps
spending:
  max_daily_inference_usd: "50.00"
  max_per_report_usd: "2.00"

# Kill switch
kill_switch: false  # set true to halt everything
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Agent status and balances |
| GET | `/api/config` | Current config (sanitized) |
| GET | `/api/ledger` | Transaction ledger |
| GET | `/api/ledger/summary` | Aggregate totals |
| GET | `/api/reports` | All generated reports |
| GET | `/api/reports/:id` | Single report |
| POST | `/api/reports/buy` | Purchase a new report |
| POST | `/api/demo/run` | Run full demo loop (SSE) |

## What Makes This Different

1. **Real working demo** — not a mockup. Customer pays, AI generates, revenue splits, all on the ledger.
2. **Genuinely powerful config** — change splits, caps, kill switch without touching code.
3. **Polished dashboard** — real-time ledger with a trading-terminal aesthetic.
4. **Security-first** — function-call keys, spending caps at the contract level.
5. **Useful output** — actual crypto market briefs, not lorem ipsum.

## License

MIT
