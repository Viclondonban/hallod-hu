import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import PodcastList from './podcast-list';

// Initialize Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Fetch the Featured Podcast
  const featuredPodcast = await prisma.podcast.findFirst({
    where: { isFeatured: true, bannerImageUrl: { not: null }, isActive: true },
  });

  // 2. Fetch ALL categories, enforcing your custom sortOrder
  const allCategories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  // 3. Fetch ALL active podcasts AND their latest episode date
  const rawPodcasts = await prisma.podcast.findMany({
    where: {},
    select: {
      id: true,
      title: true,
      author: true,
      imageUrl: true,
      category: true,
      _count: { select: { episodes: true } },
      // Grab only the single most recent episode to check its date
      episodes: {
        orderBy: { pubDate: 'desc' },
        take: 1,
        select: { pubDate: true }
      }
    },
  });

  // 4. Sort the podcasts in memory so the freshest are first!
  const sortedPodcasts = rawPodcasts.sort((a, b) => {
    const timeA = a.episodes[0]?.pubDate ? new Date(a.episodes[0].pubDate).getTime() : 0;
    const timeB = b.episodes[0]?.pubDate ? new Date(b.episodes[0].pubDate).getTime() : 0;
    
    // Fallback to 0 if the date is invalid (NaN) so it doesn't break the list
    const safeTimeA = isNaN(timeA) ? 0 : timeA;
    const safeTimeB = isNaN(timeB) ? 0 : timeB;
    
    return safeTimeB - safeTimeA; // Newest first
  });

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">hallod.hu</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Admin Panel →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {featuredPodcast && featuredPodcast.bannerImageUrl && (
          <section>
            <Link href={`/podcast/${featuredPodcast.id}`} className="block group relative rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-[21/9] md:aspect-[3/1] relative bg-gray-200">
                <img
                  src={featuredPodcast.bannerImageUrl}
                  alt={featuredPodcast.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </section>
        )}

        {/* Passing the sorted podcasts and categories to your client component */}
        <PodcastList 
          podcasts={sortedPodcasts} 
          featuredPodcastId={featuredPodcast?.id} 
          dbCategories={allCategories} 
        />

        {sortedPodcasts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No podcasts yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new podcast feed in the Admin Panel.</p>
          </div>
        )}
      </div>
    </main>
  );
}