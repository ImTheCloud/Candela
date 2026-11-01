import { useEffect, useRef, useState } from 'preact/hooks';
import { getBestRomanianVoice, isSpeechSupported, speakText, stopSpeaking } from '../lib/speech';

interface Props {
  bookSlug: string;
  bookName: string;
  ch: number;
  title?: string;
  verses: string[];
}

const SPEEDS = [
  { label: '0.9x', val: 0.88 },
  { label: '1x', val: 0.95 },
  { label: '1.2x', val: 1.12 },
];

export default function BibleAudioReader({ bookName, ch, verses }: Props) {
  const [supported] = useState(() => isSpeechSupported());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [verseIdx, setVerseIdx] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x (0.95)

  const isPlayingRef = useRef(false);
  const verseIdxRef = useRef(0);
  const speedRef = useRef(SPEEDS[1].val);

  isPlayingRef.current = isPlaying;
  verseIdxRef.current = verseIdx;
  speedRef.current = SPEEDS[speedIdx].val;

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
    highlightVerse(idx);

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
    stopSpeaking();
  };

  const resume = () => {
    setIsPaused(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    playVerse(verseIdxRef.current);
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

  const cycleSpeed = () => {
    const nextSpeed = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(nextSpeed);
    speedRef.current = SPEEDS[nextSpeed].val;
    if (isPlaying && !isPaused) {
      playVerse(verseIdxRef.current);
    }
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
    <div class={`bible-audio-bar${isPlaying ? ' is-active' : ''}`}>
      {!isPlaying ? (
        <div class="bar-idle">
          <button type="button" class="btn btn-audio-play" onClick={() => start(0)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span>Ascultă capitolul</span>
          </button>
          <button type="button" class="btn-speed" onClick={cycleSpeed} title="Schimbă viteza de citire">
            {SPEEDS[speedIdx].label}
          </button>
        </div>
      ) : (
        <div class="bar-playing">
          <div class="audio-info">
            <span class="voice-wave" aria-hidden="true">
              <span class={`vw-bar bar-1${isPaused ? ' is-paused' : ''}`} />
              <span class={`vw-bar bar-2${isPaused ? ' is-paused' : ''}`} />
              <span class={`vw-bar bar-3${isPaused ? ' is-paused' : ''}`} />
            </span>
            <span class="audio-verse-num">
              Versetul {verseIdx + 1} <span class="muted">/ {verses.length}</span>
            </span>
          </div>

          <div class="audio-controls">
            <button
              type="button"
              class="audio-ctrl-btn"
              disabled={verseIdx <= 0}
              onClick={prevVerse}
              title="Versetul anterior"
              aria-label="Versetul anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>

            {isPaused ? (
              <button
                type="button"
                class="audio-ctrl-btn is-main"
                onClick={resume}
                title="Continuă ascultarea"
                aria-label="Continuă"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                class="audio-ctrl-btn is-main"
                onClick={pause}
                title="Pauză"
                aria-label="Pauză"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            )}

            <button
              type="button"
              class="audio-ctrl-btn"
              disabled={verseIdx >= verses.length - 1}
              onClick={nextVerse}
              title="Versetul următor"
              aria-label="Versetul următor"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>

            <button
              type="button"
              class="audio-ctrl-btn is-stop"
              onClick={stop}
              title="Oprește ascultarea"
              aria-label="Oprește"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>

            <button type="button" class="btn-speed is-mini" onClick={cycleSpeed} title="Viteză">
              {SPEEDS[speedIdx].label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
