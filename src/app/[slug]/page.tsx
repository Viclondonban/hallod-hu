import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ShareButton from './share-button';
import EpisodePlayer from './episode-player';

// Initialize Prisma Client to talk to the database
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Cache for 60 seconds — matches the home page so episode counts stay in sync
export const revalidate = 60;

export default async function PodcastDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // Grab the slug from the URL (e.g. "viclondonban")
  const { slug } = await params;

  console.log(`Fetching details for podcast slug: ${slug}...`);

  // 1. Fetch the Podcast details using the SLUG
  const podcast = await prisma.podcast.findUnique({
    where: { slug: slug },
  });

  // If the podcast doesn't exist, instantly trigger a 404 page so other routes work normally
  if (!podcast) {
    notFound(); 
  }

  // 2. Fetch all episodes for this podcast, sorted by newest
  const episodes = await prisma.episode.findMany({
    where: { podcastId: podcast.id }, // We still use the internal ID to find its episodes!
    orderBy: { pubDate: 'desc' },
  });

  console.log(`Found ${episodes.length} episodes for ${podcast.title}.`);

  // Helper to format dates nicely (e.g., "2023. 10. 27.")
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  };

  // Helper to format duration (seconds -> "MM:SS" or "HH:MM:SS")
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header / Nav */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Directory
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Podcast Header Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-8 items-start">
          {/* Cover Art */}
          <div className="w-full md:w-64 lg:w-72 flex-shrink-0 aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-sm relative">
            {podcast.imageUrl ? (
              <Image
                src={podcast.imageUrl}
                alt={podcast.title}
                fill
                sizes="(max-width: 768px) 100vw, 288px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
            )}
          </div>
          {/* Details */}
          <div className="flex-grow">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{podcast.title}</h1>
            <p className="text-lg text-gray-600 mb-4 font-medium">{podcast.author}</p>
            <div className="flex items-center text-sm text-gray-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>{episodes.length} Episodes</span>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base pr-4">
              {podcast.description}
            </p>
          </div>
        </div>

        {/* Episode List */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Episodes ({episodes.length})</h2>
        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
          {episodes.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No episodes found for this podcast.
            </div>
          )}
          {episodes.map((episode) => {
            const coverImage = episode.imageUrl || podcast.imageUrl;
            return (
              <div key={episode.id} className="p-5 hover:bg-gray-50 transition-colors group">
                <div className="flex gap-4">
                  {/* Episode thumbnail */}
                  <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-200 shadow-sm">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={episode.title}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    {/* Title row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {episode.title}
                      </h3>
                      <div className="flex items-center text-xs text-gray-400 gap-3 flex-shrink-0">
                        <span>{formatDate(new Date(episode.pubDate))}</span>
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

                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                      {episode.description}
                    </p>

                    {/* Audio player + share */}
                    <div className="flex items-center gap-2">
                      <EpisodePlayer src={episode.enclosureUrl} />
                      <ShareButton
                        episode={{ id: episode.id, title: episode.title, imageUrl: episode.imageUrl }}
                        podcast={{ title: podcast.title, slug: podcast.slug, imageUrl: podcast.imageUrl }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}