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

export const SPEED_OPTIONS = [0.75, 1, 1.25];

// Coordinates (x, y in pixels) along a tight, elegant satellite arc around the top-left of the FAB
// Sits at an equidistant ~11px margin from the main button with clean 7-9px gaps between pills
const ARC_COORDINATES = [
  { x: -55, y: 0 },    // 0.75x (mid-left of button)
  { x: -36, y: -41 },  // 1x    (upper-left diagonal)
  { x: 5,   y: -54 },  // 1.25x (top, above button)
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
  // Speed buttons only show while actively playing; when paused or idle, they close into the FAB
  const showSpeeds = activePlaying;

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
      {/* Radial arc of 3 speed pills around the FAB */}
      <div
        class={`fab-arc-speeds${showSpeeds ? ' is-visible' : ''}`}
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
                '--delay': `${idx * 30}ms`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSpeedChange(s);
              }}
              aria-pressed={s === speed}
              title={`Viteza ${s}x`}
              tabIndex={showSpeeds ? 0 : -1}
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
