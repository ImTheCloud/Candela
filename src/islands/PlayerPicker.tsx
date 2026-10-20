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
  if (list.length < 2) return null;
  return (
    <div class="picker">
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
