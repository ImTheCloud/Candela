import { useEffect, useState } from 'preact/hooks';
import {
  addChildTo, createAccount, deleteAccount, deleteChild, loadUsers, renameChild, updateUser,
  type BookStats, type UserRow,
} from '../lib/admin';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import Avatar from './Avatar';
import Loader from './Loader';

/** For admins: every account, its children and how far each one got; add, change and delete them. */
export default function AdminPage() {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value && !profile.value)) return <Loader />;
  if (!u) return <p class="notice">Intră în cont ca să vezi pagina. <a class="link" href="/cont">Intră</a></p>;
  if (!profile.value?.admin) return <p class="notice">Această pagină este doar pentru administratori.</p>;
  return <Users me={u.uid} />;
}

function Users({ me }: { me: string }) {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const reload = () => loadUsers().then((r) => { setRows(r); setError(''); }).catch((e) => setError(errorText(e)));
  useEffect(() => { reload(); }, []);

  if (error && !rows) return <p class="notice notice-bad" role="alert">Lista nu a putut fi încărcată. {error}</p>;
  if (!rows) return <Loader />;

  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)
    || r.kids.some((k) => k.name.toLowerCase().includes(term))) : rows;
  const kidsTotal = rows.reduce((n, r) => n + r.kids.length, 0);

  return (
    <div class="stack">
      <dl class="adm-stats">
        <div><dt>Total</dt><dd>{rows.length + kidsTotal}</dd></div>
        <div><dt>Conturi</dt><dd>{rows.length}</dd></div>
        <div><dt>Părinți</dt><dd>{rows.filter((r) => r.isParent).length}</dd></div>
        <div><dt>Copii</dt><dd>{kidsTotal}</dd></div>
      </dl>
      {adding
        ? <NewAccountForm onDone={(made) => { setAdding(false); if (made) reload(); }} />
        : <button type="button" class="btn btn-primary btn-block" onClick={() => setAdding(true)}>Adaugă o persoană</button>}
      <input class="input" type="search" placeholder="Caută după nume sau email" aria-label="Caută" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      <ul class="adm-list">
        {shown.map((r) => <Row key={r.uid} r={r} me={me} onChanged={reload} />)}
      </ul>
      {shown.length === 0 && <p class="card empty muted">Nimeni nu se potrivește.</p>}
    </div>
  );
}

function Row({ r, me, onChanged }: { r: UserRow; me: string; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const n = r.kids.length;
  return (
    <li class="card adm-row">
      <button type="button" class="adm-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar name={r.name} size={40} />
        <strong class="adm-name">{r.name}</strong>
        <span class="adm-badge">
          {r.admin && <span class="tag-on">admin</span>}
          {r.isParent && <span class="tag-on">părinte, {n} {n === 1 ? 'copil' : 'copii'}</span>}
        </span>
        <span class="adm-sub">
          <small class="adm-mail">{r.email}</small>
          <small class="adm-date">{r.at ? r.at.toDate().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'vechi'}</small>
        </span>
      </button>
      {!open && r.isParent && n > 0 && <p class="small muted adm-kids">{r.kids.map((k) => k.name).join(', ')}</p>}
      {open && <Editor r={r} self={r.uid === me} onChanged={onChanged} />}
    </li>
  );
}

function Stats({ books }: { books: BookStats[] }) {
  return <>{books.map((b) => <p class="small muted adm-line">{b.name}: {b.mastered} știute, {b.wrong} greșite, {b.chapters} cap., {b.exams} examene</p>)}</>;
}

/** Everything an admin can change on one account. Each action saves at once and reloads the list. */
function Editor({ r, self, onChanged }: { r: UserRow; self: boolean; onChanged: () => Promise<void> }) {
  const [f, setF] = useState({ name: r.name, isParent: r.isParent, hidden: r.hidden, admin: r.admin });
  const [newKid, setNewKid] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = f.name.trim() !== r.name || f.isParent !== r.isParent || f.hidden !== r.hidden || f.admin !== r.admin;

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      await onChanged();
      setMsg({ ok: true, text: done });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="adm-detail">
      <div class="adm-player">
        <p class="adm-pname"><strong>Progresul lui {r.name.split(' ')[0]}</strong></p>
        <Stats books={r.books} />
      </div>

      <form class="stack adm-form" onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) run(() => updateUser(r.uid, f), 'Salvat.'); }}>
        <div class="field">
          <label for={`an-${r.uid}`}>Nume complet</label>
          <input id={`an-${r.uid}`} class="input" maxLength={80} value={f.name} onInput={(e) => setF({ ...f, name: e.currentTarget.value })} />
        </div>
        <label class="check"><input type="checkbox" checked={f.isParent} onChange={(e) => setF({ ...f, isParent: e.currentTarget.checked })} /><span>Cont de părinte</span></label>
        <label class="check"><input type="checkbox" checked={f.hidden} onChange={(e) => setF({ ...f, hidden: e.currentTarget.checked })} /><span>Ascuns din clasament</span></label>
        <label class="check">
          <input type="checkbox" checked={f.admin} disabled={self} onChange={(e) => setF({ ...f, admin: e.currentTarget.checked })} />
          <span>Administrator{self && <span class="muted"> (contul tău)</span>}</span>
        </label>
        <button class="btn btn-primary btn-block" disabled={busy || !dirty || !f.name.trim()}>Salvează</button>
      </form>

      {(r.isParent || r.kids.length > 0) && (
        <div class="stack adm-kids-edit">
          <p class="me-label">Copii</p>
          {r.kids.map((k) => <KidEditor key={k.key} uid={r.uid} k={k} busy={busy} run={run} />)}
          <form class="kid-row" onSubmit={(e) => { e.preventDefault(); if (newKid.trim()) run(() => addChildTo(r.uid, newKid), 'Copil adăugat.').then(() => setNewKid('')); }}>
            <input class="input" maxLength={40} placeholder="Prenumele copilului" aria-label="Prenumele copilului nou" value={newKid} onInput={(e) => setNewKid(e.currentTarget.value)} />
            <button class="btn btn-ghost" disabled={busy || !newKid.trim()}>Adaugă</button>
          </form>
        </div>
      )}

      <div class="stack adm-actions">
        {!self && (confirmDelete ? (
          <div class="two">
            <button type="button" class="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Renunță</button>
            <button type="button" class="btn btn-danger" disabled={busy} onClick={() => run(() => deleteAccount(r), 'Contul a fost șters.')}>Șterge definitiv</button>
          </div>
        ) : (
          <button type="button" class="btn btn-ghost btn-block bad" disabled={busy} onClick={() => setConfirmDelete(true)}>Șterge contul</button>
        ))}
        {confirmDelete && <p class="small muted">Se șterg profilul, copiii și tot progresul lor. Emailul și parola rămân în Firebase Authentication, de unde se pot șterge din consolă.</p>}
      </div>
      {msg && <p class={`notice ${msg.ok ? 'notice-ok' : 'notice-bad'}`} role="status">{msg.text}</p>}
    </div>
  );
}

function KidEditor({ uid, k, busy, run }: {
  uid: string; k: UserRow['kids'][number]; busy: boolean; run: (a: () => Promise<unknown>, done: string) => Promise<void>;
}) {
  const [name, setName] = useState(k.name);
  const [confirm, setConfirm] = useState(false);
  return (
    <div class="adm-player is-kid stack">
      <form class="kid-row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(() => renameChild(uid, k.key, name), 'Salvat.'); }}>
        <input class="input" maxLength={40} aria-label={`Prenumele lui ${k.name}`} value={name} onInput={(e) => setName(e.currentTarget.value)} />
        {name.trim() !== k.name && <button class="btn btn-ghost" disabled={busy || !name.trim()}>Salvează</button>}
      </form>
      <Stats books={k.books} />
      {confirm ? (
        <div class="two">
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Renunță</button>
          <button type="button" class="btn btn-danger btn-sm" disabled={busy} onClick={() => run(() => deleteChild(uid, k.key), 'Copil șters.')}>Șterge definitiv</button>
        </div>
      ) : (
        <button type="button" class="link small bad btn-reset adm-del" disabled={busy} onClick={() => setConfirm(true)}>Șterge copilul</button>
      )}
    </div>
  );
}

function NewAccountForm({ onDone }: { onDone: (made: boolean) => void }) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', isParent: false });
  const [kids, setKids] = useState(['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    if (!f.firstName.trim() || !f.lastName.trim()) return setError('Scrie prenumele și numele de familie.');
    setBusy(true);
    setError('');
    try {
      await createAccount({ ...f, kids });
      onDone(true);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form class="card auth-card stack" onSubmit={submit}>
      <h2>Persoană nouă</h2>
      <p class="small muted">Primește pe email un link ca să-și aleagă parola.</p>
      <div class="two">
        <div class="field"><label for="nf">Prenume</label><input id="nf" class="input" required value={f.firstName} onInput={(e) => setF({ ...f, firstName: e.currentTarget.value })} /></div>
        <div class="field"><label for="nl">Nume de familie</label><input id="nl" class="input" required value={f.lastName} onInput={(e) => setF({ ...f, lastName: e.currentTarget.value })} /></div>
      </div>
      <div class="field"><label for="ne">Email</label><input id="ne" class="input" type="email" required value={f.email} onInput={(e) => setF({ ...f, email: e.currentTarget.value })} /></div>
      <label class="check"><input type="checkbox" checked={f.isParent} onChange={(e) => setF({ ...f, isParent: e.currentTarget.checked })} /><span>Cont de părinte (cu copii)</span></label>
      {f.isParent && (
        <div class="field">
          <label for="nk-0">Prenumele copiilor</label>
          {kids.map((k, i) => (
            <input id={`nk-${i}`} class="input" maxLength={40} aria-label={`Prenumele copilului ${i + 1}`} value={k}
              onInput={(e) => setKids(kids.map((x, j) => (j === i ? e.currentTarget.value : x)))} />
          ))}
          <button type="button" class="link small kid-add btn-reset" onClick={() => setKids([...kids, ''])}>+ Adaugă încă un copil</button>
        </div>
      )}
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="two">
        <button type="button" class="btn btn-ghost" onClick={() => onDone(false)}>Renunță</button>
        <button class="btn btn-primary" disabled={busy}>{busy ? 'Se creează…' : 'Creează contul'}</button>
      </div>
    </form>
  );
}
