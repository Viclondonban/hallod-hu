'use client';

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

export interface PlayableEpisode {
  id: string;
  src: string;
  title: string;
  podcastTitle: string;
  coverUrl: string | null;
}

interface PlayerContextValue {
  currentEpisode: PlayableEpisode | null;
  isPlaying: boolean;
  play: (episode: PlayableEpisode) => void;
  togglePlay: () => void;
  skip: (seconds: number) => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<PlayableEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create the audio element once on mount — lives for the entire session
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => setIsPlaying(false));

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback((episode: PlayableEpisode) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Same episode — just toggle play/pause
    if (currentEpisode?.id === episode.id) {
      if (audio.paused) audio.play();
      else audio.pause();
      return;
    }

    // New episode — load it, restore saved position if any
    audio.src = episode.src;
    audio.load();

    // TODO: when user accounts exist, load saved position from API instead
    const saved = localStorage.getItem(`ep-pos-${episode.id}`);
    if (saved) {
      audio.currentTime = parseFloat(saved);
    }

    audio.play();
    setCurrentEpisode(episode);
  }, [currentEpisode]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, []);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }, []);

  return (
    <PlayerContext.Provider value={{ currentEpisode, isPlaying, play, togglePlay, skip, audioRef }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
