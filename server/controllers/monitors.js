import { CheckResult, Incident, Monitor } from '../models/index.js';
import { wrap } from '../middleware/errorHandler.js';
import { monitorSchema, rangeQuerySchema } from '../validators/schemas.js';
import { assertPublicTarget } from '../services/ssrf.js';
import { recordCheck } from '../services/runner.js';

const MAX_MONITORS = 20;
const HOURS = 3600 * 1000;
const round2 = (n) => Math.round(n * 100) / 100;

async function statsByMonitor(ids, since) {
  const rows = await CheckResult.aggregate([
    { $match: { monitor: { $in: ids }, checkedAt: { $gte: since } } },
    { $group: { _id: '$monitor', total: { $sum: 1 }, ok: { $sum: { $cond: ['$ok', 1, 0] } }, avg: { $avg: '$latencyMs' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), {
    uptime: r.total ? round2((r.ok / r.total) * 100) : null,
    avgLatency: r.avg == null ? null : Math.round(r.avg),
    checks: r.total,
  }]));
}

async function owned(req, res) {
  const m = await Monitor.findOne({ _id: req.params.id, owner: req.user._id });
  if (!m) res.status(404).json({ error: 'Monitor not found' });
  return m;
}

export const listMonitors = wrap(async (req, res) => {
  const monitors = await Monitor.find({ owner: req.user._id }).sort({ createdAt: -1 });
  const stats = await statsByMonitor(monitors.map((m) => m._id), new Date(Date.now() - 24 * HOURS));
  res.json(monitors.map((m) => {
    const s = stats.get(String(m._id));
    return { ...m.toJSON(), uptime24h: s?.uptime ?? null, avgLatency24h: s?.avgLatency ?? null };
  }));
});

export const getMonitor = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  const [d1, d7, d30] = await Promise.all([1, 7, 30].map((d) => statsByMonitor([m._id], new Date(Date.now() - d * 24 * HOURS))));
  const pick = (map) => map.get(String(m._id)) || { uptime: null, avgLatency: null, checks: 0 };
  res.json({ ...m.toJSON(), stats: { '24h': pick(d1), '7d': pick(d7), '30d': pick(d30) } });
});

export const createMonitor = wrap(async (req, res) => {
  const data = req.body;
  if ((await Monitor.countDocuments({ owner: req.user._id })) >= MAX_MONITORS) {
    return res.status(400).json({ error: `You can have up to ${MAX_MONITORS} monitors.` });
  }
  await assertPublicTarget(data);
  const monitor = await Monitor.create({ ...data, owner: req.user._id });
  const checked = data.paused ? monitor : await recordCheck(monitor);
  return res.status(201).json(checked || monitor);
});

export const updateMonitor = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  const merged = monitorSchema.parse({
    type: m.type, name: m.name, url: m.url, host: m.host, port: m.port, hostname: m.hostname,
    intervalMinutes: m.intervalMinutes, isPublic: m.isPublic, alertsEnabled: m.alertsEnabled, paused: m.paused,
    ...req.body,
  });
  await assertPublicTarget(merged);

  const targetChanged = ['url', 'host', 'port', 'hostname'].some((k) => k in merged && merged[k] !== m[k]);
  const resumed = m.paused && !merged.paused;
  m.set(merged);
  if (targetChanged) { m.status = 'pending'; m.statusSince = new Date(); m.consecutiveFailures = 0; m.lastError = ''; }
  if (targetChanged || resumed) m.nextCheckAt = new Date();
  await m.save();
  res.json(m);
});

export const deleteMonitor = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  await Promise.all([CheckResult.deleteMany({ monitor: m._id }), Incident.deleteMany({ monitor: m._id }), m.deleteOne()]);
  res.status(204).end();
});

export const checkNow = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  res.json(await recordCheck(m));
});

const RANGES = {
  '24h': { ms: 24 * HOURS, unit: 'minute', bin: 15 },
  '7d': { ms: 7 * 24 * HOURS, unit: 'hour', bin: 1 },
  '30d': { ms: 30 * 24 * HOURS, unit: 'hour', bin: 6 },
};

export const monitorSeries = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  const r = RANGES[rangeQuerySchema.parse(req.query).range];
  const rows = await CheckResult.aggregate([
    { $match: { monitor: m._id, checkedAt: { $gte: new Date(Date.now() - r.ms) } } },
    { $group: {
      _id: { $dateTrunc: { date: '$checkedAt', unit: r.unit, binSize: r.bin } },
      checks: { $sum: 1 }, ok: { $sum: { $cond: ['$ok', 1, 0] } }, avgLatency: { $avg: '$latencyMs' },
    } },
    { $sort: { _id: 1 } },
  ]);
  res.json(rows.map((x) => ({
    t: x._id, checks: x.checks, uptime: round2((x.ok / x.checks) * 100),
    avgLatency: x.avgLatency == null ? null : Math.round(x.avgLatency),
  })));
});

export const recentChecks = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  const rows = await CheckResult.find({ monitor: m._id }).sort({ checkedAt: -1 }).limit(25);
  res.json(rows.map((c) => ({ id: c.id, ok: c.ok, latencyMs: c.latencyMs, statusCode: c.statusCode, error: c.error, checkedAt: c.checkedAt })));
});

export const monitorIncidents = wrap(async (req, res) => {
  const m = await owned(req, res);
  if (!m) return;
  res.json(await Incident.find({ monitor: m._id }).sort({ startedAt: -1 }).limit(20));
});

export const allIncidents = wrap(async (req, res) => {
  res.json(await Incident.find({ owner: req.user._id }).sort({ startedAt: -1 }).limit(30).populate('monitor', 'name type'));
});
