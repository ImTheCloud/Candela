import { useEffect, useState } from 'preact/hooks';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addChild, choosePlayer, player, players, rememberedKids, removeChild, updateChild, type Player } from '../lib/players';
import { localGet, localSet } from '../lib/store';
import { TYPES } from '../lib/questions';
import { AGE_GROUPS, ageLabel, ageShort, type AgeGroup } from '../lib/age';
import { deleteProgress, EMPTY, type Progress } from '../lib/progress';
import { errorText, profile, profileError, rememberedAccount, setParent, signOut, user } from '../lib/session';
import Avatar from './Avatar';
import Loader from './Loader';

export interface BookInfo { slug: string; name: string; chapters: number; totals: Record<string, number> }

/**
 * The whole profile on one page: who you are, the family, and each player's progress.
 * It draws from what the last visit remembered, so nothing pops in while Firebase wakes up.
 */
export default function Profile({ books }: { books: BookInfo[] }) {
  const u = user.value;
  const p = profile.value;
  const name = p?.name || u?.displayName || rememberedAccount?.name || 'Contul meu';
  const email = u?.email ?? p?.email ?? '';
  const [parentError, setParentError] = useState('');
  const [adding, setAdding] = useState(false);
  const list = u ? players.value : [...self(p, rememberedAccount?.uid), ...rememberedKids];
  const kids = list.filter((x) => x.child).length;
  const isParent = p?.isParent === true;
  // how many flagged questions wait (the avatar keeps this number up to date)
  const reportsOpen = p?.admin ? localGet<number>('acctN', 0) : 0;

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

      <nav class="me-end">
        {p?.admin && <a class="me-link" href="/admin">Administrare</a>}
        {p?.admin && <a class="me-link" href="/semnalari">Semnalări de greșeli{reportsOpen > 0 ? ` (${reportsOpen})` : ''}</a>}
        <button type="button" class="me-link signout" onClick={() => signOut()}>Ieși din cont</button>
      </nav>
    </div>
  );
}

/** The signed-in account as a player, from the remembered profile, until the real list arrives. */
function self(p: ReturnType<typeof profile.peek>, uid?: string): Player[] {
  return uid && p ? [{ key: uid, name: p.name, birthYear: p.birthYear, child: false, hidden: p.hidden ?? false }] : [];
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
      {details && books.map((b) => <BookStats key={b.slug} p={p} book={b} />)}
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
interface Summary { mastered: number; /** known questions per level */ byLevel?: Record<string, number>; wrong: number; exams: Progress['exams']; stats: Progress['stats'] }
const EMPTY_SUMMARY: Summary = { mastered: 0, byLevel: {}, wrong: 0, exams: {}, stats: {} };

/** Live progress of one player in one book. The last visit's numbers show at once; `loaded` is false only for a first visit. */
function useBookProgress(p: Player, book: string): { data: Summary; loaded: boolean } {
  const key = `pg:${p.key}~${book}`;
  const [state, setState] = useState<{ data: Summary; loaded: boolean }>(() => {
    const cached = localGet<Summary | null>(key, null);
    return cached ? { data: cached, loaded: true } : { data: EMPTY_SUMMARY, loaded: false };
  });
  const uid = user.value?.uid;
  useEffect(() => {
    if (!uid) return;
    let last: Progress | null = null;
    const publish = () => {
      if (!last) return;
      const byLevel: Record<string, number> = {};
      for (const id of new Set(last.mastered)) byLevel[id.split('.')[2]] = (byLevel[id.split('.')[2]] ?? 0) + 1;
      const data: Summary = { mastered: new Set(last.mastered).size, byLevel, wrong: last.wrong.length, exams: last.exams, stats: last.stats };
      setState({ data, loaded: true });
      localSet(key, data);
    };
    const stop = onSnapshot(doc(db, 'users', uid, 'progress', `${p.key}~${book}`), (snap) => {
      last = { ...EMPTY, ...(snap.data() as Partial<Progress>) };
      publish();
    });
    return stop;
  }, [uid, p.key, book]);
  return state;
}

/** How well a player answers, per kind of question, over all the books. It is a share of the answers given, so the number of questions does not matter. */
function TypeBars({ p, books }: { p: Player; books: BookInfo[] }) {
  const all = books.map((b) => useBookProgress(p, b.slug));
  const loaded = all.every((x) => x.loaded);
  const kinds = TYPES.map((t) => ({
    ...t,
    n: all.reduce((s, x) => s + (x.data.stats[t.t]?.n ?? 0), 0),
    r: all.reduce((s, x) => s + (x.data.stats[t.t]?.r ?? 0), 0),
  })).filter((k) => k.n > 0);
  if (!loaded) return <Loader small />;
  if (!kinds.length) return <p class="small muted">Nu a început încă.</p>;
  return (
    <ul class="kinds bk-brief" aria-label="Cât de bine răspunde, pe tipuri de întrebări">
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

function BookStats({ p, book }: { p: Player; book: BookInfo }) {
  const { data: d, loaded } = useBookProgress(p, book.slug);
  // the level shown: the one with the most known questions, unless the player picks another
  const [picked, setPicked] = useState<AgeGroup | null>(null);
  const entries = Object.entries(d.exams);
  // exams only count how many were played: they bring no points and no statistics
  const examsDone = entries.filter(([id]) => !/^c\d+/.test(id)).reduce((s, [, e]) => s + (e.plays ?? 1), 0);
  const started = d.mastered || d.wrong || entries.length;
  const levels = AGE_GROUPS.filter((g) => (book.totals[g.id] ?? 0) > 0);
  const top = levels.reduce((a, g) => ((d.byLevel?.[g.id] ?? 0) > (d.byLevel?.[a.id] ?? 0) ? g : a), levels[0]);
  const lv = picked && levels.some((g) => g.id === picked) ? picked : top.id;
  const t = book.totals[lv] ?? 0;
  const m = d.byLevel?.[lv] ?? 0;

  return (
    <section class="bk">
      <h3>{book.name}</h3>
      <p class="small muted nowrap">{t} întrebări pentru fiecare grupă de vârstă</p>
      {!loaded ? <Loader small /> : !started ? <p class="small muted">Nu a început încă.</p> : (
        <>
          <p class="bk-head">Întrebări știute <small>(răspunse corect cel puțin o dată)</small></p>
          <div class="lv-chips" role="radiogroup" aria-label="Grupa de vârstă">
            {levels.map((g) => (
              <button type="button" role="radio" aria-checked={lv === g.id} class="lv-chip" onClick={() => setPicked(g.id)}>{ageShort(g.id)}</button>
            ))}
          </div>
          <ul class="kinds bk-level">
            <li class={m === t ? 'is-full' : ''}>
              <span class="kind-name">{ageLabel(lv)}</span>
              <span class="kind-bar" aria-hidden="true"><span style={{ width: `${(m / t) * 100}%` }} /></span>
              <span class="kind-n">{m}/{t}</span>
            </li>
          </ul>
          <p class="small muted">Examene făcute: <strong>{examsDone}</strong></p>
        </>
      )}
    </section>
  );
}

function ChildForm({ child, onDone }: { child?: Player; onDone: () => void }) {
  const [name, setName] = useState(child?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    if (!name.trim()) return setError('Scrie prenumele copilului.');
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
    </form>
  );
}
