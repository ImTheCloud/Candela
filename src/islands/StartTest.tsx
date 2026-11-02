import { useEffect, useState } from 'preact/hooks';
import { prefetch } from 'astro:prefetch';
import { levelLabel } from '../lib/age';
import { level } from '../lib/level';
import { loadChapter } from '../lib/load';
import { preloadQuestionAudio } from '../lib/speech';
import LevelPicker from './LevelPicker';
import TestShape from './TestShape';
import Modal, { CloseButton } from './Modal';

interface Props {
  book: string;
  ch: number;
  title: string;
}

/** "Începe întrebările" in the reader's bottom bar: it opens the same level sheet as a chapter tile, it never starts by itself. */
export default function StartTest({ book, ch, title }: Props) {
  const [open, setOpen] = useState(false);
  const lv = level.value;
  const href = `/${book}/exersare?capitol=${ch}&start=1&nivel=${encodeURIComponent(lv)}`;

  // the test then starts at once: its page, questions and first audio tracks are preloaded beforehand
  useEffect(() => {
    loadChapter(book, ch)
      .then((qs) => {
        const pool = qs.filter((q) => q.age === lv);
        if (pool[0]) preloadQuestionAudio(pool[0]);
        if (pool[1]) preloadQuestionAudio(pool[1]);
        if (pool[2]) preloadQuestionAudio(pool[2]);
      })
      .catch(() => {});
    prefetch(href, { ignoreSlowConnection: true });
  }, [book, ch, lv]);

  return (
    <>
      <button type="button" class="btn btn-primary btn-block" onClick={() => setOpen(true)}>Începe întrebările</button>
      {open && (
        <Modal labelledby="st-title" onClose={() => setOpen(false)}>
          {(close) => (<>
            <div class="sheet-top">
              <div>
                <h2 id="st-title">Testul capitolului {ch}</h2>
                <p class="muted">{title}</p>
              </div>
              <CloseButton onClick={close} />
            </div>
            <div class="test-head">
              <p class="sheet-label">Alege nivelul</p>
            </div>
            <LevelPicker />
            <TestShape />
            <a class="btn btn-primary btn-block oc-go" href={href}>Începe testul de nivel {levelLabel(lv).toLowerCase()}</a>
          </>)}
        </Modal>
      )}
    </>
  );
}
