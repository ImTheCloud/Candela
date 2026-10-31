import { useEffect, useState } from 'preact/hooks';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addChild, choosePlayer, player, players, removeChild, sameFirstName, updateChild, type Player } from '../lib/players';
import { localGet, localSet } from '../lib/store';
import { TYPES } from '../lib/questions';
import { LEVELS, levelLabel, type Level } from '../lib/age';
import { deleteProgress, EMPTY, type Progress } from '../lib/progress';
import { errorText, profile, profileError, profileLoaded, rememberedAccount, setParent, signOut, user } from '../lib/session';
import Avatar from './Avatar';
import SameNameSheet from './SameNameSheet';
import Stopwatch from './Stopwatch';
import LevelPicker from './LevelPicker';
import Loader from './Loader';

/** The "Scrie-ne un email" button: a new email to the administrator. */
const contactHref = `mailto:claudiu.dev@outlook.com?subject=${encodeURIComponent('Candela')}`;

export interface BookInfo { slug: string; name: string; chapters: number; totals: Record<string, number> }

/**
 * The whole profile on one page: who you are, the family, and each player's progress.
 * It waits for the account and its data, so nothing changes under the eyes once it shows.
 */
export default function Profile({ books }: { books: BookInfo[] }) {
  const u = user.value;
  const p = profile.value;
  const name = p?.name || u?.displayName || rememberedAccount?.name || 'Contul meu';
  const email = u?.email ?? p?.email ?? '';
  const [parentError, setParentError] = useState('');
  const [adding, setAdding] = useState(false);
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


      <section class="me-sect" aria-labelledby="pl-title">
        <h2 id="pl-title" class="me-label">{isParent ? 'Familia' : 'Progres'}</h2>
        {list.map((x) => (
          <PlayerBlock key={x.key} p={x} books={books} head={isParent} />
        ))}
        {isParent && adding && <ChildForm onDone={() => setAdding(false)} />}
        {p && (
          <div class="me-row me-fam">
            <label class="switch-row">
              <span>
                <strong>Cont de părinte</strong>
                <span class="small muted block">{kids > 0 ? 'Șterge întâi copiii ca să-l poți opri.' : 'Copiii joacă de pe telefonul tău.'}</span>
              </span>
              <input type="checkbox" class="switch" role="switch" checked={isParent} disabled={kids > 0 || !u} onChange={(e) => toggleParent(e.currentTarget.checked)} />
            </label>
            {isParent && !adding && (
              <button type="button" class="fam-add btn-reset" onClick={() => setAdding(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                <strong>Adaugă un copil</strong>
              </button>
            )}
          </div>
        )}
        {parentError && <p class="notice notice-bad" role="alert">{parentError}</p>}
      </section>

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

/** One player: who, whether they are the one playing, progress in each book, and their settings. */
function PlayerBlock({ p, books, head }: { p: Player; books: BookInfo[]; head: boolean }) {
  const current = player.value;
  const active = p.key === current.key;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [details, setDetails] = useState(false);
  const isSelf = !p.child;

  async function remove() {
    await deleteProgress(user.value!.uid, p.key);
    await removeChild(p.key);
  }

  if (editing) return <ChildForm child={p} onDone={() => setEditing(false)} />;

  return (
    <article class="pl">
      {head && (
        <header class="pl-head">
          <Avatar name={p.name} size={40} />
          <div class="pl-name">
            <strong>{p.name.split(' ')[0]}{isSelf && ' (tu)'}</strong>
          </div>
          {active
            ? <span class="tag-on">joacă acum</span>
            : <button type="button" class="btn btn-ghost btn-sm" onClick={() => choosePlayer(p.key)}>Alege</button>}
        </header>
      )}
      <TypeBars p={p} books={books} />
      <button type="button" class="btn-reset link small bk-toggle" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? 'Ascunde detaliile' : 'Vezi detaliile'}</button>
      {/* a book whose questions are still being written has nothing to show yet */}
      {details && books.filter((b) => Object.keys(b.totals).length).map((b) => <BookStats key={b.slug} p={p} book={b} />)}
      <footer class="pl-foot">
        {p.child && (
          <span class="pl-actions">
            <button type="button" class="btn-reset link small" onClick={() => setEditing(true)}>Schimbă</button>
            <button type="button" class="btn-reset link small bad" onClick={() => setConfirming(true)} aria-label={`Șterge pe ${p.name}`}>Șterge</button>
          </span>
        )}
      </footer>
      {confirming && (
        <div class="notice notice-bad stack" style="--gap: 10px">
          <p>Ștergi profilul lui {p.name} și tot progresul lui? Nu se mai poate recupera.</p>
          <div class="two">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Renunță</button>
            <button type="button" class="btn btn-sm danger" onClick={remove}>Da, șterge</button>
          </div>
        </div>
      )}
    </article>
  );
}

/** What the profile shows of one player's progress in one book. */
interface Summary {
  mastered: number;
  /** known questions per level */
  byLevel?: Record<string, number>;
  wrong: number;
  /** questions to redo per level */
  wrongByLevel?: Record<string, number>;
  exams: Progress['exams'];
  stats: Progress['stats'];
  lv?: Progress['lv'];
}
const EMPTY_SUMMARY: Summary = { mastered: 0, byLevel: {}, wrong: 0, wrongByLevel: {}, exams: {}, stats: {}, lv: {} };

/** Counts per level of question ids (2sa.24.usor.302). */
function perLevel(ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of new Set(ids)) out[id.split('.')[2]] = (out[id.split('.')[2]] ?? 0) + 1;
  return out;
}

/** Live progress of one player in one book. The last visit's numbers show at once; `loaded` is false only for a first visit. */
function useBookProgress(p: Player, book: string): { data: Summary; loaded: boolean } {
  const [state, setState] = useState<{ data: Summary; loaded: boolean }>({ data: EMPTY_SUMMARY, loaded: false });
  const uid = user.value?.uid;
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid, 'progress', `${p.key}~${book}`), (snap) => {
      const last: Progress = { ...EMPTY, ...(snap.data() as Partial<Progress>) };
      const data: Summary = {
        mastered: new Set(last.mastered).size,
        byLevel: perLevel(last.mastered),
        wrong: last.wrong.length,
        wrongByLevel: perLevel(last.wrong),
        exams: last.exams,
        stats: last.stats,
        lv: last.lv ?? {},
      };
      setState({ data, loaded: true });
    });
  }, [uid, p.key, book]);
  return state;
}

/** Bars per kind of question: the share of answers fully right, so the number of questions does not matter. */
function Kinds({ stats, label }: { stats: Progress['stats']; label: string }) {
  const kinds = TYPES.map((t) => ({ ...t, n: stats[t.t]?.n ?? 0, r: stats[t.t]?.r ?? 0 })).filter((k) => k.n > 0);
  if (!kinds.length) return null;
  return (
    <ul class="kinds bk-brief" aria-label={label}>
      {kinds.map((k) => (
        <li class={k.r === k.n ? 'is-full' : k.r === 0 ? 'is-zero' : ''}>
          <span class="kind-name">{k.t === 'fill' ? 'Completare versete' : k.short}</span>
          <span class="kind-bar" aria-hidden="true"><span style={{ width: `${(k.r / k.n) * 100}%` }} /></span>
          <span class="kind-n">{Math.round((k.r / k.n) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

/** How well a player answers, per kind of question, over all the books and levels. */
function TypeBars({ p, books }: { p: Player; books: BookInfo[] }) {
  const all = books.map((b) => useBookProgress(p, b.slug));
  if (!all.every((x) => x.loaded)) return <Loader small />;
  const stats: Progress['stats'] = {};
  for (const x of all) for (const [t, c] of Object.entries(x.data.stats)) {
    const k = t as keyof Progress['stats'];
    stats[k] = { n: (stats[k]?.n ?? 0) + (c?.n ?? 0), r: (stats[k]?.r ?? 0) + (c?.r ?? 0) };
  }
  if (!Object.values(stats).some((c) => c && c.n > 0)) return <p class="small muted">Nu a început încă.</p>;
  return <Kinds stats={stats} label="Cât de bine răspunde, pe tipuri de întrebări" />;
}

/** One book at one level: every number here changes with the level picked. */
function BookStats({ p, book }: { p: Player; book: BookInfo }) {
  const { data: d, loaded } = useBookProgress(p, book.slug);
  // the level shown: the one with the most known questions, unless the player picks another
  const [picked, setPicked] = useState<Level | null>(null);
  const entries = Object.entries(d.exams);
  const started = d.mastered || d.wrong || entries.length;
  const levels = LEVELS.filter((g) => (book.totals[g.id] ?? 0) > 0);
  const top = levels.reduce((a, g) => ((d.byLevel?.[g.id] ?? 0) > (d.byLevel?.[a.id] ?? 0) ? g : a), levels[0]);
  const lv = picked && levels.some((g) => g.id === picked) ? picked : top.id;
  const t = book.totals[lv] ?? 0;
  const m = d.byLevel?.[lv] ?? 0;
  const wrong = d.wrongByLevel?.[lv] ?? 0;
  const chapters = entries.filter(([id]) => id.endsWith(`@${lv}`) && /^c\d+@/.test(id)).length;
  const mocks = entries.filter(([id]) => id === `alb@${lv}`).reduce((s, [, e]) => s + (e.plays ?? 1), 0);
  const kinds = d.lv?.[lv] ?? {};

  return (
    <section class="bk">
      <h3>{book.name}</h3>
      <p class="hb-sub muted">{t} de întrebări pe nivel, câte {Math.round(t / book.chapters)} pe capitol</p>
      {!loaded ? <Loader small /> : !started ? <p class="small muted">Nu a început încă.</p> : (
        <>
          <LevelPicker value={lv} onChange={setPicked} groups={levels} />
          <p class="bk-head">Întrebări știute <small>(răspunse corect cel puțin o dată)</small></p>
          <ul class="kinds bk-level">
            <li class={m === t ? 'is-full' : ''}>
              <span class="kind-name">{levelLabel(lv)}</span>
              <span class="kind-bar" aria-hidden="true"><span style={{ width: `${(m / t) * 100}%` }} /></span>
              <span class="kind-n">{m}/{t}</span>
            </li>
          </ul>
          <Kinds stats={kinds} label={`Pe tipuri de întrebări, nivel ${levelLabel(lv).toLowerCase()}`} />
          <dl class="bk-nums">
            <div><dt>Teste de capitol</dt><dd>{chapters}/{book.chapters}</dd></div>
            <div><dt>De reluat</dt><dd>{wrong}</dd></div>
            <div><dt>Examene albe</dt><dd>{mocks}</dd></div>
          </dl>
        </>
      )}
    </section>
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
