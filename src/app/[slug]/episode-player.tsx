'use client';

import { useState, useRef } from 'react';

interface EpisodePlayerProps {
  src: string;
}

export default function EpisodePlayer({ src }: EpisodePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-grow min-w-0">
      {/* Prominent play/pause button */}
      <button
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform"
        style={{ backgroundColor: '#2b946b' }}
      >
        {isPlaying ? (
          // Pause icon
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          // Play icon (slightly offset for visual balance)
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Native audio — provides seek bar and time display */}
      <audio
        ref={audioRef}
        src={src}
        className="flex-grow h-9 min-w-0"
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
