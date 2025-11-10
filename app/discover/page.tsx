'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';

export default function DiscoverCollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, [sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        loadCollections();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sort: sortBy,
        ...(searchQuery.trim() && { q: searchQuery })
      });

      const response = await fetch(`/api/collections/discover?${params}`);
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="px-6 md:px-10 py-20 min-h-screen">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-light mb-2">Discover Collections</h1>
          <p className="text-sm text-gray-500">
            Explore curated travel collections from the community
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-blue-900 border border-gray-200 dark:border-dark-blue-600 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-dark-blue-900 border border-gray-200 dark:border-dark-blue-600 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-sm">Loading...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-sm">No collections found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => router.push(`/collection/${collection.id}`)}
                className="text-left p-6 border border-gray-200 dark:border-dark-blue-600 rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-blue-800 transition-colors group"
              >
                {/* Collection Header */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-4xl">{collection.emoji || '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg mb-1 line-clamp-1">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Creator Info */}
                {collection.user_profiles && (
                  <div className="flex items-center gap-2 mb-4">
                    {collection.user_profiles.avatar_url ? (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden">
                        <Image
                          src={collection.user_profiles.avatar_url}
                          alt={collection.user_profiles.display_name || collection.user_profiles.username}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-blue-700 flex items-center justify-center text-xs">
                        {(collection.user_profiles.display_name || collection.user_profiles.username)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      by {collection.user_profiles.display_name || collection.user_profiles.username}
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{collection.destination_count || 0} places</span>
                  {collection.view_count > 0 && (
                    <span>{collection.view_count} views</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
