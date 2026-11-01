import { useEffect, useState } from 'preact/hooks';
import { sendMessage, watchOpenMessagesCount } from '../lib/messages';
import { addChild, formatFirstLast, players, removeChild, sameFirstName, shortName, updateChild, type Player } from '../lib/players';
import { watchOpenCount } from '../lib/reports';
import { localGet } from '../lib/store';
import { deleteMyAccount, errorText, profile, profileError, profileLoaded, rememberedAccount, setParent, signOut, updateAccountName, user } from '../lib/session';
import Avatar from './Avatar';
import PasswordInput from './PasswordInput';
import SameNameSheet from './SameNameSheet';
import Loader from './Loader';
import Modal from './Modal';
import ProfileProgressDashboard from './ProfileProgressDashboard';

export interface BookInfo { slug: string; name: string; chapters: number; totals: Record<string, number> }

function splitName(fullName: string): { first: string; last: string } {
  const formatted = formatFirstLast(fullName);
  const parts = formatted.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/**
 * The user profile page: who you are, account settings, first and last name edition, and the family.
 */
export default function Profile({ books: _books }: { books?: BookInfo[] }) {
  const u = user.value;
  const p = profile.value;
  const email = u?.email ?? p?.email ?? '';
  const [parentError, setParentError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingSelf, setEditingSelf] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Contact message state
  const [contactModal, setContactModal] = useState(false);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState('');

  const list = players.value;
  const selfPlayer = list.find((x) => !x.child) || list[0];
  const childPlayers = list.filter((x) => x.child);
  const kids = childPlayers.length;
  const isParent = p?.isParent === true;

  // Badges for admin
  const [reportsOpen, setReportsOpen] = useState(() => (p?.admin ? localGet<number>('acctRep', 0) : 0));
  const [messagesOpen, setMessagesOpen] = useState(() => (p?.admin ? localGet<number>('acctMsg', 0) : 0));

  useEffect(() => {
    if (!p?.admin) return;
    const unsubR = watchOpenCount((n) => setReportsOpen(n));
    const unsubM = watchOpenMessagesCount((n) => setMessagesOpen(n));
    return () => {
      unsubR?.();
      unsubM?.();
    };
  }, [p?.admin]);

  // nothing is drawn from the last visit: the page waits for the account, then each block for its data
  if (!u || !profileLoaded.value) return <Loader />;

  async function toggleParent(on: boolean) {
    setParentError('');
    try { await setParent(on); } catch (err) { setParentError(errorText(err)); }
  }

  async function handleDeleteAccount(e?: Event) {
    if (e) e.preventDefault();
    if (!deletePassword.trim()) {
      setDeleteError('Introdu parola contului pentru a confirma ștergerea.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteMyAccount(deletePassword);
      window.location.replace('/');
    } catch (err) {
      setDeleteError(errorText(err));
      setDeleting(false);
    }
  }

  return (
    <div class="me">
      {profileError.value && <p class="notice notice-bad" role="alert">Profilul nu a putut fi încărcat. Verifică conexiunea.</p>}

      {isParent ? (
        <section class="me-sect" aria-labelledby="pl-title">
          <h2 id="pl-title" class="me-label">Părintele</h2>
          {selfPlayer && (
            <PlayerBlock
              key={selfPlayer.key}
              p={selfPlayer}
              email={email}
              editingSelf={editingSelf}
              onStartEditSelf={() => setEditingSelf(true)}
              onDoneEditSelf={() => setEditingSelf(false)}
            />
          )}
          {(childPlayers.length > 0 || adding) && (
            <h3 class="me-label" style={{ marginTop: '8px' }}>Copii</h3>
          )}
          {childPlayers.map((x) => (
            <PlayerBlock
              key={x.key}
              p={x}
              email={email}
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
                email={email}
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

      <ProfileProgressDashboard />

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
          {p?.admin && (
            <a class="me-item" href="/mesaje">
              <span class="me-item-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </span>
              <span class="me-item-label">Mesaje primite</span>
              {messagesOpen > 0 && <span class="me-item-badge">{messagesOpen}</span>}
              <span class="me-item-chev">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </span>
            </a>
          )}
          {p?.admin && (
            <a class="me-item" href="/admin/intrebari">
              <span class="me-item-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="9" y1="7" x2="15" y2="7" />
                  <line x1="9" y1="11" x2="15" y2="11" />
                </svg>
              </span>
              <span class="me-item-label">Întrebări și răspunsuri</span>
              <span class="me-item-chev">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </span>
            </a>
          )}
          <button
            type="button"
            class="me-item"
            onClick={() => {
              setContactText('');
              setContactDone(false);
              setContactError('');
              setContactModal(true);
            }}
          >
            <span class="me-item-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </span>
            <span class="me-item-label">Trimite un mesaj</span>
            <span class="me-item-chev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </span>
          </button>
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
          <button type="button" class="me-item danger" onClick={() => { setDeleteError(''); setDeletePassword(''); setConfirmDelete(true); }}>
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
            <form onSubmit={handleDeleteAccount} class="stack" style={{ gap: '14px' }}>
              <h2 id="del-t">Ștergi contul definitiv?</h2>
              <p class="muted small">
                Această acțiune este ireversibilă. Toate datele tale, progresul și conturile copiilor asociați vor fi șterse definitiv.
              </p>
              <div class="field">
                <label for="del-pass">Confirmă cu parola contului</label>
                <PasswordInput
                  id="del-pass"
                  autocomplete="current-password"
                  value={deletePassword}
                  onInput={(e) => setDeletePassword(e.currentTarget.value)}
                  disabled={deleting}
                  placeholder="Introdu parola ta"
                />
              </div>
              {deleteError && <p class="notice notice-bad" role="alert">{deleteError}</p>}
              <div class="two">
                <button type="button" class="btn btn-ghost" disabled={deleting} onClick={close}>
                  Renunță
                </button>
                <button
                  type="submit"
                  class="btn danger"
                  disabled={deleting || !deletePassword.trim()}
                >
                  {deleting ? 'Se șterge...' : 'Da, șterge definitiv'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {contactModal && (
        <Modal role="dialog" labelledby="msg-t" onClose={() => !contactSending && setContactModal(false)}>
          {() => (
            <>
              {contactDone ? (
                <div class="contact-success stack" style={{ textAlign: 'center', padding: '16px 8px 8px' }}>
                  <div class="contact-success-ic">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--oil-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h2 style={{ margin: '0 0 6px' }}>Mesaj trimis!</h2>
                  <p class="muted" style={{ margin: '0 0 16px' }}>
                    Mesajul tău a fost transmis cu succes administratorilor. Îți mulțumim!
                  </p>
                  <button type="button" class="btn btn-primary btn-block" onClick={() => setContactModal(false)}>
                    Închide
                  </button>
                </div>
              ) : (
                <form
                  class="stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!contactText.trim() || contactSending) return;
                    setContactSending(true);
                    setContactError('');
                    try {
                      await sendMessage(contactText);
                      setContactDone(true);
                    } catch (err) {
                      setContactError(errorText(err));
                    } finally {
                      setContactSending(false);
                    }
                  }}
                >
                  <h2 id="msg-t">Trimite un mesaj</h2>
                  <p class="muted small" style={{ margin: '-4px 0 6px' }}>
                    Ai o întrebare, o sugestie sau o problemă? Scrie-ne mai jos și vom citi mesajul tău.
                  </p>
                  <div class="field">
                    <textarea
                      class="input msg-textarea"
                      rows={5}
                      maxLength={3000}
                      required
                      placeholder="Scrie mesajul tău aici..."
                      value={contactText}
                      onInput={(e) => setContactText(e.currentTarget.value)}
                      disabled={contactSending}
                      autoFocus
                    />
                  </div>
                  {contactError && <p class="notice notice-bad" role="alert">{contactError}</p>}
                  <div class="two">
                    <button type="button" class="btn btn-ghost" disabled={contactSending} onClick={() => setContactModal(false)}>
                      Renunță
                    </button>
                    <button type="submit" class="btn btn-primary" disabled={contactSending || !contactText.trim()}>
                      {contactSending ? 'Se trimite…' : 'Trimite'}
                    </button>
                  </div>
                </form>
              )}
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
  email,
  editingSelf,
  onStartEditSelf,
  onDoneEditSelf,
}: {
  p: Player;
  email?: string;
  editingSelf: boolean;
  onStartEditSelf: () => void;
  onDoneEditSelf: () => void;
}) {
  const [editingChild, setEditingChild] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isSelf = !p.child;
  const displayName = isSelf ? formatFirstLast(p.name) : shortName(p);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await removeChild(p.key);
      setConfirming(false);
    } catch (e) {
      console.error('Eroare la ștergerea profilului:', e);
      setError('Nu s-a putut șterge profilul. Verifică conexiunea la internet și încearcă din nou.');
      setDeleting(false);
    }
  }

  if (isSelf && editingSelf) {
    return (
      <article class="pl" id="name-edit">
        <div class="pl-row">
          <Avatar name={displayName} size={38} />
          <div class="pl-name">
            <strong>{displayName}</strong>
            {email && <span class="pl-email">{email}</span>}
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
          <Avatar name={displayName} size={38} />
          <div class="pl-name">
            <strong>{displayName}</strong>
          </div>
        </div>
        <ChildForm child={p} onDone={() => setEditingChild(false)} />
      </article>
    );
  }

  return (
    <article class="pl">
      <div class="pl-row">
        <Avatar name={displayName} size={38} />
        <div class="pl-name">
          <strong>{displayName}</strong>
          {isSelf && email && <span class="pl-email">{email}</span>}
        </div>
        <div class="pl-actions">
          {p.child ? (
            <>
              <button
                type="button"
                class="pl-btn"
                onClick={() => setEditingChild(true)}
                aria-label={`Modifică numele lui ${p.name}`}
                title="Modifică"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
              <button
                type="button"
                class="pl-btn bad"
                onClick={() => setConfirming(true)}
                aria-label={`Șterge pe ${p.name}`}
                title="Șterge"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </>
          ) : (
            <button
              type="button"
              class="pl-btn"
              onClick={onStartEditSelf}
              aria-label="Modifică numele"
              title="Modifică numele"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {confirming && (
        <div class="notice notice-bad stack" style="--gap: 10px; margin-top: 6px;">
          <p>Ștergi profilul lui {displayName}? Nu se mai poate recupera.</p>
          {error && <p class="error-msg" style="color: #b91c1c; font-weight: 500; font-size: 0.9rem;">{error}</p>}
          <div class="two">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              disabled={deleting}
              onClick={() => { setConfirming(false); setError(''); }}
            >
              Renunță
            </button>
            <button
              type="button"
              class="btn btn-sm danger"
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? 'Se șterge...' : 'Da, șterge'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function AccountNameForm({ currentName, onDone }: { currentName: string; onDone: () => void }) {
  const { first, last } = splitName(currentName);
  const [firstName, setFirstName] = useState(first === 'Familia' ? '' : first);
  const [lastName, setLastName] = useState(last);
  const [nameError, setNameError] = useState('');
  const [busy, setBusy] = useState(false);
  const list = players.value;

  async function submitName(e: Event) {
    e.preventDefault();
    if (busy) return;
    const l = lastName.trim();
    const f = firstName.trim() || 'Familia';
    if (!l) {
      setNameError('Scrie numele de familie.');
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
            placeholder="Familia"
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
  const [conflict, setConflict] = useState<{ name: string; kind: 'parent' | 'child' } | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return setError('Scrie prenumele copilului.');

    // 1. Check against parent first name
    const parent = profile.value?.name ?? '';
    const parentParts = parent.trim().split(/\s+/).filter(Boolean);
    const parentFirst = parentParts.length > 1 ? parentParts.slice(1).join(' ') : (parentParts[0] ?? '');
    if (sameFirstName(cleanName, parentFirst)) return setConflict({ name: parentFirst, kind: 'parent' });

    // 2. Check against other children in this family
    const list = players.value ?? [];
    const duplicateChild = list.find((p) => p.child && p.key !== child?.key && sameFirstName(cleanName, p.name));
    if (duplicateChild) return setConflict({ name: duplicateChild.name, kind: 'child' });

    setBusy(true);
    setError('');
    try {
      if (child) await updateChild(child.key, cleanName);
      else await addChild(cleanName);
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
      {conflict && (
        <SameNameSheet
          name={conflict.name}
          kind={conflict.kind}
          fromProfile
          onClose={() => setConflict(null)}
        />
      )}
    </form>
  );
}
