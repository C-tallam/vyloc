import dns from 'node:dns/promises';

// Common throwaway-mail domains (not exhaustive). Email verification is the real safeguard.
const DISPOSABLE = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', '10minutemail.net',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'throwawaymail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'fakeinbox.com', 'mailnesia.com', 'mintemail.com', 'spamgourmet.com', 'tempail.com', 'emailondeck.com',
  'mohmal.com', 'moakt.com', 'tmpmail.org', 'burnermail.io', 'discard.email', 'mytemp.email', 'inboxkitten.com',
  'harakirimail.com', 'tempr.email', 'byom.de',
];
const MISSING = new Set(['ENODATA', 'ENOTFOUND']);
const withTimeout = (p, ms = 4000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms))]);

export async function checkEmailDomain(email) {
  const domain = email.split('@')[1].toLowerCase();
  if (DISPOSABLE.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { ok: false, reason: 'Disposable email addresses are not allowed. Please use your real email address.' };
  }
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx.some((r) => r.exchange)) return { ok: true };
  } catch (err) { if (!MISSING.has(err.code)) return { ok: true }; }
  try {
    const a = await withTimeout(dns.resolve4(domain));
    if (a.length) return { ok: true };
  } catch (err) { if (!MISSING.has(err.code)) return { ok: true }; }
  return { ok: false, reason: 'That email domain cannot receive mail. Please check the address for typos.' };
}
