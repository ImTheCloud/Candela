export interface FloatingAudioButtonProps {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  speeds?: number[];
  onToggle: () => void;
  onSpeedChange: (speed: number) => void;
  bottomOffset?: string;
  className?: string;
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

// Coordinates (x, y in pixels) along an airy, spacious radial arc around the top-left of the FAB
// Centers are ~44px apart, ensuring a clean 8-10px visual gap between 36px bubbles with zero overlap
// Placed on the left and above the button to stay completely on-screen across all mobile screens
const ARC_COORDINATES = [
  { x: -78, y: 8 },    // 0.5x  (lower-left of button)
  { x: -82, y: -36 },  // 0.75x (mid-left of button)
  { x: -62, y: -74 },  // 1.0x  (upper-left diagonal)
  { x: -22, y: -94 },  // 1.25x (top, slightly left)
  { x: 16,  y: -74 },  // 1.5x  (top, slightly right)
];

export default function FloatingAudioButton({
  isPlaying,
  isPaused,
  speed,
  speeds = SPEED_OPTIONS,
  onToggle,
  onSpeedChange,
  bottomOffset = 'calc(var(--bar-h, 72px) + 14px)',
  className = '',
}: FloatingAudioButtonProps) {
  const activePlaying = isPlaying && !isPaused;
  const isAudioActive = isPlaying || isPaused;

  const handleMainClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div
      class={`fab-audio-container ${className}`.trim()}
      style={{ bottom: bottomOffset }}
      role="region"
      aria-label="Comenzi audio"
    >
      {/* Semi-circle radial arc of 5 speed pills (from left of button up to top) */}
      <div
        class={`fab-arc-speeds${isAudioActive ? ' is-visible' : ''}`}
        role="group"
        aria-label="Viteză audio"
      >
        {speeds.map((s, idx) => {
          const coord = ARC_COORDINATES[idx] || { x: -45 * (idx + 1), y: 0 };
          return (
            <button
              key={s}
              type="button"
              class={`fab-arc-pill${s === speed ? ' is-selected' : ''}`}
              style={{
                '--dx': `${coord.x}px`,
                '--dy': `${coord.y}px`,
                '--delay': `${idx * 25}ms`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSpeedChange(s);
              }}
              aria-pressed={s === speed}
              title={`Viteza ${s}x`}
              tabIndex={isAudioActive ? 0 : -1}
            >
              {s}x
            </button>
          );
        })}
      </div>

      {/* Main Floating Action Button (FAB) */}
      <button
        type="button"
        class={`fab-main-btn${activePlaying ? ' is-playing' : ''}${isPaused ? ' is-paused' : ''}`}
        onClick={handleMainClick}
        title={
          activePlaying
            ? 'Pune pauză'
            : isPaused
            ? 'Continuă lectura'
            : 'Ascultă cu voce naturală'
        }
        aria-label={
          activePlaying
            ? 'Pauză audio'
            : isPaused
            ? 'Continuă audio'
            : 'Pornește lectura audio'
        }
      >
        {activePlaying ? (
          /* Animated dancing soundwave when audio is actively speaking */
          <span class="fab-wave" aria-hidden="true">
            <span class="fab-wbar bar-1" />
            <span class="fab-wbar bar-2" />
            <span class="fab-wbar bar-3" />
            <span class="fab-wbar bar-4" />
          </span>
        ) : isPaused ? (
          /* Play icon to resume when paused - stays base brown color (#4a3426) */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="7 4 20 12 7 20 7 4" />
          </svg>
        ) : (
          /* Natural speaker volume icon in idle state */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.25" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </div>
  );
}
