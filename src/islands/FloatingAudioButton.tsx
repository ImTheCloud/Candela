import { useState } from 'preact/hooks';

export interface FloatingAudioButtonProps {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  speeds?: number[];
  onToggle: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  bottomOffset?: string;
  className?: string;
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

export default function FloatingAudioButton({
  isPlaying,
  isPaused,
  speed,
  speeds = SPEED_OPTIONS,
  onToggle,
  onStop,
  onSpeedChange,
  bottomOffset = 'calc(var(--bar-h, 72px) + 12px)',
  className = '',
}: FloatingAudioButtonProps) {
  const [showSpeeds, setShowSpeeds] = useState(false);
  const activePlaying = isPlaying && !isPaused;
  const isAudioActive = isPlaying || isPaused;

  // Speeds dial is visible whenever audio is running (playing or paused), or can be toggled
  const speedsVisible = isAudioActive || showSpeeds;

  const handleMainClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const handleStopClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowSpeeds(false);
    onStop();
  };

  return (
    <div
      class={`fab-audio-wrap ${className}`.trim()}
      style={{ bottom: bottomOffset }}
      role="region"
      aria-label="Comenzi audio"
    >
      {/* Floating Speed Dial & Stop Button - Appears above the FAB when audio starts */}
      {speedsVisible && (
        <div class="fab-speeds-dial" role="toolbar" aria-label="Opțiuni viteză audio">
          <div class="fab-speeds-list">
            {speeds.map((s) => (
              <button
                key={s}
                type="button"
                class={`fab-speed-btn${s === speed ? ' is-selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeedChange(s);
                }}
                aria-pressed={s === speed}
                title={`Viteza ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            class="fab-speed-stop"
            onClick={handleStopClick}
            title="Oprește lectura"
            aria-label="Oprește lectura"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Floating Action Button (FAB) */}
      <button
        type="button"
        class={`fab-audio-btn${activePlaying ? ' is-playing' : ''}${isPaused ? ' is-paused' : ''}`}
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
          /* Play icon to resume when paused */
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
