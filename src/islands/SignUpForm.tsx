import { useEffect, useRef, useState } from 'preact/hooks';
import { validBirthYear } from '../lib/age';
import { errorText, signUp, user } from '../lib/session';
import PasswordInput from './PasswordInput';

export default function SignUpForm() {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '', birthYear: '', isParent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  // Someone already signed in has nothing to do here. During sign-up, wait until the profile is written.
  useEffect(() => {
    if (user.value && !submitting.current) location.replace('/cont');
  }, [user.value]);

  const set = (k: keyof typeof f) => (e: Event) => {
    const t = e.currentTarget as HTMLInputElement;
    setF({ ...f, [k]: t.type === 'checkbox' ? t.checked : t.value });
  };

  async function submit(e: Event) {
    e.preventDefault();
    const y = Number(f.birthYear);
    if (!f.firstName.trim() || !f.lastName.trim()) return setError('Scrie prenumele și numele.');
    if (!validBirthYear(y)) return setError('Scrie anul nașterii cu patru cifre, de exemplu 1990.');
    setBusy(true);
    setError('');
    submitting.current = true;
    try {
      await signUp({ ...f, birthYear: y });
      location.replace('/');
    } catch (err) {
      submitting.current = false;
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form class="card auth-card stack" onSubmit={submit}>
      <h2>Creează un cont</h2>
      <div class="two">
        <div class="field">
          <label for="first">Prenume</label>
          <input id="first" class="input" autocomplete="given-name" required value={f.firstName} onInput={set('firstName')} />
        </div>
        <div class="field">
          <label for="last">Nume</label>
          <input id="last" class="input" autocomplete="family-name" required value={f.lastName} onInput={set('lastName')} />
        </div>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required value={f.email} onInput={set('email')} />
      </div>
      <div class="field">
        <label for="password">Parolă</label>
        <PasswordInput id="password" autocomplete="new-password" minLength={6} value={f.password} onInput={set('password')} />
        <p class="small muted">Cel puțin 6 caractere.</p>
      </div>
      <div class="field">
        <label for="birth">Anul nașterii</label>
        <input id="birth" class="input" inputMode="numeric" maxLength={4} placeholder="de exemplu 1990" required value={f.birthYear}
          onInput={(e) => setF({ ...f, birthYear: e.currentTarget.value.replace(/\D/g, '') })} />
        <p class="small muted">Întrebările de examen sunt pe categorii de vârstă; așa știm ce categorie să-ți arătăm. Nu-l arătăm nimănui.</p>
      </div>
      <label class="check">
        <input type="checkbox" checked={f.isParent} onChange={set('isParent')} />
        <span>Sunt părinte și copiii mei vor juca de pe contul meu</span>
      </label>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se creează contul…' : 'Creează contul'}</button>
      <p class="small muted auth-links">Ai deja un cont? <a class="link" href="/cont">Intră</a></p>
    </form>
  );
}
