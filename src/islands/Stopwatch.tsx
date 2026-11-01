import { useEffect, useState } from 'preact/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { errorText, profile, user } from '../lib/session';

/** Saved on users/{uid}: the time already counted, and when it was started if it is running. Same on every phone. */
export interface Timer { total: number; start: number | null }

const two = (n: number) => String(n).padStart(2, '0');
const three = (n: number) => String(n).padStart(3, '0');

/** "3 z 04:12:09" past a day, else "04:12:09", with milliseconds ".mmm" */
function formatClock(ms: number): { time: string; ms: string } {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = `${two(Math.floor((s % 86400) / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  const time = d ? `${d} z ${hms}` : hms;
  const milli = three(ms % 1000);
  return { time, ms: `.${milli}` };
}

/** The admin's own stopwatch: started and paused by hand, kept until reset. */
export default function Stopwatch({ wrap = false }: { wrap?: boolean }) {
  const p = profile.value;
  if (!p?.admin) return null;

  const t: Timer = (p as { timer?: Timer } | null)?.timer ?? { total: 0, start: null };
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const running = t.start !== null;

  // Refresh every 33ms (~30 FPS) while running to update milliseconds smoothly
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 33);
    return () => clearInterval(id);
  }, [running]);

  // Auto-cancel reset confirmation after 4s if left unconfirmed
  useEffect(() => {
    if (!confirmReset) return;
    const timer = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmReset]);

  const shown = t.total + (running ? Math.max(0, now - t.start!) : 0);
  const { time, ms: milli } = formatClock(shown);

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
        <span class={`sw-digits${running ? ' is-on' : ''}`}>
          <span class="sw-digits-base">{time}</span>
          <span class="sw-digits-ms">{milli}</span>
        </span>
      </div>
      <div class="sw-actions">
        {running ? (
          <button
            type="button"
            class="sw-btn sw-btn-main"
            onClick={() => {
              setConfirmReset(false);
              save({ total: shown, start: null });
            }}
          >
            Pauză
          </button>
        ) : (
          <button
            type="button"
            class="sw-btn sw-btn-main"
            onClick={() => {
              setConfirmReset(false);
              setNow(Date.now());
              save({ total: t.total, start: Date.now() });
            }}
          >
            {t.total ? 'Continuă' : 'Pornește'}
          </button>
        )}
        {confirmReset ? (
          <div class="sw-confirm-group">
            <button
              type="button"
              class="sw-btn sw-btn-confirm"
              onClick={() => {
                setConfirmReset(false);
                save({ total: 0, start: null });
              }}
              title="Confirmă resetarea la 0"
            >
              Confirmă
            </button>
            <button
              type="button"
              class="sw-btn sw-btn-cancel"
              onClick={() => setConfirmReset(false)}
              title="Anulează"
              aria-label="Anulează resetarea"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            class="sw-btn sw-btn-reset"
            disabled={!shown}
            onClick={() => setConfirmReset(true)}
            title="Resetează cronometrul"
          >
            Reset
          </button>
        )}
      </div>
      {error && <span class="sw-err" role="alert">{error}</span>}
    </aside>
  );

  return wrap ? <div class="wrap hb-sw">{content}</div> : content;
}
