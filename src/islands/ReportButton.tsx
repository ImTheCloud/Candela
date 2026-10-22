import { useState } from 'preact/hooks';
import { player } from '../lib/players';
import type { Playable } from '../lib/questions';
import { REASONS, alreadyReported, sendReport, type Reason } from '../lib/reports';
import { errorText, user } from '../lib/session';
import Modal, { CloseButton } from './Modal';

const FLAG = <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></svg>;
const CHECK = <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

/**
 * "Semnalează": says out loud what it is (a flag and a word), and opens a sheet to report a problem with the question:
 * a mistake, or a question too hard for the level. small: a pill at the foot of the question; otherwise a tile beside "Vezi versetul".
 */
export default function ReportButton({ q, small = false }: { q: Playable; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(() => alreadyReported(q.id));
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      <button type="button" class={`info-btn${small ? ' sm' : ''}${sent ? ' is-sent' : ''}`} aria-label="Semnalează o problemă în această întrebare" onClick={() => setOpen(true)}>
        {sent ? CHECK : FLAG}
        <span>{sent ? 'Semnalat' : 'Semnalează'}</span>
      </button>
      {open && (
        <Modal class="report-modal" labelledby={`rp-${q.id}`} onClose={() => setOpen(false)}>
          {(close) => (<>
            <div class="sheet-top">
              <div>
                <h2 id={`rp-${q.id}`}>Semnalează o problemă</h2>
                <p class="muted small">{q.q.replace(/___/g, '…')}</p>
              </div>
              <CloseButton onClick={close} />
            </div>

            {sent ? (
              <div class="rp-done">
                <span class="rp-done-ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
                <p><strong>Mulțumim!</strong></p>
                <p class="muted small">Ai semnalat această întrebare; o vom verifica.</p>
                <button type="button" class="btn btn-primary btn-block" onClick={close}>Gata</button>
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
          </>)}
        </Modal>
      )}
    </>
  );
}
