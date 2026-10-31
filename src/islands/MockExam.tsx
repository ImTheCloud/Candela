import { useEffect, useState } from 'preact/hooks';
import AccountGate from './AccountGate';
import { loadChapters } from '../lib/load';
import { level } from '../lib/level';
import { PAIRS, SHAPE, shuffle, TYPES, type Playable } from '../lib/questions';
import Quiz from './Quiz';
import Loader from './Loader';

interface Props {
  book: string;
  bookName: string;
  chapters: number;
}

/** A new exam drawn from the whole book, at the level picked on the previous screen. It starts at once. */
function MockExamInner({ book, bookName, chapters }: Props) {
  const lv = level.value;
  const [exam, setExam] = useState<{ key: number; questions: Playable[] } | null>(null);
  const [error, setError] = useState('');

  async function build() {
    setError('');
    try {
      const all = Array.from({ length: chapters }, (_, k) => k + 1);
      const pool = (await loadChapters(book, all)).filter((q) => q.age === lv);
      const out: Playable[] = [];
      for (const { t } of TYPES) {
        if (t === 'match') {
          const m = mixedMatch(pool);
          if (m) out.push(m);
        } else out.push(...shuffle(pool.filter((q) => q.t === t)).slice(0, SHAPE[t]));
      }
      setExam({ key: Date.now(), questions: out });
    } catch {
      setError('Întrebările nu s-au putut încărca. Verifică conexiunea la internet.');
    }
  }

  useEffect(() => { build(); }, []);

  if (exam) {
    return <Quiz key={exam.key} book={book} bookName={bookName} questions={exam.questions} scoreId="alb" record={false}
      backHref={`/${book}/examene`} onAgain={() => { setExam(null); build(); }} />;
  }
  if (error) return <p class="notice notice-bad" role="alert">{error}</p>;
  return <Loader />;
}

/** The exam's matching: one pair from the matching of each of five different chapters. */
function mixedMatch(pool: Playable[]): Playable | null {
  const matches = shuffle(pool.filter((q): q is Extract<Playable, { t: 'match' }> => q.t === 'match')).slice(0, PAIRS);
  if (matches.length < PAIRS) return matches[0] ?? null;
  const picked = matches.map((q) => ({ q, k: Math.floor(Math.random() * q.pairs.length) }));
  const ref = picked.map(({ q, k }) => q.refs?.[k] ?? q.ref).join('; ');
  return {
    id: `alb.match.${picked.map(({ q, k }) => `${q.id}#${k}`).join('+')}`,
    age: matches[0].age,
    t: 'match',
    ref,
    q: 'Asociază fiecare element din prima coloană cu ce i se potrivește în a doua.',
    pairs: picked.map(({ q, k }) => q.pairs[k]),
    book: matches[0].book,
    ch: 0,
    cite: picked.flatMap(({ q, k }) => q.pairCite?.[k] ?? q.cite),
  };
}

/** Played only from an account. */
export default function MockExam(props: Props) {
  return <AccountGate><MockExamInner {...props} /></AccountGate>;
}
