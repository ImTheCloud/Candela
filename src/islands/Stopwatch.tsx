import { useEffect, useRef, useState } from 'preact/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { errorText, profile } from '../lib/session';

/** Saved on users/{uid}: the time already counted, and when it was started if it is running. Same on every phone. */
export interface Timer { total: number; start: number | null }

const two = (n: number) => String(n).padStart(2, '0');

/** "3 z 04:12:09" past a day, else "04:12:09", with milliseconds ".mmm" */
function formatClock(ms: number): { time: string; ms: string } {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = `${two(Math.floor((s % 86400) / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  return { time: d ? `${d} z ${hms}` : hms, ms: `.${String(ms % 1000).padStart(3, '0')}` };
}

const CLOCK = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;

/**
 * The admin's own stopwatch, as a button floating bottom left on every page (kept across navigation).
 * Tapping it opens a small panel to start, pause or reset it.
 */
export default function Stopwatch() {
  const p = profile.value;
  const t: Timer = (p as { timer?: Timer } | null)?.timer ?? { total: 0, start: null };
  const running = t.start !== null;
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Milliseconds move smoothly only while the panel is open; the button itself needs one tick a second.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), open ? 33 : 1000);
    return () => clearInterval(id);
  }, [running, open]);

  useEffect(() => {
    if (!confirmReset) return;
    const id = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(id);
  }, [confirmReset]);

  // Close on a tap outside, or Escape.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!p?.admin) return null;

  const shown = t.total + (running ? Math.max(0, now - t.start!) : 0);
  const { time, ms } = formatClock(shown);

  // The remembered profile shows the button before Firebase has restored the session: wait for it instead of failing.
  async function save(next: Timer) {
    setBusy(true);
    setError('');
    setConfirmReset(false);
    try {
      await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('not_signed_in');
      await updateDoc(doc(db, 'users', uid), { timer: next });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root} class="sw-fab">
      {open && (
        <div id="sw-panel" class="sw-panel" role="dialog" aria-label="Cronometru">
          <p class={`sw-digits${running ? ' is-on' : ''}`} aria-live="off">
            <span>{time}</span><span class="sw-digits-ms">{ms}</span>
          </p>
          <div class="sw-actions">
            {running
              ? <button type="button" class="btn btn-primary btn-sm" disabled={busy} onClick={() => save({ total: shown, start: null })}>Pauză</button>
              : <button type="button" class="btn btn-primary btn-sm" disabled={busy} onClick={() => { const at = Date.now(); setNow(at); save({ total: t.total, start: at }); }}>{t.total ? 'Continuă' : 'Pornește'}</button>}
            {confirmReset
              ? <button type="button" class="btn btn-ghost btn-sm sw-confirm" disabled={busy} onClick={() => save({ total: 0, start: null })}>Confirmă</button>
              : <button type="button" class="btn btn-ghost btn-sm" disabled={busy || !shown} onClick={() => setConfirmReset(true)}>Resetează</button>}
          </div>
          {error && <p class="sw-err" role="alert">{error}</p>}
        </div>
      )}
      <button type="button" class={`sw-main${running ? ' is-live' : ''}${shown ? ' has-time' : ''}`}
        aria-expanded={open} aria-controls="sw-panel" aria-label={`Cronometru ${time}${running ? ', pornit' : ''}`}
        onClick={() => setOpen((o) => !o)}>
        {CLOCK}
        {shown > 0 && <span class="sw-main-time">{time}</span>}
      </button>
    </div>
  );
}
