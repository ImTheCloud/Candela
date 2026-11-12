import { useEffect, useRef, useState } from 'preact/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { errorText, profile } from '../lib/session';

/** Saved on users/{uid}: the time already counted, and when it was started if it is running. Same on every phone. */
export interface Timer { total: number; start: number | null }

const HOLD_MS = 3000;
const two = (n: number) => String(n).padStart(2, '0');

/** "3 z 04:12:09" past a day, else "04:12:09" */
function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = `${two(Math.floor((s % 86400) / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  return d ? `${d} z ${hms}` : hms;
}

const CLOCK = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const PLAY = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>;

/**
 * The admin's own stopwatch, floating bottom left on every page (kept across navigation). Only admins see it.
 * Tap: start or pause (green while running, brown when paused). Hold 3 s: offers to reset to zero.
 */
export default function Stopwatch() {
  const p = profile.value;
  const t: Timer = (p as { timer?: Timer } | null)?.timer ?? { total: 0, start: null };
  const running = t.start !== null;
  const [now, setNow] = useState(Date.now());
  const [holding, setHolding] = useState(false);
  const [askReset, setAskReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // The reset question closes on a tap elsewhere or Escape.
  useEffect(() => {
    if (!askReset) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setAskReset(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAskReset(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, [askReset]);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  if (!p?.admin) return null;

  const shown = t.total + (running ? Math.max(0, now - t.start!) : 0);
  const time = formatClock(shown);

  // The remembered profile shows the button before Firebase has restored the session: wait for it instead of failing.
  async function save(next: Timer) {
    setBusy(true);
    setError('');
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

  function toggle() {
    if (busy) return;
    if (running) save({ total: shown, start: null });
    else { const at = Date.now(); setNow(at); save({ total: t.total, start: at }); }
  }

  function press(e: PointerEvent) {
    if (e.button !== 0) return;
    held.current = false;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      held.current = true;
      setHolding(false);
      setAskReset(true);
      navigator.vibrate?.(20);
    }, HOLD_MS);
  }
  function release() {
    clearTimeout(holdTimer.current);
    setHolding(false);
  }

  return (
    <div ref={root} class="sw-fab">
      {askReset && (
        <div class="sw-panel" role="dialog" aria-label="Resetează cronometrul">
          <p>Repornești cronometrul de la zero?</p>
          <div class="sw-actions">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setAskReset(false)}>Nu</button>
            <button type="button" class="btn btn-primary btn-sm" disabled={busy} onClick={async () => { await save({ total: 0, start: null }); setAskReset(false); }}>Da, de la zero</button>
          </div>
        </div>
      )}
      {error && <p class="sw-err" role="alert">{error}</p>}
      <button type="button" class={`sw-main${running ? ' is-live' : ''}${shown ? ' has-time' : ''}${holding ? ' is-holding' : ''}`}
        aria-pressed={running} aria-label={`Cronometru ${time}, ${running ? 'pornit: apasă pentru pauză' : 'oprit: apasă ca să pornească'}. Ține apăsat 3 secunde ca să-l resetezi.`}
        onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => { if (held.current) { held.current = false; return; } setAskReset(false); toggle(); }}>
        {running ? CLOCK : PLAY}
        {shown > 0 && <span class="sw-main-time">{time}</span>}
      </button>
    </div>
  );
}
