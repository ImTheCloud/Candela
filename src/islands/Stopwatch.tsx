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

/** The admin's own stopwatch, in the profile: started and paused by hand, kept until reset. */
export default function Stopwatch() {
  const t: Timer = (profile.value as { timer?: Timer } | null)?.timer ?? { total: 0, start: null };
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
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

  return (
    <section class="me-sect" aria-labelledby="sw-title">
      <h2 id="sw-title" class="me-label">Cronometru</h2>
      <div class="me-row sw">
        <p class={`sw-time${running ? ' is-on' : ''}`} aria-live="off">{clock(shown)}</p>
        {confirm ? (
          <div class="two">
            <button type="button" class="btn btn-ghost" onClick={() => setConfirm(false)}>Renunță</button>
            <button type="button" class="btn btn-danger" onClick={() => { setConfirm(false); save({ total: 0, start: null }); }}>Pune la zero</button>
          </div>
        ) : (
          <div class="two">
            {running
              ? <button type="button" class="btn btn-primary" onClick={() => save({ total: shown, start: null })}>Pauză</button>
              : <button type="button" class="btn btn-primary" onClick={() => { setNow(Date.now()); save({ total: t.total, start: Date.now() }); }}>{t.total ? 'Continuă' : 'Pornește'}</button>}
            <button type="button" class="btn btn-ghost" disabled={!shown} onClick={() => setConfirm(true)}>Reset</button>
          </div>
        )}
        {error && <p class="notice notice-bad" role="alert">{error}</p>}
      </div>
    </section>
  );
}
