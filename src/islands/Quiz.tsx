import { useEffect, useState } from 'preact/hooks';
import { recordAnswers, recordExam } from '../lib/progress';
import { emptyAnswer, grade, isAnswered, percent, typeInfo, type Answer, type Grade, type Playable } from '../lib/questions';
import QuestionView from './QuestionView';

export interface QuizProps {
  book: string;
  bookName: string;
  questions: Playable[];
  /** practice: answer, check, see the verse. exam: answer everything, then the correction. */
  mode: 'practice' | 'exam';
  examId?: string;
  backHref: string;
  onAgain?: () => void;
}

export default function Quiz({ book, bookName, questions, mode, examId, backHref, onAgain }: QuizProps) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(emptyAnswer));
  const [grades, setGrades] = useState<(Grade | null)[]>(() => questions.map(() => null));
  const [done, setDone] = useState(false);
  const [confirmHandIn, setConfirmHandIn] = useState(false);

  const q = questions[i];
  const g = grades[i];
  const started = answers.some(isAnswered);

  // leaving in the middle loses the answers: ask first
  useEffect(() => {
    if (done || !started) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [done, started]);

  useEffect(() => { scrollTo({ top: 0 }); }, [i, done]);

  const setAnswer = (a: Answer) => setAnswers(answers.map((x, k) => (k === i ? a : x)));

  function check() {
    const gr = grade(q, answers[i]);
    setGrades(grades.map((x, k) => (k === i ? gr : x)));
    recordAnswers(book, [{ id: q.id, t: q.t, right: gr.right }]);
  }

  function next() {
    if (i < questions.length - 1) setI(i + 1);
    else setDone(true);
  }

  function handIn() {
    const all = questions.map((x, k) => grade(x, answers[k]));
    setGrades(all);
    setDone(true);
    const pts = all.reduce((s, x) => s + x.points, 0);
    const max = all.reduce((s, x) => s + x.max, 0);
    if (examId) recordExam(book, examId, percent(pts, max));
  }

  if (done) {
    return <Results book={book} bookName={bookName} questions={questions} answers={answers} grades={grades} mode={mode} backHref={backHref} onAgain={onAgain} />;
  }

  const info = typeInfo(q.t);
  const newPart = mode === 'exam' && (i === 0 || questions[i - 1].t !== q.t);
  const unanswered = answers.filter((a) => !isAnswered(a)).length;

  return (
    <div class="quiz">
      <div class="quiz-top">
        <div class="row-between small muted">
          <span>Întrebarea {i + 1} din {questions.length}</span>
          <a class="link" href={backHref}>Ieși</a>
        </div>
        <div class="bar" aria-hidden="true"><span class="bar-fill" style={{ width: `${((i + (g ? 1 : 0)) / questions.length) * 100}%` }} /></div>
      </div>

      {newPart && <p class="part">{info.part}. {info.label}</p>}

      <article class="card q-card" aria-live="polite">
        <div class="q-meta">
          <span class="q-type">{info.short}</span>
          <span class="q-ref">{bookName} {q.ref}</span>
        </div>
        {info.hint && !g && <p class="small muted">{info.hint}</p>}
        <QuestionView key={q.id} q={q} answer={answers[i]} onChange={setAnswer} graded={mode === 'practice' ? g : null} />
      </article>

      {mode === 'practice' && g && <Feedback q={q} g={g} />}

      <div class="actions">
        {mode === 'practice' ? (
          g
            ? <button class="btn btn-primary btn-block" onClick={next}>{i < questions.length - 1 ? 'Mai departe' : 'Vezi rezultatul'}</button>
            : <button class="btn btn-primary btn-block" disabled={!isAnswered(answers[i])} onClick={check}>Verifică</button>
        ) : confirmHandIn ? (
          <div class="hand-in stack">
            <p class="small">{unanswered ? `Mai ai ${unanswered} ${unanswered === 1 ? 'întrebare fără răspuns' : 'întrebări fără răspuns'}. ` : ''}Predai lucrarea?</p>
            <div class="two">
              <button class="btn btn-ghost" onClick={() => setConfirmHandIn(false)}>Nu încă</button>
              <button class="btn btn-primary" onClick={handIn}>Predă</button>
            </div>
          </div>
        ) : (
          <div class="two">
            <button class="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Înapoi</button>
            {i < questions.length - 1
              ? <button class="btn btn-primary" onClick={() => setI(i + 1)}>Următoarea</button>
              : <button class="btn btn-primary" onClick={() => setConfirmHandIn(true)}>Predă lucrarea</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function Feedback({ q, g }: { q: Playable; g: Grade }) {
  const status = g.right ? 'Corect' : g.points > 0 ? `Parțial: ${g.points} din ${g.max} puncte` : 'Greșit';
  const first = q.cite[0]?.[0] ?? '';
  const [ch, v] = first.split(':');
  return (
    <section class={`card feedback ${g.right ? 'is-right' : 'is-wrong'}`}>
      <p class="fb-status">{status}</p>
      {!g.right && <p class="fb-answer">{rightAnswer(q)}</p>}
      {q.explain && <p class="fb-explain">{q.explain}</p>}
      <div class="fb-verses">
        {q.cite.map(([label, text]) => <p><sup>{label}</sup>{text}</p>)}
      </div>
      {ch && <a class="link small" href={`/${q.book}/citire/${ch}#v${v}`}>Citește capitolul {ch}</a>}
    </section>
  );
}

/** The right answer in words, for the feedback and the correction. */
function rightAnswer(q: Playable): string {
  switch (q.t) {
    case 'tf': return `Răspunsul corect: ${q.a ? 'Adevărat' : 'Fals'}.`;
    case 'one': return `Răspunsul corect: ${q.opts[q.a]}.`;
    case 'multi': return q.a.length ? `Răspunsuri corecte: ${q.a.map((k) => q.opts[k]).join(', ')}.` : 'Niciun răspuns nu era corect.';
    case 'match': return q.pairs.map(([l, r]) => `${l}: ${r}`).join(' · ');
    case 'fill': return `Cuvintele corecte: ${q.a.join(', ')}.`;
  }
}

interface ResultsProps {
  book: string;
  bookName: string;
  questions: Playable[];
  answers: Answer[];
  grades: (Grade | null)[];
  mode: 'practice' | 'exam';
  backHref: string;
  onAgain?: () => void;
}

function Results({ bookName, questions, answers, grades, mode, backHref, onAgain }: ResultsProps) {
  const gs = grades.map((g, k) => g ?? grade(questions[k], answers[k]));
  const pts = gs.reduce((s, g) => s + g.points, 0);
  const max = gs.reduce((s, g) => s + g.max, 0);
  const score = percent(pts, max);
  const right = gs.filter((g) => g.right).length;
  const missed = questions.map((q, k) => ({ q, g: gs[k], a: answers[k] })).filter((x) => !x.g.right);

  return (
    <div class="quiz results">
      <section class="card score">
        <p class="score-num">{score}<span> din 100</span></p>
        <p class="muted">{right} din {questions.length} întrebări corecte · {pts} din {max} puncte</p>
        <div class="score-actions">
          {onAgain && <button class="btn btn-primary btn-block" onClick={onAgain}>{mode === 'exam' ? 'Reia examenul' : 'Încă un test'}</button>}
          <a class="btn btn-ghost btn-block" href={backHref}>Înapoi</a>
        </div>
      </section>

      {mode === 'exam' ? (
        <section class="stack">
          <h2>Corectarea</h2>
          {questions.map((q, k) => (
            <article class="card q-card">
              {(k === 0 || questions[k - 1].t !== q.t) && <p class="part">{typeInfo(q.t).part}. {typeInfo(q.t).label}</p>}
              <div class="q-meta"><span class="q-type">{k + 1}.</span><span class="q-ref">{bookName} {q.ref}</span></div>
              <QuestionView q={q} answer={answers[k]} onChange={() => {}} graded={gs[k]} />
              <Feedback q={q} g={gs[k]} />
            </article>
          ))}
        </section>
      ) : missed.length > 0 && (
        <section class="stack">
          <h2>De recitit</h2>
          {missed.map(({ q, g }) => (
            <details class="card missed">
              <summary>{q.q.replace(/___/g, '…')}</summary>
              <Feedback q={q} g={g} />
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
