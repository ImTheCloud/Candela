import { useState } from 'preact/hooks';
import { errorText, resetPassword } from '../lib/session';
import LampIcon from './LampIcon';

export default function ResetForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div class="card auth-card stack">
        <h2>Verifică emailul</h2>
        <p>Dacă există un cont pentru <strong>{email.trim()}</strong>, ți-am trimis un link pentru o parolă nouă. Uită-te și în dosarul Spam.</p>
        <a class="btn btn-ghost" href="/cont">Înapoi la intrare</a>
      </div>
    );
  }

  return (
    <form class="card auth-card stack" onSubmit={submit}>
      <div class="auth-brand">
        <a href="/" class="auth-brand-lamp" aria-label="Acasă - Candela" title="Acasă - Candela">
          <LampIcon size={26} />
        </a>
        <span class="auth-brand-badge">Concursul „Talantul în Negoț”</span>
        <p class="auth-brand-verse">„...și candela lui Dumnezeu nu se stinsese încă...”</p>
        <span class="auth-brand-ref">1 Samuel 3:3</span>
      </div>
      <h2>Parolă nouă</h2>
      <p class="muted">Îți trimitem un link pentru o parolă nouă.</p>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se trimite…' : 'Trimite linkul'}</button>
      <div class="auth-links small">
        <a class="link" href="/cont">Înapoi la intrare</a>
        <a class="link muted" href="/">Înapoi acasă</a>
      </div>
    </form>
  );
}
