'use client';

interface EpisodePlayerProps {
  src: string;
}

export default function EpisodePlayer({ src }: EpisodePlayerProps) {
  return (
    <div className="flex-1 min-w-0">
      <audio
        controls
        src={src}
        preload="none"
        className="w-full h-9 focus:outline-none"
      />
    </div>
  );
}
