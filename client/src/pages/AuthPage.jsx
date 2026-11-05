import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, errorText } from '../api/client.js';
import { Brand, LegalLinks } from '../components/Layout.jsx';
import useTitle from '../hooks/useTitle.js';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  useTitle(isLogin ? 'Sign in' : 'Create account');
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [needsVerify, setNeedsVerify] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const resend = async (email) => {
    setBusy(true); setError(''); setInfo('');
    try {
      await api.post('/api/auth/resend-verification', { email });
      setInfo('If that address has an unconfirmed account, a new confirmation email is on its way. Check your spam folder too.');
    } catch (err) { setError(errorText(err)); }
    setBusy(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setInfo(''); setNeedsVerify(false);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        const d = await register(form.name, form.email, form.password);
        if (d.verificationRequired) { setPending({ email: d.email, emailSent: d.emailSent }); setBusy(false); return; }
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') setNeedsVerify(true);
      setError(errorText(err));
      setBusy(false);
    }
  };

  const frame = (children) => (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        {children}
      </div>
      <LegalLinks />
    </div>
  );

  if (pending) {
    return frame(
      <>
        <h1>Check your inbox</h1>
        <p>We sent a confirmation link to <strong>{pending.email}</strong>. Open it to activate your account. The link works once and expires after 24 hours.</p>
        <p className="muted">It can take a minute and may land in your spam folder.</p>
        {!pending.emailSent && <div className="form-error">We could not send the email just now. Use the resend button below.</div>}
        <div role="status" className="form-ok">{info}</div>
        <div role="alert" className="form-error">{error}</div>
        <button type="button" className="btn block" disabled={busy} onClick={() => resend(pending.email)}>Resend confirmation email</button>
        <p className="switch"><Link to="/login">Back to sign in</Link></p>
      </>
    );
  }

  return frame(
    <form onSubmit={onSubmit} className="form-stack">
      <h1>{isLogin ? 'Sign in' : 'Create your account'}</h1>
      <p className="muted">{isLogin
        ? 'Monitor websites, servers and DNS. Get an email when something stops responding.'
        : 'Use a real email address. We send a link to confirm it before the account can be used.'}</p>
      {!isLogin && (
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" value={form.name} onChange={onChange} required minLength={2} maxLength={80} autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={onChange} required minLength={isLogin ? 1 : 8} maxLength={72} autoComplete={isLogin ? 'current-password' : 'new-password'} />
        {!isLogin && <small className="muted">At least 8 characters.</small>}
      </div>
      {!isLogin && <p className="muted small">By creating an account you agree to the <Link to="/terms">Terms</Link> and the <Link to="/privacy">Privacy Policy</Link>.</p>}
      <div role="alert" className="form-error">{error}</div>
      <div role="status" className="form-ok">{info}</div>
      {needsVerify && <button type="button" className="btn block" disabled={busy} onClick={() => resend(form.email)}>Resend confirmation email</button>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Please wait' : isLogin ? 'Sign in' : 'Create account'}</button>
      <p className="switch">{isLogin ? <>No account? <Link to="/register">Create one</Link></> : <>Already registered? <Link to="/login">Sign in</Link></>}</p>
    </form>
  );
}
