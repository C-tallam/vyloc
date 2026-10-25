// One-shot: runs every monitor that is due, then exits. Used by the GitHub Actions schedule.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runDueChecks } from '../services/runner.js';

try {
  await connectDB();
  const r = await runDueChecks({ limit: 200, concurrency: 10 });
  console.log(`Checks done: ${r.ran} run, ${r.due} were due.`);
} catch (err) {
  console.error('Run failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
