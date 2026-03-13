'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface ShareButtonProps {
  episode: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
  podcast: {
    title: string;
    slug: string | null;
    imageUrl: string | null;
  };
}

export default function ShareButton({ episode, podcast }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const shareUrl = `https://www.hallod.hu/${podcast.slug ?? ''}?ep=${episode.id}`;
  const coverImage = episode.imageUrl || podcast.imageUrl;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({
        title: episode.title,
        text: `Hallgasd meg: ${episode.title} – ${podcast.title}`,
        url: shareUrl,
      }).catch(() => {});
    }
  }, [episode.title, podcast.title, shareUrl]);

  return (
    <>
      {/* Share trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Megosztás"
        className="flex items-center gap-1 text-xs text-gray-400 transition-colors px-2 py-1 rounded-md"
        style={{ ['--hover-color' as string]: '#2b946b' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2b946b'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0faf6'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = ''; (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Megosztás
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Spotify-style share card */}
            <div
              className="w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              }}
            >
              {/* Cover image */}
              <div className="relative w-full aspect-square">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={episode.title}
                    fill
                    sizes="(max-width: 384px) 100vw, 384px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Episode info — light section */}
              <div className="p-5 bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                  {podcast.title}
                </p>
                <h3 className="text-gray-900 font-bold text-lg leading-snug line-clamp-3 mb-4">
                  {episode.title}
                </h3>

                {/* hallod.hu branding */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                  <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 bg-white shadow-sm">
                    <Image
                      src="/icon.png"
                      alt="hallod.hu"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-gray-900 text-sm font-bold tracking-tight block leading-tight">hallod.hu</span>
                    <span className="text-gray-400 text-xs leading-tight">A Magyar Podcast Gyűjtő</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all"
                style={{
                  backgroundColor: copied ? '#22c55e' : 'white',
                  color: copied ? 'white' : '#111',
                }}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Másolva!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Link másolása
                  </>
                )}
              </button>

              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-colors"
                  style={{ backgroundColor: '#2b946b' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#237a58')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2b946b')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Megosztás
                </button>
              )}
            </div>

            {/* Close hint */}
            <p className="text-white/40 text-xs">Kattints bárhova a bezáráshoz</p>
          </div>
        </div>
      )}
    </>
  );
}
