"use client";

import { useState, useMemo, useEffect } from "react";
import { togglePodcastStatus, getAllPodcasts } from "./actions";

type Podcast = {
  id: string;
  title: string;
  isActive: boolean;
  category: string | null;
};

export default function PodcastManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [localPodcasts, setLocalPodcasts] = useState<Podcast[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch podcasts securely from the server action when the component loads
  useEffect(() => {
    getAllPodcasts().then((data) => {
      setLocalPodcasts(data);
      setIsLoading(false);
    });
  }, []);

  const filteredPodcasts = useMemo(() => {
    if (!searchTerm) return localPodcasts.slice(0, 15);
    const lower = searchTerm.toLowerCase();
    return localPodcasts
      .filter((p) => p.title.toLowerCase().includes(lower))
      .slice(0, 15);
  }, [searchTerm, localPodcasts]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setIsUpdating(id);
    
    // Instantly update UI
    setLocalPodcasts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
    );

    // Update database
    await togglePodcastStatus(id, currentStatus);
    setIsUpdating(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-fit mt-8">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">3. Podcast Manager (Elrejtés / Megjelenítés)</h2>
      <p className="text-gray-600 mb-4 text-sm">Keresés és podcastok elrejtése a főoldalról.</p>
      
      <input
        type="text"
        placeholder="Keresés podcast címe alapján..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-gray-900 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
      />

      {isLoading && <p className="text-gray-500 text-sm">Adatok betöltése...</p>}
      {searchTerm && filteredPodcasts.length === 0 && !isLoading && (
        <p className="text-gray-500 text-sm">Nincs találat erre: "{searchTerm}"</p>
      )}

      <div className="space-y-2">
        {filteredPodcasts.map((podcast) => (
          <div key={podcast.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="font-semibold text-gray-900">{podcast.title}</p>
              <p className="text-xs text-gray-500">
                Kategória: {podcast.category || "Egyéb"} | Állapot: {podcast.isActive ? "🟢 Aktív" : "🔴 Rejtett"}
              </p>
            </div>
            
            <button
              onClick={() => handleToggle(podcast.id, podcast.isActive)}
              disabled={isUpdating === podcast.id}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                podcast.isActive 
                  ? "bg-red-100 text-red-700 hover:bg-red-200" 
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {isUpdating === podcast.id 
                ? "Frissítés..." 
                : podcast.isActive 
                  ? "Elrejtés" 
                  : "Megjelenítés"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}