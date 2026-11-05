import { fmtShortDate, fmtShortTime } from '../utils.js';

const W = 800;
const H = 220;
const L = 54;
const R = 12;
const T = 12;
const B = 26;

function niceMax(v) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export default function LatencyChart({ points, range }) {
  if (!points.length) return <p className="muted">No checks were recorded in this period.</p>;

  const label = (t) => (range === '24h' ? fmtShortTime(t) : fmtShortDate(t));
  const times = points.map((p) => new Date(p.t).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const data = points.filter((p) => p.avgLatency != null);
  const max = niceMax(Math.max(1, ...data.map((p) => p.avgLatency)));
  const x = (t) => (tMax === tMin ? L + (W - L - R) / 2 : L + ((t - tMin) / (tMax - tMin)) * (W - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);

  const segments = [];
  let current = [];
  points.forEach((p) => {
    if (p.avgLatency == null) { if (current.length) segments.push(current); current = []; }
    else current.push([x(new Date(p.t).getTime()), y(p.avgLatency)]);
  });
  if (current.length) segments.push(current);

  const lows = data.map((p) => p.avgLatency);
  const summary = data.length
    ? `Average response time over time. Lowest ${Math.min(...lows)} ms, highest ${Math.max(...lows)} ms.`
    : 'No successful checks in this period.';

  return (
    <div>
      {data.length === 0 ? <p className="muted">No successful checks in this period, so there is no response time to plot.</p> : (
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} preserveAspectRatio="none">
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="chart-grid" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="chart-text">{Math.round(v)} ms</text>
            </g>
          ))}
          {segments.map((seg, i) => (seg.length > 1
            ? <polyline key={i} points={seg.map((p) => p.join(',')).join(' ')} className="chart-line" />
            : <circle key={i} cx={seg[0][0]} cy={seg[0][1]} r="3" className="chart-dot" />))}
          <text x={L} y={H - 6} textAnchor="start" className="chart-text">{label(tMin)}</text>
          <text x={W - R} y={H - 6} textAnchor="end" className="chart-text">{label(tMax)}</text>
        </svg>
      )}
      <div className="strip" role="img" aria-label="Availability over time. Each block is one period: green means every check passed, red means every check failed, amber means some failed.">
        {points.map((p) => (
          <span key={p.t} className={`seg ${p.uptime === 100 ? 'ok' : p.uptime === 0 ? 'bad' : 'part'}`}
            title={`${label(p.t)}: ${p.uptime}% of ${p.checks} check${p.checks === 1 ? '' : 's'} passed`} />
        ))}
      </div>
    </div>
  );
}
