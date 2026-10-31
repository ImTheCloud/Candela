import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { user } from '../lib/session';
import { localGet, localSet } from '../lib/store';
import Modal from './Modal';

/** Where questions and corrections go: the "Scrie-ne" buttons open a new email to it. */
export const CONTACT = 'claudiu.dev@outlook.com';
export const contactHref = `mailto:${CONTACT}?subject=${encodeURIComponent('Candela')}`;

const SEEN = 'welcome-v2';

interface Page { icon: JSX.Element; title: string; body: JSX.Element }

const PAGES: Page[] = [
  {
    icon: <path d="M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-5 .5 1.5 1.2 2.3 2 2.7C11.6 6.6 12 5 12 3zM5 17c2 0 4.5-1 7-1s4.5 1 7 1c-1 2.5-4 4-7 4s-6-1.5-7-4z" />,
    title: 'Bine ai venit pe Candela',
    body: (<>
      <p>Candela este făcută în <b>Biserica Bethel Dworp</b>, ca să-i ajute pe tinerii bisericii noastre să se pregătească pentru concursul biblic <b>Talantul în negoț</b>.</p>
      <p>La Talantul în negoț, tinerii învață o carte din Biblie și dau la final un examen, pe grupe de vârstă.</p>
      <p>A pornit din nevoile noastre, dar e deschisă oricui: orice biserică și oricine vrea să învețe Biblia o poate folosi.</p>
      <p class="muted">Ai o întrebare, ai găsit o greșeală sau vrei să schimbi ceva în profil? Scrie-ne direct.</p>
    </>),
  },
  {
    icon: <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2zM13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5z" />,
    title: 'Cărțile',
    body: (<>
      <p>Aici sunt cărțile <b>1 Samuel</b> și <b>2 Samuel</b>, după traducerea Cornilescu. Le alegi sus, pe pagina principală.</p>
      <p><b>2 Samuel</b> este gata. Întrebările din <b>1 Samuel</b> se scriu din nou și apar în curând.</p>
      <p>Fiecare capitol se poate citi direct pe site, cu butonul <b>Citește capitolul</b>.</p>
    </>),
  },
  {
    icon: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />,
    title: 'Testele pe capitole',
    body: (<>
      <p>Fiecare capitol are un test de <b>24 de întrebări</b>: adevărat sau fals, un singur răspuns, asociere și mai multe răspunsuri.</p>
      <p>Sunt trei niveluri: <b>Ușor</b> pentru copii, <b>Mediu</b> pentru adolescenți și <b>Greu</b> pentru adulți. Poți încerca toate nivelurile.</p>
      <p>După fiecare răspuns vezi versetul, ca să înveți din greșeli.</p>
    </>),
  },
  {
    icon: <path d="M7 3h10v4a5 5 0 0 1-10 0zM5 4H3v2a3 3 0 0 0 4 3M19 4h2v2a3 3 0 0 1-4 3M12 12v4M8 21h8M9 16h6v5H9z" />,
    title: 'Examenele',
    body: (<>
      <p>Butonul <b>Examene</b>, sub capitole, deschide un <b>examen alb</b>: 24 de întrebări amestecate din toată cartea, ca la examenul final.</p>
      <p>Când au loc, examenele reale de la concurs apar tot acolo, ca să le poți reface.</p>
    </>),
  },
  {
    icon: <path d="M8 21V11M16 21V7M12 21V3M4 21h16" />,
    title: 'Clasamentul',
    body: (<>
      <p>Fiecare întrebare la care ai răspuns corect o dată îți aduce un punct în clasament, pe fiecare nivel sau pe toate.</p>
      <p>Nu vrei să apari? Comută butonul <b>Vizibil</b> de lângă clasament și rămâi ascuns, fără să pierzi nimic.</p>
    </>),
  },
  {
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
    title: 'Profilul tău',
    body: (<>
      <p>Apasă pe cercul cu inițialele tale, sus în dreapta, ca să vezi progresul pe fiecare nivel.</p>
      <p>Un părinte își adaugă copiii în profil. Fiecare copil joacă de pe telefonul părintelui, cu progresul lui.</p>
      <p>Dacă o întrebare ți se pare greșită, apasă <b>Semnalează</b> chiar la întrebare.</p>
    </>),
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
          <span class="wl-ic" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{page.icon}</svg>
          </span>
          <h2 id="wl-title">{page.title}</h2>
          <div class="wl-body">{page.body}</div>
          {i === 0 && (
            <a class="btn btn-ghost btn-block" href={contactHref}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
              Scrie-ne un email
            </a>
          )}
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
