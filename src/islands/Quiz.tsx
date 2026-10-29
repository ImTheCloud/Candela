import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { navigate } from 'astro:transitions/client';
import { loadVerses } from '../lib/load';
import { recordAnswers, recordExam } from '../lib/progress';
import { emptyAnswer, grade, isAnswered, percent, TYPES, typeInfo, type Answer, type Grade, type Playable } from '../lib/questions';
import QuestionView from './QuestionView';
import Modal, { CloseButton } from './Modal';
import { questionLevel } from '../lib/age';
import { BOOKS } from '../lib/books';
import ReportButton from './ReportButton';

export interface QuizProps {
  book: string;
  bookName: string;
  questions: Playable[];
  /** The score is kept under this id: "c5" for a chapter test, "alb" for the mock exam, the id of a real exam. */
  scoreId?: string;
  /** false: the answers do not count for the questions known or for the board (the exams). */
  record?: boolean;
  /** false: right answers do not count for the player (the mistakes list). */
  points?: boolean;
  backHref: string;
  onAgain?: () => void;
}

/** Every set of questions is played the same way: a chapter test, the mock exam, a real exam, the mistakes. */
export default function Quiz({ book, bookName, questions, scoreId, record = true, points = true, backHref, onAgain }: QuizProps) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(emptyAnswer));
  const [grades, setGrades] = useState<(Grade | null)[]>(() => questions.map(() => null));
  const [done, setDone] = useState(false);
  const [leaveTo, setLeaveTo] = useState<(() => void) | null>(null);
  const leaving = useRef(false);
  const barEl = useRef<HTMLDivElement>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [verse, setVerse] = useState(false);

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

  // the page always leaves room under the answers for the bar at the foot, whatever its height
  useEffect(() => {
    const el = barEl.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--bar-h'); };
  }, [done]);

  // a finished test is never played again by going back: this entry of the history now points to the list,
  // and the back arrow goes there too
  useEffect(() => {
    if (!done) return;
    try { history.replaceState(history.state, '', backHref); } catch { /* keep the page as it is */ }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('header.top a[data-back]');
      if (!a || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(backHref);
    };
    addEventListener('click', onClick, true);
    return () => removeEventListener('click', onClick, true);
  }, [done]);

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
    const gr = grade(q, answers[i]);
    setGrades(grades.map((x, k) => (k === i ? gr : x)));
  }

  function next() {
    if (i < questions.length - 1) return setI(i + 1);
    // nothing counts until the whole test is finished
    if (grades.every(Boolean)) {
      const all = grades as Grade[];
      if (record) recordAnswers(book, questions.map((x, k) => ({ id: x.id, t: x.t, right: all[k].right })), points)?.catch((e) => { console.error(e); setSaveFailed(true); });
      if (scoreId) recordExam(book, scoreId, percent(all.reduce((s, x) => s + x.points, 0), all.reduce((s, x) => s + x.max, 0)), { right: all.filter((x) => x.right).length, n: all.length });
    }
    setDone(true);
  }

  if (done) {
    return <Results bookName={bookName} questions={questions} answers={answers} grades={grades} saveFailed={saveFailed} backHref={backHref} onAgain={onAgain} />;
  }

  const topEl = document.getElementById('quiz-top');
  // within one chapter the scene is the same for every question; it is said again only when chapters are mixed (mock exam, mistakes)
  const mixed = new Set(questions.map((x) => `${x.book}/${x.ch}`)).size > 1;

  return (
    <div class={`quiz${g ? ' has-fb' : ''}`}>
      {topEl && createPortal(
        <>
          <div class="bar" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i + 1} aria-label="Progres">
            <span class="bar-fill" style={{ width: `${((i + (g ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
          <span class="qt-n">{i + 1}/{questions.length}</span>
        </>, topEl)}

      <QHead q={q} bookName={bookName} scene={mixed ? q.scene : undefined} />

      <div class="q-body" aria-live="polite">
        <QuestionView key={q.id} q={q} answer={answers[i]} onChange={setAnswer} graded={g}
          onEnter={!g && isAnswered(answers[i]) ? check : undefined} />
      </div>

      {saveFailed && <p class="notice notice-bad" role="alert">Răspunsurile nu se salvează acum (progresul și clasamentul nu se actualizează). Spune-i administratorului.</p>}

      <div ref={barEl} class={`actions${g ? ` is-graded ${g.right ? 'is-right' : 'is-wrong'}` : ''}`}>
        {g ? (
          <Verdict g={g} last={i === questions.length - 1} onVerse={() => setVerse(true)} onNext={next} />
        ) : (
          <button class="btn btn-primary btn-block btn-3d" disabled={!isAnswered(answers[i])} onClick={check}>Verifică</button>
        )}
      </div>

      {verse && <VerseSheet q={q} bookName={bookName} onClose={() => setVerse(false)} />}

      {leaveTo && (
        <Modal class="confirm" role="alertdialog" labelledby="leave-t" onClose={() => setLeaveTo(null)}>
          {(close) => (<>
            <h2 id="leave-t">Ieși din test?</h2>
            <p class="muted">Răspunsurile de până acum nu se păstrează.</p>
            <div class="two">
              <button class="btn btn-ghost" onClick={close}>Rămân</button>
              <button class="btn danger" onClick={leaveTo}>Ieși</button>
            </div>
          </>)}
        </Modal>
      )}
    </div>
  );
}

/** Above the question: what to do, the level it is meant for, the report button, and the verse it comes from. */
function QHead({ q, bookName, scene }: { q: Playable; bookName: string; scene?: string }) {
  return (
    <header class="q-head">
      <div class="q-row">
        <span class="q-kind">{typeInfo(q.t).short}</span>
        <span class="q-age" title="Nivelul întrebării">{questionLevel(q.age)}</span>
        <span class="q-spacer" />
        <ReportButton key={q.id} q={q} small />
      </div>
      <p class="q-where"><b>{bookName} {q.ref}</b></p>
      {scene && <p class="q-scene">{scene}</p>}
    </header>
  );
}

const BOOK_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg>;

/** The bottom panel once the answer is checked: the verdict, the verse, and the way on. The right answer is never spelled out: it shows in place and in the verse. */
function Verdict({ g, last, onVerse, onNext }: { g: Grade; last: boolean; onVerse: () => void; onNext: () => void }) {
  return (
    <div class="verdict">
      <div class="verdict-row">
        <span class="verdict-ic" aria-hidden="true">{g.right ? <Tick /> : <Cross />}</span>
        <span class="verdict-text">{g.right ? 'Corect!' : g.points > 0 && g.parts ? `Parțial, ${g.parts.filter(Boolean).length} din ${g.parts.length}` : 'Greșit'}</span>
        <button type="button" class="verse-pill" onClick={onVerse}>{BOOK_ICON}Versetul</button>
      </div>
      <button class="btn btn-block verdict-btn btn-3d" onClick={onNext}>{last ? 'Vezi rezultatul' : 'Mai departe'}</button>
    </div>
  );
}

/** The chapter in a bottom sheet, the verses of the question highlighted and brought into view. */
function VerseSheet({ q, bookName, onClose }: { q: Playable; bookName: string; onClose: () => void }) {
  const [verses, setVerses] = useState<string[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const cited = new Set(q.cite.map(([label]) => Number(label.split(':')[1])));

  useEffect(() => {
    let live = true;
    if (!q.ch) return;
    loadVerses(q.book, q.ch).then((v) => live && setVerses(v.length ? v : null), () => {});
    return () => { live = false; };
  }, [q.id]);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('.is-cited');
    if (el && box.current) box.current.scrollTop = el.offsetTop - 16;
  }, [verses]);

  return (
    <Modal class="verse-sheet" label={`${bookName} ${q.ch || ''}`} onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <h2>{bookName} {q.ch || ''}</h2>
          <CloseButton onClick={close} />
        </div>
        <div class="vs-text" ref={box}>
          {verses
            ? verses.map((text, k) => <p class={cited.has(k + 1) ? 'is-cited' : ''}><sup>{k + 1}</sup>{text}</p>)
            : q.cite.map(([label, text]) => <p class="is-cited"><sup>{label}</sup>{text}</p>)}
        </div>
      </>)}
    </Modal>
  );
}

function Tick() {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
}

function Cross() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>;
}

/** The right answer in words, for the list of missed questions. */
function rightAnswer(q: Playable): string {
  switch (q.t) {
    case 'tf': return q.a ? 'Adevărat' : 'Fals';
    case 'one': return q.opts[q.a];
    case 'multi': return q.a.length ? q.a.map((k) => q.opts[k]).join('; ') : 'Niciun răspuns nu era corect.';
    case 'match': return q.pairs.map(([l, r]) => `${l} → ${r}`).join('\n');
    case 'fill': return q.q.replace(/___/, q.a[0]);
  }
}

interface ResultsProps {
  bookName: string;
  questions: Playable[];
  answers: Answer[];
  grades: (Grade | null)[];
  saveFailed: boolean;
  backHref: string;
  onAgain?: () => void;
}

function Results({ bookName, questions, answers, grades, saveFailed, backHref, onAgain }: ResultsProps) {
  const [verseOf, setVerseOf] = useState<Playable | null>(null);
  const gs = grades.map((g, k) => g ?? grade(questions[k], answers[k]));
  const right = gs.filter((g) => g.right).length;
  const missed = questions.filter((_, k) => !gs[k].right);
  const share = right / questions.length;
  const praise = share >= 0.9 ? 'Excelent!' : share >= 0.75 ? 'Foarte bine!' : share >= 0.5 ? 'Bine, mai e puțin.' : 'Mai ai de exersat.';
  const ring = 2 * Math.PI * 52;
  // right answers per kind of question, in the order of the paper exam
  const kinds = TYPES.map((t) => {
    const idx = questions.map((q, k) => (q.t === t.t ? k : -1)).filter((k) => k >= 0);
    return { ...t, n: idx.length, ok: idx.filter((k) => gs[k].right).length };
  }).filter((x) => x.n > 0);
  const back = backHref.endsWith('/examene') ? 'Înapoi la examene' : 'Înapoi la capitole';

  return (
    <div class="quiz results">
      <section class="card score">
        <div class="score-ring" role="img" aria-label={`${right} din ${questions.length}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" class="ring-bg" />
            <circle cx="60" cy="60" r="52" class="ring-fill" stroke-dasharray={ring} stroke-dashoffset={ring * (1 - share)} />
          </svg>
          <span class="score-num">{right}<small>/{questions.length}</small></span>
        </div>
        <p class="score-praise">{praise}</p>
        {saveFailed && <p class="notice notice-bad" role="alert">Răspunsurile nu s-au salvat. Spune-i administratorului.</p>}

        {kinds.length > 1 && (
          <ul class="kinds" aria-label="Pe tipuri de întrebări">
            {kinds.map((k) => (
              <li class={k.ok === k.n ? 'is-full' : k.ok === 0 ? 'is-zero' : ''}>
                <span class="kind-name">{k.t === 'fill' ? 'Completare versete' : k.short}</span>
                <span class="kind-bar" aria-hidden="true"><span style={{ width: `${(k.ok / k.n) * 100}%` }} /></span>
                <span class="kind-n">{k.ok}/{k.n}</span>
              </li>
            ))}
          </ul>
        )}

        <div class="score-actions">
          {onAgain && <button class="btn btn-primary btn-block" onClick={onAgain}>Reia testul</button>}
          <a class="btn btn-ghost btn-block" href={backHref}>{back}</a>
        </div>
      </section>

      {missed.length > 0 ? (
        <section class="stack">
          <h2>De recitit</h2>
          {missed.map((q) => (
            <article class="card missed-card">
              <div class="mc-head">
                <span class="missed-ic" aria-hidden="true"><Cross /></span>
                <span class="missed-q">{q.q.replace(/___/g, '…')}<small>{bookName} {q.ref}</small></span>
              </div>
              <p class="fb-answer"><small>Răspuns corect</small>{rightAnswer(q)}</p>
              <button type="button" class="verse-btn" onClick={() => setVerseOf(q)}>
                {BOOK_ICON}
                <span class="vb-main"><b>Vezi versetul</b><small>{bookName} {q.ref}</small></span>
                <svg class="vb-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </article>
          ))}
        </section>
      ) : (
        <p class="card all-right"><span class="verdict-ic" aria-hidden="true"><Tick /></span>Toate răspunsurile au fost corecte.</p>
      )}
      {verseOf && <VerseSheet q={verseOf} bookName={bookName} onClose={() => setVerseOf(null)} />}
    </div>
  );
}
