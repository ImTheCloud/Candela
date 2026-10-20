import { useState } from 'preact/hooks';
import { ageGroup, ageLabel, validBirthYear } from '../lib/age';
import { errorText, profile, profileError, profileLoaded, setBirthYear, signIn, signOut, user } from '../lib/session';
import ThemePicker from './ThemePicker';

export default function AccountPage() {
  const u = user.value;
  if (u === undefined) return <div class="card auth-card skeleton" />;
  if (!u) return <SignInForm />;
  return <Profile />;
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="card auth-card stack" onSubmit={submit}>
      <h2>Intră în cont</h2>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="password">Parolă</label>
        <input id="password" class="input" type="password" autocomplete="current-password" required value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se verifică…' : 'Intră'}</button>
      <div class="auth-links small">
        <a class="link" href="/cont/parola">Ai uitat parola?</a>
        <a class="link" href="/cont/inregistrare">Creează un cont</a>
      </div>
    </form>
  );
}

function Profile() {
  const u = user.value!;
  const p = profile.value;

  return (
    <div class="stack">
      <section class="card auth-card stack">
        <div>
          <h2>{p?.name ?? u.displayName ?? 'Contul meu'}</h2>
          <p class="muted small">{u.email}</p>
        </div>
        {!profileLoaded.value && <p class="muted">Se încarcă profilul…</p>}
        {profileError.value && (
          <p class="notice notice-bad">Profilul nu a putut fi încărcat. Verifică conexiunea și reîncarcă pagina.</p>
        )}
        {profileLoaded.value && !profileError.value && <BirthYear current={p?.birthYear ?? null} />}
      </section>

      <section class="card auth-card stack">
        <h3>Aspect</h3>
        <ThemePicker />
      </section>

      <button class="btn btn-ghost" onClick={() => signOut()}>Ieși din cont</button>
    </div>
  );
}

function BirthYear({ current }: { current: number | null }) {
  const [editing, setEditing] = useState(current === null);
  const [value, setValue] = useState(current ? String(current) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!editing && current) {
    return (
      <div class="row-between">
        <div>
          <p class="small muted">Categoria de vârstă</p>
          <p><strong>{ageLabel(ageGroup(current))}</strong> <span class="muted">· anul nașterii {current}</span></p>
        </div>
        <button class="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Schimbă</button>
      </div>
    );
  }

  async function save(e: Event) {
    e.preventDefault();
    const y = Number(value);
    if (!validBirthYear(y)) {
      setError('Scrie anul nașterii cu patru cifre, de exemplu 1990.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setBirthYear(y);
      setEditing(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="stack" onSubmit={save}>
      <div class="field">
        <label for="birth">Anul nașterii</label>
        <input id="birth" class="input" inputMode="numeric" maxLength={4} placeholder="de exemplu 1990" value={value} onInput={(e) => setValue(e.currentTarget.value.replace(/\D/g, ''))} />
        <p class="small muted">Îl folosim ca să primești întrebările potrivite vârstei tale.</p>
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează'}</button>
    </form>
  );
}
