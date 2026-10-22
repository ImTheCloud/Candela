import { useEffect } from 'preact/hooks';
import { prefetch } from 'astro:prefetch';
import { ageLabel, ageShort, type AgeGroup } from '../lib/age';
import { level } from '../lib/level';
import { progress } from '../lib/progress';
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

/** The "Examene" tile opens this sheet: the level as for a chapter test, the mock exam, and the real exams to redo. */
export default function ExamSheet({ book, exams, onClose }: { book: string; exams: ExamInfo[]; onClose: () => void }) {
  const lv = level.value;
  const best = progress(book).value.exams;
  // the exam of the chosen level first
  const list = [...exams].sort((a, b) => Number(b.age === lv) - Number(a.age === lv));

  useEffect(() => { prefetch(`/${book}/examene/alb`, { ignoreSlowConnection: true }); }, [book]);

  return (
    <Modal labelledby="ex-title" onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <div>
            <h2 id="ex-title">Examene</h2>
            <p class="muted">Notate din 100</p>
          </div>
          <CloseButton onClick={close} />
        </div>

        <div class="ts-block">
          <p class="sheet-label" style={{ margin: 0 }}>Nivelul</p>
          <LevelPicker label="Nivelul examenului" />
        </div>

        <p class="sheet-label">Examen nou</p>
        <a class="btn btn-primary btn-block" href={`/${book}/examene/alb`}>Începe examenul alb · {ageShort(lv)} ani</a>
        <p class="small muted" style={{ marginTop: '6px' }}>21 de întrebări din toată cartea, ca la examenul adevărat.</p>

        {list.length > 0 && (
          <>
            <p class="sheet-label">Examene reale · de refăcut</p>
            <div class="ts-list">
              {list.map((e) => (
                <a class={`ts-exam${e.age === lv ? ' is-mine' : ''}`} href={`/${book}/examene/${e.id}`}>
                  <span>
                    <b>{ageLabel(e.age)}</b>
                    <small>{e.title}, {e.year}{e.date ? ` · ${e.date}` : ''}</small>
                  </span>
                  {best[e.id] && <span class="ts-best">{best[e.id].best}/100</span>}
                  <svg class="ts-redo" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </a>
              ))}
            </div>
          </>
        )}
      </>)}
    </Modal>
  );
}
