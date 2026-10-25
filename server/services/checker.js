import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dns from 'node:dns/promises';
import { performance } from 'node:perf_hooks';
import { isBlockedIp, safeLookup } from './ssrf.js';

const TIMEOUT_MS = 10000;
const ERRORS = {
  ECONNREFUSED: 'Connection refused', ECONNRESET: 'Connection reset by peer', ETIMEDOUT: 'Connection timed out',
  ENOTFOUND: 'DNS lookup failed (host not found)', EAI_AGAIN: 'DNS lookup failed (temporary error)',
  EHOSTUNREACH: 'Host unreachable', ENETUNREACH: 'Network unreachable',
  EBLOCKED: 'Blocked: target is a private or reserved address',
  ENODATA: 'No DNS records found', ESERVFAIL: 'DNS server failure', ETIMEOUT: 'Timed out after 10 s',
  CERT_HAS_EXPIRED: 'TLS certificate has expired', DEPTH_ZERO_SELF_SIGNED_CERT: 'TLS certificate is self-signed',
  SELF_SIGNED_CERT_IN_CHAIN: 'TLS certificate chain contains a self-signed certificate',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'TLS certificate could not be verified',
  ERR_TLS_CERT_ALTNAME_INVALID: 'TLS certificate does not match the hostname',
};
const describe = (err) =>
  err.name === 'AbortError' || err.code === 'ABORT_ERR' ? 'Timed out after 10 s' : ERRORS[err.code] || String(err.message || 'Check failed').slice(0, 200);
const stripBrackets = (h) => h.replace(/^\[|\]$/g, '');

export function checkHttp(rawUrl) {
  return new Promise((resolve) => {
    let url;
    try { url = new URL(rawUrl); } catch { return resolve({ ok: false, error: 'Invalid URL' }); }
    if (!['http:', 'https:'].includes(url.protocol)) return resolve({ ok: false, error: 'Only http and https are supported' });
    const host = stripBrackets(url.hostname);
    if (net.isIP(host) && isBlockedIp(host)) return resolve({ ok: false, error: ERRORS.EBLOCKED });

    const lib = url.protocol === 'https:' ? https : http;
    const start = performance.now();
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    // Redirects are NOT followed (each hop would need the same safety checks): 2xx and 3xx count as UP.
    const req = lib.request(url, {
      method: 'GET', lookup: safeLookup, signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'VYLOC-Monitor/1.0', Accept: '*/*' },
    }, (res) => {
      const latency = Math.round(performance.now() - start);
      const code = res.statusCode;
      res.destroy();
      const ok = code >= 200 && code < 400;
      finish(ok ? { ok, latency, statusCode: code } : { ok, latency, statusCode: code, error: `HTTP ${code}` });
    });
    req.on('error', (err) => finish({ ok: false, error: describe(err) }));
    req.end();
  });
}

export function checkTcp(hostRaw, port) {
  return new Promise((resolve) => {
    const host = stripBrackets(hostRaw);
    if (net.isIP(host) && isBlockedIp(host)) return resolve({ ok: false, error: ERRORS.EBLOCKED });
    const start = performance.now();
    const socket = net.connect({ host, port, lookup: safeLookup, timeout: TIMEOUT_MS });
    let done = false;
    const finish = (r) => { if (!done) { done = true; socket.destroy(); resolve(r); } };
    socket.once('connect', () => finish({ ok: true, latency: Math.round(performance.now() - start) }));
    socket.once('timeout', () => finish({ ok: false, error: ERRORS.ETIMEOUT }));
    socket.once('error', (err) => finish({ ok: false, error: describe(err) }));
  });
}

export async function checkDns(hostname) {
  const start = performance.now();
  const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), TIMEOUT_MS))]);
  try {
    let records = [];
    try { records = await withTimeout(dns.resolve4(hostname)); } catch (e) { if (e.code !== 'ENODATA') throw e; }
    if (!records.length) records = await withTimeout(dns.resolve6(hostname));
    return { ok: records.length > 0, latency: Math.round(performance.now() - start) };
  } catch (err) {
    return { ok: false, error: err.code === 'ENOTFOUND' ? 'Domain not found (NXDOMAIN)' : describe(err) };
  }
}

export async function performCheck(monitor) {
  try {
    if (monitor.type === 'http') return await checkHttp(monitor.url);
    if (monitor.type === 'tcp') return await checkTcp(monitor.host, monitor.port);
    return await checkDns(monitor.hostname);
  } catch (err) {
    return { ok: false, error: describe(err) };
  }
}
