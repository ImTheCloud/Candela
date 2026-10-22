import { useEffect, useState } from 'preact/hooks';
import { loadChapters } from '../lib/load';
import { level } from '../lib/level';
import { shuffle, TYPES, type Playable, type QType } from '../lib/questions';
import Quiz from './Quiz';
import Loader from './Loader';

interface Props {
  book: string;
  bookName: string;
  chapters: number;
}

// Same shape as the paper exam: 5 + 5 + one matching + 5 + 5.
const SHAPE: Record<QType, number> = { tf: 5, one: 5, match: 1, fill: 5, multi: 5 };

/** A new exam drawn from the whole book, at the level picked on the previous screen. It starts at once. */
export default function MockExam({ book, bookName, chapters }: Props) {
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
        let list = shuffle(pool.filter((q) => q.t === t));
        if (t === 'match') list = list.sort((a, b) => (b.t === 'match' ? b.pairs.length : 0) - (a.t === 'match' ? a.pairs.length : 0));
        out.push(...list.slice(0, SHAPE[t]));
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
