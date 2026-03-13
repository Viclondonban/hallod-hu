import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Initialize Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

// 1. NEXT.JS 15 FIX: params is now a Promise!
type Props = {
  params: Promise<{
    categoryName: string;
  }>;
};

export default async function CategoryPage({ params }: Props) {
  // 2. NEXT.JS 15 FIX: We must 'await' the params before reading them
  const resolvedParams = await params;
  
  // Safety check: Fallback to an empty string if undefined so it doesn't crash
  const rawName = resolvedParams?.categoryName || "";
  const decodedCategoryName = decodeURIComponent(rawName);

  // 3. Verify this category actually exists in the database
  const category = await prisma.category.findFirst({
    where: { name: decodedCategoryName },
  });

  if (!category) {
    notFound();
  }

  // 4. Fetch all active podcasts that match this specific category
  const rawPodcasts = await prisma.podcast.findMany({
    where: {
      isActive: true,
      category: decodedCategoryName
    },
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      imageUrl: true,
      _count: { select: { episodes: true } },
      episodes: {
        orderBy: { pubDate: 'desc' },
        take: 1,
        select: { pubDate: true }
      }
    },
  });

  // 5. Sort them so the freshest episodes are at the top
  const sortedPodcasts = rawPodcasts.sort((a, b) => {
    const timeA = a.episodes[0]?.pubDate ? new Date(a.episodes[0].pubDate).getTime() : 0;
    const timeB = b.episodes[0]?.pubDate ? new Date(b.episodes[0].pubDate).getTime() : 0;
    
    const safeTimeA = isNaN(timeA) ? 0 : timeA;
    const safeTimeB = isNaN(timeB) ? 0 : timeB;
    
    return safeTimeB - safeTimeA;
  });

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:opacity-80 transition-opacity">
            hallod.hu
          </Link>
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
            <span>←</span> Vissza a főoldalra
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="space-y-6">
          {/* Category Title & Count */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">{decodedCategoryName}</h1>
            <p className="text-gray-500 mt-2">{sortedPodcasts.length} podcast található ebben a kategóriában</p>
          </div>

          {/* Podcast Grid */}
          {sortedPodcasts.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {sortedPodcasts.map((podcast) => (
                // <--- CHANGED THE HREF HERE TO USE THE SLUG --->
                <Link key={podcast.id} href={`/${podcast.slug}`} className="group flex flex-col gap-2">
                  <div className="aspect-square w-full relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-200 shadow-sm transition-transform group-hover:scale-[1.03] group-hover:shadow-md">
                    {podcast.imageUrl ? (
                      <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-xs text-center p-2">
                        Nincs borító
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                      {podcast.title}
                    </h3>
                    {podcast.author && (
                      <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1 mt-0.5">{podcast.author}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
              <span className="text-4xl mb-3 block">👻</span>
              <h3 className="text-lg font-medium text-gray-900">Még nincs itt semmi</h3>
              <p className="mt-1 text-sm text-gray-500">Jelenleg egyetlen podcast sincs ehhez a kategóriához rendelve.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}