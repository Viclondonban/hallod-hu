'use client';

import { usePlayer, type PlayableEpisode } from '@/context/player-context';

interface EpisodePlayerProps {
  episode: PlayableEpisode;
}

export default function EpisodePlayer({ episode }: EpisodePlayerProps) {
  const { currentEpisode, isPlaying, play } = usePlayer();

  const isThisEpisode = currentEpisode?.id === episode.id;
  const isThisPlaying = isThisEpisode && isPlaying;

  return (
    <>
      {/* Mobile: compact pill button */}
      <button
        onClick={() => play(episode)}
        className={`md:hidden flex items-center justify-center gap-2 w-full px-4 py-2 rounded-full text-sm font-medium transition-all ${
          isThisEpisode
            ? 'bg-gray-900 text-white hover:bg-gray-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-label={isThisPlaying ? 'Szünet' : 'Lejátszás'}
      >
        {isThisPlaying ? (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <span>Szünet</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 ml-0.5">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>{isThisEpisode ? 'Folytatás' : 'Lejátszás'}</span>
          </>
        )}
      </button>

      {/* Desktop: wide full-row player bar */}
      <button
        onClick={() => play(episode)}
        className={`hidden md:flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isThisEpisode
            ? 'bg-gray-900 text-white hover:bg-gray-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-label={isThisPlaying ? 'Szünet' : 'Lejátszás'}
      >
        {/* Play/pause icon */}
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isThisEpisode ? 'bg-white/20' : 'bg-gray-300'
        }`}>
          {isThisPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </span>

        {/* Label */}
        <span className="flex-shrink-0">
          {isThisPlaying ? 'Szünet' : isThisEpisode ? 'Folytatás' : 'Lejátszás'}
        </span>

        {/* Fake track line — visual cue this is a player */}
        <span className={`flex-1 h-1 rounded-full ${isThisEpisode ? 'bg-white/30' : 'bg-gray-300'}`} />

        {/* Duration hint */}
        {episode.src && (
          <span className={`flex-shrink-0 text-xs tabular-nums ${isThisEpisode ? 'text-white/70' : 'text-gray-400'}`}>
            ▶
          </span>
        )}
      </button>
    </>
  );
}
