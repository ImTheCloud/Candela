import { useEffect, useMemo, useState } from 'preact/hooks';
import { addChildTo, deleteAccount, deleteChild, loadUsers, renameChild, updateUser, type Kid, type UserRow } from '../lib/admin';
import { watchOpenMessagesCount } from '../lib/messages';
import { watchOpenCount } from '../lib/reports';
import { errorText, profile, profileLoaded, user } from '../lib/session';
import { localGet } from '../lib/store';
import Avatar from './Avatar';
import Loader from './Loader';

type FilterType = 'toate' | 'activi_7z' | 'azi' | 'progres' | 'parinti' | 'singuri' | 'inactivi' | 'admini';
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

  // Badges for navigation tabs
  const [reportsOpen, setReportsOpen] = useState(() => localGet<number>('acctRep', 0));
  const [messagesOpen, setMessagesOpen] = useState(() => localGet<number>('acctMsg', 0));

  useEffect(() => {
    const unsubR = watchOpenCount((n) => setReportsOpen(n));
    const unsubM = watchOpenMessagesCount((n) => setMessagesOpen(n));
    return () => {
      unsubR?.();
      unsubM?.();
    };
  }, []);

  const reload = () => loadUsers().then((r) => { setRows(r); setError(''); }).catch((e) => setError(errorText(e)));
  useEffect(() => { reload(); }, []);

  if (error && !rows) return <p class="notice notice-bad" role="alert">Lista nu a putut fi încărcată. {error}</p>;
  if (!rows) return <Loader />;

  // Global statistics calculation
  const totalAccounts = rows.length;
  const totalKids = rows.reduce((n, r) => n + r.kids.length, 0);
  const totalPlayers = totalAccounts + totalKids;
  const totalQuestions = rows.reduce((n, r) => n + (r.totalScore ?? 0), 0);

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
  const inactiveTotal = rows.filter((r) => !r.seen || r.seen.toMillis() < thirtyDaysAgo).length;
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
    if (filter === 'inactivi') return !r.seen || r.seen.toMillis() < thirtyDaysAgo;
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
    <div class="stack" style={{ gap: '16px' }}>
      {/* Admin Sub-Navigation */}
      <nav class="adm-nav" aria-label="Secțiuni administrare">
        <span class="adm-nav-btn is-active">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Utilizatori
        </span>
        <a class="adm-nav-btn" href="/semnalari">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
          Semnalări
          {reportsOpen > 0 && <span class="me-item-badge">{reportsOpen}</span>}
        </a>
        <a class="adm-nav-btn" href="/mesaje">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          Mesaje
          {messagesOpen > 0 && <span class="me-item-badge">{messagesOpen}</span>}
        </a>
        <a class="adm-nav-btn" href="/admin/intrebari">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /></svg>
          Întrebări și răspunsuri
        </a>
      </nav>

      {/* Dashboard KPI Stat Cards */}
      <section class="adm-dashboard-grid" aria-label="Statistici globale utilizatori">
        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Jucători în total</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
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
            <span class="adm-card-kpi-title">Întrebări rezolvate</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </div>
          <div class="adm-card-kpi-val">{totalQuestions.toLocaleString('ro-RO')}</div>
          <div class="adm-card-kpi-sub">{withScoreTotal} utilizatori cu progres</div>
        </article>

        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Familii & Copii</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
          </div>
          <div class="adm-card-kpi-val">{parentsTotal}</div>
          <div class="adm-card-kpi-sub">{normalTotal} fără copii · {totalKids} copii</div>
        </article>

        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Noi în 30 de zile</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div class="adm-card-kpi-val">{new30d}</div>
          <div class="adm-card-kpi-sub">înregistrați recent</div>
        </article>

        <article class="adm-card-kpi">
          <div class="adm-card-kpi-head">
            <span class="adm-card-kpi-title">Inactivi (&gt;30z)</span>
            <span class="adm-dot is-idle" />
          </div>
          <div class="adm-card-kpi-val">{inactiveTotal}</div>
          <div class="adm-card-kpi-sub">fără vizită recentă</div>
        </article>
      </section>

      {/* Filter Pills Bar */}
      <div class="adm-filter-bar" role="tablist" aria-label="Filtrare conturi">
        <button
          type="button"
          class={`adm-pill${filter === 'toate' ? ' is-active' : ''}`}
          onClick={() => setFilter('toate')}
        >
          <span>Toți</span>
          <span class="adm-pill-count">{totalAccounts}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'activi_7z' ? ' is-active' : ''}`}
          onClick={() => setFilter('activi_7z')}
        >
          <span class="adm-dot is-online" />
          <span>Activi recent (7z)</span>
          <span class="adm-pill-count">{active7d}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'azi' ? ' is-active' : ''}`}
          onClick={() => setFilter('azi')}
        >
          <span>Azi</span>
          <span class="adm-pill-count">{activeToday}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'progres' ? ' is-active' : ''}`}
          onClick={() => setFilter('progres')}
        >
          <span>Cu progres</span>
          <span class="adm-pill-count">{withScoreTotal}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'parinti' ? ' is-active' : ''}`}
          onClick={() => setFilter('parinti')}
        >
          <span>Părinți</span>
          <span class="adm-pill-count">{parentsTotal}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'singuri' ? ' is-active' : ''}`}
          onClick={() => setFilter('singuri')}
        >
          <span>Fără copii</span>
          <span class="adm-pill-count">{normalTotal}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'inactivi' ? ' is-active' : ''}`}
          onClick={() => setFilter('inactivi')}
        >
          <span>Inactivi</span>
          <span class="adm-pill-count">{inactiveTotal}</span>
        </button>
        <button
          type="button"
          class={`adm-pill${filter === 'admini' ? ' is-active' : ''}`}
          onClick={() => setFilter('admini')}
        >
          <span>Admini</span>
          <span class="adm-pill-count">{adminTotal}</span>
        </button>
      </div>

      {/* Toolbar: Search input & Sort dropdown */}
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

        <select
          class="adm-sort-select"
          aria-label="Sortează utilizatorii"
          value={sort}
          onChange={(e) => setSort(e.currentTarget.value as SortType)}
        >
          <option value="seen_desc">⏱️ Conectare: cele mai recente</option>
          <option value="seen_asc">⏱️ Conectare: cele mai vechi / inactivi</option>
          <option value="created_desc">📅 Înregistrare: cele mai noi</option>
          <option value="created_asc">📅 Înregistrare: cele mai vechi</option>
          <option value="score_desc">⭐ Scor: cele mai multe întrebări</option>
          <option value="name_asc">🔤 Nume: alfabetic (A-Z)</option>
          <option value="kids_desc">👨‍👩‍👧 Număr copii: cei mai mulți</option>
        </select>
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
    case 'inactivi': return 'inactivi';
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
              ★ {r.totalScore}
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
            <span style={{ color: copiedUid ? 'var(--ok)' : 'var(--ink-3)' }}>{copiedUid ? '✓ Copiat' : '📋'}</span>
          </button>
          {r.email && (
            <a href={`mailto:${r.email}`} class="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '0.78rem' }}>
              ✉️ Email
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
          <span class="adm-score-title">⭐ Întrebări rezolvate pe platformă</span>
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
            {r.kids.map((k) => <KidRow key={k.key} uid={r.uid} k={k} busy={busy} run={run} />)}
          </ul>
          <form class="kid-row" onSubmit={(e) => { e.preventDefault(); if (newKid.trim()) run(() => addChildTo(r.uid, newKid), 'Copil adăugat.').then(() => setNewKid('')); }}>
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
