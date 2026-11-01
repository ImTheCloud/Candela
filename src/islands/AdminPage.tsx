import { useEffect, useState } from 'preact/hooks';
import { addChildTo, deleteAccount, deleteChild, loadUsers, renameChild, updateUser, type Kid, type UserRow } from '../lib/admin';
import { sameFirstName } from '../lib/players';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import Avatar from './Avatar';
import Loader from './Loader';
import SameNameSheet from './SameNameSheet';

type FilterType = 'toate' | 'activi_7z' | 'azi' | 'progres' | 'parinti' | 'singuri' | 'admini';
type SortType = 'seen_desc' | 'seen_asc' | 'created_desc' | 'created_asc' | 'score_desc' | 'name_asc' | 'kids_desc';

/** For admins: statistics dashboard and full account/children management. */
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
  const [filter, setFilter] = useState<FilterType>('toate');
  const [sort, setSort] = useState<SortType>('seen_desc');

  const reload = () => loadUsers().then((r) => { setRows(r); setError(''); }).catch((e) => setError(errorText(e)));
  useEffect(() => { reload(); }, []);

  if (error && !rows) return <p class="notice notice-bad" role="alert">Lista nu a putut fi încărcată. {error}</p>;
  if (!rows) return <Loader />;

  // Global statistics calculation
  const totalAccounts = rows.length;
  const totalKids = rows.reduce((n, r) => n + r.kids.length, 0);
  const totalPlayers = totalAccounts + totalKids;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = todayStart - 7 * 86400000;
  const thirtyDaysAgo = todayStart - 30 * 86400000;

  const activeToday = rows.filter((r) => r.seen && r.seen.toMillis() >= todayStart).length;
  const active7d = rows.filter((r) => r.seen && r.seen.toMillis() >= sevenDaysAgo).length;
  const new30d = rows.filter((r) => r.at && r.at.toMillis() >= thirtyDaysAgo).length;
  const parentsTotal = rows.filter((r) => r.isParent).length;
  const normalTotal = totalAccounts - parentsTotal;
  const withScoreTotal = rows.filter((r) => (r.totalScore ?? 0) > 0).length;
  const adminTotal = rows.filter((r) => r.admin).length;
  const activeRate = totalAccounts > 0 ? Math.round((active7d / totalAccounts) * 100) : 0;

  // Filtered and sorted rows
  const term = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    // Search query match
    if (term) {
      const matchName = r.name.toLowerCase().includes(term);
      const matchEmail = r.email.toLowerCase().includes(term);
      const matchKids = r.kids.some((k) => k.name.toLowerCase().includes(term));
      if (!matchName && !matchEmail && !matchKids) return false;
    }
    // Filter status match
    if (filter === 'activi_7z') return r.seen && r.seen.toMillis() >= sevenDaysAgo;
    if (filter === 'azi') return r.seen && r.seen.toMillis() >= todayStart;
    if (filter === 'progres') return (r.totalScore ?? 0) > 0;
    if (filter === 'parinti') return r.isParent;
    if (filter === 'singuri') return !r.isParent;
    if (filter === 'admini') return r.admin;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'seen_desc') return (b.seen?.toMillis() ?? 0) - (a.seen?.toMillis() ?? 0);
    if (sort === 'seen_asc') return (a.seen?.toMillis() ?? 0) - (b.seen?.toMillis() ?? 0);
    if (sort === 'created_desc') return (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0);
    if (sort === 'created_asc') return (a.at?.toMillis() ?? 0) - (b.at?.toMillis() ?? 0);
    if (sort === 'score_desc') return (b.totalScore ?? 0) - (a.totalScore ?? 0);
    if (sort === 'name_asc') return a.name.localeCompare(b.name, 'ro');
    if (sort === 'kids_desc') return b.kids.length - a.kids.length;
    return 0;
  });

  return (
    <div class="stack" style={{ gap: '14px' }}>
      {/* Dashboard KPI Stat Cards - Compact 2x2 grid on mobile */}
      <section class="adm-dashboard-grid" aria-label="Statistici globale utilizatori">
        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Jucători în total</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
          <div class="adm-card-kpi-val">{totalPlayers}</div>
          <div class="adm-card-kpi-sub">{totalAccounts} conturi · {totalKids} copii</div>
        </article>

        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Activi azi</span>
            <span class="adm-dot is-online" />
          </div>
          <div class="adm-card-kpi-val">{activeToday}</div>
          <div class="adm-card-kpi-sub">{active7d} în ultimele 7 zile ({activeRate}%)</div>
        </article>

        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Familii & Copii</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
          </div>
          <div class="adm-card-kpi-val">{parentsTotal}</div>
          <div class="adm-card-kpi-sub">{normalTotal} fără copii · {totalKids} copii</div>
        </article>

        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Noi în 30 de zile</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div class="adm-card-kpi-val">{new30d}</div>
          <div class="adm-card-kpi-sub">înregistrați recent</div>
        </article>
      </section>

      {/* Toolbar: Search input, Filter dropdown & Sort dropdown */}
      <div class="adm-toolbar">
        <div class="adm-search-wrap">
          <svg class="adm-search-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            class="input"
            type="search"
            placeholder="Caută după nume, email sau copii..."
            aria-label="Caută utilizatori"
            value={q}
            onInput={(e) => setQ(e.currentTarget.value)}
          />
          {q && (
            <button
              type="button"
              class="adm-search-clear"
              aria-label="Șterge căutarea"
              onClick={() => setQ('')}
            >
              ×
            </button>
          )}
        </div>

        <div class="adm-selects-row">
          <select
            class="adm-select"
            aria-label="Filtrează utilizatorii"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value as FilterType)}
          >
            <option value="toate">Filtru: Toți utilizatorii ({totalAccounts})</option>
            <option value="activi_7z">Filtru: Activi recent – 7 zile ({active7d})</option>
            <option value="azi">Filtru: Conectați astăzi ({activeToday})</option>
            <option value="progres">Filtru: Cu progres ({withScoreTotal})</option>
            <option value="parinti">Filtru: Părinți cu copii ({parentsTotal})</option>
            <option value="singuri">Filtru: Conturi fără copii ({normalTotal})</option>
            <option value="admini">Filtru: Administratori ({adminTotal})</option>
          </select>

          <select
            class="adm-select"
            aria-label="Sortează utilizatorii"
            value={sort}
            onChange={(e) => setSort(e.currentTarget.value as SortType)}
          >
            <option value="seen_desc">Sortare: Conectare (recente)</option>
            <option value="seen_asc">Sortare: Conectare (vechi)</option>
            <option value="created_desc">Sortare: Înregistrare (noi)</option>
            <option value="created_asc">Sortare: Înregistrare (vechi)</option>
            <option value="score_desc">Sortare: Scor descrescător</option>
            <option value="name_asc">Sortare: Nume alfabetic (A-Z)</option>
            <option value="kids_desc">Sortare: Număr de copii</option>
          </select>
        </div>
      </div>

      {/* Results summary counter */}
      <div class="adm-count-bar">
        <span class="small muted">
          Se afișează <strong>{sorted.length}</strong> din {totalAccounts} conturi
          {filter !== 'toate' && ` (filtrat după ${filterLabel(filter)})`}
          {q && ` pentru „${q}”`}
        </span>
        {(filter !== 'toate' || q) && (
          <button
            type="button"
            class="btn-reset link small"
            onClick={() => { setFilter('toate'); setQ(''); }}
          >
            Resetează filtrele
          </button>
        )}
      </div>

      {/* User rows list */}
      <ul class="adm-list">
        {sorted.map((r) => <Row key={r.uid} r={r} me={me} onChanged={reload} />)}
      </ul>

      {sorted.length === 0 && (
        <div class="card empty muted" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p>Niciun utilizator nu se potrivește filtrelor selectate.</p>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            style={{ marginTop: '12px' }}
            onClick={() => { setFilter('toate'); setQ(''); }}
          >
            Afișează toți utilizatorii
          </button>
        </div>
      )}
    </div>
  );
}

function filterLabel(f: FilterType): string {
  switch (f) {
    case 'activi_7z': return 'activi recent';
    case 'azi': return 'activi azi';
    case 'progres': return 'progres / scor';
    case 'parinti': return 'părinți';
    case 'singuri': return 'fără copii';
    case 'admini': return 'admini';
    default: return '';
  }
}

function Row({ r, me, onChanged }: { r: UserRow; me: string; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const n = r.kids.length;
  const timeInfo = getTimeInfo(r.seen);

  return (
    <li class="card adm-row">
      <button type="button" class="adm-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        {/* Avatar with live status dot overlay */}
        <div class="adm-av-wrap">
          <Avatar name={r.name} size={40} />
          <span class={`adm-dot is-${timeInfo.status}`} title={`Status: ${timeInfo.tooltip}`} />
        </div>

        {/* User name & email */}
        <div class="adm-info">
          <strong class="adm-name">{r.name}</strong>
          <span class="adm-mail">{r.email || '(fără email)'}</span>
          {r.kids.length > 0 && (
            <div class="adm-kids-preview">
              <span>Copii:</span>
              {r.kids.map((k) => (
                <span key={k.key} class="adm-kid-chip">
                  {k.name}
                  {k.score !== undefined && k.score > 0 ? ` (${k.score})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Badges on right side */}
        <div class="adm-badge">
          {r.admin && <span class="adm-pill-admin">admin</span>}
          {r.isParent && <span class="adm-pill-parent">{n} {n === 1 ? 'copil' : 'copii'}</span>}
          {(r.totalScore ?? 0) > 0 && (
            <span class="adm-pill-score" title="Întrebări rezolvate în total">
              {r.totalScore} pct
            </span>
          )}
        </div>

        <svg class="adm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>

        {/* Dates and activity bar */}
        <div class="adm-dates">
          <span>
            Conectat: <b class={timeInfo.status === 'online' ? 'text-ok' : ''}>{timeInfo.text}</b>
          </span>
          <span>
            Creat: <b>{formatDate(r.at)}</b>
          </span>
        </div>
      </button>

      {open && <Editor r={r} self={r.uid === me} onChanged={onChanged} />}
    </li>
  );
}

function getTimeInfo(t: any): { text: string; status: 'online' | 'recent' | 'idle'; tooltip: string } {
  if (!t) return { text: 'încă nu', status: 'idle', tooltip: 'Nu s-a conectat încă' };
  const d = t.toDate();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfD) / 86400000);

  if (diffDays === 0) return { text: 'azi', status: 'online', tooltip: 'Activ astăzi' };
  if (diffDays === 1) return { text: 'ieri', status: 'online', tooltip: 'Activ ieri' };
  if (diffDays <= 7) return { text: `acum ${diffDays}z`, status: 'recent', tooltip: `Activ acum ${diffDays} zile` };

  const exact = d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return { text: exact, status: 'idle', tooltip: `Ultima conectare: ${exact}` };
}

function formatDate(t: any): string {
  if (!t) return '—';
  return t.toDate().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatExact(t: any): string {
  if (!t) return '—';
  return t.toDate().toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { last: parts[0], first: parts.slice(1).join(' ') };
}

/** Everything an admin can change on one account. Each action saves at once and reloads the list. */
function Editor({ r, self, onChanged }: { r: UserRow; self: boolean; onChanged: () => Promise<void> }) {
  const { first, last } = splitName(r.name);
  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);
  const [isParent, setIsParent] = useState(r.isParent);
  const [newKid, setNewKid] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [modalConflict, setModalConflict] = useState<{ name: string; kind: 'parent' | 'child' } | null>(null);

  function validateKidName(candidateName: string, currentKey?: string): boolean {
    const cleanName = candidateName.trim();
    if (!cleanName) return false;

    // 1. Cannot have the parent's first name
    const currentParentFirst = firstName.trim() || (() => {
      const parentParts = r.name.trim().split(/\s+/).filter(Boolean);
      return parentParts.length > 1 ? parentParts.slice(1).join(' ') : (parentParts[0] ?? '');
    })();
    if (sameFirstName(cleanName, currentParentFirst)) {
      setModalConflict({ name: currentParentFirst, kind: 'parent' });
      return false;
    }

    // 2. Cannot have the same first name as another child in the family
    const duplicate = r.kids.find((k) => k.key !== currentKey && sameFirstName(cleanName, k.name));
    if (duplicate) {
      setModalConflict({ name: duplicate.name, kind: 'child' });
      return false;
    }

    return true;
  }

  const dirty = firstName.trim() !== first || lastName.trim() !== last || isParent !== r.isParent;
  const valid = !!firstName.trim() && !!lastName.trim();

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

  function copyUid() {
    navigator.clipboard?.writeText(r.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  }

  return (
    <div class="adm-detail">
      {/* Quick metadata bar */}
      <div class="adm-user-meta-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" class="adm-uid-copy" onClick={copyUid} title="Copiază UID în clipboard">
            <span>UID:</span>
            <code>{r.uid.slice(0, 10)}…</code>
            <span style={{ color: copiedUid ? 'var(--ok)' : 'var(--ink-3)' }}>{copiedUid ? 'Copiat' : 'Copiază'}</span>
          </button>
          {r.email && (
            <a href={`mailto:${r.email}`} class="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '0.78rem' }}>
              Email
            </a>
          )}
        </div>
        <div class="small muted" style={{ fontSize: '0.76rem' }}>
          Înregistrat: <strong>{formatExact(r.at)}</strong> · Ultima vizită: <strong>{formatExact(r.seen)}</strong>
        </div>
      </div>

      {/* Progress / Score Breakdown Card */}
      {(r.totalScore ?? 0) > 0 && (
        <div class="adm-score-box">
          <span class="adm-score-title">Întrebări rezolvate pe platformă</span>
          <div class="adm-score-grid">
            <div class="adm-score-item">
              <span class="muted small">Părinte / Cont:</span>
              <strong>{r.score ?? 0} pct</strong>
            </div>
            {r.kids.map((k) => (
              <div key={k.key} class="adm-score-item">
                <span class="muted small">{k.name}:</span>
                <strong>{k.score ?? 0} pct</strong>
              </div>
            ))}
            <div class="adm-score-item is-total">
              <span class="small">Total familie:</span>
              <strong>{r.totalScore ?? 0} pct</strong>
            </div>
          </div>
        </div>
      )}

      {/* Profile Name & Parent Toggle Form */}
      <form class="stack adm-form" onSubmit={(e) => {
        e.preventDefault();
        const f = firstName.trim();
        const l = lastName.trim();
        if (!f || !l) return;
        const duplicateChild = r.kids.find((k) => sameFirstName(k.name, f));
        if (duplicateChild) {
          setModalConflict({ name: duplicateChild.name, kind: 'parent' });
          return;
        }
        const name = `${l} ${f}`.replace(/\s+/g, ' ');
        run(() => updateUser(r.uid, { name, isParent, admin: r.admin }), 'Profilul a fost salvat.');
      }}>
        <div class="two">
          <div class="field">
            <label for={`ln-${r.uid}`}>Nume de familie</label>
            <input
              id={`ln-${r.uid}`}
              class="input"
              maxLength={40}
              required
              value={lastName}
              onInput={(e) => setLastName(e.currentTarget.value)}
            />
          </div>
          <div class="field">
            <label for={`fn-${r.uid}`}>Prenume</label>
            <input
              id={`fn-${r.uid}`}
              class="input"
              maxLength={40}
              required
              value={firstName}
              onInput={(e) => setFirstName(e.currentTarget.value)}
            />
          </div>
        </div>
        <label class="check">
          <input type="checkbox" checked={isParent} onChange={(e) => setIsParent(e.currentTarget.checked)} />
          <span>Cont de părinte (gestionează copii)</span>
        </label>
        <button class="btn btn-primary btn-block" disabled={busy || !dirty || !valid}>
          {busy ? 'Se salvează…' : 'Salvează modificările'}
        </button>
      </form>

      {/* Children list and management */}
      {(r.isParent || r.kids.length > 0) && (
        <section class="adm-kids" aria-label="Copii">
          <p class="me-label">Copii asociați ({r.kids.length})</p>
          <ul class="adm-kid-list">
            {r.kids.map((k) => (
              <KidRow
                key={k.key}
                uid={r.uid}
                k={k}
                busy={busy}
                run={run}
                onValidate={(newName) => validateKidName(newName, k.key)}
              />
            ))}
          </ul>
          <form class="kid-row" onSubmit={(e) => {
            e.preventDefault();
            const cleanName = newKid.trim();
            if (!cleanName) return;
            if (!validateKidName(cleanName)) return;
            run(() => addChildTo(r.uid, cleanName), 'Copil adăugat.').then(() => setNewKid(''));
          }}>
            <input class="input" maxLength={40} placeholder="Prenumele unui copil nou" aria-label="Prenumele copilului nou" value={newKid} onInput={(e) => setNewKid(e.currentTarget.value)} />
            <button class="btn btn-ghost" disabled={busy || !newKid.trim()}>Adaugă</button>
          </form>
        </section>
      )}

      {/* Account Deletion */}
      {!self && (confirmDelete ? (
        <div class="stack adm-actions" style={{ marginTop: '10px' }}>
          <p class="small muted" style={{ color: 'var(--bad)' }}>
            Atenție: Se șterg profilul din baza de date, toți copiii asociați și tot progresul lor. Emailul și parola rămân în Firebase Auth.
          </p>
          <div class="two">
            <button type="button" class="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Renunță</button>
            <button type="button" class="btn btn-danger" disabled={busy} onClick={() => run(() => deleteAccount(r), 'Contul a fost șters definitiv.')}>Confirmă ștergerea definitivă</button>
          </div>
        </div>
      ) : (
        <button type="button" class="btn btn-ghost btn-block bad" style={{ marginTop: '10px' }} disabled={busy} onClick={() => setConfirmDelete(true)}>
          Șterge contul utilizatorului
        </button>
      ))}

      {msg && <p class={`notice ${msg.ok ? 'notice-ok' : 'notice-bad'}`} role="status">{msg.text}</p>}

      {modalConflict && (
        <SameNameSheet
          name={modalConflict.name}
          kind={modalConflict.kind}
          isAdmin
          onClose={() => setModalConflict(null)}
        />
      )}
    </div>
  );
}

/** One child: the name to change in place, and a delete that asks first. */
function KidRow({
  uid,
  k,
  busy,
  run,
  onValidate,
}: {
  uid: string;
  k: Kid;
  busy: boolean;
  run: (a: () => Promise<unknown>, done: string) => Promise<void>;
  onValidate: (name: string) => boolean;
}) {
  const [name, setName] = useState(k.name);
  const [confirm, setConfirm] = useState(false);
  const changed = name.trim() !== k.name && !!name.trim();

  function handleSave(e: Event) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!changed || !cleanName) return;
    if (!onValidate(cleanName)) return;
    run(() => renameChild(uid, k.key, cleanName), 'Salvat.');
  }

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
        <form class="adm-kid-line" onSubmit={handleSave}>
          <Avatar name={k.name} size={32} />
          <input class="input" maxLength={40} aria-label={`Prenumele lui ${k.name}`} value={name} onInput={(e) => setName(e.currentTarget.value)} />
          {k.score !== undefined && k.score > 0 && (
            <span class="adm-kid-chip" title="Întrebări rezolvate">{k.score} pct</span>
          )}
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
