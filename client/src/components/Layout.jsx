import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, LogOut, Menu, Settings, TriangleAlert, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="VYLOC home">
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="4" fill="#161a21" /><path d="M7 9l9 15 9-15" fill="none" stroke="#4f8cf0" strokeWidth="3.5" strokeLinejoin="miter" /></svg>
      <span>VYLOC</span>
    </Link>
  );
}

export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal">
      <Link to="/privacy">Privacy</Link>
      <Link to="/terms">Terms</Link>
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  return (
    <div className="app">
      <aside className="side" ref={rootRef}>
        <div className="side-top">
          <Brand />
          <button type="button" className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="side-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="side-menu" className={`side-menu ${open ? 'open' : ''}`}>
          <nav aria-label="Main">
            <NavLink to="/monitors"><Activity size={16} aria-hidden="true" /> Monitors</NavLink>
            <NavLink to="/incidents"><TriangleAlert size={16} aria-hidden="true" /> Incidents</NavLink>
            <NavLink to="/settings"><Settings size={16} aria-hidden="true" /> Settings</NavLink>
          </nav>
          <div className="side-bottom">
            <div className="who"><span className="who-name">{user.name}</span><span className="muted who-email">{user.email}</span></div>
            <button type="button" className="btn block" onClick={logout}><LogOut size={15} aria-hidden="true" /> Log out</button>
            <LegalLinks />
          </div>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
