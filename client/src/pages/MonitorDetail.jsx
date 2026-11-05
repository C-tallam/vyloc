import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pause, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react';
import { api, errorText } from '../api/client.js';
import LatencyChart from '../components/LatencyChart.jsx';
import StatusLabel, { monitorStatus } from '../components/StatusLabel.jsx';
import { useToast } from '../components/Toast.jsx';
import useInterval from '../hooks/useInterval.js';
import useTitle from '../hooks/useTitle.js';
import { TYPE_LABEL, fmtDateTime, fmtDuration, fmtMs, fmtPct, targetOf, timeAgo } from '../utils.js';

export default function MonitorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [monitor, setMonitor] = useState(null);
  const [checks, setChecks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [series, setSeries] = useState([]);
  const [range, setRange] = useState('24h');
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useTitle(monitor ? monitor.name : 'Monitor');

  const load = useCallback(async (signal) => {
    try {
      const [m, c, i, s] = await Promise.all([
        api.get(`/api/monitors/${id}`, signal),
        api.get(`/api/monitors/${id}/checks`, signal),
        api.get(`/api/monitors/${id}/incidents`, signal),
        api.get(`/api/monitors/${id}/series?range=${range}`, signal),
      ]);
      setMonitor(m); setChecks(c); setIncidents(i); setSeries(s); setError('');
    } catch (e) {
      if (signal?.aborted) return;
      if (e.status === 404 || e.status === 400) setNotFound(true); else setError(errorText(e));
    }
  }, [id, range]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);
  useInterval(() => load(), 30000);

  const act = async (fn, okText) => {
    setBusy(true); setError('');
    try { await fn(); if (okText) toast.success(okText); await load(); } catch (e) { setError(errorText(e)); }
    setBusy(false);
  };
  const checkNow = () => act(() => api.post(`/api/monitors/${id}/check`), 'Check complete');
  const togglePause = () => act(() => api.patch(`/api/monitors/${id}`, { paused: !monitor.paused }), monitor?.paused ? 'Monitor resumed' : 'Monitor paused');
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/api/monitors/${id}`); toast.success('Monitor deleted'); navigate('/monitors'); }
    catch (e) { setError(errorText(e)); setBusy(false); }
  };

  if (notFound) return <p className="muted">Monitor not found. <Link to="/monitors">Back to monitors</Link></p>;
  if (!monitor) return <><div role="alert" className="form-error">{error}</div><p className="muted" role="status">Loading monitor</p></>;

  const status = monitorStatus(monitor);
  const stat = (key, label) => (
    <div><dt>{label}</dt><dd className="mono">{fmtPct(monitor.stats[key].uptime)}</dd><span className="muted small">{monitor.stats[key].checks} checks</span></div>
  );

  return (
    <>
      <Link to="/monitors" className="back"><ChevronLeft size={16} aria-hidden="true" /> Monitors</Link>
      <div className="page-head">
        <div>
          <h1>{monitor.name}</h1>
          <p className="target mono">{TYPE_LABEL[monitor.type]} {targetOf(monitor)}</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={checkNow} disabled={busy || monitor.paused}><RefreshCw size={15} aria-hidden="true" /> Check now</button>
          <button type="button" className="btn" onClick={togglePause} disabled={busy}>{monitor.paused ? <><Play size={15} aria-hidden="true" /> Resume</> : <><Pause size={15} aria-hidden="true" /> Pause</>}</button>
          <Link className="btn" to={`/monitors/${id}/edit`}><Pencil size={15} aria-hidden="true" /> Edit</Link>
          {!confirmDelete
            ? <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}><Trash2 size={15} aria-hidden="true" /> Delete</button>
            : <span className="confirm">Delete this monitor and its history? <button type="button" className="btn danger" onClick={remove} disabled={busy}>Confirm delete</button> <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button></span>}
        </div>
      </div>
      <div role="alert" className="form-error">{error}</div>

      <section className="panel now" aria-label="Current state">
        <StatusLabel status={status} />
        <p>
          {status === 'up' && <>Responding since {fmtDateTime(monitor.statusSince)}.</>}
          {status === 'down' && <>Down since {fmtDateTime(monitor.statusSince)}. Last error: {monitor.lastError || 'none recorded'}.</>}
          {status === 'pending' && <>Waiting for the first check.</>}
          {status === 'paused' && <>Checks are paused.</>}
          {' '}Last checked {timeAgo(monitor.lastCheckedAt)}. Checks run every {monitor.intervalMinutes} minutes.
        </p>
      </section>

      <dl className="stats">
        {stat('24h', 'Uptime, last 24 hours')}
        {stat('7d', 'Uptime, last 7 days')}
        {stat('30d', 'Uptime, last 30 days')}
        <div><dt>Average response, 24 hours</dt><dd className="mono">{fmtMs(monitor.stats['24h'].avgLatency)}</dd></div>
      </dl>

      <section className="panel">
        <div className="panel-head">
          <h2>Response time</h2>
          <div className="tabs" role="tablist" aria-label="Time range">
            {['24h', '7d', '30d'].map((r) => (
              <button key={r} type="button" role="tab" aria-selected={range === r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
        <LatencyChart points={series} range={range} />
      </section>

      <section className="panel">
        <h2>Incidents</h2>
        {incidents.length === 0 ? <p className="muted">No incidents recorded.</p> : (
          <div className="table-wrap flat">
            <table className="grid">
              <thead><tr><th>Started</th><th>Ended</th><th className="num">Duration</th><th>Reason</th></tr></thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
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
      </section>

      <section className="panel">
        <h2>Recent checks</h2>
        {checks.length === 0 ? <p className="muted">No checks have run yet.</p> : (
          <div className="table-wrap flat">
            <table className="grid">
              <thead><tr><th>Time</th><th>Result</th><th className="num">Response</th><th className="num">Status code</th><th>Message</th></tr></thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Time" className="nowrap">{fmtDateTime(c.checkedAt)}</td>
                    <td data-label="Result"><StatusLabel status={c.ok ? 'up' : 'down'} /></td>
                    <td data-label="Response" className="num mono">{fmtMs(c.latencyMs)}</td>
                    <td data-label="Status code" className="num mono">{c.statusCode ?? 'n/a'}</td>
                    <td data-label="Message">{c.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
