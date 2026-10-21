import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { AGE_GROUPS, ageGroup, ageLabel, type AgeGroup } from '../lib/age';
import { player } from '../lib/players';
import { progress } from '../lib/progress';
import type { QType } from '../lib/questions';

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
  const p = player.value;
  const age = p.birthYear ? ageGroup(p.birthYear) : null;
  const mastered = (ch: number) => (age ? prog.mastered.filter((id) => sameChapter(id, ch, age)).length : 0);
  const total = (ch: number) => (age ? count(summary[ch]?.[age]) : 0);

  const sheet = open !== null && (
    <Sheet book={book} ch={open} title={titles[open - 1]} age={age}
      done={mastered(open)} total={total(open)} wrongs={prog.wrong.filter((id) => chapterOf(id) === open).length}
      onClose={() => setOpen(null)} />
  );

  return (
    <>
      <ol class="tiles">
        {titles.map((t, k) => {
          const ch = k + 1;
          const d = mastered(ch);
          const n = total(ch);
          const full = n > 0 && d === n;
          return (
            <li>
              <button type="button" class={`tile${full ? ' is-full' : ''}`} onClick={() => setOpen(ch)}
                aria-label={`Capitolul ${ch}: ${t}`} title={t}>
                <span class="tile-n">{ch}</span>
                {d > 0 && <span class="tile-sc">{d}/{n}</span>}
              </button>
            </li>
          );
        })}
        {examsHref && (
          <li class="tile-wide">
            <a class="tile tile-exam" href={examsHref}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></svg>
              <span>Examene</span>
            </a>
          </li>
        )}
      </ol>
      {prog.mastered.length > 0 && <p class="small muted">3/15 = întrebări știute din capitol</p>}
      {sheet}
    </>
  );
}

interface SheetProps {
  book: string;
  ch: number;
  title: string;
  age: AgeGroup | null;
  done: number;
  total: number;
  wrongs: number;
  onClose: () => void;
}

function Sheet({ book, ch, title, age, done, total, wrongs, onClose }: SheetProps) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, []);

  const base = `/${book}`;
  const harder = age && age !== '18+' ? AGE_GROUPS[AGE_GROUPS.findIndex((g) => g.id === age) + 1].id : null;

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
        <div class="lvl-list">
          <Row href={`${base}/citire/${ch}`} icon="book" tone="read" name="Citește capitolul" />
          <Row href={`${base}/exersare?capitol=${ch}&start=1`} icon="test" tone="test" name="Testul capitolului"
            tag={age ? short(age) : ''} done={!!total && done === total}
            side={total ? (done ? `${done}/${total}` : String(total)) : ''} unit={total && !done ? 'întrebări' : ''} />
          {harder && <Row href={`${base}/exersare?capitol=${ch}&start=1&nivel=greu`} icon="star" name="Mai greu" tag={short(harder)} />}
          {wrongs > 0 && <Row href={`${base}/greseli`} icon="redo" name="Greșelile mele" side={`${wrongs} de reluat`} />}
        </div>
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

function Row({ href, icon, name, tag, done, side, unit, tone }: { href: string; icon: string; name: string; tone?: 'read' | 'test'; tag?: string; done?: boolean; side?: string; unit?: string }) {
  return (
    <a class={`lvl-row${done ? ' is-done' : ''}${tone ? ` tone-${tone}` : ''}`} href={href}>
      <span class="lvl-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[icon]}</svg></span>
      <b class="lvl-name"><span class="lvl-text">{name}</span>{tag && <span class="lvl-tag">{tag}</span>}</b>
      {done && <svg class="lvl-done" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="făcut"><path d="M13.3 4L6 11.3 2.7 8" /></svg>}
      {side && <small class="lvl-side">{side}{unit && <span class="lvl-unit"> {unit}</span>}</small>}
      <svg class="lvl-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
    </a>
  );
}

/** "18+", "12–13": the age group without "ani". */
function short(age: AgeGroup): string {
  return ageLabel(age).replace(/ ani$/, '').replace('Sub 12', 'sub 12');
}

function count(s: Partial<Record<QType, number>> | undefined): number {
  return s ? Object.values(s).reduce((a, b) => a + (b ?? 0), 0) : 0;
}

/** "2sa.5.12-13.3": chapter 5, age 12-13. */
function sameChapter(id: string, ch: number, age: AgeGroup): boolean {
  const [, c, a] = id.split('.');
  return Number(c) === ch && a === age;
}

/** Chapter of a chapter question; 0 for exam questions ("1sa-2026-12-13.4"). */
function chapterOf(id: string): number {
  return /^[a-z0-9]+\.\d+\./.test(id) ? Number(id.split('.')[1]) : 0;
}
