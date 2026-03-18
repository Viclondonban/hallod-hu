'use client';

import { useState, useRef, useEffect } from 'react';
import { usePlayer, type PlayableEpisode } from '@/context/player-context';

interface EpisodePlayerProps {
  episode: PlayableEpisode;
}

export default function EpisodePlayer({ episode }: EpisodePlayerProps) {
  const { currentEpisode, isPlaying, play } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isThisEpisode = currentEpisode?.id === episode.id;
  const isThisPlaying = isThisEpisode && isPlaying;

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const barBg = isThisEpisode
    ? 'bg-gray-900 text-white'
    : 'bg-gray-100 text-gray-700';

  const dotsColor = isThisEpisode ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700';
  const dividerColor = isThisEpisode ? 'bg-white/20' : 'bg-gray-300';

  const PlayPauseIcon = () => isThisPlaying ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 ml-0.5">
      <path d="M8 5v14l11-7z"/>
    </svg>
  );

  const label = isThisPlaying ? 'Szünet' : isThisEpisode ? 'Folytatás' : 'Lejátszás';

  return (
    <div className={`flex items-center w-full rounded-full text-sm font-medium overflow-hidden ${barBg}`}>

      {/* Play/pause area — takes all space */}
      <button
        onClick={() => play(episode)}
        className="flex items-center gap-2 flex-1 px-4 py-2 hover:opacity-80 transition-opacity"
        aria-label={label}
      >
        {/* Circle icon — visible on desktop; hidden on mobile to keep it slim */}
        <span className={`hidden sm:flex flex-shrink-0 w-6 h-6 rounded-full items-center justify-center ${isThisEpisode ? 'bg-white/20' : 'bg-gray-300'}`}>
          <PlayPauseIcon />
        </span>
        {/* Plain icon on mobile */}
        <span className="sm:hidden flex-shrink-0">
          <PlayPauseIcon />
        </span>

        <span className="flex-shrink-0">{label}</span>

        {/* Decorative track line */}
        <span className={`flex-1 h-0.5 rounded-full ${isThisEpisode ? 'bg-white/25' : 'bg-gray-300'}`} />
      </button>

      {/* Divider */}
      <span className={`w-px h-5 flex-shrink-0 ${dividerColor}`} />

      {/* Three-dot menu — lives inside the bar */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className={`flex items-center justify-center w-9 h-9 transition-colors ${dotsColor}`}
          aria-label="Műveletek"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[140px] z-10">
            <a
              href={episode.src}
              download
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Letöltés
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
