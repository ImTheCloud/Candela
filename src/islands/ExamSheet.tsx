import { useEffect } from 'preact/hooks';
import { prefetch } from 'astro:prefetch';
import { levelLabel } from '../lib/age';
import { level } from '../lib/level';
import LevelPicker from './LevelPicker';
import TestShape from './TestShape';
import Modal, { CloseButton } from './Modal';

interface Props {
  book: string;
  /** Chapters with questions, and chapters in the book: a book being written draws only from the first. */
  ready: number;
  total: number;
  onClose: () => void;
}

/** The "Examen alb" tile opens this sheet, laid out like a chapter's: reading from chapter 1, then the level and the start button. */
export default function ExamSheet({ book, ready, total, onClose }: Props) {
  const base = `/${book}`;
  const lv = level.value;

  useEffect(() => {
    prefetch(`${base}/examene/alb`, { ignoreSlowConnection: true });
    prefetch(`${base}/citire/1`, { ignoreSlowConnection: true });
  }, [book]);

  return (
    <Modal labelledby="ex-title" onClose={onClose}>
      {(close) => (<>
        <div class="sheet-top">
          <div>
            <h2 id="ex-title">Examen alb</h2>
            <p class="muted">{ready < total ? `Din capitolele gata: ${ready} din ${total}` : 'Din toată cartea, ca la examenul final'}</p>
          </div>
          <CloseButton onClick={close} />
        </div>
        <TestShape />
        <a class="read-row" href={`${base}/citire/1`}>
          <span class="oc-main"><b>Citește cartea</b><small>De la capitolul 1, traducerea Cornilescu</small></span>
          <Chev />
        </a>
        <div class="test-head">
          <p class="sheet-label">Alege nivelul</p>
        </div>
        <LevelPicker />
        <a class="btn btn-primary btn-block oc-go" href={`${base}/examene/alb`}>Începe examenul alb de nivel {levelLabel(lv).toLowerCase()}</a>
      </>)}
    </Modal>
  );
}

function Chev() {
  return <svg class="oc-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>;
}
