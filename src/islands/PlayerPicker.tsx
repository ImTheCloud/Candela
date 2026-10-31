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

  const count = list.length;
  const gridClass =
    count === 2
      ? 'pk-cols-2'
      : count === 3
        ? 'pk-cols-3'
        : count === 4
          ? 'pk-cols-2'
          : 'pk-cols-many';

  const currentFirst = current.name.trim().split(/\s+/)[0];

  return (
    <div class="picker">
      <div class="pk-head">
        <span class="pk-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Cine joacă?
        </span>
        <span class="pk-badge">
          <span class="pk-dot" aria-hidden="true" />
          <span>acum: <strong>{currentFirst}</strong></span>
        </span>
      </div>
      <div class={`pk-grid ${gridClass}`} role="radiogroup" aria-label="Cine joacă">
        {list.map((p) => {
          const isSelected = p.key === current.key;
          const firstName = p.name.trim().split(/\s+/)[0];
          const initial = (firstName[0] ?? '?').toUpperCase();
          const isSelf = !p.child;

          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              class={`pk-btn${isSelected ? ' is-selected' : ''}`}
              onClick={() => choosePlayer(p.key)}
            >
              <span class="pk-av" aria-hidden="true">{initial}</span>
              <span class="pk-name">
                {firstName}
                {isSelf && <small class="pk-sub"> (tu)</small>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
