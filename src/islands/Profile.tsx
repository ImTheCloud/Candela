import { useEffect, useState } from 'preact/hooks';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ageGroup, ageLabel, validBirthYear } from '../lib/age';
import { db } from '../lib/firebase';
import { addChild, choosePlayer, player, players, removeChild, setHidden, updateChild, type Player } from '../lib/players';
import { deleteProgress, EMPTY, type Progress } from '../lib/progress';
import { typeInfo, TYPES } from '../lib/questions';
import { errorText, profile, profileError, profileLoaded, rememberedAccount, setBirthYear, setParent, signOut, user } from '../lib/session';
import Avatar from './Avatar';

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
  const list = u ? players.value : self(p, rememberedAccount?.uid);
  const kids = list.filter((x) => x.child).length;
  const isParent = p?.isParent === true;

  async function toggleParent(on: boolean) {
    setParentError('');
    try { await setParent(on); } catch (err) { setParentError(errorText(err)); }
  }

  return (
    <div class="me">
      <header class="me-id">
        <Avatar name={name} size={64} />
        <div class="me-who">
          <h1>{name}</h1>
          {email && <p class="small muted">{email}</p>}
          {profileError.value && <p class="small bad">Profilul nu a putut fi încărcat. Verifică conexiunea.</p>}
          {!profileError.value && (profileLoaded.value || p) && <BirthYear current={p?.birthYear ?? null} />}
        </div>
      </header>

      {p && (
        <label class="me-row switch-row">
          <span>
            <strong>Cont de părinte</strong>
            <span class="small muted block">{kids > 0 ? 'Șterge întâi copiii ca să-l poți opri.' : 'Copiii joacă de pe telefonul tău, fiecare cu progresul lui.'}</span>
          </span>
          <input type="checkbox" class="switch" role="switch" checked={isParent} disabled={kids > 0 || !u} onChange={(e) => toggleParent(e.currentTarget.checked)} />
        </label>
      )}
      {parentError && <p class="notice notice-bad" role="alert">{parentError}</p>}

      <section class="me-sect" aria-labelledby="pl-title">
        <h2 id="pl-title" class="me-label">{isParent ? 'Familia' : 'Progres'}</h2>
        {list.map((x) => (
          <PlayerBlock key={x.key} p={x} books={books} head={isParent} />
        ))}
        {isParent && (adding
          ? <ChildForm onDone={() => setAdding(false)} />
          : (
            <button type="button" class="add" onClick={() => setAdding(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Adaugă un copil
            </button>
          ))}
      </section>

      <nav class="me-end">
        {p?.admin && <a class="me-link" href="/semnalari">Semnalări de greșeli</a>}
        <button type="button" class="me-link signout" onClick={() => signOut()}>Ieși din cont</button>
      </nav>
    </div>
  );
}

/** The signed-in account as a player, from the remembered profile, until the real list arrives. */
function self(p: ReturnType<typeof profile.peek>, uid?: string): Player[] {
  return uid && p ? [{ key: uid, name: p.name, birthYear: p.birthYear, child: false, hidden: p.hidden ?? false }] : [];
}

function BirthYear({ current }: { current: number | null }) {
  const [editing, setEditing] = useState(current === null);
  const [value, setValue] = useState(current ? String(current) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!editing && current) {
    return (
      <p class="small muted me-age">
        <strong>{ageLabel(ageGroup(current))}</strong> · născut în {current} · <button type="button" class="btn-reset link" onClick={() => setEditing(true)}>schimbă</button>
      </p>
    );
  }

  async function save(e: Event) {
    e.preventDefault();
    const y = Number(value);
    if (!validBirthYear(y)) {
      setError('Scrie anul nașterii cu patru cifre, de exemplu 1990.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setBirthYear(y);
      setEditing(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="stack me-form" onSubmit={save}>
      <div class="field">
        <label for="birth">Anul nașterii</label>
        <input id="birth" class="input" inputMode="numeric" maxLength={4} placeholder="de exemplu 1990" value={value} onInput={(e) => setValue(e.currentTarget.value.replace(/\D/g, ''))} />
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="two">
        {current && <button type="button" class="btn btn-ghost" onClick={() => setEditing(false)}>Renunță</button>}
        <button class="btn btn-primary" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează'}</button>
      </div>
    </form>
  );
}

/** One player: who, whether they are the one playing, progress in each book, and their settings. */
function PlayerBlock({ p, books, head }: { p: Player; books: BookInfo[]; head: boolean }) {
  const current = player.value;
  const active = p.key === current.key;
  const group = p.birthYear ? ageGroup(p.birthYear) : null;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isSelf = !p.child;

  async function toggleHidden() {
    setBusy(true);
    try { await setHidden(p, !p.hidden); } finally { setBusy(false); }
  }

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
            <span class="small muted">{group ? ageLabel(group) : ''}</span>
          </div>
          {active
            ? <span class="tag-on">joacă acum</span>
            : <button type="button" class="btn btn-ghost btn-sm" onClick={() => choosePlayer(p.key)}>Alege</button>}
        </header>
      )}
      {books.map((b) => <BookStats key={b.slug} p={p} book={b} total={group ? b.totals[group] ?? 0 : 0} />)}
      <footer class="pl-foot">
        <label class="check small">
          <input type="checkbox" checked={!p.hidden} disabled={busy || !user.value} onChange={toggleHidden} />
          <span>Apare în clasament</span>
        </label>
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

/** Live progress of one player in one book; `loaded` is false until the first answer from Firestore. */
function useBookProgress(p: Player, book: string): { data: Progress; v1: number; loaded: boolean } {
  const [state, setState] = useState<{ data: Progress; loaded: boolean }>({ data: EMPTY, loaded: false });
  const [v1, setV1] = useState(0);
  const uid = user.value?.uid;
  useEffect(() => {
    if (!uid) return;
    setState({ data: EMPTY, loaded: false });
    const stop = onSnapshot(doc(db, 'users', uid, 'progress', `${p.key}~${book}`), (snap) => setState({ data: { ...EMPTY, ...(snap.data() as Partial<Progress>) }, loaded: true }));
    return stop;
  }, [uid, p.key, book]);
  // questions mastered in v1 are kept as a record: those questions were rewritten
  useEffect(() => {
    if (!uid || book !== '1-samuel') return;
    getDoc(doc(db, 'users', uid, 'archive', `${p.key}~1-samuel-v1`)).then((s) => setV1((s.get('count') as number) ?? 0)).catch(() => {});
  }, [uid, p.key, book]);
  return { ...state, v1 };
}

function BookStats({ p, book, total }: { p: Player; book: BookInfo; total: number }) {
  const { data: d, v1, loaded } = useBookProgress(p, book.slug);
  const typed = TYPES.map((x) => ({ x, s: d.stats[x.t] })).filter((e) => e.s && e.s.n >= 3);
  // a weak spot only means something next to other kinds of questions
  const weakest = typed.length >= 2 ? typed.sort((a, b) => a.s!.r / a.s!.n - b.s!.r / b.s!.n)[0] : undefined;
  const exams = Object.values(d.exams);
  const bestExam = exams.length ? Math.max(...exams.map((e) => e.best)) : null;
  const started = d.read.length || d.mastered.length || exams.length || v1;

  return (
    <section class="bk">
      <h3>{book.name}</h3>
      {!loaded ? <div class="sk-rows" aria-hidden="true"><span class="sk" /><span class="sk" /><span class="sk" /></div> : !started ? <p class="small muted">Nu a început încă.</p> : (
        <dl class="kv">
          <div><dt>Capitole citite</dt><dd>{d.read.length} din {book.chapters}</dd></div>
          <div><dt>Întrebări știute</dt><dd>{d.mastered.length}{total ? ` din ${total}` : ''}</dd></div>
          <div><dt>De reluat</dt><dd>{d.wrong.length}</dd></div>
          {bestExam !== null && <div><dt>Cel mai bun examen</dt><dd>{bestExam} din 100</dd></div>}
          {weakest && <div><dt>De lucrat</dt><dd>{typeInfo(weakest.x.t).label} · {Math.round((weakest.s!.r / weakest.s!.n) * 100)}%</dd></div>}
          {v1 > 0 && <div><dt>În versiunea veche</dt><dd>{v1} știute</dd></div>}
        </dl>
      )}
    </section>
  );
}

function ChildForm({ child, onDone }: { child?: Player; onDone: () => void }) {
  const [name, setName] = useState(child?.name ?? '');
  const [year, setYear] = useState(child?.birthYear ? String(child.birthYear) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: Event) {
    e.preventDefault();
    const y = Number(year);
    if (!name.trim()) return setError('Scrie prenumele copilului.');
    if (!validBirthYear(y)) return setError('Scrie anul nașterii cu patru cifre, de exemplu 2014.');
    setBusy(true);
    setError('');
    try {
      if (child) await updateChild(child.key, name, y);
      else await addChild(name, y);
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  const id = child?.key ?? 'new';
  return (
    <form class="stack me-form" onSubmit={submit}>
      <div class="two">
        <div class="field">
          <label for={`kn-${id}`}>Prenume</label>
          <input id={`kn-${id}`} class="input" maxLength={40} value={name} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
        <div class="field">
          <label for={`ky-${id}`}>Anul nașterii</label>
          <input id={`ky-${id}`} class="input" inputMode="numeric" maxLength={4} placeholder="2014" value={year} onInput={(e) => setYear(e.currentTarget.value.replace(/\D/g, ''))} />
        </div>
      </div>
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="two">
        <button type="button" class="btn btn-ghost" onClick={onDone}>Renunță</button>
        <button class="btn btn-primary" disabled={busy}>{child ? 'Salvează' : 'Adaugă'}</button>
      </div>
    </form>
  );
}
