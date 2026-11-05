import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const ToastCtx = createContext({ success() {}, error() {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const remove = useCallback((id) => setToasts((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((type, text) => {
    const id = ++nextId.current;
    setToasts((l) => [...l, { id, type, text }].slice(-3));
    setTimeout(() => remove(id), type === 'error' ? 7000 : 4000);
  }, [remove]);
  const api = useMemo(() => ({ success: (t) => push('success', t), error: (t) => push('error', t) }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.text}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => remove(t.id)}><X size={14} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
