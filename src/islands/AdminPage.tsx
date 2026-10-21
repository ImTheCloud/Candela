import { useEffect, useState } from 'preact/hooks';
import { loadDetail, loadUsers, type PlayerDetail, type UserRow } from '../lib/admin';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import Avatar from './Avatar';

/** For admins: who signed up, and how far each one got. */
export default function AdminPage() {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value && !profile.value)) return <div class="card skeleton" style="height: 120px" />;
  if (!u) return <p class="notice">Intră în cont ca să vezi pagina. <a class="link" href="/cont">Intră</a></p>;
  if (!profile.value?.admin) return <p class="notice">Această pagină este doar pentru administratori.</p>;
  return <Users />;
}

function Users() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => { loadUsers().then(setRows).catch((e) => setError(errorText(e))); }, []);

  if (error) return <p class="notice notice-bad" role="alert">Lista nu a putut fi încărcată. {error}</p>;
  if (!rows) return <div class="card skeleton" style="height: 160px" />;

  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)) : rows;
  const week = Date.now() - 7 * 864e5;

  return (
    <div class="stack">
      <dl class="kv adm-kv">
        <div><dt>Înscriși</dt><dd>{rows.length}</dd></div>
        <div><dt>Părinți</dt><dd>{rows.filter((r) => r.isParent).length}</dd></div>
        <div><dt>Noi, 7 zile</dt><dd>{rows.filter((r) => (r.at?.toMillis() ?? 0) > week).length}</dd></div>
      </dl>
      <input class="input" type="search" placeholder="Caută după nume sau email" aria-label="Caută" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      <ul class="adm-list">
        {shown.map((r) => <Row key={r.uid} r={r} />)}
      </ul>
      {shown.length === 0 && <p class="card empty muted">Nimeni nu se potrivește.</p>}
    </div>
  );
}

function Row({ r }: { r: UserRow }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<PlayerDetail[] | null>(null);
  const [failed, setFailed] = useState(false);

  function toggle() {
    setOpen(!open);
    if (!detail && !failed) loadDetail(r).then(setDetail).catch(() => setFailed(true));
  }

  const n = r.kids.length;
  return (
    <li class="card adm-row">
      <button type="button" class="adm-head" aria-expanded={open} onClick={toggle}>
        <Avatar name={r.name} size={40} />
        <span class="adm-who">
          <strong>{r.name}</strong>
          <small>{r.email}</small>
        </span>
        <span class="adm-meta">
          {r.isParent && <span class="tag-on">părinte{n > 0 ? ` · ${n} ${n === 1 ? 'copil' : 'copii'}` : ''}</span>}
          <small>{r.at ? r.at.toDate().toLocaleDateString('ro-RO') : 'cont vechi'}</small>
        </span>
      </button>
      {open && (
        <div class="adm-detail">
          {failed ? <p class="small bad">Nu s-au putut citi detaliile.</p> : !detail ? <p class="small muted">Se încarcă…</p> : detail.map((p) => (
            <div class={`adm-player${p.child ? ' is-kid' : ''}`}>
              <p class="adm-pname">
                <strong>{p.name}</strong>
                {r.isParent && <span class={p.child ? 'tag-kid' : 'tag-on'}>{p.child ? 'copil' : 'părinte'}</span>}
              </p>
              {p.books.map((b) => (
                <p class="small muted adm-line">{b.name} · {b.mastered} știute · {b.wrong} de reluat · {b.chapters} cap.</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
