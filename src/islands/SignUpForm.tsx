import { useEffect, useRef, useState } from 'preact/hooks';
import { errorText, signUp, user } from '../lib/session';
import PasswordInput from './PasswordInput';
import { nextPage } from './AccountGate';
import { addChild, sameFirstName } from '../lib/players';
import SameNameSheet from './SameNameSheet';
import LampIcon from './LampIcon';

export default function SignUpForm() {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '', isParent: false });
  // a parent names the children at once: each plays from this account
  const [kids, setKids] = useState(['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sameName, setSameName] = useState<{ name: string; kind: 'parent' | 'child' } | null>(null);
  const submitting = useRef(false);

  // Someone already signed in has nothing to do here. During sign-up, wait until the profile is written.
  useEffect(() => {
    document.body.classList.add('auth-no-header');
    if (user.value && !submitting.current) location.replace('/');
    return () => document.body.classList.remove('auth-no-header');
  }, [user.value]);

  const set = (k: keyof typeof f) => (e: Event) => {
    const t = e.currentTarget as HTMLInputElement;
    setF({ ...f, [k]: t.type === 'checkbox' ? t.checked : t.value });
  };

  async function submit(e: Event) {
    e.preventDefault();
    if (!f.lastName.trim()) return setError('Scrie numele de familie.');
    const effectiveFirst = f.firstName.trim() || 'Familia';
    const names = f.isParent ? kids.map((k) => k.trim()).filter(Boolean) : [];
    if (f.isParent && !names.length) return setError('Scrie prenumele a cel puțin unui copil.');
    const twin = names.find((n) => sameFirstName(n, effectiveFirst));
    if (twin) return setSameName({ name: effectiveFirst, kind: 'parent' });
    const duplicateChild = names.find((n, i) => names.some((other, j) => j > i && sameFirstName(n, other)));
    if (duplicateChild) return setSameName({ name: duplicateChild, kind: 'child' });
    setBusy(true);
    setError('');
    submitting.current = true;
    try {
      await signUp({ ...f, firstName: effectiveFirst });
    } catch (err) {
      submitting.current = false;
      setError(errorText(err));
      setBusy(false);
      return;
    }
    try {
      for (const n of names) await addChild(n);
      location.replace(nextPage('/'));
    } catch {
      // the account is created: redirect to home
      location.replace(nextPage('/'));
    }
  }

  return (
    <form class="card auth-card stack" onSubmit={submit}>
      <div class="auth-brand">
        <div class="auth-brand-lamp" aria-hidden="true">
          <LampIcon size={56} />
        </div>
        <span class="auth-brand-badge">Concursul „Talantul în Negoț”</span>
        <p class="auth-brand-verse">„...și candela lui Dumnezeu nu se stinsese încă...”</p>
        <span class="auth-brand-ref">1 Samuel 3:3</span>
      </div>
      <h2>Creează un cont</h2>
      <div class="two">
        <div class="field">
          <label for="last">Nume de familie</label>
          <input id="last" class="input" autocomplete="family-name" required value={f.lastName} onInput={set('lastName')} />
        </div>
        <div class="field">
          <label for="first">Prenume</label>
          <input
            id="first"
            class="input"
            autocomplete="given-name"
            placeholder="Familia"
            value={f.firstName}
            onInput={set('firstName')}
          />
        </div>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" autocomplete="email" required value={f.email} onInput={set('email')} />
      </div>
      <div class="field">
        <label for="password">Parolă <span class="muted">(cel puțin 6 caractere)</span></label>
        <PasswordInput id="password" autocomplete="new-password" minLength={6} value={f.password} onInput={set('password')} />
      </div>
      <label class="check">
        <input type="checkbox" checked={f.isParent} onChange={set('isParent')} />
        <span>Cont de părinte (cu copii)</span>
      </label>
      {f.isParent && (
        <div class="field">
          <label for="kid-0">Prenumele copiilor</label>
          {kids.map((k, i) => (
            <div class="kid-row">
              <input id={`kid-${i}`} class="input" maxLength={40} aria-label={`Prenumele copilului ${i + 1}`} value={k}
                onInput={(e) => setKids(kids.map((x, j) => (j === i ? e.currentTarget.value : x)))} />
              {kids.length > 1 && (
                <button type="button" class="btn btn-ghost kid-x" aria-label={`Șterge copilul ${i + 1}`} onClick={() => setKids(kids.filter((_, j) => j !== i))}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" class="link small kid-add btn-reset" onClick={() => setKids([...kids, ''])}>+ Adaugă încă un copil</button>
        </div>
      )}
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <button class="btn btn-primary btn-block" disabled={busy}>{busy ? 'Se creează contul…' : 'Creează contul'}</button>
      <div class="auth-links small">
        <a class="link" href={`/cont${location.search}`}>Ai deja un cont?</a>
      </div>
      {sameName && <SameNameSheet name={sameName.name} kind={sameName.kind} onClose={() => setSameName(null)} />}
    </form>
  );
}
