import type { ComponentChildren } from 'preact';
import { rememberedAccount, user } from '../lib/session';
import Loader from './Loader';

/** Where to come back after signing in: `?next=` when it is a page of this site, else `fallback`. */
export function nextPage(fallback: string): string {
  const next = new URLSearchParams(location.search).get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

/** Tests and exams are played from an account: signed out, the page asks to sign in or create one, then comes back here. */
export default function AccountGate({ children }: { children: ComponentChildren }) {
  const u = user.value;
  if (u === undefined && !rememberedAccount) return <Loader />;
  if (u === null) return <NeedAccount />;
  return <>{children}</>;
}

function NeedAccount() {
  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <div class="card auth-card stack">
      <div class="auth-brand">
        <span class="auth-brand-badge">Concursul „Talantul în Negoț”</span>
        <h1 class="auth-brand-title">Candela lui Dumnezeu</h1>
        <p class="auth-brand-verse">„...și candela lui Dumnezeu nu se stinsese încă...”</p>
        <span class="auth-brand-ref">1 Samuel 3:3</span>
      </div>
      <h2>Intră în cont ca să joci</h2>
      <p>Întrebările se joacă din cont, ca să-ți păstrăm progresul pe orice telefon și să apari în clasament. Copiii joacă din contul unui părinte.</p>
      <p class="small muted">Ai avut cont pe versiunea veche a site-ului? Intră cu același email și aceeași parolă.</p>
      <a class="btn btn-primary btn-block" href={`/cont?next=${next}`}>Intră în cont</a>
      <a class="btn btn-ghost btn-block" href={`/cont/inregistrare?next=${next}`}>Creează un cont</a>
      <p class="small auth-links"><a class="link" href="/cont/parola">Ai uitat parola?</a></p>
    </div>
  );
}
