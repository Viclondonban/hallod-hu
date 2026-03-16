import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import PodcastList from './podcast-list';

// Initialize Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Force server-side rendering on every request — avoids DB connection
// exhaustion during build (Next.js 47-worker static generation)
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Fetch the Featured Podcast 
  // We sort by updatedAt desc so the one you JUST edited in Supabase becomes the banner
  const featuredPodcast = await prisma.podcast.findFirst({
    where: { 
        isFeatured: true, 
        bannerImageUrl: { not: null }, 
        isActive: true 
    },
    orderBy: { updatedAt: 'desc' } 
  });

  // 2. Fetch ALL categories
  const allCategories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  // 3. Fetch ALL active podcasts
  const rawPodcasts = await prisma.podcast.findMany({
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
        select: { pubDate: true }
      }
    },
  });

  // 4. Sort the podcasts by freshness
  const sortedPodcasts = rawPodcasts.sort((a, b) => {
    const timeA = a.episodes[0]?.pubDate ? new Date(a.episodes[0].pubDate).getTime() : 0;
    const timeB = b.episodes[0]?.pubDate ? new Date(b.episodes[0].pubDate).getTime() : 0;
    const safeTimeA = isNaN(timeA) ? 0 : timeA;
    const safeTimeB = isNaN(timeB) ? 0 : timeB;
    return safeTimeB - safeTimeA;
  });

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-blue-600">hallod.hu</h1>
        
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* THE BANNER */}
        {featuredPodcast && featuredPodcast.bannerImageUrl && (
          <section>
            <Link href={`/${featuredPodcast.slug}`} className="block group relative rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="aspect-[21/9] md:aspect-[3/1] relative bg-gray-200">
                <img
                  src={featuredPodcast.bannerImageUrl}
                  alt={featuredPodcast.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
              </div>
            </Link>
          </section>
        )}

        {/* PODCAST LISTS BY CATEGORY */}
        <PodcastList 
          podcasts={sortedPodcasts} 
          featuredPodcastId={featuredPodcast?.id} 
          dbCategories={allCategories} 
        />

        {sortedPodcasts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Még nincs tartalom</h3>
            <p className="text-gray-500 mt-2 text-sm">Adj hozzá új feedet az admin felületen!</p>
          </div>
        )}
      </div>
    </main>
  );
}