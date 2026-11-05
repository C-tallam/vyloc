import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Monitors from './pages/Monitors.jsx';
import MonitorForm from './pages/MonitorForm.jsx';
import MonitorDetail from './pages/MonitorDetail.jsx';
import Incidents from './pages/Incidents.jsx';
import Settings from './pages/Settings.jsx';
import StatusPage from './pages/StatusPage.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="center-note" role="status">Loading</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/status/:slug" element={<StatusPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/monitors" replace />} />
        <Route path="monitors" element={<Monitors />} />
        <Route path="monitors/new" element={<MonitorForm mode="create" />} />
        <Route path="monitors/:id" element={<MonitorDetail />} />
        <Route path="monitors/:id/edit" element={<MonitorForm mode="edit" />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
