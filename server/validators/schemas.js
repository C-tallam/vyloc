import { z } from 'zod';
import { INTERVALS } from '../models/index.js';

const text = (max, min = 0) => z.string().trim().min(min).max(max);
const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  name: text(80, 2), email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters'),
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(200) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72, 'New password must be at most 72 characters'),
}).refine((o) => o.currentPassword !== o.newPassword, { message: 'New password must be different', path: ['newPassword'] });
export const verifyEmailSchema = z.object({ token: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid token') });
export const resendSchema = z.object({ email });

// ---- monitors ----
const url = text(2048, 1)
  .refine((u) => /^https?:\/\//i.test(u), 'Must start with http:// or https://')
  .refine((u) => { try { const x = new URL(u); return !x.username && !x.password; } catch { return false; } }, 'Enter a valid URL without a username or password');
const host = text(253, 1).regex(/^[a-z0-9.\-:[\]]+$/i, 'Enter a valid host name or IP address');
const port = z.number().int().min(1).max(65535);
const interval = z.union(INTERVALS.map((n) => z.literal(n)));
const common = {
  name: text(80, 1),
  intervalMinutes: interval.default(5),
  isPublic: z.boolean().default(false),
  alertsEnabled: z.boolean().default(true),
  paused: z.boolean().default(false),
};
export const monitorSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('http'), url, ...common }),
  z.object({ type: z.literal('tcp'), host, port, ...common }),
  z.object({ type: z.literal('dns'), hostname: host, ...common }),
]);
export const monitorPatchSchema = z.object({
  name: common.name, url, host, port, hostname: host,
  intervalMinutes: interval, isPublic: z.boolean(), alertsEnabled: z.boolean(), paused: z.boolean(),
}).partial().refine((o) => Object.keys(o).length > 0, 'Nothing to update');

export const rangeQuerySchema = z.object({ range: z.enum(['24h', '7d', '30d']).default('24h') });
export const statusPageSchema = z.object({
  slug: z.union([z.literal(''), z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/, 'Use 3-40 letters, numbers or hyphens')]),
  title: text(80),
});
