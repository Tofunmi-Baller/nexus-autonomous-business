import { isDemoMode, isKilled } from "../config.js";
import { checkEscrows } from "./escrow.js";
import { resolvePredictions } from "./predictions.js";
import { adjustPrice } from "./pricing-engine.js";
import { evaluateTrends } from "./product-manager.js";

const timers: NodeJS.Timeout[] = [];

function every(
  label: string,
  intervalMs: number,
  task: () => unknown | Promise<unknown>,
): void {
  const timer = setInterval(() => {
    if (isKilled()) return;
    Promise.resolve()
      .then(task)
      .catch((err: unknown) => {
        console.error(`  [scheduler:${label}] ${(err as Error).message}`);
      });
  }, intervalMs);
  timer.unref();
  timers.push(timer);
}

export function startAutonomousLoops(): void {
  if (timers.length > 0) return;

  const demo = isDemoMode();
  every("pricing", 60_000, adjustPrice);
  every("settlement", demo ? 15_000 : 60_000, async () => {
    resolvePredictions();
    await checkEscrows();
  });
  every("products", demo ? 60_000 : 10 * 60_000, evaluateTrends);
}

export function stopAutonomousLoops(): void {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
}
