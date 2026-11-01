import { player } from '../lib/players';
import { profile, rememberedAccount, user } from '../lib/session';

/** Header title: "Bun venit, Ana" for a signed-in player, the site name otherwise. */
export default function HeaderTitle() {
  const u = user.value;
  // while Firebase restores the session, the last visit's name is shown
  const current = player.value?.name;
  const full = u
    ? (current && current !== 'Eu' && current !== 'Invitat' ? current : profile.value?.name || u.displayName)
    : u === undefined
      ? rememberedAccount?.name
      : '';
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  const first = parts.length > 1 ? parts.slice(1).join(' ') : (parts[0] ?? '');
  return <span class="brand-text">{first ? `Bun venit, ${first}` : 'Candela'}</span>;
}

