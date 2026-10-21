import { useEffect, useState } from 'preact/hooks';
import { loadDetail, loadUsers, type PlayerDetail, type UserRow } from '../lib/admin';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import Avatar from './Avatar';
import Loader from './Loader';

/** For admins: who signed up, and how far each one got. */
export default function AdminPage() {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value && !profile.value)) return <Loader />;
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
  if (!rows) return <Loader />;

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

  const load = () => { if (!detail && !failed) loadDetail(r).then(setDetail).catch(() => setFailed(true)); };
  // a parent shows its children right away; anyone else opens to show their own numbers
  useEffect(() => { if (r.isParent) load(); }, []);

  const n = r.kids.length;
  const kids = detail?.filter((p) => p.child) ?? [];
  const own = detail?.find((p) => !p.child);
  return (
    <li class="card adm-row">
      <button type="button" class="adm-head" aria-expanded={open} onClick={() => { if (!r.isParent) { setOpen(!open); load(); } }}>
        <Avatar name={r.name} size={40} />
        <strong class="adm-name">{r.name}</strong>
        <span class="adm-badge">{r.isParent && <span class="tag-on">părinte · {n} {n === 1 ? 'copil' : 'copii'}</span>}</span>
        <span class="adm-sub">
          <small class="adm-mail">{r.email}</small>
          <small class="adm-date">{r.at ? r.at.toDate().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'vechi'}</small>
        </span>
      </button>
      {r.isParent && kids.length > 0 && (
        <div class="adm-detail">
          {kids.map((p) => (
            <div class="adm-player is-kid">
              <p class="adm-pname"><strong>{p.name}</strong><span class="tag-kid">copil</span></p>
              {p.books.map((b) => <p class="small muted adm-line">{b.name} · {b.mastered} știute · {b.wrong} de reluat · {b.chapters} cap.</p>)}
            </div>
          ))}
        </div>
      )}
      {!r.isParent && open && (
        <div class="adm-detail">
          {failed ? <p class="small bad">Nu s-au putut citi detaliile.</p> : !own ? <p class="small muted">Se încarcă…</p> : own.books.map((b) => (
            <p class="small muted adm-line">{b.name} · {b.mastered} știute · {b.wrong} de reluat · {b.chapters} cap.</p>
          ))}
        </div>
      )}
    </li>
  );
}
