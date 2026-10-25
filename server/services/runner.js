import { CheckResult, Incident, Monitor, User } from '../models/index.js';
import { performCheck } from './checker.js';
import { sendDownAlert, sendRecoveryAlert } from './alerts.js';

const minutes = (n) => n * 60 * 1000;

/** Runs one check, stores the result, updates the monitor's state and sends alerts on changes. */
export async function recordCheck(monitor) {
  const result = await performCheck(monitor);
  const now = new Date();
  await CheckResult.create({
    monitor: monitor._id, ok: result.ok, latencyMs: result.latency ?? null,
    statusCode: result.statusCode ?? null, error: result.ok ? '' : result.error || '', checkedAt: now,
  });

  const update = {
    lastCheckedAt: now, lastLatencyMs: result.ok ? result.latency : null,
    lastStatusCode: result.statusCode ?? null, lastError: result.ok ? '' : result.error || '',
  };
  let transition = null;

  if (result.ok) {
    update.consecutiveFailures = 0;
    update.nextCheckAt = new Date(now.getTime() + minutes(monitor.intervalMinutes));
    if (monitor.status !== 'up') {
      update.status = 'up';
      update.statusSince = now;
      if (monitor.status === 'down') transition = 'recovered';
    }
  } else {
    const failures = monitor.consecutiveFailures + 1;
    update.consecutiveFailures = failures;
    // A monitor that was UP needs 2 failures in a row (retried after 1 minute) to avoid false alarms.
    const threshold = monitor.status === 'up' ? 2 : 1;
    if (failures >= threshold && monitor.status !== 'down') {
      update.status = 'down';
      update.statusSince = now;
      transition = 'down';
    }
    const retrySoon = monitor.status === 'up' && failures < threshold;
    update.nextCheckAt = new Date(now.getTime() + minutes(retrySoon ? 1 : monitor.intervalMinutes));
  }

  const updated = await Monitor.findByIdAndUpdate(monitor._id, { $set: update }, { new: true });
  if (!updated || !transition) return updated;

  const owner = await User.findById(updated.owner);
  if (transition === 'down') {
    await Incident.create({ monitor: updated._id, owner: updated.owner, startedAt: now, reason: update.lastError });
    if (updated.alertsEnabled && owner) await sendDownAlert(owner, updated, update.lastError);
  } else {
    const incident = await Incident.findOneAndUpdate({ monitor: updated._id, resolvedAt: null }, [
      { $set: { resolvedAt: now, durationSec: { $round: [{ $divide: [{ $subtract: [now, '$startedAt'] }, 1000] }, 0] } } },
    ], { new: true });
    if (updated.alertsEnabled && owner) {
      await sendRecoveryAlert(owner, updated, incident?.durationSec ?? Math.round((now - monitor.statusSince) / 1000));
    }
  }
  return updated;
}

/** Runs every monitor that is due. Safe to run from several places at once: each monitor is claimed atomically. */
export async function runDueChecks({ limit = 40, concurrency = 8 } = {}) {
  const now = new Date();
  const due = await Monitor.find({ paused: false, nextCheckAt: { $lte: now } }).sort({ nextCheckAt: 1 }).limit(limit);
  let next = 0;
  let ran = 0;
  async function worker() {
    while (next < due.length) {
      const m = due[next++];
      const claimed = await Monitor.findOneAndUpdate(
        { _id: m._id, paused: false, nextCheckAt: m.nextCheckAt },
        { $set: { nextCheckAt: new Date(now.getTime() + minutes(m.intervalMinutes)) } },
        { new: true },
      );
      if (!claimed) continue; // someone else took it
      try { await recordCheck(claimed); ran += 1; } catch (err) { console.error(`Check failed for ${m.id}:`, err.message); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) }, worker));
  return { due: due.length, ran };
}
