import { useEffect, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { api, errorText } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { useToast } from '../components/Toast.jsx';
import useTitle from '../hooks/useTitle.js';

function StatusPageForm() {
  const toast = useToast();
  const [form, setForm] = useState({ slug: '', title: '' });
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api.get('/api/status-page', ctrl.signal).then((s) => { setForm(s); setSaved(s.slug); }).catch(() => {});
    return () => ctrl.abort();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const s = await api.patch('/api/status-page', { slug: form.slug.trim().toLowerCase(), title: form.title.trim() });
      setForm(s); setSaved(s.slug); toast.success('Status page saved');
    } catch (err) { setError(errorText(err)); }
    setBusy(false);
  };
  const url = saved ? `${window.location.origin}/status/${saved}` : '';

  return (
    <form className="panel narrow form-stack" onSubmit={onSubmit}>
      <h2>Public status page</h2>
      <p className="muted small">Shows the name, current status and 30 day uptime of the monitors you mark as public. It never shows addresses or error messages. Leave the address empty to turn the page off.</p>
      <div className="field">
        <label htmlFor="slug">Page address</label>
        <input id="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} maxLength={40} placeholder="my-company" />
        <small className="muted">3 to 40 letters, numbers or hyphens.</small>
      </div>
      <div className="field">
        <label htmlFor="title">Page title</label>
        <input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={80} placeholder="My Company status" />
      </div>
      {url && <p className="small">Your page: <a href={url} target="_blank" rel="noopener noreferrer" className="mono">{url}</a></p>}
      <div role="alert" className="form-error">{error}</div>
      <div><button className="btn primary" disabled={busy}>{busy ? 'Saving' : 'Save status page'}</button></div>
    </form>
  );
}

function ChangePassword() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const onChange = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setDone(false); setError(''); };

  const rules = [
    { ok: form.newPassword.length >= 8, text: 'At least 8 characters' },
    { ok: form.newPassword.length > 0 && form.newPassword === form.confirm, text: 'Both new passwords match' },
    { ok: form.newPassword.length > 0 && form.currentPassword.length > 0 && form.newPassword !== form.currentPassword, text: 'Different from your current password' },
  ];
  const valid = form.currentPassword && rules.every((r) => r.ok);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true); setError(''); setDone(false);
    try {
      await api.post('/api/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setDone(true);
      toast.success('Password changed');
    } catch (err) { setError(errorText(err)); }
    setBusy(false);
  };

  return (
    <form className="panel narrow form-stack" onSubmit={onSubmit}>
      <h2>Change password</h2>
      {user.demo ? <p className="muted">This is a shared demo account, so its password cannot be changed.</p> : (
        <>
          {done && <div className="banner" role="status"><strong>Password changed.</strong> You stay signed in on this device. Use the new password next time you sign in.</div>}
          <PasswordField id="currentPassword" label="Current password" value={form.currentPassword} onChange={onChange} autoComplete="current-password" />
          <PasswordField id="newPassword" label="New password" value={form.newPassword} onChange={onChange} autoComplete="new-password" minLength={8} />
          <PasswordField id="confirm" label="Confirm new password" value={form.confirm} onChange={onChange} autoComplete="new-password" minLength={8} />
          <ul className="rules" aria-label="Password requirements">
            {rules.map((r) => <li key={r.text} className={r.ok ? 'ok' : ''}>{r.ok ? <Check size={14} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />} {r.text}</li>)}
          </ul>
          <div role="alert" className="form-error">{error}</div>
          <div><button className="btn primary" disabled={busy || !valid}>{busy ? 'Saving' : 'Change password'}</button></div>
        </>
      )}
    </form>
  );
}

export default function Settings() {
  useTitle('Settings');
  const { user } = useAuth();
  return (
    <>
      <div className="page-head"><h1>Settings</h1></div>
      <section className="panel narrow">
        <h2>Account</h2>
        <dl className="facts"><dt>Name</dt><dd>{user.name}</dd><dt>Email</dt><dd>{user.email}</dd></dl>
        <p className="muted small">Alert emails are sent to this address.</p>
      </section>
      <StatusPageForm />
      <ChangePassword />
    </>
  );
}
