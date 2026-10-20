import { ageGroup, ageLabel } from '../lib/age';
import { choosePlayer, player, players } from '../lib/players';
import { user } from '../lib/session';

/** "Cine joacă?" for a parent and their children; a short note for guests. */
export default function PlayerPicker() {
  const u = user.value;
  if (u === undefined) return <div class="picker-space" />;
  if (!u) {
    return (
      <div class="card picker guest">
        <p class="small">Joci fără cont: progresul rămâne doar pe acest telefon.</p>
        <a class="btn btn-ghost btn-sm" href="/cont">Intră în cont</a>
      </div>
    );
  }
  const list = players.value;
  const current = player.value;
  // accounts brought over from v1 have no birth year yet: questions depend on it
  const missing = list.filter((p) => !p.birthYear).map((p) => p.name.split(' ')[0]);
  const notice = missing.length > 0 && (
    <a class="card picker guest" href="/cont">
      <span class="small">Lipsește anul nașterii pentru {missing.join(', ')}. Îl folosim ca să alegem întrebările potrivite.</span>
      <span class="btn btn-ghost btn-sm">Completează</span>
    </a>
  );
  if (list.length < 2) return notice || null;
  return (
    <div class="picker">
      {notice}
      <p class="small muted">Cine joacă?</p>
      <div class="chips" role="radiogroup" aria-label="Cine joacă">
        {list.map((p) => (
          <button type="button" role="radio" aria-checked={p.key === current.key} class="chip" onClick={() => choosePlayer(p.key)}>
            <span class="chip-name">{p.name.split(' ')[0]}</span>
            {p.birthYear && <span class="chip-age">{ageLabel(ageGroup(p.birthYear))}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
