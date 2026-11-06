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

export const SPEED_OPTIONS = [0.65, 0.75, 1, 1.25];

// Four 32px speed buttons spaced along a quarter circle around the FAB.
const ARC_COORDINATES = [
  { x: -70, y: 0 },
  { x: -61, y: -35 },
  { x: -35, y: -61 },
  { x: 0, y: -70 },
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
      {/* Radial arc of speed pills around the FAB */}
      <div
        class={`fab-arc-speeds${showSpeeds ? ' is-visible' : ''}`}
        role="group"
        aria-label="Viteză audio"
        aria-hidden={!showSpeeds}
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
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSpeedChange(s);
              }}
              aria-pressed={s === speed}
              aria-label={`Viteza ${s}x`}
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
        ) : (
          /* Base natural speaker icon for both idle and paused states */
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
