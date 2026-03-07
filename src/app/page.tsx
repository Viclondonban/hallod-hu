import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

// Initialize Prisma Client to talk to the database
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Mark the page as dynamic so it re-fetches data on every request
export const dynamic = 'force-dynamic';

export default async function Home() {
  console.log("Homepage requested. Fetching podcasts and episode counts...");

  // Fetch all podcasts, sorted by newest first.
  // CRITICAL CHANGE: We ask Prisma to count related episodes.
  const allPodcasts = await prisma.podcast.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: { episodes: true }, // Count the episodes for each podcast
      },
    },
  });

  console.log(`Found ${allPodcasts.length} podcasts.`);

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header / Nav */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">hallod.hu</h1>
            <p className="text-sm text-gray-500">Hungarian Podcast Directory</p>
          </div>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Admin Panel →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Recently Added</h2>
          <span className="text-sm text-gray-500">{allPodcasts.length} podcasts indexed</span>
        </div>

        {/* Podcast Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allPodcasts.map((podcast) => (
            <Link key={podcast.id} href={`/podcast/${podcast.id}`} className="group">
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
                {/* Cover Art Image */}
                <div className="aspect-square bg-gray-200 relative">
                  {podcast.imageUrl ? (
                    <img
                      src={podcast.imageUrl}
                      alt={podcast.title}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* Podcast Details */}
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {podcast.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                    {podcast.author || 'Unknown Author'}
                  </p>
                  <div className="mt-auto pt-3 flex items-center text-xs text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {/* Display the episode count we fetched */}
                    <span>{podcast._count.episodes} Episodes</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {allPodcasts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No podcasts yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new podcast feed.</p>
            <div className="mt-6">
              <Link href="/admin" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Go to Admin Panel
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}