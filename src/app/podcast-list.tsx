"use client";

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

type Podcast = {
  id: string;
  slug: string | null; // <-- ADDED THIS!
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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 1. PERFORMANCE UPGRADE: Debounce the search
  // This waits 300ms after the user stops typing before filtering.
  // It stops the browser from freezing while you are typing a word!
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. PERFORMANCE UPGRADE: useMemo
  // This remembers the filtered list so React doesn't have to recalculate 
  // 1,400 items every single time the screen blinks.
  const filteredPodcasts = useMemo(() => {
    if (!debouncedSearch) return podcasts; 
    
    const lowerSearch = debouncedSearch.toLowerCase();
    return podcasts.filter((p) => {
      const titleMatch = p.title.toLowerCase().includes(lowerSearch);
      const authorMatch = p.author?.toLowerCase().includes(lowerSearch) || false;
      return titleMatch || authorMatch;
    });
  }, [podcasts, debouncedSearch]);

  const renderedPodcastIds = new Set<string>();

  return (
    <div className="space-y-12">
      
      {/* SEARCH BAR */}
      <div className="relative max-w-xl mx-auto my-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        </div>
        <input
          type="text"
          placeholder="Keresés cím vagy készítő alapján..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 placeholder-gray-400"
/>
        {searchTerm && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button 
              onClick={() => setSearchTerm("")}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              ✖
            </button>
          </div>
        )}
      </div>

      {/* Show message if nothing found */}
      {debouncedSearch && filteredPodcasts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nincs találat erre: <span className="font-semibold text-gray-900">"{debouncedSearch}"</span>
        </div>
      )}

      {dbCategories.map((category) => {
        const categoryPodcasts = filteredPodcasts.filter(p => 
          p.category?.trim().toLowerCase() === category.name.trim().toLowerCase()
        );
        
        if (categoryPodcasts.length === 0) return null;

        categoryPodcasts.forEach(p => renderedPodcastIds.add(p.id));

        // 3. PERFORMANCE UPGRADE: Limit search DOM nodes
        // If searching, show up to 24 results per category to prevent DOM crashing.
        // If not searching, show the standard top 11.
        const displayPodcasts = debouncedSearch 
          ? categoryPodcasts.slice(0, 24) 
          : categoryPodcasts.slice(0, 11);

        return (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {category.name} 
                {debouncedSearch && <span className="text-sm font-normal text-gray-500 ml-2">({categoryPodcasts.length} találat)</span>}
              </h2>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {displayPodcasts.map((podcast) => (
                <Link key={podcast.id} href={`/${podcast.slug}`} className="group flex flex-col gap-2"> {/* <-- UPDATED LINK */}
                  <div className="aspect-square w-full relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-200 shadow-sm transition-transform group-hover:scale-[1.03] group-hover:shadow-md">
                    {podcast.imageUrl ? (
                      <img 
                        src={podcast.imageUrl} 
                        alt={podcast.title} 
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        decoding="async" 
                      />
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

              {!debouncedSearch && (
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
              )}
            </div>
          </section>
        );
      })}

      {/* SAFETY NET SECTION */}
      {(() => {
        const orphanPodcasts = filteredPodcasts.filter(p => !renderedPodcastIds.has(p.id));
        if (orphanPodcasts.length === 0) return null;
        
        // Also limit the orphan podcasts during a search
        const displayOrphans = debouncedSearch ? orphanPodcasts.slice(0, 24) : orphanPodcasts;

        return (
          <section className="space-y-4 pt-8 border-t border-gray-200 opacity-80">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-600">Egyéb (Kategorizálatlan)</h2>
              <span className="text-xs text-red-500 font-medium">Láthatatlan podcastok!</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {displayOrphans.map((podcast) => (
                <Link key={podcast.id} href={`/${podcast.slug}`} className="group flex flex-col gap-2"> {/* <-- UPDATED LINK */}
                  <div className="aspect-square w-full relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-200 shadow-sm transition-transform group-hover:scale-[1.03]">
                    {podcast.imageUrl ? (
                      <img 
                        src={podcast.imageUrl} 
                        alt={podcast.title} 
                        className="w-full h-full object-cover grayscale" 
                        loading="lazy" 
                        decoding="async" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-xs text-center p-2">Nincs borító</div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{podcast.title}</h3>
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