'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function DiscoverCollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [featuredCollection, setFeaturedCollection] = useState<any | null>(null);

  useEffect(() => {
    loadCollections();
  }, [sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        loadCollections();
      } else {
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
      const collectionsData = data.collections || [];
      setCollections(collectionsData);
      
      // Set featured collection (first/most popular one)
      if (collectionsData.length > 0 && !searchQuery.trim()) {
        setFeaturedCollection(collectionsData[0]);
      } else {
        setFeaturedCollection(null);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-medium leading-tight text-black dark:text-white">
            Discover Collections
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Explore curated travel collections from the community. Find inspiration for your next adventure.
          </p>
        </div>
      </section>

      {/* Search and Sort Toolbar - Lighter, Inline */}
      <div className="px-6 md:px-10 lg:px-12 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 text-sm font-normal text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 text-sm font-normal text-gray-700 dark:text-gray-300"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Editorial Band - Featured Collection */}
      {featuredCollection && !searchQuery.trim() && (
        <div className="px-6 md:px-10 lg:px-12 mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
              <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                Featured Collection
              </div>
              <button
                onClick={() => router.push(`/collection/${featuredCollection.id}`)}
                className="group w-full text-left"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Featured Image - Square */}
                  <div className="relative w-full md:w-64 h-64 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow">
                    {featuredCollection.emoji && (
                      <div className="absolute inset-0 flex items-center justify-center text-6xl">
                        {featuredCollection.emoji}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white mb-2 group-hover:opacity-80 transition-opacity">
                        {featuredCollection.name}
                      </h2>
                      {featuredCollection.description && (
                        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                          {featuredCollection.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                      {featuredCollection.user_profiles && (
                        <div className="flex items-center gap-2">
                          {featuredCollection.user_profiles.avatar_url ? (
                            <div className="relative w-5 h-5 rounded-full overflow-hidden">
                              <Image
                                src={featuredCollection.user_profiles.avatar_url}
                                alt={featuredCollection.user_profiles.display_name || featuredCollection.user_profiles.username}
                                fill
                                className="object-cover"
                                sizes="20px"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                              {(featuredCollection.user_profiles.display_name || featuredCollection.user_profiles.username)?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs">
                            {featuredCollection.user_profiles.display_name || featuredCollection.user_profiles.username}
                          </span>
                        </div>
                      )}
                      <span className="text-xs">
                        {featuredCollection.destination_count || 0} places
                      </span>
                    </div>
                    
                    {/* CTA */}
                    <div className="flex items-center gap-2 text-sm font-normal text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                      <span>View collection</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections Grid */}
      <div className="px-6 md:px-10 lg:px-12 pb-24">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <p className="text-sm font-normal">Loading...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <p className="text-sm font-normal">No collections found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => router.push(`/collection/${collection.id}`)}
                  className="text-left group"
                >
                  {/* Square Image Container */}
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow mb-3">
                    {collection.emoji ? (
                      <div className="absolute inset-0 flex items-center justify-center text-5xl">
                        {collection.emoji}
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>

                  {/* Simplified Metadata Stack */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-base leading-tight text-black dark:text-white line-clamp-1 group-hover:opacity-80 transition-opacity">
                      {collection.name}
                    </h3>
                    
                    {collection.description && (
                      <p className="text-sm font-normal text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {collection.description}
                      </p>
                    )}

                    {/* Minimal Meta */}
                    <div className="flex items-center gap-3 text-xs font-normal text-gray-500 dark:text-gray-500 pt-1">
                      {collection.user_profiles && (
                        <span>
                          {collection.user_profiles.display_name || collection.user_profiles.username}
                        </span>
                      )}
                      <span>·</span>
                      <span>{collection.destination_count || 0} places</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
