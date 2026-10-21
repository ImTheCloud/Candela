import { useState } from 'preact/hooks';
import { player } from '../lib/players';
import type { Playable } from '../lib/questions';
import { REASONS, alreadyReported, sendReport, type Reason } from '../lib/reports';
import { errorText, user } from '../lib/session';

/** "Semnalează o greșeală" under the correction of a question. */
export default function ReportButton({ q }: { q: Playable }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(() => alreadyReported(q.id));
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (sent) return <p class="small muted report-done">Mulțumim! Ai semnalat această întrebare; o vom verifica.</p>;
  if (!open) return <button type="button" class="btn-reset link small report-link" onClick={() => setOpen(true)}>Semnalează o greșeală</button>;

  if (!user.value) {
    return (
      <div class="report stack">
        <p class="small">Ca să semnalezi o greșeală, intră în cont. Așa putem să te întrebăm dacă avem nevoie de lămuriri.</p>
        <div class="two">
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Renunță</button>
          <a class="btn btn-primary btn-sm" href="/cont">Intră în cont</a>
        </div>
      </div>
    );
  }

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
      setBusy(false);
    }
  }

  return (
    <form class="report stack" onSubmit={send}>
      <p class="report-title">Ce nu este în regulă?</p>
      <div class="report-reasons" role="radiogroup">
        {REASONS.map((r) => (
          <label class="check">
            <input type="radio" name={`reason-${q.id}`} checked={reason === r.id} onChange={() => setReason(r.id)} />
            <span>{r.label}</span>
          </label>
        ))}
      </div>
      <div class="field">
        <label for={`note-${q.id}`}>Detalii {reason === 'other' ? '' : '(dacă vrei)'}</label>
        <textarea id={`note-${q.id}`} class="input" rows={3} maxLength={1000} value={note}
          placeholder="De exemplu: în versetul 12 scrie altfel."
          onInput={(e) => setNote(e.currentTarget.value)} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="two">
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Renunță</button>
        <button class="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Se trimite…' : 'Trimite'}</button>
      </div>
    </form>
  );
}
