import { profile, user } from '../lib/session';

/** "Bun venit, Ana." at the top of the home page. */
export default function Welcome() {
  const u = user.value;
  if (u === undefined) return <h1 class="welcome">&nbsp;</h1>;
  const first = (profile.value?.name || u?.displayName || '').trim().split(/\s+/)[0];
  return <h1 class="welcome">{u && first ? `Bun venit, ${first}.` : 'Bun venit!'}</h1>;
}
