'use client';

interface EpisodePlayerProps {
  src: string;
}

export default function EpisodePlayer({ src }: EpisodePlayerProps) {
  return (
    <div className="flex-1">
      <audio
        controls
        src={src}
        preload="none"
        className="w-full"
        style={{ height: '36px' }}
      />
    </div>
  );
}
