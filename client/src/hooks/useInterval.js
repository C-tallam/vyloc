import { useEffect, useRef } from 'react';

// Calls fn every `ms` milliseconds, but only while the browser tab is visible.
export default function useInterval(fn, ms) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);
  useEffect(() => {
    if (!ms) return undefined;
    const id = setInterval(() => { if (!document.hidden) saved.current(); }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
