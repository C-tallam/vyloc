export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' }) : 'n/a');
export const fmtShortTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
export const fmtShortDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function fmtDuration(sec) {
  if (sec == null) return 'n/a';
  if (sec < 60) return `${sec} s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const fmtMs = (n) => (n == null ? 'n/a' : `${n} ms`);
export const fmtPct = (n) => (n == null ? 'n/a' : `${n}%`);
export const TYPE_LABEL = { http: 'HTTP', tcp: 'TCP', dns: 'DNS' };
export const targetOf = (m) => (m.type === 'http' ? m.url : m.type === 'tcp' ? `${m.host}:${m.port}` : m.hostname);
export const INTERVALS = [5, 10, 15, 30, 60];
