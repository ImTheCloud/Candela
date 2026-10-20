import { useState } from 'preact/hooks';
import { ageGroup, ageLabel, validBirthYear } from '../lib/age';
import { addChild, players, removeChild, updateChild, type Player } from '../lib/players';
import { deleteProgress } from '../lib/progress';
import { errorText, profile, setParent, user } from '../lib/session';

/** Parent switch and the list of children who play from this account. */
export default function Children() {
  const p = profile.value;
  const kids = players.value.filter((x) => x.child);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function toggleParent(on: boolean) {
    setError('');
    try {
      await setParent(on);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section class="card auth-card stack">
      <label class="check">
        <input type="checkbox" checked={p?.isParent ?? false} disabled={kids.length > 0} onChange={(e) => toggleParent(e.currentTarget.checked)} />
        <span>
          Cont de părinte
          <span class="small muted block">Copiii joacă de pe telefonul tău, fiecare cu progresul lui.</span>
        </span>
      </label>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}

      {p?.isParent && (
        <>
          {kids.length > 0 && (
            <ul class="kids">
              {kids.map((k) => <Child key={k.key} child={k} />)}
            </ul>
          )}
          {adding ? <ChildForm onDone={() => setAdding(false)} /> : (
            <button class="btn btn-ghost" onClick={() => setAdding(true)}>Adaugă un copil</button>
          )}
        </>
      )}
    </section>
  );
}

function Child({ child }: { child: Player }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) return <li><ChildForm child={child} onDone={() => setEditing(false)} /></li>;

  async function remove() {
    await deleteProgress(user.value!.uid, child.key);
    await removeChild(child.key);
  }

  return (
    <li class="kid">
      <div class="row-between">
        <div>
          <p><strong>{child.name}</strong></p>
          <p class="small muted">{child.birthYear ? ageLabel(ageGroup(child.birthYear)) : ''}</p>
        </div>
        <div class="kid-actions">
          <button class="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Schimbă</button>
          <button class="btn btn-ghost btn-sm" onClick={() => setConfirming(true)} aria-label={`Șterge pe ${child.name}`}>Șterge</button>
        </div>
      </div>
      {confirming && (
        <div class="notice notice-bad stack confirm">
          <p>Ștergi profilul lui {child.name} și tot progresul lui? Nu se mai poate recupera.</p>
          <div class="kid-actions">
            <button class="btn btn-sm danger" onClick={remove}>Da, șterge</button>
            <button class="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Renunță</button>
          </div>
        </div>
      )}
    </li>
  );
}

function ChildForm({ child, onDone }: { child?: Player; onDone: () => void }) {
  const [name, setName] = useState(child?.name ?? '');
  const [year, setYear] = useState(child?.birthYear ? String(child.birthYear) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    const y = Number(year);
    if (!name.trim()) return setError('Scrie prenumele copilului.');
    if (!validBirthYear(y)) return setError('Scrie anul nașterii cu patru cifre, de exemplu 2014.');
    setBusy(true);
    setError('');
    try {
      if (child) await updateChild(child.key, name, y);
      else await addChild(name, y);
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form class="stack kid-form" onSubmit={submit}>
      <div class="two">
        <div class="field">
          <label for={`kn-${child?.key ?? 'new'}`}>Prenume</label>
          <input id={`kn-${child?.key ?? 'new'}`} class="input" maxLength={40} value={name} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
        <div class="field">
          <label for={`ky-${child?.key ?? 'new'}`}>Anul nașterii</label>
          <input id={`ky-${child?.key ?? 'new'}`} class="input" inputMode="numeric" maxLength={4} placeholder="2014" value={year}
            onInput={(e) => setYear(e.currentTarget.value.replace(/\D/g, ''))} />
        </div>
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="kid-actions">
        <button class="btn btn-primary" disabled={busy}>{child ? 'Salvează' : 'Adaugă'}</button>
        <button type="button" class="btn btn-ghost" onClick={onDone}>Renunță</button>
      </div>
    </form>
  );
}
