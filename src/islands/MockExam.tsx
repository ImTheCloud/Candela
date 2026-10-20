import { useState } from 'preact/hooks';
import { ageGroup, ageLabel } from '../lib/age';
import { loadChapters } from '../lib/load';
import { player } from '../lib/players';
import { shuffle, TYPES, type Playable, type QType } from '../lib/questions';
import { ExamIntro } from './ExamRunner';
import Quiz from './Quiz';
import type { Summary } from './Practice';
import '../styles/quiz.css';

interface Props {
  book: string;
  bookName: string;
  chapters: number;
  summary: Summary;
}

// Same shape as the paper exam: 5 + 5 + one matching + 5 + 5.
const SHAPE: Record<QType, number> = { tf: 5, one: 5, match: 1, fill: 5, multi: 5 };

/** A new exam drawn from the chosen chapters, for the player's age group. */
export default function MockExam({ book, bookName, chapters, summary }: Props) {
  const p = player.value;
  const own = p.birthYear ? ageGroup(p.birthYear) : null;
  const ready = Array.from({ length: chapters }, (_, k) => k + 1).filter((c) => own && summary[c]?.[own]);
  const [picked, setPicked] = useState<number[]>(ready);
  const [exam, setExam] = useState<Playable[] | null>(null);
  const [run, setRun] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!own) {
    return (
      <div class="card auth-card stack">
        <h1>Examen alb</h1>
        <p class="muted">Ca să primești un examen potrivit vârstei, alege mai întâi anul nașterii.</p>
        <a class="btn btn-primary" href={`/${book}/exersare`}>Continuă</a>
      </div>
    );
  }

  async function build() {
    setBusy(true);
    setError('');
    try {
      const pool = (await loadChapters(book, picked)).filter((q) => q.age === own);
      const out: Playable[] = [];
      for (const { t } of TYPES) {
        let list = shuffle(pool.filter((q) => q.t === t));
        if (t === 'match') list = list.sort((a, b) => (b.t === 'match' ? b.pairs.length : 0) - (a.t === 'match' ? a.pairs.length : 0));
        out.push(...list.slice(0, SHAPE[t]));
      }
      setExam(out);
      setRun(0);
    } catch {
      setError('Întrebările nu s-au putut încărca. Verifică conexiunea la internet.');
    } finally {
      setBusy(false);
    }
  }

  if (exam && run) {
    return <Quiz key={run} book={book} bookName={bookName} questions={exam} mode="exam" examId="alb"
      backHref={`/${book}/examene`} onAgain={() => { setExam(null); build(); }} />;
  }
  if (exam) return <ExamIntro title={`Examen alb, ${ageLabel(own)}`} questions={exam} onStart={() => setRun(1)} />;

  const toggle = (c: number) => setPicked(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c]);
  return (
    <div class="setup">
      <div class="card auth-card stack">
        <h1>Examen alb</h1>
        <p class="muted">21 de întrebări noi pentru {ageLabel(own)}, împărțite ca la examen. Alege capitolele.</p>
      </div>
      {ready.length === 0 ? (
        <p class="card notice muted">Întrebările pentru {bookName} se pregătesc. Revino în curând.</p>
      ) : (
        <div class="setup-block">
          <div class="setup-head">
            <strong>Capitole</strong>
            <button type="button" class="link small btn-reset" onClick={() => setPicked(picked.length === ready.length ? [] : ready)}>
              {picked.length === ready.length ? 'Niciunul' : 'Toate'}
            </button>
          </div>
          <div class="ch-grid">
            {Array.from({ length: chapters }, (_, k) => k + 1).map((c) => (
              <button type="button" class="ch-pick" aria-pressed={picked.includes(c)} disabled={!ready.includes(c)}
                aria-label={`Capitolul ${c}`} onClick={() => toggle(c)}>{c}</button>
            ))}
          </div>
        </div>
      )}
      {error && <p class="notice notice-bad" role="alert">{error}</p>}
      <div class="actions">
        <button class="btn btn-primary btn-block" disabled={!picked.length || busy} onClick={build}>
          {busy ? 'Se pregătește…' : 'Pregătește examenul'}
        </button>
      </div>
    </div>
  );
}
