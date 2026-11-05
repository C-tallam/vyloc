import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api, errorText } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import useTitle from '../hooks/useTitle.js';
import { INTERVALS } from '../utils.js';

const blank = { type: 'http', name: '', url: '', host: '', port: '', hostname: '', intervalMinutes: 5, alertsEnabled: true, isPublic: false, paused: false };

export default function MonitorForm({ mode }) {
  const editing = mode === 'edit';
  useTitle(editing ? 'Edit monitor' : 'Add monitor');
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    const ctrl = new AbortController();
    api.get(`/api/monitors/${id}`, ctrl.signal)
      .then((m) => { setForm({ ...blank, ...m, port: m.port ?? '' }); setLoading(false); })
      .catch((e) => { if (!ctrl.signal.aborted) { setError(errorText(e)); setLoading(false); } });
    return () => ctrl.abort();
  }, [editing, id]);

  const set = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : name === 'intervalMinutes' ? Number(value) : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { name: form.name, intervalMinutes: form.intervalMinutes, alertsEnabled: form.alertsEnabled, isPublic: form.isPublic };
    if (form.type === 'http') body.url = form.url.trim();
    if (form.type === 'tcp') { body.host = form.host.trim(); body.port = Number(form.port); }
    if (form.type === 'dns') body.hostname = form.hostname.trim();
    try {
      let saved;
      if (editing) { body.paused = form.paused; saved = await api.patch(`/api/monitors/${id}`, body); toast.success('Monitor saved'); }
      else { saved = await api.post('/api/monitors', { type: form.type, ...body }); toast.success('Monitor added and checked'); }
      navigate(`/monitors/${saved.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  if (loading) return <p className="muted" role="status">Loading monitor</p>;

  return (
    <>
      <Link to={editing ? `/monitors/${id}` : '/monitors'} className="back"><ChevronLeft size={16} aria-hidden="true" /> {editing ? 'Back to monitor' : 'Monitors'}</Link>
      <div className="page-head"><h1>{editing ? 'Edit monitor' : 'Add monitor'}</h1></div>
      <form className="panel form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" value={form.type} onChange={set} disabled={editing}>
            <option value="http">HTTP or HTTPS (website or API)</option>
            <option value="tcp">TCP port</option>
            <option value="dns">DNS lookup</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={set} required maxLength={80} placeholder="For example: Company website" />
        </div>

        {form.type === 'http' && (
          <div className="field full">
            <label htmlFor="url">URL</label>
            <input id="url" name="url" type="url" value={form.url} onChange={set} required maxLength={2048} placeholder="https://example.com" />
            <small className="muted">The monitor is UP when the response status is 2xx or 3xx. Redirects are not followed.</small>
          </div>
        )}
        {form.type === 'tcp' && (
          <>
            <div className="field">
              <label htmlFor="host">Host</label>
              <input id="host" name="host" value={form.host} onChange={set} required maxLength={253} placeholder="example.com or 203.0.113.10" />
            </div>
            <div className="field">
              <label htmlFor="port">Port</label>
              <input id="port" name="port" type="number" min={1} max={65535} value={form.port} onChange={set} required placeholder="443" />
            </div>
            <small className="muted full">The monitor is UP when a connection to that port opens.</small>
          </>
        )}
        {form.type === 'dns' && (
          <div className="field full">
            <label htmlFor="hostname">Domain name</label>
            <input id="hostname" name="hostname" value={form.hostname} onChange={set} required maxLength={253} placeholder="example.com" />
            <small className="muted">The monitor is UP when the domain resolves to an IP address.</small>
          </div>
        )}

        <div className="field">
          <label htmlFor="intervalMinutes">Check every</label>
          <select id="intervalMinutes" name="intervalMinutes" value={form.intervalMinutes} onChange={set}>
            {INTERVALS.map((n) => <option key={n} value={n}>{n} minutes</option>)}
          </select>
        </div>
        <div className="field checks">
          <label className="check"><input type="checkbox" name="alertsEnabled" checked={form.alertsEnabled} onChange={set} /> Email me when this monitor goes down or recovers</label>
          <label className="check"><input type="checkbox" name="isPublic" checked={form.isPublic} onChange={set} /> Show on my public status page</label>
          {editing && <label className="check"><input type="checkbox" name="paused" checked={form.paused} onChange={set} /> Pause checks</label>}
        </div>

        <p className="muted small full">Only add addresses you own or have permission to check. Private, local and reserved addresses cannot be monitored.</p>
        <div className="full"><div role="alert" className="form-error">{error}</div></div>
        <div className="full actions">
          <button className="btn primary" disabled={busy}>{busy ? 'Saving' : editing ? 'Save changes' : 'Add monitor'}</button>
          <Link className="btn" to={editing ? `/monitors/${id}` : '/monitors'}>Cancel</Link>
        </div>
      </form>
    </>
  );
}
