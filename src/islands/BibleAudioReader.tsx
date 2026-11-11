import { useEffect, useRef, useState } from 'preact/hooks';
import { getSavedSpeakingSpeed, isSpeechSupported, pauseSpeaking, preloadText, resumeSpeaking, savesData, setMediaSession, setSpeakingSpeed, speakText, stopSpeaking } from '../lib/speech';
import FloatingAudioButton from './FloatingAudioButton';

interface Props {
  bookSlug: string;
  bookName?: string;
  ch: number;
  totalChapters?: number;
  title?: string;
  verses: string[];
}

export default function BibleAudioReader({ bookName = '', ch, title = '', verses }: Props) {
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

  // Verse 1 is ready before the first tap; the rest of the chapter is buffered one verse after another
  // only once the reading has started (opening a chapter never downloads all of it)
  useEffect(() => {
    if (savesData()) return;
    if (verses[0]) preloadText(verses[0]);
  }, [ch, verses]);

  useEffect(() => {
    if (!isPlaying || savesData()) return;
    let cancelled = false;
    let k = 1;
    const preloadNext = () => {
      if (cancelled) return;
      if (k >= verses.length) {
        return;
      }
      preloadText(verses[k++]).finally(preloadNext);
    };
    preloadNext();
    return () => { cancelled = true; };
  }, [isPlaying, ch, verses]);

  // Handle autoplay when auto-advancing from the previous chapter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const isAutoplayParam = params.get('autoplay') === '1';
    let isAutoplayStorage = false;
    try {
      if (sessionStorage.getItem('candela_auto_chapter') === String(ch)) {
        isAutoplayStorage = true;
        sessionStorage.removeItem('candela_auto_chapter');
      }
    } catch {}

    if (isAutoplayParam || isAutoplayStorage) {
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch {}

      window.scrollTo({ top: 0, behavior: 'instant' });

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
        onError: (err) => {
          console.warn('Audio autoplay failed on chapter announcement:', err);
          setIsPlaying(false);
          setIsPaused(true);
          isPlayingRef.current = false;
          isPausedRef.current = true;
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
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
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
      onError: (err) => {
        console.warn('Audio playback error on verse', idx, err);
        // Do NOT skip verses on error! Cleanly pause at this verse.
        setIsPlaying(false);
        setIsPaused(true);
        isPlayingRef.current = false;
        isPausedRef.current = true;
      },
    });
  };

  const handleChapterFinished = () => {
    clearHighlight();
    if (isPlayingRef.current && verses.length > 0) {
      playVerse(0);
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
    setMediaSession(null);
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

  // Lock screen, car and headphones: title of the verse being read, play/pause, next and previous verse.
  // The handlers go through a ref so they always act on the latest state.
  const media = useRef({ toggle: toggleAudio, pause, start, stop });
  media.current = { toggle: toggleAudio, pause, start, stop };
  useEffect(() => {
    if (!isPlaying) return;
    setMediaSession({
      title: `${bookName} ${ch}:${verseIdx + 1}`.trim(),
      album: title,
      onPlay: () => media.current.toggle(),
      onPause: () => media.current.pause(),
      onNext: () => media.current.start(verseIdxRef.current + 1),
      onPrevious: () => media.current.start(Math.max(0, verseIdxRef.current - 1)),
      onStop: () => media.current.stop(),
    });
  }, [isPlaying, verseIdx]);

  // Clean up on unmount or page exit
  useEffect(() => {
    return () => {
      setMediaSession(null);
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
