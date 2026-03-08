"use client";

import Link from 'next/link';

type Podcast = {
  id: string;
  title: string;
  author: string | null;
  imageUrl: string | null;
  category: string | null;
  _count: { episodes: number };
};

type DbCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

type Props = {
  podcasts: Podcast[];
  featuredPodcastId?: string;
  dbCategories: DbCategory[];
};

export default function PodcastList({ podcasts, featuredPodcastId, dbCategories }: Props) {
  // 1. Keep all podcasts in the list, even the featured one!
  const listPodcasts = podcasts;

  // 2. We keep a list of IDs we've successfully shown, so we can catch any missing ones!
  const renderedPodcastIds = new Set<string>();

  return (
    <div className="space-y-12">
      {dbCategories.map((category) => {
        // BULLETPROOF MATCHING: Ignores trailing spaces and uppercase/lowercase issues
        const categoryPodcasts = listPodcasts.filter(p => 
          p.category?.trim().toLowerCase() === category.name.trim().toLowerCase()
        );
        
        if (categoryPodcasts.length === 0) return null;

        // Mark these podcasts as safely rendered
        categoryPodcasts.forEach(p => renderedPodcastIds.add(p.id));

        const top11 = categoryPodcasts.slice(0, 11);

        return (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {top11.map((podcast) => (
                <Link key={podcast.id} href={`/podcast/${podcast.id}`} className="group flex flex-col gap-2">
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

              <Link 
                href={`/category/${encodeURIComponent(category.name)}`} 
                className="group flex flex-col gap-2 h-full"
              >
                <div className="aspect-square w-full relative rounded-lg sm:rounded-xl overflow-hidden bg-blue-50/50 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center transition-all group-hover:bg-blue-100 group-hover:border-blue-400 group-hover:scale-[1.03]">
                  <span className="text-2xl sm:text-3xl mb-1 group-hover:scale-110 transition-transform">🎧</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700">Mindenki</span>
                  <span className="text-[10px] sm:text-xs text-blue-500 mt-1">{categoryPodcasts.length} podcast</span>
                </div>
              </Link>
            </div>
          </section>
        );
      })}

      {/* 3. THE SAFETY NET: Shows any podcasts that didn't match a category */}
      {(() => {
        const orphanPodcasts = listPodcasts.filter(p => !renderedPodcastIds.has(p.id));
        if (orphanPodcasts.length === 0) return null;

        return (
          <section className="space-y-4 pt-8 border-t border-gray-200 opacity-80">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-600">Egyéb (Kategorizálatlan)</h2>
              <span className="text-xs text-red-500 font-medium">Láthatatlan podcastok!</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {orphanPodcasts.map((podcast) => (
                <Link key={podcast.id} href={`/podcast/${podcast.id}`} className="group flex flex-col gap-2">
                  <div className="aspect-square w-full relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-200 shadow-sm transition-transform group-hover:scale-[1.03]">
                    {podcast.imageUrl ? (
                      <img src={podcast.imageUrl} alt={podcast.title} className="w-full h-full object-cover grayscale" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-xs text-center p-2">Nincs borító</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{podcast.title}</h3>
                    {/* Prints the exact broken category name so you can see why it failed */}
                    <p className="text-[10px] text-red-500 font-bold line-clamp-1 mt-0.5">Hibás kategória: "{podcast.category}"</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}