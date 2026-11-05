import { Link } from 'react-router-dom';
import StatusLabel, { monitorStatus } from './StatusLabel.jsx';
import { TYPE_LABEL, fmtMs, fmtPct, targetOf, timeAgo } from '../utils.js';

export default function MonitorTable({ items }) {
  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th>Status</th><th>Name</th><th>Type</th><th>Target</th>
            <th className="num">Uptime 24h</th><th className="num">Avg latency 24h</th><th>Last check</th><th className="num">Every</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id}>
              <td data-label="Status"><StatusLabel status={monitorStatus(m)} /></td>
              <td className="name-cell"><Link to={`/monitors/${m.id}`}>{m.name}</Link></td>
              <td data-label="Type">{TYPE_LABEL[m.type]}</td>
              <td className="target-cell mono" data-label="Target" title={targetOf(m)}>{targetOf(m)}</td>
              <td className="num mono" data-label="Uptime 24h">{fmtPct(m.uptime24h)}</td>
              <td className="num mono" data-label="Avg latency 24h">{fmtMs(m.avgLatency24h)}</td>
              <td className="muted nowrap" data-label="Last check">{timeAgo(m.lastCheckedAt)}</td>
              <td className="num mono" data-label="Every">{m.intervalMinutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
