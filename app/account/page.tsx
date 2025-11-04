'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Heart, Check } from "lucide-react";
import { cityCountryMap } from "@/data/cityCountryMap";
import Image from "next/image";
import { EnhancedVisitedTab } from "@/components/EnhancedVisitedTab";
import { EnhancedSavedTab } from "@/components/EnhancedSavedTab";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'visited' | 'saved' | 'collections'>('profile');

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthChecked(true);
        setIsLoadingData(false);
        return;
      }

      setUser(session.user);
      const role = (session.user.app_metadata as Record<string, any> | undefined)?.role;
      setIsAdmin(role === 'admin');
      setAuthChecked(true);
    }

    checkAuth();
  }, []);

  // Load user data
  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);

        // Load saved, visited, and collections
        const [savedResult, visitedResult, collectionsResult] = await Promise.all([
          supabase
            .from('saved_places')
            .select('destination_slug')
            .eq('user_id', user.id),
          supabase
            .from('visited_places')
            .select('destination_slug, visited_at, rating, notes')
            .eq('user_id', user.id)
            .order('visited_at', { ascending: false }),
          supabase
            .from('collections')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        // Collect all unique slugs
        const allSlugs = new Set<string>();
        if (savedResult.data) {
          savedResult.data.forEach(item => allSlugs.add(item.destination_slug));
        }
        if (visitedResult.data) {
          visitedResult.data.forEach(item => allSlugs.add(item.destination_slug));
        }

        // Fetch destinations
        if (allSlugs.size > 0) {
          const { data: destData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, image')
            .in('slug', Array.from(allSlugs));

          if (destData) {
            // Map saved places
            if (savedResult.data) {
              setSavedPlaces(savedResult.data.map((item: any) => {
                const dest = destData.find((d: any) => d.slug === item.destination_slug);
                return dest ? {
                  destination_slug: dest.slug,
                  destination: {
                    name: dest.name,
                    city: dest.city,
                    category: dest.category,
                    image: dest.image
                  }
                } : null;
              }).filter((item: any) => item !== null));
            }

            // Map visited places
            if (visitedResult.data) {
              setVisitedPlaces(visitedResult.data.map((item: any) => {
                const dest = destData.find((d: any) => d.slug === item.destination_slug);
                return dest ? {
                  destination_slug: item.destination_slug,
                  visited_at: item.visited_at,
                  rating: item.rating,
                  notes: item.notes,
                  destination: {
                    name: dest.name,
                    city: dest.city,
                    category: dest.category,
                    image: dest.image
                  }
                } : null;
              }).filter((item: any) => item !== null));
            }
          }
        }

        // Set collections
        if (collectionsResult.data) {
          setCollections(collectionsResult.data);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadUserData();
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter(Boolean),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    const uniqueCountries = new Set(
      Array.from(uniqueCities).map(city => cityCountryMap[city] || 'Other')
    );

    return {
      uniqueCities,
      uniqueCountries,
      visitedCount: visitedPlaces.length,
      savedCount: savedPlaces.length,
      collectionsCount: collections.length
    };
  }, [savedPlaces, visitedPlaces, collections]);

  // Show loading
  if (!authChecked || isLoadingData) {
    return (
      <main className="px-8 py-20">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </main>
    );
  }

  // Show sign in screen
  if (!user) {
    return (
      <main className="px-8 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Account</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Sign in to save places, track visits, and create collections
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-sm hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-8 py-20 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header - Matches homepage spacing and style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Account</h1>
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>

        {/* Tab Navigation - Minimal, matches homepage city/category style */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {['profile', 'visited', 'saved', 'collections'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`transition-all ${
                  activeTab === tab
                    ? "font-medium text-black dark:text-white"
                    : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-12 fade-in">
            {/* Stats Grid - Minimal, like homepage cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.visitedCount}</div>
                <div className="text-xs text-gray-500">Visited</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.savedCount}</div>
                <div className="text-xs text-gray-500">Saved</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.uniqueCities.size}</div>
                <div className="text-xs text-gray-500">Cities</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.uniqueCountries.size}</div>
                <div className="text-xs text-gray-500">Countries</div>
              </div>
            </div>

            {/* World Map */}
            {(stats.uniqueCountries.size > 0 || stats.uniqueCities.size > 0) && (
              <div>
                <h2 className="text-xs font-medium mb-4 text-gray-500 dark:text-gray-400">Travel Map</h2>
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="text-4xl mb-4">🗺️</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                    {stats.uniqueCountries.size} {stats.uniqueCountries.size === 1 ? 'country' : 'countries'} • {stats.uniqueCities.size} {stats.uniqueCities.size === 1 ? 'city' : 'cities'}
                  </p>
                  <p className="text-xs text-gray-400">Your travel footprint</p>
                </div>
              </div>
            )}

            {/* Recent Visits */}
            {visitedPlaces.length > 0 && (
              <div>
                <h2 className="text-xs font-medium mb-4 text-gray-500 dark:text-gray-400">Recent Visits</h2>
                <div className="space-y-2">
                  {visitedPlaces.slice(0, 5).map((place) => (
                    <button
                      key={place.destination_slug}
                      onClick={() => router.push(`/destination/${place.destination_slug}`)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-2xl transition-colors text-left"
                    >
                      {place.destination.image && (
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <Image
                            src={place.destination.image}
                            alt={place.destination.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{place.destination.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {capitalizeCity(place.destination.city)} • {place.destination.category}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(place.visited_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visited Tab */}
        {activeTab === 'visited' && (
          <div className="fade-in">
            <EnhancedVisitedTab visitedPlaces={visitedPlaces} />
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <div className="fade-in">
            <EnhancedSavedTab savedPlaces={savedPlaces} />
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="fade-in">
            {collections.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-sm text-gray-500">No collections yet</p>
                <p className="text-xs text-gray-400 mt-2">Create lists to organize your places</p>
                <button
                  className="mt-6 px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-sm hover:opacity-80 transition-opacity"
                >
                  Create Collection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    className="text-left p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <h3 className="font-medium text-sm mb-1">{collection.name}</h3>
                    {collection.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{collection.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>0 places</span>
                      {collection.is_public && <span>• Public</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
