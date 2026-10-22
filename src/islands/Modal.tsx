import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  /** Called once the closing animation is over: the parent then stops rendering the modal. */
  onClose: () => void;
  /** Extra class on the panel. */
  class?: string;
  role?: 'dialog' | 'alertdialog';
  labelledby?: string;
  label?: string;
  /** Gets `close`: the way out that slides the panel down first. */
  children: (close: () => void) => ComponentChildren;
}

const OUT_MS = 230;

/** The bottom sheet of the site: it slides up when it opens and down when it closes (backdrop, X, Escape). */
export default function Modal({ onClose, class: cls = '', role = 'dialog', labelledby, label, children }: Props) {
  const [closing, setClosing] = useState(false);
  const shut = useRef(false);
  const latest = useRef(onClose);
  latest.current = onClose;

  const close = useRef(() => {
    if (shut.current) return;
    shut.current = true;
    setClosing(true);
    setTimeout(() => latest.current(), OUT_MS);
  }).current;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, []);

  return (
    <div class={`sheet-back${closing ? ' is-closing' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div class={`sheet-panel ${cls}`} role={role} aria-modal="true" aria-labelledby={labelledby} aria-label={label}>
        <div class="sheet-grab" aria-hidden="true" />
        {children(close)}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" class="icon-btn" aria-label="Închide" onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
    </button>
  );
}
