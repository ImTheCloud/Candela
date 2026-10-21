import { player } from '../lib/players';
import { user } from '../lib/session';

export default function AccountButton() {
  const u = user.value;
  if (u === undefined) return <span class="account-placeholder" />;
  if (!u) {
    // The account pages already show the sign-in form.
    if (location.pathname.startsWith('/cont')) return <span class="account-placeholder" />;
    return <a class="btn btn-ghost btn-sm" href="/cont" aria-label="Intră în cont">Intră</a>;
  }
  return (
    <a class="avatar" href="/cont" aria-label={`Contul meu (joacă ${player.value.name})`}>
      {initials(player.value.name || u.email || '?')}
    </a>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
