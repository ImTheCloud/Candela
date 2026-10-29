import { useEffect, useState } from 'preact/hooks';
import { prefetch } from 'astro:prefetch';
import { levelLabel, type Level } from '../lib/age';
import { level } from '../lib/level';
import { loadChapter } from '../lib/load';
import type { QType } from '../lib/questions';
import LevelPicker from './LevelPicker';
import Modal, { CloseButton } from './Modal';

interface Props {
  book: string;
  ch: number;
  title: string;
  /** Questions of this chapter per age group and type. */
  counts: Partial<Record<Level, Partial<Record<QType, number>>>>;
}

/** "Începe întrebările" in the reader's bottom bar: it opens the same level sheet as a chapter tile, it never starts by itself. */
export default function StartTest({ book, ch, title, counts }: Props) {
  const [open, setOpen] = useState(false);
  const lv = level.value;
  const total = Object.values(counts[lv] ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const href = `/${book}/exersare?capitol=${ch}&start=1&nivel=${encodeURIComponent(lv)}`;

  // the test then starts at once: its page and the chapter's questions are fetched beforehand
  useEffect(() => {
    loadChapter(book, ch).catch(() => {});
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
            <div class="ts-block" style={{ marginTop: '14px' }}>
              <p class="sheet-label" style={{ margin: 0 }}>Nivelul{total ? `, ${total} de întrebări` : ''}</p>
              <LevelPicker />
            </div>
            <a class="btn btn-primary btn-block oc-go" href={href}>Începe testul de nivel {levelLabel(lv).toLowerCase()}</a>
          </>)}
        </Modal>
      )}
    </>
  );
}
