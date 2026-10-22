import { useEffect } from 'preact/hooks';
import { prefetch } from 'astro:prefetch';
import { ageLabel, ageShort, type AgeGroup } from '../lib/age';
import { level } from '../lib/level';
import { progress, scoreLabel } from '../lib/progress';
import LevelPicker from './LevelPicker';
import Modal, { CloseButton } from './Modal';

/** A real exam that already took place, to play again. */
export interface ExamInfo {
  id: string;
  age: AgeGroup;
  title: string;
  year: number;
  /** "luni, 19 octombrie 2026" */
  date?: string;
}

/** The "Examene" tile opens this sheet, built like a chapter's: the real exams to redo on top, then the level and the start button. */
export default function ExamSheet({ book, exams, onClose }: { book: string; exams: ExamInfo[]; onClose: () => void }) {
  const lv = level.value;
  const best = progress(book).value.exams;
  // one date for all of them when it is the same
  const dates = [...new Set(exams.map((e) => e.date).filter(Boolean))];

  useEffect(() => { prefetch(`/${book}/examene/alb`, { ignoreSlowConnection: true }); }, [book]);

  return (
    <Modal labelledby="ex-title" onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <div>
            <h2 id="ex-title">Examene</h2>
            <p class="muted">21 de întrebări, ca la un test obișnuit</p>
          </div>
          <CloseButton onClick={close} />
        </div>

        {exams.length > 0 && (
          <>
            <p class="sheet-label">Examenele reale de la concurs{dates.length === 1 ? ` · ${dates[0]}` : ''}</p>
            <div class="opt-card ex-real">
              {exams.map((e) => (
                <a class={`oc-row${e.age === lv ? ' is-mine' : ''}`} href={`/${book}/examene/${e.id}`}>
                  <span class="oc-main"><b>{ageLabel(e.age)}</b></span>
                  {best[e.id] ? <span class="ts-best">{scoreLabel(best[e.id], 21)}</span> : <span class="ts-todo">de refăcut</span>}
                  <svg class="oc-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </a>
              ))}
            </div>
          </>
        )}

        <p class="sheet-label">Examen alb · doar pentru exersat</p>
        <div class="opt-card">
          <div class="oc-test" style={{ borderTop: 0 }}>
            <div class="oc-head">
              <span class="oc-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></svg></span>
              <span class="oc-main"><b>Întrebări din toată cartea</b></span>
            </div>
            <LevelPicker label="Nivelul examenului" />
          </div>
        </div>
        <a class="btn btn-primary btn-block oc-go" href={`/${book}/examene/alb`}>Începe examenul alb · {ageShort(lv)} ani</a>
      </>)}
    </Modal>
  );
}
