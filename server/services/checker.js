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

// Two lookups run at the same time and the DOMAIN IS UP if either one resolves it:
//  1. a direct query to public resolvers (not affected by the local network's DNS settings)
//  2. the operating system's own resolver (works when direct DNS queries are blocked by the network)
const PUBLIC_RESOLVERS = ['1.1.1.1', '8.8.8.8'];

async function viaPublicResolvers(hostname) {
  const resolver = new dns.Resolver({ timeout: 2500, tries: 1 });
  resolver.setServers(PUBLIC_RESOLVERS);
  let records = [];
  try { records = await resolver.resolve4(hostname); } catch (e) { if (e.code !== 'ENODATA') throw e; }
  if (!records.length) records = await resolver.resolve6(hostname);
  if (!records.length) throw Object.assign(new Error('no records'), { code: 'ENODATA' });
  return true;
}

async function viaSystemResolver(hostname) {
  const addrs = await dns.lookup(hostname, { all: true });
  if (!addrs.length) throw Object.assign(new Error('no records'), { code: 'ENODATA' });
  return true;
}

export async function checkDns(hostname) {
  const start = performance.now();
  const timeout = new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), TIMEOUT_MS));
  try {
    await Promise.race([Promise.any([viaPublicResolvers(hostname), viaSystemResolver(hostname)]), timeout]);
    return { ok: true, latency: Math.round(performance.now() - start) };
  } catch (err) {
    const errors = err instanceof AggregateError ? err.errors : [err];
    const code = ['ENOTFOUND', 'ENODATA'].find((c) => errors.some((e) => e.code === c));
    if (code === 'ENOTFOUND') return { ok: false, error: 'Domain not found (NXDOMAIN)' };
    if (code === 'ENODATA') return { ok: false, error: ERRORS.ENODATA };
    return { ok: false, error: describe(errors[0]) };
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
