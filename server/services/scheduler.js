import { runDueChecks } from './runner.js';

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const r = await runDueChecks();
    if (r.ran) console.log(`Scheduler: ran ${r.ran} check(s)`);
  } catch (err) {
    console.error('Scheduler error:', err.message);
  } finally {
    running = false;
  }
}

// In-process scheduler for local development (production uses the GitHub Actions workflow).
export function startScheduler() {
  setTimeout(tick, 5000);
  return setInterval(tick, 60 * 1000);
}
