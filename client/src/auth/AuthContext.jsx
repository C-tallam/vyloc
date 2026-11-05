import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    api.get('/api/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, [logout]);

  const value = useMemo(() => ({
    user, loading, logout,
    login: async (email, password) => {
      const d = await api.post('/api/auth/login', { email, password });
      setToken(d.token); setUser(d.user); return d.user;
    },
    register: async (name, email, password) => {
      const d = await api.post('/api/auth/register', { name, email, password });
      if (d.token) { setToken(d.token); setUser(d.user); }
      return d;
    },
    verifyEmail: async (token) => {
      const d = await api.post('/api/auth/verify-email', { token });
      setToken(d.token); setUser(d.user); return d.user;
    },
  }), [user, loading, logout]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
