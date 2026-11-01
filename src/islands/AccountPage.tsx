import { useEffect, useState } from 'preact/hooks';
import { errorText, rememberedAccount, signIn, user } from '../lib/session';
import PasswordInput from './PasswordInput';
import Profile, { type BookInfo } from './Profile';
import Loader from './Loader';
import { nextPage } from './AccountGate';
import LampIcon from './LampIcon';

export default function AccountPage({ books }: { books: BookInfo[] }) {
  const u = user.value;
  if (u === undefined && !rememberedAccount) return <Loader />;
  if (u === null) return <SignInForm />;
  // already signed in and sent here by another page: go back to it
  if (u && nextPage('')) { location.replace(nextPage('')); return <Loader />; }
  return <Profile books={books} />;
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('auth-no-header');
    return () => document.body.classList.remove('auth-no-header');
  }, []);

  async function submit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      // sent here by a test: go back to it
      const next = nextPage('');
      if (next) location.replace(next);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
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
      <h2>Intră în cont</h2>
      <p class="small muted">Ai avut cont pe versiunea veche a site-ului? Intră cu același email și aceeași parolă.</p>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="password">Parolă</label>
        <PasswordInput id="password" autocomplete="current-password" value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se verifică…' : 'Intră'}</button>
      <div class="auth-links small">
        <a class="link" href="/cont/parola">Ai uitat parola?</a>
        <a class="link" href={`/cont/inregistrare${location.search}`}>Creează un cont</a>
        <a class="link muted" href="/">Înapoi acasă</a>
      </div>
    </form>
  );
}
