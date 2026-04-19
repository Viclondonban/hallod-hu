import { PrismaClient } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import Link from 'next/link';
import PodcastList from './podcast-list';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Keep force-dynamic to avoid the 47-worker build-time DB exhaustion issue.
// unstable_cache below handles response-level caching instead.
export const dynamic = 'force-dynamic';

// ─── Cached queries ────────────────────────────────────────────────────────

// Banner: fast single-row query, cached 5 min
const getFeaturedPodcast = unstable_cache(
  async () =>
    prisma.podcast.findFirst({
      where: { isFeatured: true, bannerImageUrl: { not: null }, isActive: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ['featured-podcast'],
  { revalidate: 300 }
);

// Directory: heavy query, cached 5 min — re-runs in background after expiry
const getDirectoryData = unstable_cache(
  async () => {
    const [allCategories, rawPodcasts] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.podcast.findMany({
        where: { isActive: true },
        select: {
          id: true,
          slug: true,
          title: true,
          author: true,
          imageUrl: true,
          category: true,
          _count: { select: { episodes: true } },
          episodes: {
            orderBy: { pubDate: 'desc' },
            take: 1,
            select: { pubDate: true },
          },
        },
      }),
    ]);

    const sortedPodcasts = [...rawPodcasts].sort((a, b) => {
      const tA = a.episodes[0]?.pubDate ? new Date(a.episodes[0].pubDate).getTime() : 0;
      const tB = b.episodes[0]?.pubDate ? new Date(b.episodes[0].pubDate).getTime() : 0;
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });

    return { allCategories, sortedPodcasts };
  },
  ['directory-data'],
  { revalidate: 300 }
);

// ─── Streaming component ───────────────────────────────────────────────────

// Lives inside a <Suspense> boundary so it streams in after the banner
async function PodcastDirectory({ featuredPodcastId }: { featuredPodcastId?: string }) {
  const { allCategories, sortedPodcasts } = await getDirectoryData();
  return (
    <PodcastList
      podcasts={sortedPodcasts}
      featuredPodcastId={featuredPodcastId}
      dbCategories={allCategories}
    />
  );
}

// Simple skeleton shown while the directory streams in
function DirectorySkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Search bar placeholder */}
      <div className="max-w-xl mx-auto my-8 h-12 bg-white rounded-full shadow-sm" />
      {/* Two category skeletons */}
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <div className="aspect-square w-full rounded-xl bg-gray-200" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function Home() {
  // Banner query is fast and cached — renders before anything else
  const featuredPodcast = await getFeaturedPodcast();

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-blue-600">hallod.hu</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Banner — appears immediately */}
        {featuredPodcast?.bannerImageUrl && (
          <section>
            <Link
              href={`/${featuredPodcast.slug}`}
              className="block group relative rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-[21/9] md:aspect-[3/1] relative bg-gray-200">
                <img
                  src={featuredPodcast.bannerImageUrl}
                  alt={featuredPodcast.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
              </div>
            </Link>
          </section>
        )}

        {/* Directory streams in — skeleton shown while the heavy query runs */}
        <Suspense fallback={<DirectorySkeleton />}>
          <PodcastDirectory featuredPodcastId={featuredPodcast?.id} />
        </Suspense>
      </div>
    </main>
  );
}
