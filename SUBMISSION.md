# Nexus — Hackathon Submission

**Event:** NEAR Hackathon 2026 · Track 04: Autonomous Business
**Repo:** https://github.com/Tofunmi-Baller/nexus-autonomous-business

## One-liner

Nexus is an AI agent that runs its own small business: it sells crypto market reports, takes payment in any token through NEAR Intents, pays for its own AI and data, and shares the revenue out automatically, all in public.

## The problem

"AI agents" today are mostly assistants. They answer questions but can't earn, spend, or account for money on their own, so a human still runs the business around them. We wanted to see what it takes for an agent to be the business: take orders, do the work, pay its suppliers, pay its owners, and keep the books, with a human only setting the rules.

## What Nexus does

1. **Customer pays** in whatever token they hold. NEAR Intents converts it, so nobody has to swap manually.
2. **Nexus buys what it needs.** It purchases data from supplier agents (chart analysis, sentiment, whale tracking) and pays for Claude inference, all under a daily spending cap.
3. **Nexus writes the report:** a real market brief with metrics, drivers, risks and price predictions.
4. **Revenue is split instantly:** 70% owner, 20% contributors, 10% treasury (set in `config.yaml`).
5. **Everything is logged** to a public ledger: every sale, AI cost, supplier payment and payout.
6. **Money-back guarantee:** payments sit in escrow for 7 days. Predictions are hashed when made, then scored, and if they miss badly the customer is refunded automatically.

The agent also manages its own treasury (keeps a stablecoin target and rebalances), adjusts prices to demand within owner-set bounds, and runs an affiliate program with automatic 5% commissions.

## Owner control

All business rules live in one file, `config.yaml`: revenue splits, price floor and ceiling, spending caps, treasury targets, and a **kill switch** that halts every operation. Changes hot-reload and need no redeploy.

## How it's built

| Layer | Tech |
|-------|------|
| Agent backend | TypeScript, Express, SQLite ledger |
| AI | Anthropic Claude |
| Payments | NEAR Intents Agent API (scoped function-call keys, 1Click swap routing) |
| Frontend | React 18, Vite, Tailwind v4: landing page, demo login, live dashboard |

## Try it

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:5176 → **Launch Dashboard** → sign in with any account name → **Demo** → **Run Full Demo Loop**. You'll watch one full business cycle, from payment to split, land on the ledger in real time.

## Honest limitations

- The NEAR Intents Agent API is mainnet-only, so on testnet the payment, swap and payout steps are simulated (marked `demo-tx-*` on the ledger). Report generation, pricing, procurement decisions, prediction scoring and the ledger are real.
- Sign-in is a demo login. Production would use NEAR wallet sign-in.

## What's next

- Mainnet deployment with real Intents settlement
- NEAR wallet sign-in for customers
- Open the supplier marketplace so third-party agents can sell data to Nexus

---

## Demo video script (about 2 minutes)

| Time | Show | Say |
|------|------|-----|
| 0:00–0:15 | Landing page hero | "This is Nexus, an AI that runs its own business. No staff, no shopkeeper." |
| 0:15–0:35 | Scroll to How It Works, then Follow the Money | "A customer pays in any token. Nexus buys data, writes a report with Claude, and splits the $10: seven to the owner, two to the team, one kept to pay its own bills." |
| 0:35–0:45 | Click Launch Dashboard, sign in | "Let's watch it happen live." |
| 0:45–1:20 | Demo page → Run Full Demo Loop | Narrate each step as it lights up: payment, procurement, report, ledger, split. |
| 1:20–1:35 | Ledger page | "Every cent is on a public ledger: sales, AI costs, payouts." |
| 1:35–1:50 | Agent Decisions, then Treasury | "Here's the agent's own reasoning on pricing, suppliers and treasury." |
| 1:50–2:00 | `config.yaml` with the kill switch | "The owner controls everything from one file, including a kill switch." |
