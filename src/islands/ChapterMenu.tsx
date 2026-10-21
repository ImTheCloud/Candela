import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ageShort, type AgeGroup } from '../lib/age';
import { level } from '../lib/level';
import { cachedExams, EMPTY, progress, type Progress } from '../lib/progress';
import { rememberedAccount, user } from '../lib/session';
import { player } from '../lib/players';
import type { QType } from '../lib/questions';
import { prefetch } from 'astro:prefetch';
import { loadChapter } from '../lib/load';
import LevelPicker from './LevelPicker';

/** Questions per chapter, age group and type (computed at build). */
export type Summary = Record<number, Partial<Record<AgeGroup, Partial<Record<QType, number>>>>>;

interface Props {
  book: string;
  titles: string[];
  summary: Summary;
  /** Tile after the last chapter (as in v1). */
  examsHref?: string;
}

/**
 * The chapters of a book as tiles (as in v1): a tap opens the chapter's menu,
 * where the player reads it or picks a test.
 */
export default function ChapterMenu({ book, titles, summary, examsHref }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const prog = progress(book).value;
  // until Firestore answers, the scores of the last visit are shown
  const exams = prog === EMPTY && user.value !== null ? cachedExams(user.value?.uid ?? rememberedAccount?.uid ?? player.value.key, book) : prog.exams;
  const entry = (ch: number) => exams[`c${ch}`];

  const sheet = open !== null && (
    <Sheet book={book} ch={open} title={titles[open - 1]} total={count(summary[open]?.[level.value])} best={labelFor(entry(open), count(summary[open]?.[level.value]))}
      wrongs={prog.wrong.filter((id) => chapterOf(id) === open).length}
      onClose={() => setOpen(null)} />
  );

  return (
    <>
      <ol class="tiles">
        {titles.map((t, k) => {
          const ch = k + 1;
          const e = entry(ch);
          const label = labelFor(e, count(summary[ch]?.[level.value]));
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
        {examsHref && (
          <li style={{ gridColumn: `span ${examSpan(titles.length)}` }}>
            <a class="tile tile-exam" href={examsHref}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></svg>
              <span>Examene</span>
            </a>
          </li>
        )}
      </ol>
      {sheet}
    </>
  );
}

interface SheetProps {
  book: string;
  ch: number;
  title: string;
  total: number;
  best: string | undefined;
  wrongs: number;
  onClose: () => void;
}

function Sheet({ book, ch, title, total, best, wrongs, onClose }: SheetProps) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, []);

  const base = `/${book}`;
  const lv = level.value;

  // the test starts at once: its page and the chapter's questions are fetched while the menu is open
  useEffect(() => {
    loadChapter(book, ch).catch(() => {});
    prefetch(`${base}/exersare?capitol=${ch}&start=1&nivel=${lv}`, { ignoreSlowConnection: true });
  }, [book, ch, lv]);

  return (
    <div class="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="cm-title">
        <div class="sheet-grab" aria-hidden="true" />
        <div class="sheet-top">
          <div>
            <h2 id="cm-title">Capitolul {ch}</h2>
            <p class="muted">{title}</p>
          </div>
          <button type="button" class="icon-btn" aria-label="Închide" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </div>
        <p class="sheet-label">Alege ce vrei să faci</p>
        <div class="opt-card">
          <a class="oc-row" href={`${base}/citire/${ch}`}>
            <span class="oc-ic"><Icon name="book" /></span>
            <span class="oc-main"><b>Citește capitolul</b><small>Traducerea Cornilescu</small></span>
            <Chev />
          </a>
          <div class="oc-test">
            <div class="oc-head">
              <span class="oc-ic"><Icon name="test" /></span>
              <span class="oc-main">
                <b>Testul capitolului</b>
                <small>{total ? `${total} întrebări` : ''}{best !== undefined ? `${total ? ' · ' : ''}cel mai bun scor ${best}` : ''}</small>
              </span>
            </div>
            <LevelPicker label="Nivelul testului" />
          </div>
        </div>
        <a class="btn btn-primary btn-block oc-go" href={`${base}/exersare?capitol=${ch}&start=1&nivel=${lv}`}>
          Începe testul · {ageShort(lv)} ani
        </a>
        {wrongs > 0 && (
          <a class="oc-more" href={`${base}/greseli`}>Greșelile mele ({wrongs} de reluat)</a>
        )}
      </div>
    </div>
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

type Entry = Progress['exams'][string] | undefined;

/** "4/21" for a chapter test. Entries from before the count was kept have only a percentage: the count is worked out from it until the test is played again. */
function labelFor(e: Entry, size: number): string | undefined {
  if (!e) return undefined;
  if (e.bestRight !== undefined && e.n) return `${e.bestRight}/${e.n}`;
  return size ? `${Math.round((e.best / 100) * size)}/${size}` : undefined;
}

/** The exam tile takes what is left of the last row of the 6-column grid. */
function examSpan(n: number): number {
  const left = 6 - (n % 6);
  return left < 3 ? 6 : left;
}

function count(s: Partial<Record<QType, number>> | undefined): number {
  return s ? Object.values(s).reduce((a, b) => a + (b ?? 0), 0) : 0;
}

/** Chapter of a chapter question; 0 for exam questions ("1sa-2026-12-13.4"). */
function chapterOf(id: string): number {
  return /^[a-z0-9]+\.\d+\./.test(id) ? Number(id.split('.')[1]) : 0;
}
