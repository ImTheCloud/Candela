import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { loadVerses } from '../lib/load';
import { createPortal } from 'preact/compat';
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
  const [leaveTo, setLeaveTo] = useState<(() => void) | null>(null);
  const leaving = useRef(false);
  const quizEl = useRef<HTMLDivElement>(null);
  const cardEl = useRef<HTMLElement>(null);
  // where the card sat when the answer was checked: it stays there while the correction appears below
  const [pin, setPin] = useState<number | null>(null);

  const q = questions[i];
  const g = grades[i];
  const started = answers.some(isAnswered);

  // leaving in the middle loses the answers: ask first
  useEffect(() => {
    if (done || !started) return;
    const warn = (e: BeforeUnloadEvent) => { if (!leaving.current) e.preventDefault(); };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [done, started]);

  useEffect(() => { scrollTo({ top: 0 }); }, [i, done]);

  // the correction must fit on the screen: if it does not, the card moves up just enough
  useLayoutEffect(() => {
    if (!g || mode !== 'practice') return;
    const fb = quizEl.current?.querySelector('.feedback');
    const bar = document.querySelector('.actions');
    if (!fb || !bar) return;
    const over = fb.getBoundingClientRect().bottom - (bar.getBoundingClientRect().top - 12);
    if (over > 0) setPin((p) => Math.max(8, (p ?? 8) - over));
  }, [g]);

  // slim header while answering
  useEffect(() => {
    if (done) return;
    document.body.classList.add('in-quiz');
    return () => document.body.classList.remove('in-quiz');
  }, [done]);

  // the back arrow (or the logo) leaves the test: ask first
  useEffect(() => {
    if (done) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('header.top a') as HTMLAnchorElement | null;
      if (!a || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const back = a.matches('a[data-back]');
      setLeaveTo(() => () => {
        leaving.current = true;
        if (back && (history.state?.index ?? 0) > 0) history.back();
        else location.assign(a.href);
      });
    };
    addEventListener('click', onClick, true);
    return () => removeEventListener('click', onClick, true);
  }, [done]);

  const setAnswer = (a: Answer) => setAnswers(answers.map((x, k) => (k === i ? a : x)));

  function check() {
    if (quizEl.current && cardEl.current) setPin(cardEl.current.getBoundingClientRect().top - quizEl.current.getBoundingClientRect().top);
    const gr = grade(q, answers[i]);
    setGrades(grades.map((x, k) => (k === i ? gr : x)));
    recordAnswers(book, [{ id: q.id, t: q.t, right: gr.right }]);
  }

  function next() {
    setPin(null);
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
  const topEl = document.getElementById('quiz-top');

  return (
    <div ref={quizEl} class={`quiz${mode === 'practice' && g ? ' has-fb' : ''}`} style={pin !== null && g ? { paddingTop: `${pin}px` } : undefined}>
      {topEl && createPortal(
        <>
          <div class="bar" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i + 1} aria-label="Progres">
            <span class="bar-fill" style={{ width: `${((i + (g ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
          <span class="qt-n">{i + 1}/{questions.length}</span>
        </>, topEl)}

      {newPart && <p class="part">{info.part}. {info.label}</p>}

      <article ref={cardEl} class="card q-card" aria-live="polite">
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
              <button class="btn verdict-btn" onClick={next}>{i < questions.length - 1 ? 'Mai departe' : 'Vezi rezultatul'}</button>
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
      {leaveTo && (
        <div class="sheet-back" onClick={(e) => e.target === e.currentTarget && setLeaveTo(null)}>
          <div class="sheet-panel confirm" role="alertdialog" aria-labelledby="leave-t">
            <h2 id="leave-t">Ieși din test?</h2>
            <p class="muted">Răspunsurile de până acum nu se păstrează.</p>
            <div class="two">
              <button class="btn btn-ghost" onClick={() => setLeaveTo(null)}>Rămân</button>
              <button class="btn danger" onClick={leaveTo}>Ieși</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** answer: also write the right answer (where the question itself is not shown, as in "De recitit"). */
function Feedback({ q, g, bookName, answer = false }: { q: Playable; g: Grade; bookName: string; answer?: boolean }) {
  const [open, setOpen] = useState(false);
  // "Niciun răspuns corect: …" in the explanation already says it
  const showAnswer = answer && !g.right && !(q.explain ?? '').startsWith('Niciun răspuns corect');
  const verses = q.cite.map(([label]) => label.split(':')[1]).filter(Boolean);
  return (
    <section class={`feedback ${g.right ? 'is-right' : 'is-wrong'}`}>
      {showAnswer && <p class="fb-answer"><small>Răspunsul corect</small>{rightAnswer(q)}</p>}
      {q.explain && <p class="fb-explain">{q.explain}</p>}
      <button type="button" class="verse-btn" onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg>
        <span class="vb-main"><b>Vezi versetul</b><small>{bookName} {q.ch}:{verses.length > 1 ? `${verses[0]}–${verses[verses.length - 1]}` : verses[0]}</small></span>
        <svg class="vb-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {open && <VerseSheet q={q} bookName={bookName} onClose={() => setOpen(false)} />}
    </section>
  );
}

/** The chapter in a bottom sheet, the verses of the question highlighted and brought into view. */
function VerseSheet({ q, bookName, onClose }: { q: Playable; bookName: string; onClose: () => void }) {
  const [verses, setVerses] = useState<string[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cited = new Set(q.cite.map(([label]) => Number(label.split(':')[1])));

  useEffect(() => {
    let live = true;
    loadVerses(q.book, q.ch).then((v) => live && setVerses(v.length ? v : null), () => {});
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { live = false; removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [q.id]);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('.is-cited');
    if (el && box.current) box.current.scrollTop = el.offsetTop - 16;
  }, [verses]);

  return (
    <div class="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet-panel verse-sheet" role="dialog" aria-modal="true" aria-label={`${bookName} ${q.ch}`}>
        <div class="sheet-grab" aria-hidden="true" />
        <div class="sheet-top">
          <h2>{bookName} {q.ch}</h2>
          <button type="button" class="icon-btn" aria-label="Închide" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </div>
        <div class="vs-text" ref={box}>
          {verses
            ? verses.map((text, k) => <p class={cited.has(k + 1) ? 'is-cited' : ''}><sup>{k + 1}</sup>{text}</p>)
            : q.cite.map(([label, text]) => <p class="is-cited"><sup>{label}</sup>{text}</p>)}
        </div>
        <div class="vs-foot"><ReportButton q={q} /></div>
      </div>
    </div>
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
          {max !== 100 && <div><dt>Puncte</dt><dd>{pts}/{max}</dd></div>}
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
              <div class="q-meta"><span class="q-type">{k + 1}. {typeInfo(q.t).short}</span><span class="q-ref">{bookName} {q.ref}</span></div>
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
