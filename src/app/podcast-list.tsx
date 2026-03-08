"use client";

import { useState } from 'react';
import Link from 'next/link';

// Define the shape of a podcast object
type Podcast = {
  id: string;
  title: string;
  author: string | null;
  imageUrl: string | null;
  category: string | null;
  _count: { episodes: number };
};

type Props = {
  podcasts: Podcast[];
  featuredPodcastId?: string;
};

// Helper to group podcasts by category
const groupPodcastsByCategory = (podcasts: Podcast[]) => {
  return podcasts.reduce((groups, podcast) => {
    const category = podcast.category || 'Egyéb';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(podcast);
    return groups;
  }, {} as Record<string, Podcast[]>);
};

export default function PodcastList({ podcasts, featuredPodcastId }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filter podcasts based on search term
  const filteredPodcasts = podcasts.filter((podcast) => {
    // Exclude featured podcast from the list
    if (podcast.id === featuredPodcastId) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      podcast.title.toLowerCase().includes(searchLower) ||
      (podcast.author && podcast.author.toLowerCase().includes(searchLower))
    );
  });

  // 2. Group the FILTERED podcasts by category
  const podcastsByCategory = groupPodcastsByCategory(filteredPodcasts);
  const sortedCategories = Object.keys(podcastsByCategory).sort();

  return (
    <div className="space-y-12">
      {/* Search Box - Centered below banner */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Keresés podcast vagy szerző alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Categorized Podcast Grid */}
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

      {/* No Results State */}
      {searchTerm && filteredPodcasts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nincs találat a(z) "{searchTerm}" kifejezésre.
        </div>
      )}
    </div>
  );
}