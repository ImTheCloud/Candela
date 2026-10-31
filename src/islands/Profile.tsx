import { useState } from 'preact/hooks';
import { addChild, choosePlayer, player, players, removeChild, sameFirstName, updateChild, type Player } from '../lib/players';
import { localGet } from '../lib/store';
import { deleteProgress } from '../lib/progress';
import { errorText, profile, profileError, profileLoaded, rememberedAccount, setParent, signOut, updateAccountName, user } from '../lib/session';
import Avatar from './Avatar';
import SameNameSheet from './SameNameSheet';
import Stopwatch from './Stopwatch';
import Loader from './Loader';

/** The "Scrie-ne un email" button: a new email to the administrator. */
const contactHref = `mailto:claudiu.dev@outlook.com?subject=${encodeURIComponent('Candela')}`;

export interface BookInfo { slug: string; name: string; chapters: number; totals: Record<string, number> }

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/**
 * The user profile page: who you are, account settings, first and last name edition, and the family.
 */
export default function Profile({ books: _books }: { books?: BookInfo[] }) {
  const u = user.value;
  const p = profile.value;
  const name = p?.name || u?.displayName || rememberedAccount?.name || 'Contul meu';
  const email = u?.email ?? p?.email ?? '';
  const [parentError, setParentError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);

  const list = players.value;
  const kids = list.filter((x) => x.child).length;
  const isParent = p?.isParent === true;
  // how many flagged questions wait (the avatar keeps this number up to date)
  const reportsOpen = p?.admin ? localGet<number>('acctN', 0) : 0;

  // nothing is drawn from the last visit: the page waits for the account, then each block for its data
  if (!u || !profileLoaded.value) return <Loader />;

  function startEditName() {
    const { first, last } = splitName(name);
    setFirstName(first);
    setLastName(last);
    setNameError('');
    setEditingName(true);
  }

  async function submitName(e: Event) {
    e.preventDefault();
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f || !l) {
      setNameError('Scrie prenumele și numele de familie.');
      return;
    }
    const full = `${f} ${l}`.replace(/\s+/g, ' ');
    if (full.length > 80) {
      setNameError('Numele este prea lung (maximum 80 de caractere).');
      return;
    }
    const twin = list.find((x) => x.child && sameFirstName(x.name, f));
    if (twin) {
      setNameError(`Prenumele tău nu poate fi identic cu cel al copilului (${twin.name}).`);
      return;
    }
    setSavingName(true);
    setNameError('');
    try {
      await updateAccountName(f, l);
      setEditingName(false);
    } catch (err) {
      setNameError(errorText(err));
    } finally {
      setSavingName(false);
    }
  }

  async function toggleParent(on: boolean) {
    setParentError('');
    try { await setParent(on); } catch (err) { setParentError(errorText(err)); }
  }

  return (
    <div class="me">
      <header class="me-id">
        <Avatar name={name} size={76} />
        {!editingName ? (
          <div class="me-who">
            <h1>{name}</h1>
            {email && <p class="small muted">{email}</p>}
            <button
              type="button"
              class="btn-reset link small me-edit-btn"
              onClick={startEditName}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Schimbă numele
            </button>
            {profileError.value && <p class="small bad">Profilul nu a putut fi încărcat. Verifică conexiunea.</p>}
          </div>
        ) : (
          <form class="stack me-form me-name-form" onSubmit={submitName}>
            <div class="two">
              <div class="field">
                <label for="me-first">Prenume</label>
                <input
                  id="me-first"
                  class="input"
                  autocomplete="given-name"
                  required
                  maxLength={40}
                  value={firstName}
                  onInput={(e) => setFirstName(e.currentTarget.value)}
                />
              </div>
              <div class="field">
                <label for="me-last">Nume de familie</label>
                <input
                  id="me-last"
                  class="input"
                  autocomplete="family-name"
                  required
                  maxLength={40}
                  value={lastName}
                  onInput={(e) => setLastName(e.currentTarget.value)}
                />
              </div>
            </div>
            {nameError && <p class="notice notice-bad" role="alert">{nameError}</p>}
            <div class="two">
              <button type="button" class="btn btn-ghost" onClick={() => setEditingName(false)}>Renunță</button>
              <button type="submit" class="btn btn-primary" disabled={savingName}>
                {savingName ? 'Se salvează…' : 'Salvează'}
              </button>
            </div>
          </form>
        )}
      </header>

      {isParent ? (
        <section class="me-sect" aria-labelledby="pl-title">
          <h2 id="pl-title" class="me-label">Familia</h2>
          {list.map((x) => (
            <PlayerBlock key={x.key} p={x} onEditSelf={startEditName} />
          ))}
          {adding && <ChildForm onDone={() => setAdding(false)} />}
          {p && (
            <div class="me-row me-fam">
              <label class="switch-row">
                <span>
                  <strong>Cont de părinte</strong>
                  <span class="small muted block">{kids > 0 ? 'Șterge întâi copiii ca să-l poți opri.' : 'Copiii joacă de pe telefonul tău.'}</span>
                </span>
                <input type="checkbox" class="switch" role="switch" checked={isParent} disabled={kids > 0 || !u} onChange={(e) => toggleParent(e.currentTarget.checked)} />
              </label>
              {!adding && (
                <button type="button" class="fam-add btn-reset" onClick={() => setAdding(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  <strong>Adaugă un copil</strong>
                </button>
              )}
            </div>
          )}
          {parentError && <p class="notice notice-bad" role="alert">{parentError}</p>}
        </section>
      ) : (
        p && (
          <section class="me-sect" aria-label="Setări cont">
            <div class="me-row me-fam">
              <label class="switch-row">
                <span>
                  <strong>Cont de părinte</strong>
                  <span class="small muted block">Copiii joacă de pe telefonul tău.</span>
                </span>
                <input type="checkbox" class="switch" role="switch" checked={isParent} disabled={!u} onChange={(e) => toggleParent(e.currentTarget.checked)} />
              </label>
            </div>
            {parentError && <p class="notice notice-bad" role="alert">{parentError}</p>}
          </section>
        )
      )}

      {p?.admin && <Stopwatch />}

      <nav class="me-end">
        {p?.admin && <a class="me-link" href="/admin">Administrare</a>}
        {p?.admin && <a class="me-link" href="/semnalari">Semnalări de greșeli{reportsOpen > 0 ? ` (${reportsOpen})` : ''}</a>}
        <a class="me-link" href={contactHref}>Scrie-ne un email</a>
        <button type="button" class="me-link signout" onClick={() => signOut()}>Ieși din cont</button>
      </nav>
    </div>
  );
}

/** One player in the family: who they are, whether they are playing, and child management. */
function PlayerBlock({ p, onEditSelf }: { p: Player; onEditSelf: () => void }) {
  const current = player.value;
  const active = p.key === current.key;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isSelf = !p.child;

  async function remove() {
    await deleteProgress(user.value!.uid, p.key);
    await removeChild(p.key);
  }

  if (editing) return <ChildForm child={p} onDone={() => setEditing(false)} />;

  return (
    <article class="pl">
      <header class="pl-head">
        <Avatar name={p.name} size={40} />
        <div class="pl-name">
          <strong>{p.name.split(' ')[0]}{isSelf && ' (tu)'}</strong>
        </div>
        {active
          ? <span class="tag-on">joacă acum</span>
          : <button type="button" class="btn btn-ghost btn-sm" onClick={() => choosePlayer(p.key)}>Alege</button>}
      </header>
      <footer class="pl-foot">
        <span class="pl-actions">
          {p.child ? (
            <>
              <button type="button" class="btn-reset link small" onClick={() => setEditing(true)}>Schimbă</button>
              <button type="button" class="btn-reset link small bad" onClick={() => setConfirming(true)} aria-label={`Șterge pe ${p.name}`}>Șterge</button>
            </>
          ) : (
            <button type="button" class="btn-reset link small" onClick={onEditSelf}>Schimbă numele</button>
          )}
        </span>
      </footer>
      {confirming && (
        <div class="notice notice-bad stack" style="--gap: 10px">
          <p>Ștergi profilul lui {p.name}? Nu se mai poate recupera.</p>
          <div class="two">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Renunță</button>
            <button type="button" class="btn btn-sm danger" onClick={remove}>Da, șterge</button>
          </div>
        </div>
      )}
    </article>
  );
}

function ChildForm({ child, onDone }: { child?: Player; onDone: () => void }) {
  const [name, setName] = useState(child?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sameName, setSameName] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    if (!name.trim()) return setError('Scrie prenumele copilului.');
    const parent = profile.value?.name ?? '';
    if (sameFirstName(name, parent)) return setSameName(parent.trim().split(/\s+/)[0]);
    setBusy(true);
    setError('');
    try {
      if (child) await updateChild(child.key, name);
      else await addChild(name);
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  const id = child?.key ?? 'new';
  return (
    <form class="stack me-form" onSubmit={submit}>
      <div class="field">
        <label for={`kn-${id}`}>Prenume</label>
        <input id={`kn-${id}`} class="input" maxLength={40} value={name} onInput={(e) => setName(e.currentTarget.value)} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="two">
        <button type="button" class="btn btn-ghost" onClick={onDone}>Renunță</button>
        <button class="btn btn-primary" disabled={busy}>{child ? 'Salvează' : 'Adaugă'}</button>
      </div>
      {sameName && <SameNameSheet name={sameName} fromProfile onClose={() => setSameName('')} />}
    </form>
  );
}
