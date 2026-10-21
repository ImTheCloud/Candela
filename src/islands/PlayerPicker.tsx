import { choosePlayer, player, players } from '../lib/players';
import { user } from '../lib/session';

/** "Cine joacă?" for a parent and their children. */
export default function PlayerPicker() {
  const u = user.value;
  // guests: the board says why they are not on it
  if (!u) return null;
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
          </button>
        ))}
      </div>
    </div>
  );
}
