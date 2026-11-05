import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { errorText } from '../api/client.js';
import { Brand, LegalLinks } from '../components/Layout.jsx';
import useTitle from '../hooks/useTitle.js';

export default function VerifyEmail() {
  useTitle('Confirm email');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false); // the link works once, so call the API only once
  const [state, setState] = useState(token ? 'working' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This link has no token in it.');

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    verifyEmail(token)
      .then(() => { setState('ok'); setTimeout(() => navigate('/', { replace: true }), 1500); })
      .catch((e) => { setState('error'); setMessage(errorText(e)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        {state === 'working' && <p role="status">Confirming your email address</p>}
        {state === 'ok' && <><h1>Email confirmed</h1><p className="form-ok" role="status">Your account is active. Opening VYLOC.</p></>}
        {state === 'error' && (
          <>
            <h1>Could not confirm your email</h1>
            <div role="alert" className="form-error">{message}</div>
            <p className="switch"><Link to="/login">Go to sign in</Link> to request a new link.</p>
          </>
        )}
      </div>
      <LegalLinks />
    </div>
  );
}
