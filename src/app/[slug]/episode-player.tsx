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
    <button
      onClick={() => play(episode)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
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
  );
}
