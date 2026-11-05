import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api/client.js';
import useTitle from '../hooks/useTitle.js';
import { TYPE_LABEL, fmtDateTime, fmtDuration } from '../utils.js';

export default function Incidents() {
  useTitle('Incidents');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    api.get('/api/monitors/incidents', ctrl.signal).then(setItems).catch((e) => { if (!ctrl.signal.aborted) setError(errorText(e)); });
    return () => ctrl.abort();
  }, []);

  return (
    <>
      <div className="page-head"><h1>Incidents</h1></div>
      <p className="muted small note">An incident starts when a monitor goes down and ends when it recovers. Incidents are kept for 90 days.</p>
      <div role="alert" className="form-error">{error}</div>
      {!items && !error && <p className="muted" role="status">Loading incidents</p>}
      {items && items.length === 0 && <div className="panel"><p className="muted">No incidents recorded.</p></div>}
      {items && items.length > 0 && (
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Monitor</th><th>Type</th><th>Started</th><th>Ended</th><th className="num">Duration</th><th>Reason</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="name-cell">{i.monitor ? <Link to={`/monitors/${i.monitor.id}`}>{i.monitor.name}</Link> : 'Deleted monitor'}</td>
                  <td data-label="Type">{i.monitor ? TYPE_LABEL[i.monitor.type] : 'n/a'}</td>
                  <td data-label="Started" className="nowrap">{fmtDateTime(i.startedAt)}</td>
                  <td data-label="Ended" className="nowrap">{i.resolvedAt ? fmtDateTime(i.resolvedAt) : 'Ongoing'}</td>
                  <td data-label="Duration" className="num mono">{fmtDuration(i.durationSec)}</td>
                  <td data-label="Reason">{i.reason || 'not recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
