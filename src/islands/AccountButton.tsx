import { useEffect } from 'preact/hooks';
import { player } from '../lib/players';
import { user } from '../lib/session';
import { localGet, localSet } from '../lib/store';

export default function AccountButton() {
  const u = user.value;
  const initialsNow = u ? initials(player.value.name || u.email || '?') : u === null ? '' : null;
  // remembered for the next visit, so the button is there from the first paint (see the script in Base)
  useEffect(() => { if (initialsNow !== null) localSet('acct', initialsNow); }, [initialsNow]);

  // while Firebase restores the session, show what the last visit left
  const shown = initialsNow ?? localGet<string | null>('acct', null);
  if (shown === null || (shown === '' && location.pathname.startsWith('/cont'))) return <span class="account-placeholder" />;
  if (!shown) return <a class="btn btn-ghost btn-sm" href="/cont" aria-label="Intră în cont">Intră</a>;
  return (
    <a class="avatar" href="/cont" aria-label={u ? `Contul meu (joacă ${player.value.name})` : 'Contul meu'}>
      {shown}
    </a>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
