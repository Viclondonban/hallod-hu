// src/app/page.tsx
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

// Initialize Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

// Helper to group podcasts by category
const groupPodcastsByCategory = (podcasts: any[]) => {
  return podcasts.reduce((groups, podcast) => {
    const category = podcast.category || 'Egyéb';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(podcast);
    return groups;
  }, {} as Record<string, any[]>);
};

export default async function Home() {
  // 1. Fetch the Featured Podcast (the one with a banner)
  const featuredPodcast = await prisma.podcast.findFirst({
    where: { isFeatured: true, bannerImageUrl: { not: null } },
    include: { _count: { select: { episodes: true } } },
  });

  // 2. Fetch all other podcasts, sorted by newest
  const allPodcasts = await prisma.podcast.findMany({
    where: {
      // Exclude the featured one so it doesn't show up twice
      id: { not: featuredPodcast?.id },
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { episodes: true } } },
  });

  // 3. Group podcasts by category
  const podcastsByCategory = groupPodcastsByCategory(allPodcasts);
  // Get category names sorted alphabetically
  const sortedCategories = Object.keys(podcastsByCategory).sort();


  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">hallod.hu</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Admin Panel →
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Banner (Featured Podcast) */}
        {featuredPodcast && featuredPodcast.bannerImageUrl && (
          <section>
            <Link href={`/podcast/${featuredPodcast.id}`} className="block group relative rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Banner Image */}
              <div className="aspect-[21/9] md:aspect-[3/1] relative bg-gray-200">
                <img
                  src={featuredPodcast.bannerImageUrl}
                  alt={featuredPodcast.title}
                  className="w-full h-full object-cover"
                />
                {/* Subtle gradient just at the bottom for a little depth, optional */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </section>
        )}

        {/* Categorized Podcasts */}
        {sortedCategories.map((category) => (
          <section key={category}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
              <span className="text-sm text-gray-500">{podcastsByCategory[category].length} podcasts</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {podcastsByCategory[category].map((podcast) => (
                <Link key={podcast.id} href={`/podcast/${podcast.id}`} className="group">
                  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
                    {/* Cover Art */}
                    <div className="aspect-square bg-gray-200 relative">
                      {podcast.imageUrl ? (
                        <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                    </div>
                    {/* Details */}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{podcast.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{podcast.author || 'Unknown Author'}</p>
                      <div className="mt-auto pt-3 flex items-center text-xs text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span>{podcast._count.episodes} Episodes</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Empty State */}
        {allPodcasts.length === 0 && !featuredPodcast && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No podcasts yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new podcast feed in the Admin Panel.</p>
          </div>
        )}
      </div>
    </main>
  );
}