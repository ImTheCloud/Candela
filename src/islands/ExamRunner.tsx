import { useState } from 'preact/hooks';
import { maxPoints, TYPES, type Playable } from '../lib/questions';
import Quiz from './Quiz';

interface Props {
  book: string;
  bookName: string;
  title: string;
  examId: string;
  questions: Playable[];
}

/** A paper exam: the rules first, then all questions, then the correction. */
export default function ExamRunner({ book, bookName, title, examId, questions }: Props) {
  const [run, setRun] = useState(0);
  if (run) {
    return <Quiz key={run} book={book} bookName={bookName} questions={questions} mode="exam" examId={examId}
      backHref={`/${book}/examene`} onAgain={() => setRun(run + 1)} />;
  }
  return <ExamIntro title={title} questions={questions} onStart={() => setRun(1)} />;
}

export function ExamIntro({ title, questions, onStart }: { title: string; questions: Playable[]; onStart: () => void }) {
  const max = questions.reduce((s, q) => s + maxPoints(q), 0);
  return (
    <div class="setup">
      <div class="card auth-card stack">
        <h1>{title}</h1>
        <p class="muted">{questions.length} întrebări, ca pe foaia de examen. Corectarea apare la sfârșit, nota este din 100.</p>
        <ul class="parts">
          {TYPES.map((x) => {
            const qs = questions.filter((q) => q.t === x.t);
            if (!qs.length) return null;
            const pts = qs.reduce((s, q) => s + maxPoints(q), 0);
            return <li><span><strong>{x.part}.</strong> {x.short}</span><span class="muted small nowrap">{pts} p</span></li>;
          })}
        </ul>
        <p class="small muted">Total: {max} de puncte, socotite din 100.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary btn-block" onClick={onStart}>Începe examenul</button>
      </div>
    </div>
  );
}
