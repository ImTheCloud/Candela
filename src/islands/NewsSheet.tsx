import { useEffect, useState } from 'preact/hooks';
import { mark1SamuelNewsOpened, mark1SamuelNewsSeen, needs1SamuelNews, profile, profileLoaded, user } from '../lib/session';
import LampIcon from './LampIcon';
import Modal, { CloseButton } from './Modal';

const POINTS = [
  { title: '31 de capitole', text: 'Câte 24 de întrebări pe capitol, la fiecare nivel.', icon: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13" /> },
  { title: 'Același stil ca 2 Samuel', text: 'Adevărat sau fals, un singur răspuns, asociere și mai multe răspunsuri.', icon: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /> },
  { title: 'Un clasament separat', text: '1 Samuel are clasamentul lui, deosebit de cel din 2 Samuel.', icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /> },
];

/** Tells the accounts that already existed that 1 Samuel is ready: once per account, on the home page. */
export default function NewsSheet() {
  const [open, setOpen] = useState(false);
  const u = user.value;
  const show = !!u && profileLoaded.value && needs1SamuelNews(profile.value);

  useEffect(() => {
    if (!show) return;
    setOpen(true);
    mark1SamuelNewsSeen(u.uid);
  }, [show]);

  if (!open) return null;
  return (
    <Modal labelledby="news-title" class="news" onClose={() => setOpen(false)}>
      {(close) => (<>
        <div class="news-close"><CloseButton onClick={close} /></div>
        <div class="news-head">
          <LampIcon size={40} />
          <span class="news-tag">Nou în Candela</span>
          <h2 id="news-title">1 Samuel este gata!</h2>
          <p class="muted">Întrebările din 1 Samuel sunt în sfârșit disponibile.</p>
        </div>
        <ul class="news-list">
          {POINTS.map((p) => (
            <li>
              <span class="news-ic" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{p.icon}</svg>
              </span>
              <span><b>{p.title}</b><small>{p.text}</small></span>
            </li>
          ))}
        </ul>
        <a class="btn btn-primary btn-block" href="/1-samuel" onClick={() => { if (u) mark1SamuelNewsOpened(u.uid); close(); }}>Deschide 1 Samuel</a>
      </>)}
    </Modal>
  );
}
