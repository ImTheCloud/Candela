import { useEffect, useState } from 'preact/hooks';
import { watchOpenMessagesCount } from '../lib/messages';
import { player } from '../lib/players';
import { formatFirstLast } from '../lib/players';
import { watchOpenCount } from '../lib/reports';
import { profile, user } from '../lib/session';
import { localGet, localSet } from '../lib/store';

export default function AccountButton() {
  const u = user.value;
  const admin = !!u && profile.value?.admin === true;
  const initialsNow = u ? initials(player.value.name || u.email || '?') : u === null ? '' : null;
  // remembered for the next visit, so the button is there from the first paint (see the script in Base)
  useEffect(() => { if (initialsNow !== null) localSet('acct', initialsNow); }, [initialsNow]);

  // for an admin: how many flagged questions and messages wait, shown on the avatar
  const [repCount, setRepCount] = useState(() => localGet<number>('acctRep', 0));
  const [msgCount, setMsgCount] = useState(() => localGet<number>('acctMsg', 0));

  useEffect(() => {
    if (!admin) {
      if (u !== undefined) {
        localSet('acctN', 0);
        localSet('acctRep', 0);
        localSet('acctMsg', 0);
      }
      return;
    }
    const unsubRep = watchOpenCount((n) => {
      setRepCount(n);
      localSet('acctRep', n);
    });
    const unsubMsg = watchOpenMessagesCount((n) => {
      setMsgCount(n);
      localSet('acctMsg', n);
    });
    return () => {
      unsubRep?.();
      unsubMsg?.();
    };
  }, [admin, u === undefined]);

  const total = repCount + msgCount;
  useEffect(() => {
    if (admin) localSet('acctN', total);
  }, [admin, total]);

  const count = admin || u === undefined ? (admin ? total : localGet<number>('acctN', 0)) : 0;

  // while Firebase restores the session, show what the last visit left
  const shown = initialsNow ?? localGet<string | null>('acct', null);
  if (shown === null || (shown === '' && location.pathname.startsWith('/cont'))) return <span class="account-placeholder" />;
  if (!shown) return <a class="btn btn-primary btn-sm" href="/cont" aria-label="Intră în cont">Intră</a>;

  const targetHref = admin && count > 0 ? (repCount > 0 ? '/semnalari' : '/mesaje') : '/cont';

  return (
    <a class="avatar" href={targetHref}
      aria-label={admin && count ? `${count} notificări de verificat` : u ? `Contul meu (joacă ${player.value.name})` : 'Contul meu'}>
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
