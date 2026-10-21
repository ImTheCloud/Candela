import { useEffect, useState } from 'preact/hooks';
import { player } from '../lib/players';
import type { Playable } from '../lib/questions';
import { REASONS, alreadyReported, sendReport, type Reason } from '../lib/reports';
import { errorText, user } from '../lib/session';

/** A small "i" button next to the correction; it opens a sheet to flag a mistake in the question. */
export default function ReportButton({ q }: { q: Playable }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(() => alreadyReported(q.id));
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);

  async function send(e: Event) {
    e.preventDefault();
    if (!reason) return setError('Alege ce nu este în regulă.');
    if (reason === 'other' && !note.trim()) return setError('Scrie pe scurt ce nu este în regulă.');
    setBusy(true);
    setError('');
    try {
      await sendReport(q, reason, note, player.value.name);
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" class={`info-btn${sent ? ' is-sent' : ''}`} aria-label="Semnalează o greșeală în această întrebare" onClick={() => setOpen(true)}>
        {sent
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" stroke-width="1.8" /><path d="M12 11v5.5" /><circle cx="12" cy="7.6" r=".6" fill="currentColor" /></svg>}
      </button>
      {open && (
        <div class="sheet-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div class="sheet-panel report-modal" role="dialog" aria-modal="true" aria-labelledby={`rp-${q.id}`}>
            <div class="sheet-grab" aria-hidden="true" />
            <div class="sheet-top">
              <div>
                <h2 id={`rp-${q.id}`}>Semnalează o greșeală</h2>
                <p class="muted small">{q.q.replace(/___/g, '…')}</p>
              </div>
              <button type="button" class="icon-btn" aria-label="Închide" onClick={() => setOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </div>

            {sent ? (
              <div class="rp-done">
                <span class="rp-done-ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
                <p><strong>Mulțumim!</strong></p>
                <p class="muted small">Ai semnalat această întrebare; o vom verifica.</p>
                <button type="button" class="btn btn-primary btn-block" onClick={() => setOpen(false)}>Gata</button>
              </div>
            ) : !user.value ? (
              <div class="rp-done">
                <p class="muted">Ca să semnalezi o greșeală, intră în cont. Așa putem să te întrebăm dacă avem nevoie de lămuriri.</p>
                <a class="btn btn-primary btn-block" href="/cont">Intră în cont</a>
              </div>
            ) : (
              <form class="rp-form" onSubmit={send}>
                <div class="rp-reasons" role="radiogroup" aria-label="Ce nu este în regulă">
                  {REASONS.map((r) => (
                    <label class={`rp-opt${reason === r.id ? ' on' : ''}`}>
                      <input type="radio" name={`reason-${q.id}`} checked={reason === r.id} onChange={() => setReason(r.id)} />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
                <textarea class="input rp-note" rows={2} maxLength={1000} value={note}
                  placeholder={reason === 'other' ? 'Scrie pe scurt ce nu este în regulă' : 'Detalii (dacă vrei): în versetul 12 scrie altfel.'}
                  aria-label="Detalii" onInput={(e) => setNote(e.currentTarget.value)} />
                {error && <p class="notice notice-bad" role="alert">{error}</p>}
                <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se trimite…' : 'Trimite'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
