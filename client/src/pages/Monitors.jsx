import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, errorText } from '../api/client.js';
import MonitorTable from '../components/MonitorTable.jsx';
import { monitorStatus } from '../components/StatusLabel.jsx';
import useInterval from '../hooks/useInterval.js';
import useTitle from '../hooks/useTitle.js';

export default function Monitors() {
  useTitle('Monitors');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (signal) => {
    try { setItems(await api.get('/api/monitors', signal)); setError(''); }
    catch (e) { if (!signal?.aborted) setError(errorText(e)); }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);
  useInterval(() => load(), 30000);

  const count = (s) => (items || []).filter((m) => monitorStatus(m) === s).length;

  return (
    <>
      <div className="page-head">
        <h1>Monitors</h1>
        <Link to="/monitors/new" className="btn primary"><Plus size={16} aria-hidden="true" /> Add monitor</Link>
      </div>
      <div role="alert" className="form-error">{error}</div>
      {!items && !error && <p className="muted" role="status">Loading monitors</p>}
      {items && items.length === 0 && (
        <div className="panel empty">
          <h2>No monitors yet</h2>
          <p className="muted">A monitor checks one website, server port or domain name on a schedule and records the result. Add your first one to start collecting data.</p>
          <Link to="/monitors/new" className="btn primary">Add a monitor</Link>
        </div>
      )}
      {items && items.length > 0 && (
        <>
          <dl className="stats">
            <div><dt>Up</dt><dd className="up">{count('up')}</dd></div>
            <div><dt>Down</dt><dd className="down">{count('down')}</dd></div>
            <div><dt>Pending</dt><dd>{count('pending')}</dd></div>
            <div><dt>Paused</dt><dd>{count('paused')}</dd></div>
          </dl>
          <MonitorTable items={items} />
          <p className="muted small note">This page refreshes every 30 seconds. Checks run on the schedule set for each monitor.</p>
        </>
      )}
    </>
  );
}
