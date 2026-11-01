import { useEffect, useRef, useState } from 'preact/hooks';
import { isSpeechSupported, pauseSpeaking, preloadText, resumeSpeaking, setSpeakingSpeed, speakText, stopSpeaking } from '../lib/speech';

interface Props {
  bookSlug: string;
  bookName: string;
  ch: number;
  title?: string;
  verses: string[];
}

const SPEEDS = [
  { label: '0.75x', val: 0.75 },
  { label: '1x', val: 1.0 },
  { label: '1.25x', val: 1.25 },
];

export default function BibleAudioReader({ bookName, ch, verses }: Props) {
  const [supported] = useState(() => isSpeechSupported());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [verseIdx, setVerseIdx] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0); // default 0.75x

  const isPlayingRef = useRef(false);
  const verseIdxRef = useRef(0);
  const speedRef = useRef(SPEEDS[0].val);

  isPlayingRef.current = isPlaying;
  verseIdxRef.current = verseIdx;
  speedRef.current = SPEEDS[speedIdx].val;

  // Pre-buffer first 2 verses immediately upon opening chapter for 0ms initial latency
  useEffect(() => {
    if (verses[0]) preloadText(`Versetul 1. ${verses[0]}`);
    if (verses[1]) preloadText(`Versetul 2. ${verses[1]}`);
  }, [ch]);

  // Manage class on body to expand page bottom padding when bottom dock player is active
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isPlaying) {
      document.body.classList.add('bible-audio-active');
    } else {
      document.body.classList.remove('bible-audio-active');
    }
    return () => {
      document.body.classList.remove('bible-audio-active');
    };
  }, [isPlaying]);

  // Highlight verse in DOM and smooth scroll into view
  const highlightVerse = (idx: number) => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.verse.is-reading').forEach((el) => {
      el.classList.remove('is-reading');
    });

    const el = document.getElementById(`v${idx + 1}`);
    if (el) {
      el.classList.add('is-reading');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const clearHighlight = () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.verse.is-reading').forEach((el) => {
      el.classList.remove('is-reading');
    });
  };

  const playVerse = (idx: number) => {
    if (idx < 0 || idx >= verses.length) {
      stop();
      return;
    }

    setVerseIdx(idx);
    verseIdxRef.current = idx;
    setIsPaused(false);
    highlightVerse(idx);

    // Preload next verse in background for gapless playback
    if (idx + 1 < verses.length) {
      preloadText(`Versetul ${idx + 2}. ${verses[idx + 1]}`);
    }

    const verseText = verses[idx];
    const textToSpeak = `Versetul ${idx + 1}. ${verseText}`;

    speakText(textToSpeak, {
      rate: speedRef.current,
      onEnd: () => {
        if (!isPlayingRef.current) return;
        const next = verseIdxRef.current + 1;
        if (next < verses.length) {
          playVerse(next);
        } else {
          stop();
        }
      },
      onError: () => {
        if (!isPlayingRef.current) return;
        const next = verseIdxRef.current + 1;
        if (next < verses.length) {
          playVerse(next);
        } else {
          stop();
        }
      },
    });
  };

  const start = (fromIdx = 0) => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    setIsPaused(false);
    playVerse(fromIdx);
  };

  const pause = () => {
    setIsPaused(true);
    pauseSpeaking();
  };

  const resume = () => {
    setIsPaused(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    resumeSpeaking();
  };

  const stop = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsPaused(false);
    setVerseIdx(0);
    verseIdxRef.current = 0;
    stopSpeaking();
    clearHighlight();
  };

  const nextVerse = () => {
    if (verseIdx < verses.length - 1) {
      playVerse(verseIdx + 1);
    }
  };

  const prevVerse = () => {
    if (verseIdx > 0) {
      playVerse(verseIdx - 1);
    }
  };

  const cycleSpeed = (e?: MouseEvent) => {
    e?.stopPropagation();
    const nextSpeed = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(nextSpeed);
    speedRef.current = SPEEDS[nextSpeed].val;
    setSpeakingSpeed(SPEEDS[nextSpeed].val);
  };

  // Clean up on unmount or page exit
  useEffect(() => {
    return () => {
      stopSpeaking();
      clearHighlight();
    };
  }, []);

  // Allow clicking on any verse in the text to start listening from that verse
  useEffect(() => {
    const onVerseClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.verse');
      if (!target || !target.id || !target.id.startsWith('v')) return;
      const num = parseInt(target.id.slice(1), 10);
      if (!isNaN(num) && num >= 1 && num <= verses.length) {
        start(num - 1);
      }
    };

    const container = document.querySelector('.reader .text');
    if (container) {
      container.addEventListener('click', onVerseClick as any);
      return () => container.removeEventListener('click', onVerseClick as any);
    }
  }, [verses]);

  if (!supported) return null;

  return (
    <>
      {/* Trigger button above text when idle */}
      {!isPlaying && (
        <div class="bible-audio-trigger-bar">
          <button type="button" class="btn btn-audio-start" onClick={() => start(0)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span>Ascultă capitolul</span>
          </button>
          <button type="button" class="btn-audio-speed-pill" onClick={cycleSpeed} title="Schimbă viteza vocii (0.75x, 1x, 1.25x)">
            {SPEEDS[speedIdx].label}
          </button>
        </div>
      )}

      {/* Persistent floating player dock docked at the bottom of the screen */}
      {isPlaying && (
        <div class="bible-audio-dock" role="region" aria-label="Player audio biblic">
          <div class="bible-audio-dock-inner">
            <div class="dock-meta">
              <span class="voice-wave" aria-hidden="true">
                <span class={`vw-bar bar-1${isPaused ? ' is-paused' : ''}`} />
                <span class={`vw-bar bar-2${isPaused ? ' is-paused' : ''}`} />
                <span class={`vw-bar bar-3${isPaused ? ' is-paused' : ''}`} />
              </span>
              <span class="dock-verse-title">
                Versetul <b>{verseIdx + 1}</b> <span class="muted">/ {verses.length}</span>
              </span>
            </div>

            <div class="dock-controls">
              <button
                type="button"
                class="dock-btn"
                disabled={verseIdx <= 0}
                onClick={prevVerse}
                title="Versetul anterior"
                aria-label="Versetul anterior"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="19 20 9 12 19 4 19 20" />
                  <line x1="5" y1="19" x2="5" y2="5" />
                </svg>
              </button>

              {isPaused ? (
                <button
                  type="button"
                  class="dock-btn is-play-pause"
                  onClick={resume}
                  title="Continuă ascultarea"
                  aria-label="Continuă"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  class="dock-btn is-play-pause"
                  onClick={pause}
                  title="Pauză"
                  aria-label="Pauză"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1.5" />
                    <rect x="14" y="4" width="4" height="16" rx="1.5" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                class="dock-btn"
                disabled={verseIdx >= verses.length - 1}
                onClick={nextVerse}
                title="Versetul următor"
                aria-label="Versetul următor"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>

              <button
                type="button"
                class="dock-btn is-stop"
                onClick={stop}
                title="Oprește ascultarea"
                aria-label="Oprește"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              </button>

              <button
                type="button"
                class="dock-speed-pill"
                onClick={cycleSpeed}
                title="Schimbă viteza vocii"
              >
                {SPEEDS[speedIdx].label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
