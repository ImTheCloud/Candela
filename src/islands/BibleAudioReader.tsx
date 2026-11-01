import { useEffect, useRef, useState } from 'preact/hooks';
import { getSavedSpeakingSpeed, isSpeechSupported, pauseSpeaking, preloadText, resumeSpeaking, setSpeakingSpeed, speakText, stopSpeaking } from '../lib/speech';
import FloatingAudioButton from './FloatingAudioButton';

interface Props {
  bookSlug: string;
  bookName?: string;
  ch: number;
  totalChapters?: number;
  title?: string;
  verses: string[];
}

export default function BibleAudioReader({ bookSlug, ch, totalChapters = 24, verses }: Props) {
  const [supported] = useState(() => isSpeechSupported());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [verseIdx, setVerseIdx] = useState(0);
  const [speed, setSpeed] = useState(() => getSavedSpeakingSpeed());

  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const verseIdxRef = useRef(0);
  const speedRef = useRef(speed);

  isPlayingRef.current = isPlaying;
  isPausedRef.current = isPaused;
  verseIdxRef.current = verseIdx;
  speedRef.current = speed;

  // Sync saved audio speed from storage on mount
  useEffect(() => {
    const saved = getSavedSpeakingSpeed();
    setSpeed(saved);
    speedRef.current = saved;
  }, []);

  // Toggle .audio-active on reader element when audio is active
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isAudioActive = isPlaying || isPaused;
    const readerEl = document.querySelector('.reader');
    if (readerEl) {
      readerEl.classList.toggle('audio-active', isAudioActive);
    }
  }, [isPlaying, isPaused]);

  // Track .pager height dynamically for perfect responsive FAB placement above the bottom bar
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const pager = document.querySelector('.pager') as HTMLElement | null;
    if (!pager) return;
    const update = () => {
      document.documentElement.style.setProperty('--pager-h', `${pager.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(pager);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--pager-h');
    };
  }, []);

  // Pre-buffer entire chapter in background sequentially so any clicked verse starts in 0ms
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;

    if (verses[0]) preloadText(verses[0]);

    const isAutoplay = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autoplay') === '1';
    if (isAutoplay) {
      preloadText(`Capitolul ${ch}.`);
    }

    let nextIdxToPreload = 1;

    const preloadNext = () => {
      if (cancelled) return;
      if (nextIdxToPreload >= verses.length) return;

      const idx = nextIdxToPreload++;
      const text = verses[idx];
      if (!text) {
        preloadNext();
        return;
      }

      preloadText(text)
        .then(() => {
          if (!cancelled) {
            timeoutId = setTimeout(preloadNext, 50);
          }
        })
        .catch(() => {
          if (!cancelled) {
            timeoutId = setTimeout(preloadNext, 200);
          }
        });
    };

    timeoutId = setTimeout(preloadNext, 300);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
      highlightVerse(0);

      // Announce the chapter number out loud: "Capitolul X.", then read verse 1 directly
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

    // Preload the next 3 verses in background for gapless, zero-latency playback
    for (let k = 1; k <= 3; k++) {
      if (idx + k < verses.length) {
        preloadText(verses[idx + k]);
      }
    }

    // Pure biblical text only: never say verse numbers out loud
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
      // Auto-advance to the next chapter with ?autoplay=1 (replace history so back button still returns home)
      const nextCh = ch + 1;
      window.location.replace(`/${bookSlug}/citire/${nextCh}?autoplay=1`);
    } else {
      stop();
    }
  };

  const start = (fromIdx = verseIdxRef.current) => {
    stopSpeaking();
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
    const ok = resumeSpeaking();
    if (!ok) {
      // Audio element was lost or ended while paused: restart verse immediately
      playVerse(verseIdxRef.current);
    }
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

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    setSpeakingSpeed(newSpeed);
  };

  const toggleAudio = () => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPlaying && isPaused) {
      resume();
    } else {
      start(verseIdxRef.current);
    }
  };

  // Clean up on unmount or page exit
  useEffect(() => {
    return () => {
      stopSpeaking();
      clearHighlight();
      if (typeof document !== 'undefined') {
        const readerEl = document.querySelector('.reader');
        if (readerEl) readerEl.classList.remove('audio-active');
      }
    };
  }, []);

  // If audio playback was started, clicking on any verse jumps directly to that verse
  useEffect(() => {
    const onVerseClick = (e: MouseEvent) => {
      // Only jump to clicked verse if audio playback was already started (playing or paused)
      if (!isPlayingRef.current && !isPausedRef.current) return;

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
    <FloatingAudioButton
      isPlaying={isPlaying}
      isPaused={isPaused}
      speed={speed}
      onToggle={toggleAudio}
      onSpeedChange={handleSpeedChange}
      bottomOffset="calc(var(--pager-h, 65px) + 14px)"
    />
  );
}
