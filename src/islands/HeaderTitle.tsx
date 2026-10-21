import { profile, rememberedAccount, user } from '../lib/session';

/** Home page title in the header: "Bun venit, Ana" for a signed-in player, the site name otherwise. */
export default function HeaderTitle() {
  const u = user.value;
  // while Firebase restores the session, the last visit's name is shown
  const full = u ? profile.value?.name || u.displayName : u === undefined ? rememberedAccount?.name : '';
  const first = (full ?? '').trim().split(/\s+/)[0];
  return <span class="brand-text">{first ? `Bun venit, ${first}` : 'Candela'}</span>;
}
