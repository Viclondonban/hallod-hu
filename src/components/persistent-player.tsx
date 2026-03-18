'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { usePlayer } from '@/context/player-context';

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function SkipBackIcon() {
  return (
    <span className="relative inline-flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
      </svg>
      <span className="absolute text-[9px] font-bold leading-none mt-1">15</span>
    </span>
  );
}

function SkipForwardIcon() {
  return (
    <span className="relative inline-flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
      </svg>
      <span className="absolute text-[9px] font-bold leading-none mt-1">15</span>
    </span>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z"/>
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  );
}

// Defined outside PersistentPlayer so it keeps a stable identity across re-renders,
// preventing the image from remounting (and flickering) on every timeupdate tick.
function CoverArt({ coverUrl, title, broken, onBroken, size }: {
  coverUrl: string | null;
  title: string;
  broken: boolean;
  onBroken: () => void;
  size: 'sm' | 'lg';
}) {
  const dim = size === 'sm' ? 'w-12 h-12' : 'w-56 h-56 sm:w-64 sm:h-64';
  const rounded = size === 'sm' ? 'rounded-md' : 'rounded-2xl';
  return (
    <div className={`${dim} ${rounded} bg-gray-200 overflow-hidden flex-shrink-0 shadow-md`}>
      {coverUrl && !broken ? (
        <Image
          src={coverUrl}
          alt={title}
          width={size === 'sm' ? 48 : 256}
          height={size === 'sm' ? 48 : 256}
          className="w-full h-full object-cover"
          onError={onBroken}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <svg className="w-1/3 h-1/3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function PersistentPlayer() {
  const { currentEpisode, isPlaying, togglePlay, skip, audioRef } = usePlayer();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [coverBroken, setCoverBroken] = useState(false);

  // Reset cover error state when episode changes
  useEffect(() => {
    setCoverBroken(false);
  }, [currentEpisode?.id]);

  // Attach time tracking listeners to the shared audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Save position every ~5s so the user can resume later
      // TODO: when user accounts exist, persist to API instead of localStorage
      if (currentEpisode && Math.round(audio.currentTime) % 5 === 0) {
        localStorage.setItem(`ep-pos-${currentEpisode.id}`, String(audio.currentTime));
      }
      // Keep the OS notification in sync — this is what unlocks skip buttons on Android
      if ('mediaSession' in navigator && isFinite(audio.duration) && audio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        } catch {
          // setPositionState not supported on this browser/OS — ignore
        }
      }
    };
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      setCurrentTime(0);
      if (currentEpisode) localStorage.removeItem(`ep-pos-${currentEpisode.id}`);
    };
    const onPause = () => {
      // Save exact position on every pause
      if (currentEpisode) {
        localStorage.setItem(`ep-pos-${currentEpisode.id}`, String(audio.currentTime));
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, [audioRef, currentEpisode]);

  // Media Session API — populates lock screen / notification controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentEpisode) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentEpisode.title,
      artist: currentEpisode.podcastTitle,
      artwork: currentEpisode.coverUrl
        ? [{ src: currentEpisode.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, audio.currentTime - 15);
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15);
    });
    // Samsung One UI only shows previoustrack/nexttrack buttons in the notification
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, audio.currentTime - 15);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15);
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [currentEpisode, audioRef]);

  // Keep the lock screen playback state badge in sync
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Lock body scroll when overlay is open on mobile
  useEffect(() => {
    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOverlayOpen]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }, [audioRef]);

  const handleCoverBroken = useCallback(() => setCoverBroken(true), []);

  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = duration > 0 ? duration - currentTime : 0;

  return (
    <>
      {/* ── BOTTOM BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">

        {/* Thin progress line at the very top of the bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-3 py-2 max-w-7xl mx-auto">

          {/* Cover + episode info — tapping opens overlay on mobile */}
          <button
            onClick={() => setIsOverlayOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left md:pointer-events-none"
            aria-label="Részletek megnyitása"
          >
            <CoverArt size="sm" coverUrl={currentEpisode.coverUrl} title={currentEpisode.title} broken={coverBroken} onBroken={handleCoverBroken} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {currentEpisode.title}
              </p>
              <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                {currentEpisode.podcastTitle}
              </p>
            </div>
          </button>

          {/* Desktop: full controls */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => skip(-15)}
              className="w-7 h-7 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Visszatekerés 15 másodperccel"
            >
              <SkipBackIcon />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
              aria-label={isPlaying ? 'Szünet' : 'Lejátszás'}
            >
              {isPlaying
                ? <PauseIcon className="w-5 h-5" />
                : <PlayIcon className="w-5 h-5 ml-0.5" />
              }
            </button>

            <button
              onClick={() => skip(15)}
              className="w-7 h-7 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Előreugrás 15 másodperccel"
            >
              <SkipForwardIcon />
            </button>

            {/* Scrubber */}
            <div className="flex items-center gap-2 w-64">
              <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={1}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 accent-green-500 cursor-pointer"
                aria-label="Lejátszási pozíció"
              />
              <span className="text-xs text-gray-400 w-10 tabular-nums">−{formatTime(remaining)}</span>
            </div>
          </div>

          {/* Mobile: just play/pause + expand */}
          <div className="flex items-center gap-2 md:hidden flex-shrink-0">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center"
              aria-label={isPlaying ? 'Szünet' : 'Lejátszás'}
            >
              {isPlaying
                ? <PauseIcon className="w-5 h-5" />
                : <PlayIcon className="w-5 h-5 ml-0.5" />
              }
            </button>
            <button
              onClick={() => setIsOverlayOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-400"
              aria-label="Lejátszó megnyitása"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE OVERLAY (slide-up sheet) ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 md:hidden ${
          isOverlayOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOverlayOpen(false)}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl transition-transform duration-300 ease-out md:hidden`}
        style={{ transform: isOverlayOpen ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button
          onClick={() => setIsOverlayOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Bezárás"
        >
          <ChevronDownIcon />
        </button>

        <div className="flex flex-col items-center px-8 pb-10 pt-2 gap-6">

          {/* Cover art */}
          <CoverArt size="lg" coverUrl={currentEpisode.coverUrl} title={currentEpisode.title} broken={coverBroken} onBroken={handleCoverBroken} />

          {/* Episode info */}
          <div className="text-center w-full">
            <p className="text-base font-bold text-gray-900 line-clamp-2 leading-snug">
              {currentEpisode.title}
            </p>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {currentEpisode.podcastTitle}
            </p>
          </div>

          {/* Scrubber */}
          <div className="w-full flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 accent-green-500 cursor-pointer"
              aria-label="Lejátszási pozíció"
            />
            <div className="flex justify-between text-xs text-gray-400 tabular-nums px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>−{formatTime(remaining)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => skip(-15)}
              className="w-10 h-10 text-gray-600 active:text-gray-900 transition-colors"
              aria-label="Visszatekerés 15 másodperccel"
            >
              <SkipBackIcon />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              aria-label={isPlaying ? 'Szünet' : 'Lejátszás'}
            >
              {isPlaying
                ? <PauseIcon className="w-8 h-8" />
                : <PlayIcon className="w-8 h-8 ml-1" />
              }
            </button>

            <button
              onClick={() => skip(15)}
              className="w-10 h-10 text-gray-600 active:text-gray-900 transition-colors"
              aria-label="Előreugrás 15 másodperccel"
            >
              <SkipForwardIcon />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
