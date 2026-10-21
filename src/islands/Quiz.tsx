import { useEffect, useState } from 'preact/hooks';
import { recordAnswers, recordExam } from '../lib/progress';
import { emptyAnswer, grade, isAnswered, percent, typeInfo, type Answer, type Grade, type Playable } from '../lib/questions';
import QuestionView from './QuestionView';
import ReportButton from './ReportButton';

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
    setTimeout(() => document.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
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

      {mode === 'practice' && g && <Feedback q={q} g={g} bookName={bookName} />}

      <div class={`actions${mode === 'practice' && g ? ` is-graded ${g.right ? 'is-right' : 'is-wrong'}` : ''}`}>
        {mode === 'practice' ? (
          g ? (
            <div class="verdict">
              <p class="verdict-line">
                <span class="verdict-ic" aria-hidden="true">{g.right ? <Tick /> : <Cross />}</span>
                <span>{g.right ? 'Corect!' : g.points > 0 ? `Parțial · ${g.points} din ${g.max} puncte` : 'Greșit'}</span>
              </p>
              <button class="btn btn-block verdict-btn" onClick={next}>{i < questions.length - 1 ? 'Mai departe' : 'Vezi rezultatul'}</button>
            </div>
          ) : <button class="btn btn-primary btn-block" disabled={!isAnswered(answers[i])} onClick={check}>Verifică</button>
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

/** answer: also write the right answer (where the question itself is not shown, as in "De recitit"). */
function Feedback({ q, g, bookName, answer = false }: { q: Playable; g: Grade; bookName: string; answer?: boolean }) {
  const first = q.cite[0]?.[0] ?? '';
  const [ch, v] = first.split(':');
  // "Niciun răspuns corect: …" in the explanation already says it
  const showAnswer = answer && !g.right && !(q.explain ?? '').startsWith('Niciun răspuns corect');
  return (
    <section class={`card feedback ${g.right ? 'is-right' : 'is-wrong'}`}>
      {showAnswer && (
        <div class="fb-block">
          <p class="fb-label">Răspunsul corect</p>
          <p class="fb-answer">{rightAnswer(q)}</p>
        </div>
      )}
      {q.explain && (
        <div class="fb-block">
          <p class="fb-label">{g.right ? 'Pe scurt' : 'De ce'}</p>
          <p class="fb-explain">{q.explain}</p>
        </div>
      )}
      <div class="fb-block">
        <p class="fb-label">Ce spune textul · {bookName} {q.ref}</p>
        <div class="fb-verses">
          {q.cite.map(([label, text]) => <p><sup>{label}</sup>{text}</p>)}
        </div>
      </div>
      <div class="fb-links">
        {ch && <a class="link small" href={`/${q.book}/citire/${ch}#v${v}`}>Citește capitolul {ch}</a>}
        <ReportButton q={q} />
      </div>
    </section>
  );
}

function Tick() {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
}

function Cross() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>;
}

/** The right answer in words, for the feedback and the correction. */
function rightAnswer(q: Playable): string {
  switch (q.t) {
    case 'tf': return q.a ? 'Adevărat' : 'Fals';
    case 'one': return q.opts[q.a];
    case 'multi': return q.a.length ? q.a.map((k) => q.opts[k]).join(' · ') : 'Niciun răspuns nu era corect.';
    case 'match': return q.pairs.map(([l, r]) => `${l} → ${r}`).join(' · ');
    case 'fill': return q.a.join(', ');
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
  const praise = score >= 90 ? 'Excelent!' : score >= 75 ? 'Foarte bine!' : score >= 50 ? 'Bine, mai e puțin.' : 'Mai citește o dată capitolul.';
  const ring = 2 * Math.PI * 52;

  return (
    <div class="quiz results">
      <section class="card score">
        <div class="score-ring" role="img" aria-label={`${score} din 100`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" class="ring-bg" />
            <circle cx="60" cy="60" r="52" class="ring-fill" stroke-dasharray={ring} stroke-dashoffset={ring * (1 - score / 100)} />
          </svg>
          <span class="score-num">{score}<small>din 100</small></span>
        </div>
        <p class="score-praise">{praise}</p>
        <dl class="score-stats">
          <div><dt>Corecte</dt><dd class="ok">{right}</dd></div>
          <div><dt>Greșite</dt><dd class="bad">{questions.length - right}</dd></div>
          <div><dt>Puncte</dt><dd>{pts}/{max}</dd></div>
        </dl>
        <div class="score-actions">
          {onAgain && <button class="btn btn-primary btn-block" onClick={onAgain}>{mode === 'exam' ? 'Reia examenul' : 'Încă un test'}</button>}
          <a class="btn btn-ghost btn-block" href={backHref}>Înapoi la capitole</a>
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
              <Feedback q={q} g={gs[k]} bookName={bookName} />
            </article>
          ))}
        </section>
      ) : missed.length > 0 ? (
        <section class="stack">
          <div>
            <h2>De recitit</h2>
            <p class="small muted">Atinge o întrebare ca să vezi răspunsul și versetele.</p>
          </div>
          {missed.map(({ q, g }) => (
            <details class="card missed">
              <summary>
                <span class="missed-ic" aria-hidden="true"><Cross /></span>
                <span class="missed-q">{q.q.replace(/___/g, '…')}<small>{bookName} {q.ref}</small></span>
              </summary>
              <Feedback q={q} g={g} bookName={bookName} answer />
            </details>
          ))}
        </section>
      ) : (
        <p class="card all-right"><span class="verdict-ic" aria-hidden="true"><Tick /></span>Toate răspunsurile au fost corecte.</p>
      )}
    </div>
  );
}
