import { useEffect } from 'preact/hooks';
import { prefetch } from 'astro:prefetch';
import { ageLabel, levelLabel, type AgeGroup } from '../lib/age';
import { level } from '../lib/level';
import { progress, scoreLabel } from '../lib/progress';
import LevelPicker from './LevelPicker';
import TestShape from './TestShape';
import Modal, { CloseButton } from './Modal';
import { PER_TEST } from '../lib/questions';

/** A real exam that already took place, to play again. */
export interface ExamInfo {
  id: string;
  age: AgeGroup;
  title: string;
  year: number;
  /** "luni, 19 octombrie 2026" */
  date?: string;
}

/** The "Examene" tile opens this sheet, laid out like a chapter's: reading from chapter 1, the real exams to redo, then the level and the start button. */
export default function ExamSheet({ book, exams, onClose }: { book: string; exams: ExamInfo[]; onClose: () => void }) {
  const base = `/${book}`;
  const lv = level.value;
  const best = progress(book).value.exams;
  // one date for all of them when it is the same
  const dates = [...new Set(exams.map((e) => e.date).filter(Boolean))];

  useEffect(() => {
    prefetch(`${base}/examene/alb`, { ignoreSlowConnection: true });
    prefetch(`${base}/citire/1`, { ignoreSlowConnection: true });
  }, [book]);

  return (
    <Modal labelledby="ex-title" onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <div>
            <h2 id="ex-title">Examene</h2>
            <p class="muted">{PER_TEST} de întrebări, ca la examenul final</p>
          </div>
          <CloseButton onClick={close} />
        </div>
        <a class="read-row" href={`${base}/citire/1`}>
          <span class="oc-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg></span>
          <span class="oc-main"><b>Citește cartea</b><small>De la capitolul 1, traducerea Cornilescu</small></span>
          <Chev />
        </a>

        {exams.length > 0 && (
          <>
            <p class="sheet-label">Examenele reale de la concurs{dates.length === 1 ? `, din ${dates[0]!.replace(/^\S+, /, '')}` : ''}</p>
            <div class="opt-card ex-real">
              {exams.map((e) => (
                <a class="oc-row" href={`${base}/examene/${e.id}`}>
                  <span class="oc-main"><b>{ageLabel(e.age)}</b></span>
                  {best[e.id] ? <span class="ts-best">{scoreLabel(best[e.id], 21)}</span> : <span class="ts-todo">Încearcă-l</span>}
                  <Chev />
                </a>
              ))}
            </div>
          </>
        )}

        <div class="test-head">
          <p class="sheet-label">Examen alb, din toată cartea</p>
        </div>
        <LevelPicker />
        <TestShape />
        <a class="btn btn-primary btn-block oc-go" href={`${base}/examene/alb`}>Începe examenul alb de nivel {levelLabel(lv).toLowerCase()}</a>
      </>)}
    </Modal>
  );
}

function Chev() {
  return <svg class="oc-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>;
}
