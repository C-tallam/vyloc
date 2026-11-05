import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '../api/client.js';
import StatusLabel from '../components/StatusLabel.jsx';
import { LegalLinks } from '../components/Layout.jsx';
import useTitle from '../hooks/useTitle.js';
import { TYPE_LABEL, fmtPct, timeAgo } from '../utils.js';

const OVERALL = {
  operational: 'All monitored systems are operational.',
  degraded: 'Some monitored systems are down.',
  outage: 'All monitored systems are down.',
};

export default function StatusPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  useTitle(data ? data.title : 'Status');

  useEffect(() => {
    const ctrl = new AbortController();
    api.get(`/api/status/${encodeURIComponent(slug)}`, ctrl.signal)
      .then(setData)
      .catch((e) => { if (ctrl.signal.aborted) return; if (e.status === 404) setMissing(true); else setError(errorText(e)); });
    return () => ctrl.abort();
  }, [slug]);

  return (
    <div className="public">
      <div className="public-in">
        {missing && <><h1>Status page not found</h1><p className="muted">This status page does not exist or has been turned off.</p></>}
        <div role="alert" className="form-error">{error}</div>
        {!data && !missing && !error && <p className="muted" role="status">Loading status</p>}
        {data && (
          <>
            <h1>{data.title}</h1>
            <p className={`overall ${data.overall}`}>{data.monitors.length ? OVERALL[data.overall] : 'No public monitors yet.'}</p>
            {data.monitors.length > 0 && (
              <ul className="status-list">
                {data.monitors.map((m, i) => (
                  <li key={`${m.name}-${i}`}>
                    <div><strong>{m.name}</strong> <span className="muted small">{TYPE_LABEL[m.type]}</span></div>
                    <div className="status-meta">
                      <span className="muted small">30 day uptime <span className="mono">{fmtPct(m.uptime30d)}</span></span>
                      <span className="muted small">Checked {timeAgo(m.lastCheckedAt)}</span>
                      <StatusLabel status={m.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <footer className="public-foot"><LegalLinks /><Link to="/login" className="muted small">VYLOC</Link></footer>
      </div>
    </div>
  );
}
