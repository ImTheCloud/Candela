import { useState } from 'preact/hooks';
import { ageGroup, ageLabel, validBirthYear } from '../lib/age';
import { players } from '../lib/players';
import { errorText, profile, profileError, profileLoaded, setBirthYear, setParent, signIn, signOut, user } from '../lib/session';
import Avatar from './Avatar';
import Children from './Children';
import PasswordInput from './PasswordInput';

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
        <PasswordInput id="password" autocomplete="current-password" value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
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
  const name = p?.name ?? u.displayName ?? 'Contul meu';
  const [parentError, setParentError] = useState('');
  const kids = players.value.filter((x) => x.child).length;

  async function toggleParent(on: boolean) {
    setParentError('');
    try { await setParent(on); } catch (err) { setParentError(errorText(err)); }
  }

  return (
    <div class="stack profile">
      <section class="card hero">
        <Avatar name={name} size={72} />
        <h2>{name}</h2>
        <p class="muted small">{u.email}</p>
        {!profileLoaded.value && <p class="muted small">Se încarcă profilul…</p>}
        {profileError.value && <p class="notice notice-bad">Profilul nu a putut fi încărcat. Verifică conexiunea și reîncarcă pagina.</p>}
        {profileLoaded.value && !profileError.value && <BirthYear current={p?.birthYear ?? null} />}
      </section>

      {p && (
        <section class="card setting">
          <label class="switch-row">
            <span>
              <strong>Cont de părinte</strong>
              <span class="small muted block">{kids > 0 ? 'Șterge întâi copiii ca să-l poți opri.' : 'Copiii joacă de pe telefonul tău, fiecare cu progresul lui.'}</span>
            </span>
            <input type="checkbox" class="switch" role="switch" checked={p.isParent} disabled={kids > 0} onChange={(e) => toggleParent(e.currentTarget.checked)} />
          </label>
          {parentError && <p class="notice notice-bad" role="alert">{parentError}</p>}
        </section>
      )}

      {p && <Children />}

      <nav class="menu card" aria-label="Contul meu">
        <a href="/progres"><MenuIcon d="M4 19V9M10 19V5M16 19v-8M22 19H2" /><span>Progres</span><Chev /></a>
        {p?.admin && <a href="/semnalari"><MenuIcon d="M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><span>Semnalări de greșeli</span><Chev /></a>}
      </nav>

      <button class="btn btn-ghost btn-block signout" onClick={() => signOut()}>Ieși din cont</button>
    </div>
  );
}

function MenuIcon({ d }: { d: string }) {
  return <svg class="menu-ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

function Chev() {
  return <svg class="menu-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>;
}

function BirthYear({ current }: { current: number | null }) {
  const [editing, setEditing] = useState(current === null);
  const [value, setValue] = useState(current ? String(current) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!editing && current) {
    return (
      <div class="hero-tags">
        <span class="tag">{ageLabel(ageGroup(current))}</span>
        <button type="button" class="btn-reset link small" onClick={() => setEditing(true)}>Născut în {current} · schimbă</button>
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
    <form class="stack hero-form" onSubmit={save}>
      <div class="field">
        <label for="birth">Anul nașterii</label>
        <input id="birth" class="input" inputMode="numeric" maxLength={4} placeholder="de exemplu 1990" value={value} onInput={(e) => setValue(e.currentTarget.value.replace(/\D/g, ''))} />
        <p class="small muted">Întrebările de la examen sunt diferite pe categorii de vârstă; anul nașterii ne spune ce categorie să-ți arătăm. Nu-l arătăm nimănui.</p>
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="two">
        {current && <button type="button" class="btn btn-ghost" onClick={() => setEditing(false)}>Renunță</button>}
        <button class="btn btn-primary" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează'}</button>
      </div>
    </form>
  );
}
