import { env } from '../config/env.js';
import { button, esc, sendEmail } from '../utils/email.js';

export const targetOf = (m) => (m.type === 'http' ? m.url : m.type === 'tcp' ? `${m.host}:${m.port}` : m.hostname);
const link = (m) => (env.appUrl ? `${env.appUrl}/monitors/${m.id}` : '');
const fmtDuration = (sec) => {
  if (sec < 60) return `${sec} s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  return `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min`;
};

export function sendDownAlert(owner, monitor, reason) {
  return sendEmail({
    to: owner.email, name: owner.name, subject: `[DOWN] ${monitor.name}`,
    html: `<h2 style="color:#b42318">${esc(monitor.name)} is DOWN</h2><p><strong>Target:</strong> ${esc(targetOf(monitor))}<br><strong>Reason:</strong> ${esc(reason || 'Check failed')}<br><strong>Detected:</strong> ${new Date().toUTCString()}</p>${link(monitor) ? button(link(monitor), 'View monitor') : ''}`,
    text: `${monitor.name} is DOWN. Target: ${targetOf(monitor)}. Reason: ${reason || 'Check failed'}.`,
  });
}

export function sendRecoveryAlert(owner, monitor, downtimeSec) {
  return sendEmail({
    to: owner.email, name: owner.name, subject: `[UP] ${monitor.name} is back`,
    html: `<h2 style="color:#05603a">${esc(monitor.name)} is back UP</h2><p><strong>Target:</strong> ${esc(targetOf(monitor))}<br><strong>Downtime:</strong> ${fmtDuration(downtimeSec)}</p>${link(monitor) ? button(link(monitor), 'View monitor') : ''}`,
    text: `${monitor.name} is back UP after ${fmtDuration(downtimeSec)}.`,
  });
}
