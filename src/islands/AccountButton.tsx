import { useEffect } from 'preact/hooks';
import { notifications } from '../lib/notifications';
import { player } from '../lib/players';
import { formatFirstLast } from '../lib/players';
import { user } from '../lib/session';
import { localGet, localSet } from '../lib/store';

export default function AccountButton() {
  const u = user.value;
  const initialsNow = u ? initials(player.value.name || u.email || '?') : u === null ? '' : null;
  // remembered for the next visit, so the button is there from the first paint (see the script in Base)
  useEffect(() => { if (initialsNow !== null) localSet('acct', initialsNow); }, [initialsNow]);

  const n = notifications.value;
  const total = n.uid === u?.uid ? n.reports + n.messages + n.replies : 0;
  const count = u === undefined ? localGet<number>('acctN', 0) : u ? total : 0;

  // while Firebase restores the session, show what the last visit left
  const shown = initialsNow ?? localGet<string | null>('acct', null);
  if (shown === null || (shown === '' && location.pathname.startsWith('/cont'))) return <span class="account-placeholder" />;
  if (!shown) return <a class="btn btn-primary btn-sm" href="/cont" aria-label="Intră în cont">Intră</a>;

  return (
    <a class="avatar" href="/cont"
      aria-label={count ? (count === 1 ? 'O notificare nouă' : `${count} notificări noi`) : u ? `Contul meu (joacă ${player.value.name})` : 'Contul meu'}>
      {shown}
      {count > 0 && <span class="badge-n">{count > 9 ? '9+' : count}</span>}
    </a>
  );
}

function initials(name: string): string {
  const formatted = formatFirstLast(name);
  const parts = formatted.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
