import { useEffect, useRef, useState } from 'preact/hooks';
import { isSpeechSupported, pauseSpeaking, preloadText, resumeSpeaking, setSpeakingSpeed, speakText, stopSpeaking } from '../lib/speech';
import AudioPlayerBar, { DEFAULT_SPEEDS } from './AudioPlayerBar';

interface Props {
  bookSlug: string;
  bookName: string;
  ch: number;
  totalChapters?: number;
  title?: string;
  verses: string[];
}

export default function BibleAudioReader({ bookSlug, bookName, ch, totalChapters = 24, verses }: Props) {
  const [supported] = useState(() => isSpeechSupported());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [verseIdx, setVerseIdx] = useState(0);
  const [speed, setSpeed] = useState(0.75); // default 0.75x as requested

  const isPlayingRef = useRef(false);
  const verseIdxRef = useRef(0);
  const speedRef = useRef(0.75);

  isPlayingRef.current = isPlaying;
  verseIdxRef.current = verseIdx;
  speedRef.current = speed;

  // Pre-buffer first 2 verses immediately upon opening chapter for 0ms initial latency
  useEffect(() => {
    if (verses[0]) preloadText(verses[0]);
    if (verses[1]) preloadText(verses[1]);
  }, [ch, verses]);

  // Handle autoplay when auto-advancing from the previous chapter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoplay') === '1') {
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch {}

      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsPaused(false);
      setVerseIdx(0);
      verseIdxRef.current = 0;

      // Announce the chapter number out loud so the listener knows it changed chapters
      speakText(`Capitolul ${ch}.`, {
        rate: speedRef.current,
        onEnd: () => {
          if (!isPlayingRef.current) return;
          playVerse(0);
        },
        onError: () => {
          if (!isPlayingRef.current) return;
          playVerse(0);
        },
      });
    }
  }, [ch]);

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
      handleChapterFinished();
      return;
    }

    setVerseIdx(idx);
    verseIdxRef.current = idx;
    setIsPaused(false);
    highlightVerse(idx);

    // Preload next verse in background for gapless playback
    if (idx + 1 < verses.length) {
      preloadText(verses[idx + 1]);
    }

    // Do NOT say "Versetul X." out loud: read only the pure text of the verse
    const verseText = verses[idx];

    speakText(verseText, {
      rate: speedRef.current,
      onEnd: () => {
        if (!isPlayingRef.current) return;
        const next = verseIdxRef.current + 1;
        if (next < verses.length) {
          playVerse(next);
        } else {
          handleChapterFinished();
        }
      },
      onError: () => {
        if (!isPlayingRef.current) return;
        const next = verseIdxRef.current + 1;
        if (next < verses.length) {
          playVerse(next);
        } else {
          handleChapterFinished();
        }
      },
    });
  };

  const handleChapterFinished = () => {
    clearHighlight();
    if (ch < totalChapters) {
      // Auto-advance to the next chapter with ?autoplay=1
      const nextCh = ch + 1;
      window.location.assign(`/${bookSlug}/citire/${nextCh}?autoplay=1`);
    } else {
      stop();
    }
  };

  const start = (fromIdx = verseIdx) => {
    if (isPlaying && isPaused) {
      resume();
      return;
    }
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
    } else {
      handleChapterFinished();
    }
  };

  const prevVerse = () => {
    if (verseIdx > 0) {
      playVerse(verseIdx - 1);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    setSpeakingSpeed(newSpeed);
  };

  // Clean up on unmount or page exit
  useEffect(() => {
    return () => {
      stopSpeaking();
      clearHighlight();
    };
  }, []);

  // Allow clicking on any verse in the text to start listening directly from that verse
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

  const statusLabel = isPlaying
    ? isPaused
      ? `Pauză: Versetul ${verseIdx + 1} din ${verses.length}`
      : `Versetul ${verseIdx + 1} din ${verses.length}`
    : `Capitolul ${ch} (${verses.length} versete)`;

  return (
    <div class="bible-bottom-dock" role="region" aria-label="Player audio biblic permanent">
      <AudioPlayerBar
        isPlaying={isPlaying}
        isPaused={isPaused}
        speed={speed}
        speeds={DEFAULT_SPEEDS}
        onStart={() => start(verseIdx)}
        onPause={pause}
        onStop={stop}
        onSpeedChange={handleSpeedChange}
        statusLabel={statusLabel}
        onPrev={prevVerse}
        onNext={nextVerse}
        hasPrev={verseIdx > 0}
        hasNext={verseIdx < verses.length - 1 || ch < totalChapters}
      />
    </div>
  );
}
