'use client';

import { useRef, useState } from 'react';

interface EpisodePlayerProps {
  src: string;
}

export default function EpisodePlayer({ src }: EpisodePlayerProps) {
  const [activated, setActivated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mobileAudioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!mobileAudioRef.current) return;
    if (isPlaying) {
      mobileAudioRef.current.pause();
    } else {
      mobileAudioRef.current.play();
    }
  };

  return (
    <div className="flex-1 min-w-0 flex items-center">
      {/* ── DESKTOP: original clean native player ── */}
      <audio
        controls
        src={src}
        preload="none"
        className="hidden md:flex flex-grow h-9 min-w-0 focus:outline-none w-full"
      />

      {/* ── MOBILE: Hallgatás button → expands to player ── */}
      <div className="flex md:hidden flex-1 min-w-0">
        {!activated ? (
          <button
            onClick={() => setActivated(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold active:opacity-80"
            style={{ backgroundColor: '#2b946b' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 translate-x-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
            Hallgatás
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {/* Green play/pause button */}
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Szünet' : 'Lejátszás'}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white active:opacity-80"
              style={{ backgroundColor: '#2b946b' }}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {/* Seek bar */}
            <audio
              ref={mobileAudioRef}
              src={src}
              autoPlay
              className="flex-1 h-8 min-w-0"
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
