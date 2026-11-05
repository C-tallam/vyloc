export default function StatusLabel({ status }) {
  return <span className={`st st-${status}`}>{status.toUpperCase()}</span>;
}

// Paused monitors are shown as PAUSED, whatever their last known status was.
export const monitorStatus = (m) => (m.paused ? 'paused' : m.status);
