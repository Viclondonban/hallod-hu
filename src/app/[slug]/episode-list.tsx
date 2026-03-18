'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import EpisodePlayer from './episode-player';
import ShareButton from './share-button';
import { fetchMoreEpisodes, type SerializedEpisode } from './actions';
import { usePlayer } from '@/context/player-context';

interface Podcast {
  title: string;
  slug: string | null;
  imageUrl: string | null;
}

interface Props {
  initialEpisodes: SerializedEpisode[];
  totalCount: number;
  podcastId: string;
  podcast: Podcast;
}

function EpisodeThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false);
  const fallback = (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </div>
  );
  return (
    <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-gray-200 shadow-sm">
      {src && !broken ? (
        <Image
          src={src}
          alt={alt}
          width={112}
          height={112}
          className="w-full h-full object-cover"
          sizes="112px"
          onError={() => setBroken(true)}
        />
      ) : fallback}
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function NowPlayingBars() {
  return (
    <span className="flex items-end gap-[2px] h-4 flex-shrink-0" aria-label="Lejátszás alatt">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] bg-green-500 rounded-sm"
          style={{
            height: `${i === 2 ? '100%' : '60%'}`,
            animation: `nowplaying 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

export default function EpisodeList({ initialEpisodes, totalCount, podcastId, podcast }: Props) {
  const [episodes, setEpisodes] = useState<SerializedEpisode[]>(initialEpisodes);
  const [isPending, startTransition] = useTransition();
  const { currentEpisode, isPlaying } = usePlayer();

  const hasMore = episodes.length < totalCount;
  const last = episodes[episodes.length - 1];

  function loadMore() {
    if (!last) return;
    startTransition(async () => {
      const more = await fetchMoreEpisodes(podcastId, last.pubDate, last.id);
      setEpisodes(prev => [...prev, ...more]);
    });
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
        {episodes.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No episodes found for this podcast.
          </div>
        )}
        {episodes.map((episode) => {
          const coverImage = episode.imageUrl || podcast.imageUrl;
          const isActive = currentEpisode?.id === episode.id;
          const isCurrentlyPlaying = isActive && isPlaying;
          return (
            <div
              key={episode.id}
              id={`ep-${episode.id}`}
              className={`p-4 sm:p-5 transition-colors group ${isActive ? 'bg-green-50' : 'hover:bg-gray-50'}`}
            >
              {/* Content row: thumbnail + meta */}
              <div className="flex gap-3 sm:gap-4 mb-3">
                <EpisodeThumbnail src={coverImage} alt={episode.title} />
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                    <h3 className={`text-base font-semibold leading-snug flex items-center gap-2 ${isActive ? 'text-green-700' : 'text-gray-900 group-hover:text-blue-600 transition-colors'}`}>
                      {episode.title}
                      {isCurrentlyPlaying && <NowPlayingBars />}
                    </h3>
                    <div className="flex items-center text-xs text-gray-400 gap-3 flex-shrink-0">
                      <span>{formatDate(episode.pubDate)}</span>
                      {episode.duration && (
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(episode.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {stripHtml(episode.description)}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-row items-center gap-2">
                {episode.enclosureUrl && (
                  <div className="flex-1 min-w-0">
                    <EpisodePlayer episode={{
                      id: episode.id,
                      src: episode.enclosureUrl,
                      title: episode.title,
                      podcastTitle: podcast.title,
                      coverUrl: coverImage,
                    }} />
                  </div>
                )}
                <div className="flex-shrink-0">
                  <ShareButton
                    episode={{ id: episode.id, title: episode.title, imageUrl: episode.imageUrl, enclosureUrl: episode.enclosureUrl }}
                    podcast={{ title: podcast.title, slug: podcast.slug, imageUrl: podcast.imageUrl }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? 'Töltés...'
              : `Régebbi epizódok (még ${totalCount - episodes.length})`}
          </button>
        </div>
      )}
    </>
  );
}
