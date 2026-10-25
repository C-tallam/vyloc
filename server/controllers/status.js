import { CheckResult, Monitor, User } from '../models/index.js';
import { wrap } from '../middleware/errorHandler.js';

export const getSettings = (req, res) => res.json({ slug: req.user.statusSlug || '', title: req.user.statusTitle || '' });

export const updateSettings = wrap(async (req, res) => {
  const { slug, title } = req.body;
  if (slug && (await User.exists({ statusSlug: slug, _id: { $ne: req.user._id } }))) {
    return res.status(409).json({ error: 'That status page address is already taken' });
  }
  req.user.statusSlug = slug || undefined;
  req.user.statusTitle = title;
  await req.user.save();
  return res.json({ slug: req.user.statusSlug || '', title: req.user.statusTitle });
});

// Public. Shows names and health only: never targets, errors or ids.
export const publicStatus = wrap(async (req, res) => {
  const user = await User.findOne({ statusSlug: String(req.params.slug).toLowerCase() });
  if (!user) return res.status(404).json({ error: 'Status page not found' });

  const monitors = await Monitor.find({ owner: user._id, isPublic: true, paused: false }).sort({ name: 1 });
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const rows = await CheckResult.aggregate([
    { $match: { monitor: { $in: monitors.map((m) => m._id) }, checkedAt: { $gte: since } } },
    { $group: { _id: '$monitor', total: { $sum: 1 }, ok: { $sum: { $cond: ['$ok', 1, 0] } } } },
  ]);
  const uptime = new Map(rows.map((r) => [String(r._id), r.total ? Math.round((r.ok / r.total) * 10000) / 100 : null]));

  const items = monitors.map((m) => ({
    name: m.name, type: m.type, status: m.status, statusSince: m.statusSince,
    lastCheckedAt: m.lastCheckedAt, uptime30d: uptime.get(String(m._id)) ?? null,
  }));
  const down = items.filter((i) => i.status === 'down').length;
  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    title: user.statusTitle || 'Service status',
    overall: down === 0 ? 'operational' : down === items.length ? 'outage' : 'degraded',
    monitors: items,
  });
});
