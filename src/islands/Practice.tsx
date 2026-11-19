import { useEffect, useState } from 'preact/hooks';
import AccountGate from './AccountGate';
import { LEVELS, type Level } from '../lib/age';
import { level as savedLevel, setLevel } from '../lib/level';
import { player } from '../lib/players';
import { examOrder, shuffle, type Playable, type QType } from '../lib/questions';
import { bookHome } from '../lib/books';
import { loadChapters } from '../lib/load';
import LevelPicker from './LevelPicker';
import Quiz, { type LevelOffer } from './Quiz';
import { progress } from '../lib/progress';
import Loader from './Loader';

/** How many questions each chapter has, per age group and type (computed at build). */
export type Summary = Record<number, Partial<Record<Level, Partial<Record<QType, number>>>>>;

interface Props {
  book: string;
  bookName: string;
  chapters: number;
  summary: Summary;
}

const COUNTS = [10, 20, 0];

function PracticeInner({ book, bookName, chapters, summary }: Props) {
  const params = new URLSearchParams(location.search);
  const [picked, setPicked] = useState<number[]>(() => {
    const c = Number(params.get('capitol'));
    return c && summary[c] ? [c] : [];
  });
  // from a chapter's menu: ?capitol=5&start=1[&nivel=mediu] starts the whole chapter test at once
  // read once: at the end of the test the address is replaced and no longer says start=1
  const [direct] = useState(() => params.get('start') === '1');
  useState(() => {
    // a bare "+" in the address reads as a space ("18+")
    const asked = params.get('nivel');
    if (asked && LEVELS.some((g) => g.id === asked)) setLevel(asked as Level);
  });
  const [count, setCount] = useState(direct ? 0 : 10);
  const [quiz, setQuiz] = useState<{ key: number; questions: Playable[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const p = player.value;
  const level = savedLevel.value;

  const available = (ch: number) => {
    if (!level) return 0;
    const s = summary[ch]?.[level];
    if (!s) return 0;
    return Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
  };
  const withQuestions = Array.from({ length: chapters }, (_, k) => k + 1).filter((c) => available(c) > 0);
  const chosen = picked.filter((c) => available(c) > 0);
  const total = chosen.reduce((s, c) => s + available(c), 0);
  const n = count === 0 ? total : Math.min(count, total);

  async function start(lv: Level | null = level) {
    setBusy(true);
    setError('');
    try {
      const all = await loadChapters(book, chosen);
      const pool = all.filter((q) => q.age === lv);
      if (pool.length === 0) {
        setError('Nu există întrebări disponibile pentru acest nivel în capitolul selectat.');
        return;
      }
      const questions = examOrder(shuffle(pool).slice(0, count === 0 ? pool.length : count));
      setQuiz({ key: Date.now(), questions });
    } catch {
      setError('Întrebările nu s-au putut încărca. Verifică conexiunea la internet.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (direct && level && chosen.length && !quiz && !busy) {
      start();
    }
  }, [level, direct, chosen.length]);

  // end of a whole chapter test: the two other levels of that chapter, easiest first, with the best score made there
  const exams = progress(book).value.exams;
  const offers: LevelOffer[] = [];
  if (level && chosen.length === 1) {
    const ch = chosen[0];
    const at = (id: Level) => LEVELS.findIndex((g) => g.id === id);
    for (const g of LEVELS) {
      if (g.id === level || !summary[ch]?.[g.id]) continue;
      const e = exams[`c${ch}@${g.id}`];
      offers.push({ id: g.id, label: g.label, who: g.who, harder: at(g.id) > at(level),
        score: e ? (e.bestRight !== undefined && e.n ? `${e.bestRight}/${e.n}` : `${e.best}%`) : null });
    }
  }

  async function playLevel(lv: Level) {
    setLevel(lv);
    await start(lv);
    scrollTo({ top: 0 });
  }

  const toggle = (c: number) => setPicked(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c]);

  // points count only for a whole chapter test, not for a few questions picked or taken again
  const wholeTest = direct && chosen.length === 1 && count === 0;

  if (quiz) {
    return <Quiz key={quiz.key} book={book} bookName={bookName} questions={quiz.questions}
      points={wholeTest}
      backHref={bookHome(book)} onAgain={() => start()}
      otherLevels={wholeTest ? offers : undefined} onLevel={playLevel}
      scoreId={wholeTest ? `c${chosen[0]}@${level}` : undefined} />;
  }

  if (direct && chosen.length) return error ? <p class="notice notice-bad" role="alert">{error}</p> : <Loader />;

  return (
    <div class="setup">
      <div class="card who-line">
        <div>
          <p class="small muted">Joacă</p>
          <p><strong>{p.name.split(' ')[0]}</strong></p>
        </div>
      </div>

      <div class="setup-block">
        <p class="setup-head"><strong>Nivelul</strong></p>
        <LevelPicker />
      </div>

      <div class="setup-block">
        <div class="setup-head">
          <strong>Capitole</strong>
          {withQuestions.length > 0 && (
            <button type="button" class="link small btn-reset" onClick={() => setPicked(chosen.length === withQuestions.length ? [] : withQuestions)}>
              {chosen.length === withQuestions.length ? 'Niciunul' : 'Toate'}
            </button>
          )}
        </div>
        {withQuestions.length === 0 ? (
          <p class="card notice muted">Întrebările pentru {bookName} se pregătesc. Revino în curând.</p>
        ) : (
          <div class="ch-grid">
            {Array.from({ length: chapters }, (_, k) => k + 1).map((c) => (
              <button type="button" class="ch-pick" aria-pressed={picked.includes(c)} disabled={!available(c)}
                aria-label={`Capitolul ${c}`} onClick={() => toggle(c)}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div class="setup-block">
        <p class="setup-head"><strong>Câte întrebări</strong></p>
        <div class="segmented" role="radiogroup" aria-label="Câte întrebări">
          {COUNTS.map((c) => (
            <button type="button" role="radio" aria-checked={count === c} onClick={() => setCount(c)}>{c || 'Toate'}</button>
          ))}
        </div>
      </div>

      {error && <p class="notice notice-bad" role="alert">{error}</p>}

      <div class="actions">
        <button class="btn btn-primary btn-block" disabled={!n || busy} onClick={() => start()}>
          {busy ? 'Se încarcă…' : n ? n === 1 ? 'Începe întrebarea' : `Începe cele ${n} întrebări` : 'Alege capitolele'}
        </button>
      </div>
    </div>
  );
}

/** Played only from an account. */
export default function Practice(props: Props) {
  return <AccountGate><PracticeInner {...props} /></AccountGate>;
}
