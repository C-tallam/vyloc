import { Link } from 'react-router-dom';
import { SITE } from '../config.js';
import { Brand } from '../components/Layout.jsx';

export default function LegalPage({ title, children }) {
  return (
    <div className="public">
      <div className="public-in legal">
        <Brand />
        {!SITE.policiesReviewed && <p className="draft" role="note">Draft. This page has not been reviewed yet.</p>}
        <h1>{title}</h1>
        <p className="muted small">Last updated: {SITE.policiesUpdated || 'not yet set'}</p>
        {children}
        <footer className="public-foot">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/login">Back to VYLOC</Link>
        </footer>
      </div>
    </div>
  );
}

export const operator = () => SITE.operatorName || '[operator name not set]';
export const contact = () => SITE.contactEmail || '[contact email not set]';
