export interface AudioPlayerBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  speeds?: number[];
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  statusLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  className?: string;
}

export const DEFAULT_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayerBar({
  isPlaying,
  isPaused,
  speed,
  speeds = DEFAULT_SPEEDS,
  onStart,
  onPause,
  onStop,
  onSpeedChange,
  statusLabel,
  onPrev,
  onNext,
  hasPrev = true,
  hasNext = true,
  className = '',
}: AudioPlayerBarProps) {
  const activePlaying = isPlaying && !isPaused;

  return (
    <div class={`audio-player-bar ${className}`.trim()} role="region" aria-label="Player audio voce naturală">
      <div class="apb-main">
        {/* Status indicator & wave */}
        <div class="apb-meta">
          <span class={`voice-wave${activePlaying ? ' is-active' : ''}`} aria-hidden="true">
            <span class={`vw-bar bar-1${isPaused ? ' is-paused' : ''}`} />
            <span class={`vw-bar bar-2${isPaused ? ' is-paused' : ''}`} />
            <span class={`vw-bar bar-3${isPaused ? ' is-paused' : ''}`} />
          </span>
          <span class="apb-status-text">
            {statusLabel || (activePlaying ? 'Redare în curs' : isPaused ? 'În pauză' : 'Gata de redare')}
          </span>
        </div>

        {/* Playback action buttons */}
        <div class="apb-controls">
          {onPrev && (
            <button
              type="button"
              class="apb-btn apb-nav-btn"
              disabled={!hasPrev}
              onClick={onPrev}
              title="Versetul anterior"
              aria-label="Versetul anterior"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>
          )}

          {/* Démarrer / Pornește / Continuă */}
          <button
            type="button"
            class={`apb-btn apb-btn-start${activePlaying ? ' is-current' : ''}`}
            onClick={onStart}
            title={isPaused ? 'Continuă lectura' : activePlaying ? 'Reia de la început' : 'Pornește lectura'}
            aria-label="Pornește"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            <span>{isPaused ? 'Continuă' : activePlaying ? 'Reia' : 'Pornește'}</span>
          </button>

          {/* Pause */}
          <button
            type="button"
            class={`apb-btn apb-btn-pause${isPaused ? ' is-current' : ''}`}
            disabled={!isPlaying || isPaused}
            onClick={onPause}
            title="Pauză"
            aria-label="Pauză"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            <span>Pauză</span>
          </button>

          {/* Termină / Oprește */}
          <button
            type="button"
            class="apb-btn apb-btn-stop"
            disabled={!isPlaying && !isPaused}
            onClick={onStop}
            title="Oprește lectura"
            aria-label="Termină"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
            <span>Termină</span>
          </button>

          {onNext && (
            <button
              type="button"
              class="apb-btn apb-nav-btn"
              disabled={!hasNext}
              onClick={onNext}
              title="Versetul următor"
              aria-label="Versetul următor"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Speed selector row with all 6 requested buttons */}
      <div class="apb-speeds" role="group" aria-label="Viteza vocii">
        {speeds.map((s) => (
          <button
            key={s}
            type="button"
            class={`apb-speed-pill${s === speed ? ' is-selected' : ''}`}
            onClick={() => onSpeedChange(s)}
            aria-pressed={s === speed}
            title={`Viteza ${s}x`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
