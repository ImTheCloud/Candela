import { useEffect, useState } from 'preact/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { errorText, profile, user } from '../lib/session';

/** Saved on users/{uid}: the time already counted, and when it was started if it is running. Same on every phone. */
export interface Timer { total: number; start: number | null }

const two = (n: number) => String(n).padStart(2, '0');

/** "3 z 04:12:09" past a day, else "04:12:09". */
function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = `${two(Math.floor((s % 86400) / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  return d ? `${d} z ${hms}` : hms;
}

/** The admin's own stopwatch: started and paused by hand, kept until reset. */
export default function Stopwatch({ wrap = false }: { wrap?: boolean }) {
  const p = profile.value;
  if (!p?.admin) return null;

  const t: Timer = (p as { timer?: Timer } | null)?.timer ?? { total: 0, start: null };
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const running = t.start !== null;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const shown = t.total + (running ? Math.max(0, now - t.start!) : 0);

  async function save(next: Timer) {
    setError('');
    try { await updateDoc(doc(db, 'users', user.value!.uid), { timer: next }); } catch (e) { setError(errorText(e)); }
  }

  const content = (
    <aside class="sw-bar" aria-label="Cronometru admin">
      <div class="sw-info">
        <span class={`sw-dot${running ? ' is-live' : ''}`} aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <span class={`sw-digits${running ? ' is-on' : ''}`}>{clock(shown)}</span>
      </div>
      <div class="sw-actions">
        {running ? (
          <button type="button" class="sw-btn sw-btn-main" onClick={() => save({ total: shown, start: null })}>
            Pauză
          </button>
        ) : (
          <button type="button" class="sw-btn sw-btn-main" onClick={() => { setNow(Date.now()); save({ total: t.total, start: Date.now() }); }}>
            {t.total ? 'Continuă' : 'Pornește'}
          </button>
        )}
        <button
          type="button"
          class="sw-btn sw-btn-reset"
          disabled={!shown}
          onClick={() => save({ total: 0, start: null })}
          title="Reset"
        >
          Reset
        </button>
      </div>
      {error && <span class="sw-err" role="alert">{error}</span>}
    </aside>
  );

  return wrap ? <div class="wrap hb-sw">{content}</div> : content;
}
