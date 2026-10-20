import { useEffect, useState } from 'preact/hooks';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ageGroup, ageLabel } from '../lib/age';
import { db } from '../lib/firebase';
import { players, setHidden, GUEST, type Player } from '../lib/players';
import { EMPTY, progress, type Progress } from '../lib/progress';
import { typeInfo, TYPES } from '../lib/questions';
import { user } from '../lib/session';

interface BookInfo { slug: string; name: string; chapters: number; totals: Record<string, number> }

/** Progress of the account and each child: reading, questions mastered, weak question types, exams. */
export default function FamilyProgress({ books }: { books: BookInfo[] }) {
  const u = user.value;
  if (u === undefined) return <div class="card skeleton" />;
  const list = players.value;
  return (
    <div class="stack fam">
      {!u && <p class="card notice muted">Joci fără cont: progresul de mai jos este doar pe acest telefon. <a class="link" href="/cont">Intră în cont</a> ca să-l păstrezi.</p>}
      {list.map((p) => <PlayerCard key={p.key} p={p} books={books} />)}
    </div>
  );
}

function usePlayerProgress(p: Player, book: string): Progress {
  const [data, setData] = useState<Progress>(EMPTY);
  const u = user.value;
  const guest = progress(book).value;
  useEffect(() => {
    if (!u) return;
    return onSnapshot(doc(db, 'users', u.uid, 'progress', `${p.key}~${book}`), (snap) => setData({ ...EMPTY, ...(snap.data() as Partial<Progress>) }));
  }, [u?.uid, p.key, book]);
  return u ? data : guest;
}

function PlayerCard({ p, books }: { p: Player; books: BookInfo[] }) {
  const group = p.birthYear ? ageGroup(p.birthYear) : null;
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try { await setHidden(p, !p.hidden); } finally { setBusy(false); }
  }
  return (
    <section class="card fam-card">
      <header class="row-between">
        <div>
          <h2>{p.name.split(' ')[0]}</h2>
          <p class="small muted">{group ? ageLabel(group) : 'Fără an al nașterii'}</p>
        </div>
      </header>
      {books.map((b) => <BookProgress key={b.slug} p={p} book={b} total={group ? b.totals[group] ?? 0 : 0} />)}
      {p.key !== GUEST && (
        <label class="check small">
          <input type="checkbox" checked={!p.hidden} disabled={busy} onChange={toggle} />
          <span>Apare în clasament</span>
        </label>
      )}
    </section>
  );
}

/** Questions mastered in v1 (kept as a record: those questions were rewritten). */
function useV1(p: Player, book: string): number {
  const [n, setN] = useState(0);
  const u = user.value;
  useEffect(() => {
    if (!u || book !== '1-samuel') return;
    getDoc(doc(db, 'users', u.uid, 'archive', `${p.key}~1-samuel-v1`)).then((s) => setN((s.get('count') as number) ?? 0)).catch(() => {});
  }, [u?.uid, p.key, book]);
  return n;
}

function BookProgress({ p, book, total }: { p: Player; book: BookInfo; total: number }) {
  const d = usePlayerProgress(p, book.slug);
  const v1 = useV1(p, book.slug);
  const typed = TYPES.map((x) => ({ x, s: d.stats[x.t] })).filter((e) => e.s && e.s.n >= 3);
  // a weak spot only means something next to other kinds of questions
  const weakest = typed.length >= 2 ? typed.sort((a, b) => a.s!.r / a.s!.n - b.s!.r / b.s!.n)[0] : undefined;
  const exams = Object.values(d.exams);
  const bestExam = exams.length ? Math.max(...exams.map((e) => e.best)) : null;
  const started = d.read.length || d.mastered.length || exams.length || v1;
  return (
    <div class="fam-book">
      <p class="fam-title">{book.name}</p>
      {!started ? <p class="small muted">Nu a început încă.</p> : (
        <dl class="fam-stats">
          <div><dt>Capitole citite</dt><dd>{d.read.length} din {book.chapters}</dd></div>
          <div><dt>Întrebări știute</dt><dd>{d.mastered.length}{total ? ` din ${total}` : ''}</dd></div>
          <div><dt>De reluat</dt><dd>{d.wrong.length}</dd></div>
          {bestExam !== null && <div><dt>Cel mai bun examen</dt><dd>{bestExam} din 100</dd></div>}
          {v1 > 0 && <div class="wide"><dt>În versiunea veche</dt><dd>{v1} întrebări știute</dd></div>}
          {weakest && <div class="wide"><dt>De lucrat</dt><dd>{typeInfo(weakest.x.t).label} ({Math.round((weakest.s!.r / weakest.s!.n) * 100)}% corecte)</dd></div>}
        </dl>
      )}
    </div>
  );
}
