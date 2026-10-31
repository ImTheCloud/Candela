import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { user } from '../lib/session';
import { localGet, localSet } from '../lib/store';
import Modal from './Modal';

/** Where questions and corrections go: the "Scrie-ne" buttons open a new email to it. */
export const CONTACT = 'claudiu.dev@outlook.com';
export const contactHref = `mailto:${CONTACT}?subject=${encodeURIComponent('Candela')}`;

const SEEN = 'welcome-v2';

interface Page { title: string; body: JSX.Element }

const PAGES: Page[] = [
  {
    title: 'Bine ai venit pe Candela',
    body: (<>
      <p>Candela îi ajută pe copii, adolescenți, tineri și adulți să se pregătească pentru concursul biblic <b>Talantul în negoț</b>.</p>
      <p class="muted">Pentru orice întrebare sau corectare, ne poți scrie din profil.</p>
    </>),
  },
  {
    title: 'Cărțile',
    body: <p><b>1 Samuel</b> și <b>2 Samuel</b>, după traducerea Cornilescu. 2 Samuel este gata, 1 Samuel vine în curând. Fiecare capitol se poate și citi.</p>,
  },
  {
    title: 'Testele',
    body: <p><b>24 de întrebări</b> pe capitol, pe trei niveluri: <b>Ușor</b> (copii), <b>Mediu</b> (adolescenți) și <b>Greu</b> (adulți). Le poți încerca pe toate.</p>,
  },
  {
    title: 'Examenele',
    body: <p>Un <b>examen alb</b> de 24 de întrebări amestecate din toată cartea, ca la examenul final.</p>,
  },
  {
    title: 'Clasamentul',
    body: <p>Fiecare întrebare știută îți aduce un punct. Cu butonul <b>Vizibil</b> poți apărea sau nu în clasament.</p>,
  },
  {
    title: 'Profilul',
    body: <p>Sus în dreapta: progresul tău, copiii (pentru un părinte) și un email către noi. O întrebare greșită? Apasă <b>Semnalează</b>.</p>,
  },
];

/** Shown once on this phone, after the first sign-in to this version: what Candela is and how it works, page by page. */
export default function Welcome() {
  const [open, setOpen] = useState(() => !localGet<boolean>(SEEN, false));
  const [i, setI] = useState(0);
  if (!open || !user.value) return null;

  const done = () => { localSet(SEEN, true); setOpen(false); };
  const page = PAGES[i];
  const last = i === PAGES.length - 1;

  return (
    <Modal labelledby="wl-title" onClose={done} class="welcome">
      {(close) => (<>
        <div class="wl-top">
          <span class="small muted">{i + 1} din {PAGES.length}</span>
          {!last && <button type="button" class="btn-reset link small" onClick={close}>Sari peste</button>}
        </div>
        <div class="wl-page" key={i}>
          <WelcomeLamp />
          <h2 id="wl-title">{page.title}</h2>
          <div class="wl-body">{page.body}</div>
        </div>
        <div class="wl-dots" aria-hidden="true">
          {PAGES.map((_, k) => <span class={k === i ? 'on' : ''} />)}
        </div>
        <div class="two">
          <button type="button" class="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Înapoi</button>
          {last
            ? <button type="button" class="btn btn-primary" onClick={close}>Începe</button>
            : <button type="button" class="btn btn-primary" onClick={() => setI(i + 1)}>Înainte</button>}
        </div>
      </>)}
    </Modal>
  );
}

/** The site's lamp, as in the header, larger. */
function WelcomeLamp() {
  return (
    <span class="wl-lamp" aria-hidden="true">
      <span class="wl-glow" />
      <svg width="96" height="96" viewBox="0 0 160 160">
        <g class="wl-flame">
          <path d="M80 18c10 18 22 30 22 48 0 13-10 22-22 22s-22-9-22-22c0-12 8-20 12-30 2 8 6 12 10 14-2-12 0-22 0-32z" fill="#D97B26" />
          <path d="M80 50c5 9 10 15 10 23 0 6-4 10-10 10s-10-4-10-10c0-7 6-13 10-23z" fill="#FBE5CC" />
        </g>
        <path d="M28 104c18 0 34-8 52-8s30 4 52 0c-4 18-24 32-52 32-20 0-40-8-52-24z" fill="#3A271B" />
        <path d="M132 96c8-4 14-2 16 4-6 0-10 2-16 6z" fill="#3A271B" />
        <ellipse cx="80" cy="96" rx="10" ry="3" fill="#7B6450" />
      </svg>
    </span>
  );
}
