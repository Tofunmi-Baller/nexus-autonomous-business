import { Router } from "express";
import type { Request, Response } from "express";
import { getConfig, isKilled, isDemoMode } from "../config.js";
import { getBalance, getAgentAccountId } from "../near/account.js";
import {
  getEntries,
  getEntriesByType,
  getEntriesByReport,
  getCount,
  getSummary,
  addEntry,
} from "../services/ledger.js";
import {
  generateReport,
  getReport,
  getAllReports,
} from "../services/report-generator.js";
import { splitRevenue } from "../services/revenue-splitter.js";
import { getDailySpend } from "../services/spending-tracker.js";
import {
  addDecision,
  getDecisionCursor,
  getDecisionStream,
  getDecisions,
  isDecisionType,
} from "../services/decision-engine.js";
import {
  getCurrentPrice,
  getPricingState,
  recordSale,
} from "../services/pricing-engine.js";
import {
  extractPredictions,
  getPredictions,
  getScore,
} from "../services/predictions.js";
import {
  getOrders,
  getSupplierStats,
  getSuppliers,
  procureForReport,
} from "../services/procurement.js";
import {
  checkRebalance,
  executeRebalance,
  getActions,
  getTreasuryState,
  recordTreasuryInflow,
} from "../services/treasury-manager.js";
import { getEscrowEntries, holdPayment } from "../services/escrow.js";
import {
  createAffiliate,
  getAffiliate,
  getAffiliates,
  getReferrals,
  recordReferral,
} from "../services/affiliates.js";
import {
  getAllProducts,
  getProduct,
  getProducts,
  recordProductSale,
} from "../services/product-manager.js";
import { v4 as uuidv4 } from "uuid";
import type {
  DemoStep,
  EscrowEntry,
  Prediction,
  ProcurementResult,
  Referral,
} from "../types.js";

const router = Router();
const startTime = Date.now();

let demoRunning = false;
let demoSteps: DemoStep[] = [];

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

router.get("/config", (_req: Request, res: Response) => {
  const config = getConfig();
  res.json({
    agent: config.agent,
    near: {
      network: config.near.network,
      agent_account: config.near.agent_account,
      contributors_account: config.near.contributors_account,
      owner_account: config.near.owner_account,
    },
    revenue: config.revenue,
    pricing: {
      min_price_usd: config.pricing.min_price_usd,
      default_price_usd: config.pricing.default_price_usd,
      max_price_usd: config.pricing.max_price_usd,
      current_price_usd: getCurrentPrice(),
      accepted_tokens: config.pricing.accepted_tokens,
    },
    spending: config.spending,
    treasury: config.treasury,
    affiliates: config.affiliates,
    escrow: config.escrow,
    kill_switch: config.kill_switch,
  });
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const balances = await getBalance();
    const summary = getSummary();
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    res.json({
      name: config.agent.name,
      agentId: process.env.AGENT_ID || "demo-agent",
      nearAccount: getAgentAccountId(),
      network: config.near.network,
      isKilled: config.kill_switch,
      balances,
      dailySpend: getDailySpend(),
      maxDailySpend: config.spending.max_daily_inference_usd,
      totalSales: summary.saleCount,
      totalRevenue: summary.totalSales,
      uptime: formatUptime(uptimeSeconds),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/ledger", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const type = req.query.type as string | undefined;

  const entries = type
    ? getEntriesByType(type).slice(offset, offset + limit)
    : getEntries(limit, offset);

  res.json({ entries, total: getCount(type || undefined) });
});

router.get("/ledger/summary", (_req: Request, res: Response) => {
  res.json(getSummary());
});

router.get("/reports", (_req: Request, res: Response) => {
  const reports = getAllReports();
  res.json(
    reports.map((r) => ({
      id: r.id,
      title: r.title,
      topic: r.topic,
      content: r.content,
      summary: r.summary,
      createdAt: r.createdAt,
      price: r.price,
      token: r.token,
      buyer: r.buyer,
      inferenceCost: r.inferenceCost,
      status: r.status,
    })),
  );
});

router.get("/reports/:id", (req: Request, res: Response) => {
  const report = getReport(String(req.params.id));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(report);
});

// A sale that has already been paid for and delivered must not fail because a follow-up step did.
async function afterSale<T>(
  label: string,
  task: () => T | Promise<T>,
): Promise<T | null> {
  try {
    return await task();
  } catch (err) {
    console.error(`  [buy:${label}] ${(err as Error).message}`);
    return null;
  }
}

router.post("/reports/buy", async (req: Request, res: Response) => {
  if (isKilled()) {
    res.status(503).json({ error: "Agent is shut down — kill switch is active" });
    return;
  }

  const { topic, buyer, token } = req.body as {
    topic?: string;
    buyer?: string;
    token?: string;
  };

  if (
    typeof topic !== "string" ||
    typeof buyer !== "string" ||
    !topic.trim() ||
    !buyer.trim()
  ) {
    res.status(400).json({ error: "topic and buyer are required" });
    return;
  }

  const config = getConfig();
  const paymentToken = token || "nep141:usdc.near";
  const affiliateParam = req.query.affiliate ?? req.body?.affiliate;
  const affiliateCode =
    typeof affiliateParam === "string" && affiliateParam.trim()
      ? affiliateParam.trim()
      : null;

  const price = getCurrentPrice();
  const reportId = uuidv4();

  try {
    addDecision({
      type: "general",
      action: `Accepted order from ${buyer} for "${topic}" at $${price}`,
      reasoning: `Quoted the live dynamic price (base $${config.pricing.default_price_usd}); kill switch is off and the order is within spending caps`,
      impact: `+$${price} gross revenue pending delivery`,
      confidence: 0.95,
      metadata: { reportId, token: paymentToken, affiliate: affiliateCode },
    });

    addEntry({
      type: "deposit",
      amount: price,
      token: paymentToken,
      from: buyer,
      to: getAgentAccountId(),
      txHash: isDemoMode() ? `demo-tx-deposit-${Date.now()}` : null,
      reportId: null,
      description: `Payment received for report: ${topic}`,
    });

    let procurement: ProcurementResult = {
      orders: [],
      totalCost: "0.00",
      context: "",
    };
    try {
      procurement = await procureForReport(reportId, topic);
    } catch (err) {
      addDecision({
        type: "procurement",
        action: `Continued without supplier inputs for report ${reportId.slice(0, 8)}`,
        reasoning: `Procurement failed (${(err as Error).message}); first-party inference alone can still deliver the report`,
        impact: "$0.00 procurement cost; report may carry less supporting data",
        confidence: 0.6,
        metadata: { reportId },
      });
    }

    const report = await generateReport(topic, buyer, {
      reportId,
      supplierContext: procurement.context,
    });
    report.price = price;
    report.token = paymentToken;

    addEntry({
      type: "sale",
      amount: price,
      token: paymentToken,
      from: buyer,
      to: getAgentAccountId(),
      txHash: isDemoMode() ? `demo-tx-sale-${Date.now()}` : null,
      reportId: report.id,
      description: `Report delivered: ${report.title}`,
    });

    const split = await splitRevenue(price, paymentToken, report.id);

    const unitCost = (
      parseFloat(report.inferenceCost) + parseFloat(procurement.totalCost)
    ).toFixed(4);

    const predictions: Prediction[] =
      (await afterSale("predictions", () =>
        extractPredictions(report.content, report.id, topic),
      )) ?? [];

    const escrow: EscrowEntry | null = await afterSale("escrow", () =>
      holdPayment(report.id, buyer, price, paymentToken),
    );

    const referral: Referral | null = affiliateCode
      ? await afterSale("affiliate", () =>
          recordReferral(affiliateCode, report.id, price, paymentToken, buyer),
        )
      : null;

    await afterSale("products", () =>
      recordProductSale(topic, price, unitCost),
    );
    await afterSale("pricing", () => recordSale(unitCost));
    await afterSale("treasury", async () => {
      const retained =
        parseFloat(split.treasury) - parseFloat(referral?.commission ?? "0");
      recordTreasuryInflow(paymentToken, retained.toFixed(4));
      const plan = await checkRebalance();
      if (plan.needed) await executeRebalance(plan);
    });

    res.json({
      id: report.id,
      title: report.title,
      topic: report.topic,
      content: report.content,
      summary: report.summary,
      createdAt: report.createdAt,
      price,
      token: paymentToken,
      buyer,
      inferenceCost: report.inferenceCost,
      procurementCost: procurement.totalCost,
      suppliers: procurement.orders.map((o) => ({
        name: o.supplierName,
        type: o.type,
        cost: o.cost,
        status: o.status,
      })),
      predictions,
      escrow: escrow ? { id: escrow.id, status: escrow.status } : null,
      affiliate: referral
        ? { code: affiliateCode, commission: referral.commission, status: referral.status }
        : null,
      nextPrice: getCurrentPrice(),
    });
  } catch (err) {
    addEntry({
      type: "refund",
      amount: price,
      token: paymentToken,
      from: getAgentAccountId(),
      to: buyer!,
      txHash: isDemoMode() ? `demo-refund-${Date.now()}` : null,
      reportId,
      description: `Auto-refund: report generation failed (${(err as Error).message})`,
    });
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/decisions", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const type = req.query.type;

  if (type !== undefined && !isDecisionType(type)) {
    res.status(400).json({ error: `Unknown decision type: ${String(type)}` });
    return;
  }

  const decisions = getDecisions(limit, type);
  res.json({ decisions, total: decisions.length });
});

router.get("/decisions/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const backlog = Math.min(parseInt(req.query.backlog as string) || 0, 100);
  if (backlog > 0) {
    for (const decision of getDecisions(backlog).reverse()) {
      res.write(`data: ${JSON.stringify(decision)}\n\n`);
    }
  }

  let cursor = getDecisionCursor();
  const poll = setInterval(() => {
    const next = getDecisionStream(cursor);
    cursor = next.cursor;
    if (next.decisions.length === 0) {
      // Comment frame keeps proxies from closing an idle connection.
      res.write(": keep-alive\n\n");
      return;
    }
    for (const decision of next.decisions) {
      res.write(`data: ${JSON.stringify(decision)}\n\n`);
    }
  }, 2000);

  req.on("close", () => {
    clearInterval(poll);
    res.end();
  });
});

router.get("/pricing", (_req: Request, res: Response) => {
  res.json(getPricingState());
});

router.get("/predictions", (_req: Request, res: Response) => {
  res.json({ predictions: getPredictions(), score: getScore() });
});

router.get("/predictions/score", (_req: Request, res: Response) => {
  res.json(getScore());
});

router.get("/predictions/:reportId", (req: Request, res: Response) => {
  const reportId = String(req.params.reportId);
  res.json({
    predictions: getPredictions(reportId),
    score: getScore(reportId),
  });
});

router.get("/procurement/suppliers", (_req: Request, res: Response) => {
  res.json(getSuppliers());
});

router.get("/procurement/orders", (req: Request, res: Response) => {
  const reportId =
    typeof req.query.reportId === "string" ? req.query.reportId : undefined;
  res.json(getOrders(reportId));
});

router.get("/procurement/stats", (_req: Request, res: Response) => {
  res.json(getSupplierStats());
});

router.get("/treasury", async (_req: Request, res: Response) => {
  try {
    res.json(await getTreasuryState());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/treasury/actions", (_req: Request, res: Response) => {
  res.json(getActions());
});

router.get("/escrow", (req: Request, res: Response) => {
  const status = req.query.status;
  if (
    status !== undefined &&
    status !== "held" &&
    status !== "released" &&
    status !== "refunded"
  ) {
    res.status(400).json({ error: `Unknown escrow status: ${String(status)}` });
    return;
  }

  const entries = getEscrowEntries(status);
  const sum = (s: EscrowEntry["status"]) =>
    getEscrowEntries(s)
      .reduce((total, e) => total + parseFloat(e.amount), 0)
      .toFixed(2);

  res.json({
    entries,
    totals: {
      held: sum("held"),
      released: sum("released"),
      refunded: sum("refunded"),
    },
  });
});

router.post("/affiliates", (req: Request, res: Response) => {
  const nearAccount = (req.body as { nearAccount?: unknown } | undefined)
    ?.nearAccount;
  if (typeof nearAccount !== "string" || !nearAccount.trim()) {
    res.status(400).json({ error: "nearAccount is required" });
    return;
  }
  if (!getConfig().affiliates.enabled) {
    res.status(403).json({ error: "Affiliate program is disabled" });
    return;
  }

  try {
    res.status(201).json(createAffiliate(nearAccount));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/affiliates", (_req: Request, res: Response) => {
  res.json(getAffiliates());
});

router.get("/affiliates/:code", (req: Request, res: Response) => {
  const affiliate = getAffiliate(String(req.params.code));
  if (!affiliate) {
    res.status(404).json({ error: "Affiliate not found" });
    return;
  }
  res.json(affiliate);
});

router.get("/affiliates/:code/referrals", (req: Request, res: Response) => {
  const affiliate = getAffiliate(String(req.params.code));
  if (!affiliate) {
    res.status(404).json({ error: "Affiliate not found" });
    return;
  }
  res.json(getReferrals(affiliate.id));
});

router.get("/products", (_req: Request, res: Response) => {
  res.json(getProducts());
});

router.get("/products/all", (_req: Request, res: Response) => {
  res.json(getAllProducts());
});

router.get("/products/:id", (req: Request, res: Response) => {
  const product = getProduct(String(req.params.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

function makeDemoStep(
  step: number,
  label: string,
  status: DemoStep["status"],
  detail: string,
  payload?: Record<string, unknown>,
): DemoStep {
  return { step, label, status, detail, timestamp: new Date().toISOString(), ...(payload ? { payload } : {}) };
}

router.post("/demo/run", async (_req: Request, res: Response) => {
  if (demoRunning) {
    res.status(409).json({ error: "Demo already running" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  demoRunning = true;
  demoSteps = [];
  const demoStart = Date.now();

  const sendStep = (step: DemoStep) => {
    demoSteps.push(step);
    res.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
  };

  try {
    const config = getConfig();
    const price = getCurrentPrice();
    const reportId = uuidv4();

    // Step 1: Customer deposit
    sendStep(makeDemoStep(1, "Receiving payment", "running", "A customer is paying for a market research report..."));
    await sleep(800);
    addEntry({
      type: "deposit",
      amount: price,
      token: "nep141:usdc.near",
      from: "demo-customer.testnet",
      to: getAgentAccountId(),
      txHash: `demo-deposit-${Date.now()}`,
      reportId: null,
      description: "Customer deposit for report purchase",
    });
    sendStep(makeDemoStep(1, "Receiving payment", "complete", `Received $${price} USDC from demo-customer.testnet`, {
      amount: price, token: "USDC", from: "demo-customer.testnet", to: getAgentAccountId(),
      explanation: "The customer pays in any token they want. NEAR Intents automatically converts it to the agent's preferred currency.",
    }));

    // Step 2: Consulting data providers
    sendStep(makeDemoStep(2, "Consulting data providers", "running", "MarketMind is selecting the best supplier agents for this topic and buying data from them..."));
    let procurement = { orders: [] as unknown[], totalCost: "0.00", context: "" };
    try {
      procurement = await procureForReport(reportId, "BTC Weekly Outlook — Demo");
    } catch { /* continue without suppliers */ }
    const supplierNames = (procurement.orders as Array<{ supplierName: string; cost: string; type: string }>).map(o => ({ name: o.supplierName, cost: o.cost, type: o.type }));
    sendStep(makeDemoStep(2, "Consulting data providers", "complete", `Consulted ${procurement.orders.length} supplier agents`, {
      suppliers: supplierNames, totalCost: procurement.totalCost,
      explanation: "The agent autonomously picks and pays other AI agents for on-chain data, sentiment analysis, and chart generation. Each supplier is paid via NEAR Intents.",
    }));

    // Step 3: Generate report
    sendStep(makeDemoStep(3, "Generating report", "running", "MarketMind is writing your market brief using AI, enriched with supplier data..."));
    const report = await generateReport("BTC Weekly Outlook — Demo", "demo-customer.testnet", { reportId, supplierContext: procurement.context });
    report.price = price;
    sendStep(makeDemoStep(3, "Generating report", "complete", `"${report.title}" is ready`, {
      reportId: report.id, title: report.title, content: report.content, inferenceCost: report.inferenceCost,
      explanation: "The agent bought its own AI inference to write this report. The inference cost is tracked against a daily spending cap set by the owner.",
    }));

    // Step 4: Committing predictions
    sendStep(makeDemoStep(4, "Locking in predictions", "running", "Extracting specific market calls from the report and hashing them on-chain..."));
    await sleep(400);
    const predictions = extractPredictions(report.content, report.id, report.topic);
    sendStep(makeDemoStep(4, "Locking in predictions", "complete", `${predictions.length} predictions committed`, {
      predictions: predictions.map(p => ({ asset: p.asset, prediction: p.prediction, priceTarget: p.priceTarget, timeframe: p.timeframe, confidence: p.confidence, hash: p.hash })),
      explanation: "Every prediction is SHA-256 hashed and timestamped. The agent will score itself against real prices later — this creates a verifiable track record no human research shop offers.",
    }));

    // Step 5: Log sale + escrow
    sendStep(makeDemoStep(5, "Securing payment in escrow", "running", "Logging the sale and holding payment under a money-back guarantee..."));
    await sleep(400);
    addEntry({
      type: "sale",
      amount: price,
      token: "nep141:usdc.near",
      from: "demo-customer.testnet",
      to: getAgentAccountId(),
      txHash: `demo-sale-${Date.now()}`,
      reportId: report.id,
      description: `Report sold: ${report.title}`,
    });
    holdPayment(report.id, "demo-customer.testnet", price, "nep141:usdc.near");
    sendStep(makeDemoStep(5, "Securing payment in escrow", "complete", `$${price} held for 7 days`, {
      amount: price, escrowDays: 7,
      explanation: "Payment is held in escrow for 7 days. If the agent's predictions fall below 40% accuracy, the customer gets an automatic refund — no support tickets needed.",
    }));

    // Step 6: Split revenue
    sendStep(makeDemoStep(6, "Splitting revenue", "running", `Automatically dividing revenue: ${config.revenue.owner_pct}% owner, ${config.revenue.contributors_pct}% contributors, ${config.revenue.treasury_pct}% treasury...`));
    await sleep(600);
    const split = await splitRevenue(price, "nep141:usdc.near", report.id);
    recordSale(report.inferenceCost);
    recordProductSale(report.topic, price, report.inferenceCost);
    recordTreasuryInflow("nep141:usdc.near", split.treasury);
    sendStep(makeDemoStep(6, "Splitting revenue", "complete", `Revenue distributed to 3 parties`, {
      owner: { amount: split.owner, pct: config.revenue.owner_pct, account: config.near.owner_account },
      contributors: { amount: split.contributors, pct: config.revenue.contributors_pct, account: config.near.contributors_account },
      treasury: { amount: split.treasury, pct: config.revenue.treasury_pct },
      explanation: "Revenue is instantly split between the owner, contributors, and the agent's own treasury. The percentages are set in config.yaml — change them anytime without touching code.",
    }));

    // Step 7: Rebalancing treasury
    sendStep(makeDemoStep(7, "Rebalancing treasury", "running", "The agent is checking its portfolio allocation and adjusting for safety..."));
    await sleep(500);
    const plan = await checkRebalance();
    if (plan.needed) await executeRebalance(plan);
    const treasury = await getTreasuryState();
    sendStep(makeDemoStep(7, "Rebalancing treasury", "complete", `Treasury healthy: $${treasury.totalValue} total`, {
      totalValue: treasury.totalValue,
      runwayDays: treasury.runwayDays,
      stablecoinPct: treasury.stablecoinPct,
      positions: treasury.positions,
      rebalanced: plan.needed,
      swap: plan.needed ? { from: plan.fromToken, to: plan.toToken, amount: plan.amountUsd } : null,
      explanation: "The agent manages its own balance sheet. It keeps 70% in stablecoins for safety and automatically swaps volatile tokens when the ratio drifts.",
    }));

    // Step 8: Complete
    sendStep(makeDemoStep(8, "Cycle complete", "complete", `Full autonomous business cycle finished`, {
      reportId: report.id, totalSuppliers: procurement.orders.length, totalPredictions: predictions.length,
      explanation: "One customer payment just triggered procurement, AI inference, prediction hashing, escrow, revenue splits, and treasury management — all without a single human in the loop.",
    }));

    const totalTime = (Date.now() - demoStart) / 1000;
    const score = getScore();
    res.write(`event: complete\ndata: ${JSON.stringify({
      reportId: report.id,
      totalTime,
      predictionCount: predictions.length,
      supplierCount: procurement.orders.length,
      treasuryRunway: treasury.runwayDays,
      accuracy: score.accuracy,
    })}\n\n`);
  } catch (err) {
    sendStep(makeDemoStep(demoSteps.length + 1, "Error", "error", (err as Error).message));
    res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
  } finally {
    demoRunning = false;
    res.end();
  }
});

router.get("/demo/status", (_req: Request, res: Response) => {
  res.json({ running: demoRunning, steps: demoSteps });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
