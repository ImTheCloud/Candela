import { useState } from 'preact/hooks';
import { ageGroup, type AgeGroup } from '../lib/age';
import { localGet, localSet } from '../lib/store';
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
 * The chapters of a book as tiles. A switch decides what a tap does: start the chapter's test or open its reading.
 */
export default function ChapterMenu({ book, titles, summary, examsHref }: Props) {
  const [mode, setModeState] = useState<'test' | 'citire'>(() => (localGet<string>('mode', 'test') === 'citire' ? 'citire' : 'test'));
  const setMode = (m: 'test' | 'citire') => { setModeState(m); localSet('mode', m); };
  const prog = progress(book).value;
  const p = player.value;
  const age = p.birthYear ? ageGroup(p.birthYear) : null;
  const mastered = (ch: number) => (age ? prog.mastered.filter((id) => sameChapter(id, ch, age)).length : 0);
  const total = (ch: number) => (age ? count(summary[ch]?.[age]) : 0);

  const wrongs = prog.wrong.filter((id) => chapterOf(id) > 0).length;
  const href = (ch: number) => (mode === 'test' ? `/${book}/exersare?capitol=${ch}&start=1` : `/${book}/citire/${ch}`);

  return (
    <>
      <div class="mode-switch" role="tablist" aria-label="Ce vrei să faci">
        <button type="button" role="tab" aria-selected={mode === 'test'} onClick={() => setMode('test')}>Exersează</button>
        <button type="button" role="tab" aria-selected={mode === 'citire'} onClick={() => setMode('citire')}>Citește</button>
      </div>
      <ol class="tiles">
        {titles.map((t, k) => {
          const ch = k + 1;
          const d = mastered(ch);
          const n = total(ch);
          const full = n > 0 && d === n;
          return (
            <li>
              <a class={`tile${full ? ' is-full' : ''}`} href={href(ch)}
                aria-label={`Capitolul ${ch}: ${t}`} title={t}>
                <span class="tile-n">{ch}</span>
                {mode === 'test' && d > 0 && <span class="tile-sc">{d}/{n}</span>}
              </a>
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
      {(wrongs > 0 || (mode === 'test' && prog.mastered.length > 0)) && (
        <div class="row-between small muted">
          <span>{mode === 'test' && prog.mastered.length > 0 ? 'Sub număr: întrebări știute' : ''}</span>
          {wrongs > 0 && <a class="link" href={`/${book}/greseli`}>Greșelile mele ({wrongs})</a>}
        </div>
      )}
    </>
  );
}

/** The exam tile takes what is left of the last row of the 6-column grid. */
function examSpan(n: number): number {
  const left = 6 - (n % 6);
  return left < 3 ? 6 : left;
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
