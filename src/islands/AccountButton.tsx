import { useEffect, useState } from 'preact/hooks';
import { player } from '../lib/players';
import { watchOpenCount } from '../lib/reports';
import { profile, user } from '../lib/session';
import { localGet, localSet } from '../lib/store';

export default function AccountButton() {
  const u = user.value;
  const admin = !!u && profile.value?.admin === true;
  const initialsNow = u ? initials(player.value.name || u.email || '?') : u === null ? '' : null;
  // remembered for the next visit, so the button is there from the first paint (see the script in Base)
  useEffect(() => { if (initialsNow !== null) localSet('acct', initialsNow); }, [initialsNow]);

  // for an admin: how many flagged questions wait, shown on the avatar
  const [open, setOpen] = useState(() => localGet<number>('acctN', 0));
  useEffect(() => {
    if (!admin) { if (u !== undefined) localSet('acctN', 0); return; }
    return watchOpenCount((n) => { setOpen(n); localSet('acctN', n); });
  }, [admin, u === undefined]);
  const count = admin || u === undefined ? open : 0;

  // while Firebase restores the session, show what the last visit left
  const shown = initialsNow ?? localGet<string | null>('acct', null);
  if (shown === null || (shown === '' && location.pathname.startsWith('/cont'))) return <span class="account-placeholder" />;
  if (!shown) return <a class="btn btn-primary btn-sm" href="/cont" aria-label="Intră în cont">Intră</a>;
  return (
    <a class="avatar" href={admin && count ? '/semnalari' : '/cont'}
      aria-label={admin && count ? `${count} semnalări de verificat` : u ? `Contul meu (joacă ${player.value.name})` : 'Contul meu'}>
      {shown}
      {count > 0 && <span class="badge-n">{count > 9 ? '9+' : count}</span>}
    </a>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
