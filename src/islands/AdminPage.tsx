import { useEffect, useState } from 'preact/hooks';
import { addChildTo, deleteAccount, deleteChild, loadUsers, renameChild, updateUser, type Kid, type UserRow } from '../lib/admin';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import Avatar from './Avatar';
import Loader from './Loader';

/** For admins: every account and its children; change and delete them. */
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
          {r.isParent && <span class="tag-on">{n} {n === 1 ? 'copil' : 'copii'}</span>}
        </span>
        <svg class="adm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        <span class="adm-sub">
          <small class="adm-mail">{r.email}</small>
        </span>
        <span class="adm-dates">
          <small>Creat: <b>{r.at ? day(r.at.toDate()) : '—'}</b></small>
          <small>Ultima dată: <b>{r.seen ? day(r.seen.toDate()) : 'încă nu'}</b></small>
        </span>
      </button>
      {open && <Editor r={r} self={r.uid === me} onChanged={onChanged} />}
    </li>
  );
}

/** "azi", "ieri" or "31.10.26". */
function day(d: Date): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return 'azi';
  if (diff === 1) return 'ieri';
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Everything an admin can change on one account. Each action saves at once and reloads the list. */
function Editor({ r, self, onChanged }: { r: UserRow; self: boolean; onChanged: () => Promise<void> }) {
  const [f, setF] = useState({ name: r.name, isParent: r.isParent, admin: r.admin });
  const [newKid, setNewKid] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = f.name.trim() !== r.name || f.isParent !== r.isParent || f.admin !== r.admin;

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
      <form class="stack adm-form" onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) run(() => updateUser(r.uid, f), 'Salvat.'); }}>
        <div class="field">
          <label for={`an-${r.uid}`}>Nume complet</label>
          <input id={`an-${r.uid}`} class="input" maxLength={80} value={f.name} onInput={(e) => setF({ ...f, name: e.currentTarget.value })} />
        </div>
        <label class="check"><input type="checkbox" checked={f.isParent} onChange={(e) => setF({ ...f, isParent: e.currentTarget.checked })} /><span>Cont de părinte</span></label>
        <label class="check">
          <input type="checkbox" checked={f.admin} disabled={self} onChange={(e) => setF({ ...f, admin: e.currentTarget.checked })} />
          <span>Administrator{self && <span class="muted"> (contul tău)</span>}</span>
        </label>
        <button class="btn btn-primary btn-block" disabled={busy || !dirty || !f.name.trim()}>Salvează</button>
      </form>

      {(r.isParent || r.kids.length > 0) && (
        <section class="adm-kids" aria-label="Copii">
          <p class="me-label">Copii</p>
          <ul class="adm-kid-list">
            {r.kids.map((k) => <KidRow key={k.key} uid={r.uid} k={k} busy={busy} run={run} />)}
          </ul>
          <form class="kid-row" onSubmit={(e) => { e.preventDefault(); if (newKid.trim()) run(() => addChildTo(r.uid, newKid), 'Copil adăugat.').then(() => setNewKid('')); }}>
            <input class="input" maxLength={40} placeholder="Prenumele unui copil nou" aria-label="Prenumele copilului nou" value={newKid} onInput={(e) => setNewKid(e.currentTarget.value)} />
            <button class="btn btn-ghost" disabled={busy || !newKid.trim()}>Adaugă</button>
          </form>
        </section>
      )}

      {!self && (confirmDelete ? (
        <div class="stack adm-actions">
          <p class="small muted">Se șterg profilul, copiii și tot progresul lor. Emailul și parola rămân în Firebase Authentication, de unde se pot șterge din consolă.</p>
          <div class="two">
            <button type="button" class="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Renunță</button>
            <button type="button" class="btn btn-danger" disabled={busy} onClick={() => run(() => deleteAccount(r), 'Contul a fost șters.')}>Șterge definitiv</button>
          </div>
        </div>
      ) : (
        <button type="button" class="btn btn-ghost btn-block bad" disabled={busy} onClick={() => setConfirmDelete(true)}>Șterge contul</button>
      ))}
      {msg && <p class={`notice ${msg.ok ? 'notice-ok' : 'notice-bad'}`} role="status">{msg.text}</p>}
    </div>
  );
}

/** One child: the name to change in place, and a delete that asks first. */
function KidRow({ uid, k, busy, run }: { uid: string; k: Kid; busy: boolean; run: (a: () => Promise<unknown>, done: string) => Promise<void> }) {
  const [name, setName] = useState(k.name);
  const [confirm, setConfirm] = useState(false);
  const changed = name.trim() !== k.name && !!name.trim();
  return (
    <li class="adm-kid">
      {confirm ? (
        <div class="adm-kid-confirm">
          <span class="small">Ștergi pe <strong>{k.name}</strong> și progresul lui?</span>
          <div class="two">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Renunță</button>
            <button type="button" class="btn btn-danger btn-sm" disabled={busy} onClick={() => run(() => deleteChild(uid, k.key), 'Copil șters.')}>Șterge</button>
          </div>
        </div>
      ) : (
        <form class="adm-kid-line" onSubmit={(e) => { e.preventDefault(); if (changed) run(() => renameChild(uid, k.key, name), 'Salvat.'); }}>
          <Avatar name={k.name} size={32} />
          <input class="input" maxLength={40} aria-label={`Prenumele lui ${k.name}`} value={name} onInput={(e) => setName(e.currentTarget.value)} />
          {changed
            ? <button class="btn btn-ghost btn-sm" disabled={busy}>Salvează</button>
            : (
              <button type="button" class="btn btn-ghost btn-sm adm-kid-del" disabled={busy} aria-label={`Șterge pe ${k.name}`} onClick={() => setConfirm(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
              </button>
            )}
        </form>
      )}
    </li>
  );
}
