import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { LEVELS, levelLabel, type Level } from '../lib/age';
import { level, scoreView } from '../lib/level';
import { progress, progressLoaded, scoreLabel } from '../lib/progress';
import { PER_TEST, type QType } from '../lib/questions';
import { prefetch } from 'astro:prefetch';
import { loadChapter } from '../lib/load';
import LevelPicker from './LevelPicker';
import TestShape from './TestShape';
import Modal, { CloseButton } from './Modal';
import Loader from './Loader';
import ExamSheet, { type ExamInfo } from './ExamSheet';

/** Questions per chapter, age group and type (computed at build). */
export type Summary = Record<number, Partial<Record<Level, Partial<Record<QType, number>>>>>;

interface Props {
  book: string;
  titles: string[];
  summary: Summary;
  /** The exams tile after the last chapter (as in v1): it opens a sheet to pick the level and the exam. */
  exams?: ExamInfo[];
}

/**
 * The chapters of a book as tiles (as in v1): a tap opens the chapter's menu,
 * where the player reads it or picks a test.
 */
export default function ChapterMenu({ book, titles, summary, exams: realExams }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const [examOpen, setExamOpen] = useState(false);
  const prog = progress(book).value;
  const exams = prog.exams;
  // a chapter's score belongs to a level: the tiles and the sheet show the score of the level picked now
  const at = (ch: number, lv: string) => exams[`c${ch}@${lv}`];
  const entry = (ch: number) => at(ch, level.value);
  // the tiles follow the tabs of the board: "Toate" = the best score of any level
  // exams only count how many were played
  const examsDone = Object.entries(exams).filter(([id]) => !/^c\d+/.test(id)).reduce((s, [, e]) => s + (e.plays ?? 1), 0);
  const view = scoreView.value;
  const tileEntry = (ch: number) => {
    if (view !== 'all') return at(ch, view);
    const all = LEVELS.map((g) => at(ch, g.id)).filter(Boolean) as NonNullable<ReturnType<typeof entry>>[];
    return all.sort((a, b) => (b.bestRight ?? Math.round(b.best / 100 * PER_TEST)) - (a.bestRight ?? Math.round(a.best / 100 * PER_TEST)))[0];
  };

  const sheet = open !== null && (
    <Sheet book={book} ch={open} title={titles[open - 1]} best={scoreLabel(entry(open), count(summary[open]?.[level.value]))}
      onClose={() => setOpen(null)} />
  );

  // the tiles wait for the player's scores: no numbers popping in after the page shows
  if (!progressLoaded(book).value) return <Loader />;

  return (
    <>
      <div class="tiles-wrap"><ol class="tiles">
        {titles.map((t, k) => {
          const ch = k + 1;
          const e = tileEntry(ch);
          const label = scoreLabel(e, PER_TEST);
          const full = !!e && (e.bestRight !== undefined ? e.bestRight === e.n : e.best === 100);
          return (
            <li>
              <button type="button" class={`tile${full ? ' is-full' : ''}`} onClick={() => setOpen(ch)}
                aria-label={`Capitolul ${ch}: ${t}`} title={t}>
                <span class="tile-n">{ch}</span>
                {label && <span class="tile-sc">{label}</span>}
              </button>
            </li>
          );
        })}
        {realExams && (
          <li style={{ gridColumn: `span ${examSpan(titles.length)}` }}>
            <button type="button" class="tile tile-exam" onClick={() => setExamOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></svg>
              <span>Examene</span>
              {examsDone > 0 && <small class="tile-done">{examsDone} {examsDone === 1 ? 'făcut' : 'făcute'}</small>}
            </button>
          </li>
        )}
      </ol></div>
      {sheet}
      {examOpen && realExams && <ExamSheet book={book} exams={realExams} onClose={() => setExamOpen(false)} />}
    </>
  );
}

interface SheetProps {
  book: string;
  ch: number;
  title: string;
  best: string | undefined;
  onClose: () => void;
}

function Sheet({ book, ch, title, best, onClose }: SheetProps) {
  const base = `/${book}`;
  const lv = level.value;

  // the test starts at once: its page and the chapter's questions are fetched while the menu is open
  useEffect(() => {
    loadChapter(book, ch).catch(() => {});
    prefetch(`${base}/exersare?capitol=${ch}&start=1&nivel=${encodeURIComponent(lv)}`, { ignoreSlowConnection: true });
    prefetch(`${base}/citire/${ch}`, { ignoreSlowConnection: true });
  }, [book, ch, lv]);

  return (
    <Modal labelledby="cm-title" onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <div>
            <h2 id="cm-title">Capitolul {ch}</h2>
            <p class="muted">{title}</p>
          </div>
          <CloseButton onClick={close} />
        </div>
        <a class="read-row" href={`${base}/citire/${ch}`}>
          <span class="oc-ic"><Icon name="book" /></span>
          <span class="oc-main"><b>Citește capitolul</b><small>Traducerea Cornilescu</small></span>
          <Chev />
        </a>
        <div class="test-head">
          <p class="sheet-label">Testul capitolului</p>
          {best !== undefined && <span class="test-best">Cel mai bun scor: {best}</span>}
        </div>
        <LevelPicker />
        <TestShape />
        <a class="btn btn-primary btn-block oc-go" href={`${base}/exersare?capitol=${ch}&start=1&nivel=${encodeURIComponent(lv)}`}>
          Începe testul de nivel {levelLabel(lv).toLowerCase()}
        </a>
      </>)}
    </Modal>
  );
}

const ICONS: Record<string, JSX.Element> = {
  book: <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />,
  test: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
  star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
  redo: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>,
};

function Icon({ name }: { name: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

function Chev() {
  return <svg class="oc-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>;
}

/** The exam tile takes what is left of the last row of the 6-column grid. */
function examSpan(n: number): number {
  const left = 6 - (n % 6);
  return left < 3 ? 6 : left;
}

function count(s: Partial<Record<QType, number>> | undefined): number {
  return s ? Object.values(s).reduce((a, b) => a + (b ?? 0), 0) : 0;
}
