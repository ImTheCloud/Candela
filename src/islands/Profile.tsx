import { useState } from 'preact/hooks';
import { addChild, players, removeChild, sameFirstName, updateChild, type Player } from '../lib/players';
import { localGet } from '../lib/store';
import { deleteProgress } from '../lib/progress';
import { deleteMyAccount, errorText, profile, profileError, profileLoaded, rememberedAccount, setParent, signOut, updateAccountName, user } from '../lib/session';
import Avatar from './Avatar';
import SameNameSheet from './SameNameSheet';
import Loader from './Loader';
import Modal from './Modal';

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
  const [editingSelf, setEditingSelf] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const list = players.value;
  const kids = list.filter((x) => x.child).length;
  const isParent = p?.isParent === true;
  // how many flagged questions wait (the avatar keeps this number up to date)
  const reportsOpen = p?.admin ? localGet<number>('acctN', 0) : 0;

  // nothing is drawn from the last visit: the page waits for the account, then each block for its data
  if (!u || !profileLoaded.value) return <Loader />;

  async function toggleParent(on: boolean) {
    setParentError('');
    try { await setParent(on); } catch (err) { setParentError(errorText(err)); }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteMyAccount();
      window.location.replace('/');
    } catch (e) {
      setDeleteError(errorText(e));
      setDeleting(false);
    }
  }

  return (
    <div class="me">
      <header class="me-id">
        <Avatar name={name} size={76} />
        <div class="me-who">
          <h1>{name}</h1>
          {email && <p class="small muted">{email}</p>}
          {profileError.value && <p class="small bad">Profilul nu a putut fi încărcat. Verifică conexiunea.</p>}
        </div>
      </header>

      {isParent ? (
        <section class="me-sect" aria-labelledby="pl-title">
          <h2 id="pl-title" class="me-label">Familia</h2>
          {list.map((x) => (
            <PlayerBlock
              key={x.key}
              p={x}
              editingSelf={editingSelf}
              onStartEditSelf={() => setEditingSelf(true)}
              onDoneEditSelf={() => setEditingSelf(false)}
            />
          ))}
          {adding && (
            <article class="pl">
              <ChildForm onDone={() => setAdding(false)} />
            </article>
          )}
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
          <section class="me-sect" aria-label="Contul meu">
            {list.map((x) => (
              <PlayerBlock
                key={x.key}
                p={x}
                editingSelf={editingSelf}
                onStartEditSelf={() => setEditingSelf(true)}
                onDoneEditSelf={() => setEditingSelf(false)}
              />
            ))}
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

      <div class="me-end">
        <div class="me-card">
          {p?.admin && (
            <a class="me-item" href="/admin">
              <span class="me-item-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </span>
              <span class="me-item-label">Administrare</span>
              <span class="me-item-chev">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </span>
            </a>
          )}
          {p?.admin && (
            <a class="me-item" href="/semnalari">
              <span class="me-item-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
              </span>
              <span class="me-item-label">Semnalări de greșeli</span>
              {reportsOpen > 0 && <span class="me-item-badge">{reportsOpen}</span>}
              <span class="me-item-chev">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </span>
            </a>
          )}
          <a class="me-item" href={contactHref}>
            <span class="me-item-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </span>
            <span class="me-item-label">Scrie-ne un email</span>
            <span class="me-item-chev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </span>
          </a>
        </div>

        <div class="me-card">
          <button type="button" class="me-item" onClick={() => signOut()}>
            <span class="me-item-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </span>
            <span class="me-item-label">Ieși din cont</span>
            <span class="me-item-chev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </span>
          </button>
          <button type="button" class="me-item danger" onClick={() => { setDeleteError(''); setConfirmDelete(true); }}>
            <span class="me-item-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            </span>
            <span class="me-item-label">Șterge contul</span>
            <span class="me-item-chev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </span>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <Modal class="confirm" role="alertdialog" labelledby="del-t" onClose={() => !deleting && setConfirmDelete(false)}>
          {(close) => (
            <>
              <h2 id="del-t">Ștergi contul definitiv?</h2>
              <p class="muted">
                Această acțiune este ireversibilă. Toate datele tale, progresul și conturile copiilor asociați vor fi șterse definitiv.
              </p>
              {deleteError && <p class="notice notice-bad" role="alert">{deleteError}</p>}
              <div class="two">
                <button type="button" class="btn btn-ghost" disabled={deleting} onClick={close}>
                  Renunță
                </button>
                <button
                  type="button"
                  class="btn danger"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                >
                  {deleting ? 'Se șterge...' : 'Da, șterge contul'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/** One player in the family: who they are, and management (rename, delete). */
function PlayerBlock({
  p,
  editingSelf,
  onStartEditSelf,
  onDoneEditSelf,
}: {
  p: Player;
  editingSelf: boolean;
  onStartEditSelf: () => void;
  onDoneEditSelf: () => void;
}) {
  const [editingChild, setEditingChild] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isSelf = !p.child;

  async function remove() {
    await deleteProgress(user.value!.uid, p.key);
    await removeChild(p.key);
  }

  if (isSelf && editingSelf) {
    return (
      <article class="pl" id="name-edit">
        <div class="pl-row">
          <Avatar name={p.name} size={36} />
          <div class="pl-name">
            <strong>{p.name.split(' ')[0]} <span class="muted small">(tu)</span></strong>
          </div>
        </div>
        <AccountNameForm currentName={p.name} onDone={onDoneEditSelf} />
      </article>
    );
  }

  if (editingChild) {
    return (
      <article class="pl">
        <div class="pl-row">
          <Avatar name={p.name} size={36} />
          <div class="pl-name">
            <strong>{p.name.split(' ')[0]}</strong>
          </div>
        </div>
        <ChildForm child={p} onDone={() => setEditingChild(false)} />
      </article>
    );
  }

  return (
    <article class="pl">
      <div class="pl-row">
        <Avatar name={p.name} size={36} />
        <div class="pl-name">
          <strong>{p.name.split(' ')[0]}{isSelf && <span class="muted small"> (tu)</span>}</strong>
        </div>
        <div class="pl-actions">
          {p.child ? (
            <>
              <button type="button" class="btn-reset link small" onClick={() => setEditingChild(true)}>Schimbă</button>
              <button type="button" class="btn-reset link small bad" onClick={() => setConfirming(true)} aria-label={`Șterge pe ${p.name}`}>Șterge</button>
            </>
          ) : (
            <button type="button" class="btn-reset link small" onClick={onStartEditSelf}>Schimbă numele</button>
          )}
        </div>
      </div>
      {confirming && (
        <div class="notice notice-bad stack" style="--gap: 10px; margin-top: 6px;">
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

function AccountNameForm({ currentName, onDone }: { currentName: string; onDone: () => void }) {
  const { first, last } = splitName(currentName);
  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);
  const [nameError, setNameError] = useState('');
  const [busy, setBusy] = useState(false);
  const list = players.value;

  async function submitName(e: Event) {
    e.preventDefault();
    if (busy) return;
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
    setBusy(true);
    setNameError('');
    try {
      await updateAccountName(f, l);
      onDone();
    } catch (err) {
      setNameError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="stack me-form" onSubmit={submitName}>
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
        <button type="button" class="btn btn-ghost" onClick={onDone}>Renunță</button>
        <button type="submit" class="btn btn-primary" disabled={busy}>
          {busy ? 'Se salvează…' : 'Salvează'}
        </button>
      </div>
    </form>
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
    } finally {
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
