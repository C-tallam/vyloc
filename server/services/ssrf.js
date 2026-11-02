import dns from 'node:dns';
import dnsp from 'node:dns/promises';
import net from 'node:net';

// Addresses that must never be reachable through a monitor (SSRF protection).
const blocked = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([a, p]) => blocked.addSubnet(a, p, 'ipv4'));
[
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96],
].forEach(([a, p]) => blocked.addSubnet(a, p, 'ipv6'));

// Note: Node's BlockList treats every IPv4 address as IPv4-mapped IPv6, so '::ffff:0:0/96' must NOT be added as a rule
// (it would block all of IPv4). IPv4-mapped IPv6 addresses are unwrapped and checked as IPv4 instead.
export function isBlockedIp(ip) {
  if (!net.isIPv6(ip)) return blocked.check(ip, 'ipv4');
  let v6;
  try { v6 = new URL(`http://[${ip}]/`).hostname.slice(1, -1).toLowerCase(); } catch { return true; } // unparseable: refuse
  if (v6.startsWith('::ffff:')) {
    const rest = v6.slice(7);
    let v4 = rest;
    if (!rest.includes('.')) {
      const [h1, h2] = rest.split(':').map((h) => parseInt(h, 16));
      v4 = `${h1 >> 8}.${h1 & 255}.${h2 >> 8}.${h2 & 255}`;
    }
    return blocked.check(v4, 'ipv4');
  }
  return blocked.check(v6, 'ipv6');
}

export class TargetError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

/**
 * DNS lookup used for the REAL connection. Because the check happens on the address that is
 * actually connected to, DNS rebinding and tricky hostnames cannot slip past it.
 */
export function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return callback(err);
    if (addrs.some((a) => isBlockedIp(a.address))) {
      const e = new Error('Target resolves to a private or reserved address');
      e.code = 'EBLOCKED';
      return callback(e);
    }
    if (options.all) return callback(null, addrs);
    return callback(null, addrs[0].address, addrs[0].family);
  });
}

// Used when a monitor is saved, to give a friendly error early.
export async function assertPublicHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (net.isIP(h)) {
    if (isBlockedIp(h)) throw new TargetError('Private, local and reserved addresses cannot be monitored.');
    return;
  }
  if (!h.includes('.') || /\.(local|localhost|internal|lan|home|corp|intranet)$/.test(h)) {
    throw new TargetError('Enter a full public domain name or IP address.');
  }
  try {
    const addrs = await dnsp.lookup(h, { all: true });
    if (addrs.some((a) => isBlockedIp(a.address))) throw new TargetError('That host resolves to a private or reserved address.');
  } catch (err) {
    if (err instanceof TargetError) throw err;
    // Not resolvable right now: allowed, it will simply show as DOWN.
  }
}

export async function assertPublicTarget(data) {
  if (data.type === 'http') return assertPublicHost(new URL(data.url).hostname);
  if (data.type === 'tcp') return assertPublicHost(data.host);
  return assertPublicHost(data.hostname);
}
