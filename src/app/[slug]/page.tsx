import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import EpisodeScroller from './episode-scroller';
import EpisodeList from './episode-list';
import PodcastCover from './podcast-cover';

// Strip HTML tags from descriptions coming from RSS feeds
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Reject obviously-invalid slugs before hitting Prisma. Real podcast slugs are
// short kebab-case identifiers, so anything with a dot (robots.txt, meta.json,
// sitemap.xml, .env, wp-login.php…), uppercase letters, or a suspicious length
// is almost certainly a bot probe. Blocking here stops vuln scanners from
// driving Postgres traffic.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/;

// Cache for 30 seconds — short enough to show new episodes promptly
export const revalidate = 30;

export async function generateMetadata(
  { params, searchParams }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ep?: string }>;
  }
): Promise<Metadata> {
  const { slug } = await params;
  const { ep } = await searchParams;

  // Short-circuit bot probes before they hit the database
  if (!SLUG_PATTERN.test(slug)) return {};

  const podcast = await prisma.podcast.findUnique({ where: { slug } });
  if (!podcast) return {};

  const BASE = 'https://www.hallod.hu';

  // Helper: build the styled OG image URL
  function ogImageUrl(
    title: string,
    podcastTitle: string,
    image: string | null | undefined,
    desc: string,
    id: string,
  ): string {
    const u = new URL('/api/og', BASE);
    u.searchParams.set('title', title);
    u.searchParams.set('podcast', podcastTitle);
    u.searchParams.set('desc', desc.slice(0, 100)); // keep URL short; route handles display
    u.searchParams.set('id', id);
    if (image) u.searchParams.set('image', image);
    return u.toString();
  }

  // Episode-specific OG tags when ?ep= is present
  if (ep) {
    const episode = await prisma.episode.findUnique({ where: { id: ep } });
    if (episode) {
      // Priority: episode art → podcast channel art → no image (route shows solid colour)
      const coverImage = episode.imageUrl || podcast.imageUrl;
      const description = stripHtml(episode.description)?.slice(0, 200) || '';
      const url = `${BASE}/${slug}?ep=${ep}`;
      const ogImg = ogImageUrl(episode.title, podcast.title, coverImage, description, episode.id);
      // og:title = podcast name so Facebook bottom strip shows the channel, not the episode title again
      // (the episode title is already large in the OG image itself)
      const ogDescription = description
        ? `${episode.title} — ${description}`
        : episode.title;
      return {
        title: `${episode.title} – ${podcast.title} | hallod.hu`,
        description: ogDescription,
        openGraph: {
          title: podcast.title,
          description: ogDescription,
          url,
          siteName: 'hallod.hu – A Magyar Podcast Gyűjtő',
          images: [{ url: ogImg, width: 1200, height: 630, alt: episode.title }],
          type: 'website',
          locale: 'hu_HU',
        },
        twitter: {
          card: 'summary_large_image',
          title: podcast.title,
          description: ogDescription,
          images: [ogImg],
        },
      };
    }
  }

  // Default: podcast-level OG tags
  const description = podcast.description?.slice(0, 200) || 'Magyar podcast csatorna a hallod.hu-n';
  const url = `${BASE}/${slug}`;
  const ogImg = ogImageUrl(podcast.title, podcast.title, podcast.imageUrl, description, podcast.id);
  return {
    title: `${podcast.title} – hallod.hu`,
    description,
    openGraph: {
      title: podcast.title,
      description,
      url,
      siteName: 'hallod.hu – A Magyar Podcast Gyűjtő',
      images: [{ url: ogImg, width: 1200, height: 630, alt: podcast.title }],
      type: 'website',
      locale: 'hu_HU',
    },
    twitter: {
      card: 'summary_large_image',
      title: podcast.title,
      description,
      images: [ogImg],
    },
  };
}

export default async function PodcastDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  // Grab the slug from the URL (e.g. "viclondonban")
  const { slug } = await params;

  // Short-circuit bot probes (robots.txt, meta.json, wp-login.php, …) before
  // they hit Prisma. Saves a DB round-trip per probe and avoids log noise.
  if (!SLUG_PATTERN.test(slug)) {
    notFound();
  }

  // 1. Fetch the Podcast details using the SLUG
  const podcast = await prisma.podcast.findUnique({
    where: { slug: slug },
  });

  // If the podcast doesn't exist, instantly trigger a 404 page so other routes work normally
  if (!podcast) {
    notFound();
  }

  // 2. Fetch first 20 episodes + total count in parallel
  const [initialEpisodes, totalCount] = await Promise.all([
    prisma.episode.findMany({
      where: { podcastId: podcast.id },
      orderBy: [{ pubDate: 'desc' }, { id: 'desc' }],
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        pubDate: true,
        duration: true,
        imageUrl: true,
        enclosureUrl: true,
      },
    }),
    prisma.episode.count({ where: { podcastId: podcast.id } }),
  ]);

  // Serialize dates — Date objects can't cross the server/client boundary
  const serializedEpisodes = initialEpisodes.map(ep => ({
    ...ep,
    pubDate: ep.pubDate.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header / Nav */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Vissza a főoldalra
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Podcast Header Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-8 items-start">
          {/* Cover Art */}
          <div className="w-full md:w-64 lg:w-72 flex-shrink-0 aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-sm relative">
            {podcast.imageUrl ? (
              <PodcastCover src={podcast.imageUrl} alt={podcast.title} />
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
              <span>{totalCount} epizód</span>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base pr-4">
              {stripHtml(podcast.description)}
            </p>
          </div>
        </div>

        {/* Scroll to episode when ?ep= is in the URL */}
        <Suspense fallback={null}>
          <EpisodeScroller />
        </Suspense>

        {/* Episode List — client component handles pagination */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Epizódok ({totalCount})</h2>
        <EpisodeList
          initialEpisodes={serializedEpisodes}
          totalCount={totalCount}
          podcastId={podcast.id}
          podcast={{
            title: podcast.title,
            slug: podcast.slug,
            imageUrl: podcast.imageUrl,
          }}
        />
      </div>
    </main>
  );
}