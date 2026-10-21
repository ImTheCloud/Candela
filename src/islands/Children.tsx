import { useState } from 'preact/hooks';
import { ageGroup, ageLabel, validBirthYear } from '../lib/age';
import Avatar from './Avatar';
import { addChild, choosePlayer, player, players, removeChild, updateChild, type Player } from '../lib/players';
import { deleteProgress } from '../lib/progress';
import { errorText, profile, user } from '../lib/session';

/** The family of a parent account: the adult and the children, each with a tap-to-play row. */
export default function Children() {
  const p = profile.value;
  const list = players.value;
  const current = player.value;
  const [adding, setAdding] = useState(false);
  if (!p?.isParent) return null;

  return (
    <section class="card family">
      <div class="row-between">
        <h3>Familia</h3>
        <span class="small muted">Atinge un nume ca să joace el</span>
      </div>
      <ul class="kids">
        {list.map((k) => <Member key={k.key} m={k} active={k.key === current.key} />)}
      </ul>
      {adding ? <ChildForm onDone={() => setAdding(false)} /> : (
        <button class="btn btn-ghost btn-block" onClick={() => setAdding(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Adaugă un copil
        </button>
      )}
    </section>
  );
}

function Member({ m, active }: { m: Player; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (editing) return <li><ChildForm child={m} onDone={() => setEditing(false)} /></li>;

  async function remove() {
    await deleteProgress(user.value!.uid, m.key);
    await removeChild(m.key);
  }

  return (
    <li class={`member${active ? ' is-active' : ''}`}>
      <button type="button" class="member-main" onClick={() => choosePlayer(m.key)} aria-pressed={active}>
        <Avatar name={m.name} />
        <span class="member-text">
          <strong>{m.name.split(' ')[0]}{!m.child && ' (tu)'}</strong>
          <span class="small muted">{m.birthYear ? ageLabel(ageGroup(m.birthYear)) : ''}</span>
        </span>
        {active && <span class="tag-on">joacă acum</span>}
      </button>
      {m.child && (
        <div class="kid-actions">
          <button class="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Schimbă</button>
          <button class="btn btn-ghost btn-sm" onClick={() => setConfirming(true)} aria-label={`Șterge pe ${m.name}`}>Șterge</button>
        </div>
      )}
      {confirming && (
        <div class="notice notice-bad stack confirm">
          <p>Ștergi profilul lui {m.name} și tot progresul lui? Nu se mai poate recupera.</p>
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
