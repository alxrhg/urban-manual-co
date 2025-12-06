'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cityCountryMap } from "@/data/cityCountryMap";
import Image from "next/image";
import { WorldMapVisualization } from "@/components/WorldMapVisualization";
import { PageLoader } from "@/components/LoadingStates";
import type { Collection, SavedPlace, VisitedPlace } from "@/types/common";
import type { Trip } from "@/types/trip";
import type { User } from "@supabase/supabase-js";
import { toast } from "@/lib/toast";

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
  const [user, setUser] = useState<User | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [totalDestinations, setTotalDestinations] = useState(0);

  // Collection creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(true);
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Trip management state
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

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
      setAuthChecked(true);
    }

    checkAuth();
  }, []);

  // Fetch total destinations count
  useEffect(() => {
    async function fetchTotalDestinations() {
      try {
        const { count } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true });
        setTotalDestinations(count || 0);
      } catch (error) {
        console.error('Error fetching total destinations:', error);
      }
    }
    fetchTotalDestinations();
  }, []);

  // Load user data - extracted as a function to be callable
  const loadUserData = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      // Load saved, visited, collections, and trips
      const [savedResult, visitedResult, collectionsResult, tripsResult] = await Promise.all([
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
          .order('created_at', { ascending: false }),
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      // Collect all unique slugs
      const allSlugs = new Set<string>();
      interface SavedPlaceRow {
        destination_slug: string;
      }
      interface VisitedPlaceRow {
        destination_slug: string;
        visited_at?: string;
        rating?: number;
        notes?: string;
      }
      
      if (savedResult.data) {
        (savedResult.data as SavedPlaceRow[]).forEach((item) => allSlugs.add(item.destination_slug));
      }
      if (visitedResult.data) {
        (visitedResult.data as VisitedPlaceRow[]).forEach((item) => allSlugs.add(item.destination_slug));
      }

      // Fetch destinations with location data for map
      if (allSlugs.size > 0) {
        interface DestRow {
          slug: string;
          name: string;
          city: string;
          category: string;
          image?: string;
          latitude?: number | null;
          longitude?: number | null;
          country?: string;
        }
        
        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));

        if (destData) {
          const typedDestData = destData as DestRow[];
          
          // Map saved places
          if (savedResult.data) {
            const typedSavedData = savedResult.data as SavedPlaceRow[];
            setSavedPlaces(typedSavedData.map((item) => {
              const dest = typedDestData.find((d) => d.slug === item.destination_slug);
              return dest ? {
                id: 0, // placeholder
                user_id: user.id,
                destination_id: 0, // placeholder
                destination_slug: dest.slug,
                created_at: '',
                destination: {
                  slug: dest.slug,
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image,
                  country: dest.country
                }
              } as SavedPlace : null;
            }).filter((item): item is SavedPlace => item !== null));
          }

          // Map visited places
          if (visitedResult.data) {
            const typedVisitedData = visitedResult.data as VisitedPlaceRow[];
            setVisitedPlaces(typedVisitedData.map((item) => {
              const dest = typedDestData.find((d) => d.slug === item.destination_slug);
              return dest ? {
                id: 0, // placeholder
                user_id: user.id,
                destination_id: 0, // placeholder
                destination_slug: dest.slug,
                visited_at: item.visited_at,
                rating: item.rating,
                notes: item.notes,
                created_at: '',
                destination: {
                  slug: dest.slug,
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image,
                  latitude: dest.latitude,
                  longitude: dest.longitude,
                  country: dest.country
                }
              } as VisitedPlace : null;
            }).filter((item): item is VisitedPlace => item !== null));
          }
        }
      }

      // Set collections
      if (collectionsResult.data) {
        setCollections(collectionsResult.data);
      }

      // Set trips
      if (tripsResult.data) {
        setTrips(tripsResult.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;

    setCreatingCollection(true);
    try {
      // Use API endpoint for better error handling and RLS compliance
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim() || null,
          is_public: newCollectionPublic,
          emoji: '📚',
          color: '#3B82F6',
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.details || 'Failed to create collection';
        throw new Error(errorMessage);
      }

      // Response is ok, extract collection data
      const data = responseData.collection;

      if (!data) {
        throw new Error('Invalid response from server');
      }

      // Add new collection to list and reload to ensure consistency
      setCollections([data, ...collections]);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionPublic(true);
      setShowCreateModal(false);
      
      // Reload collections to ensure we have the latest data
      await loadUserData();
    } catch (error) {
      console.error('Error creating collection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create collection. Please try again.';
      toast.error(errorMessage);
    } finally {
      setCreatingCollection(false);
    }
  };

  // Calculate stats
  const stats = useMemo((): {
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
    visitedCount: number;
    savedCount: number;
    collectionsCount: number;
    curationCompletionPercentage: number;
    visitedDestinationsWithCoords: Array<{
      city: string;
      latitude?: number | null;
      longitude?: number | null;
    }>;
  } => {
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter((city): city is string => typeof city === 'string'),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    // Get countries from destination.country field first, fallback to cityCountryMap
    const countriesFromDestinations = new Set([
      ...savedPlaces.map(p => p.destination?.country).filter((country): country is string => typeof country === 'string' && country.trim().length > 0),
      ...visitedPlaces.filter(p => p.destination?.country).map(p => p.destination!.country!).filter((country): country is string => typeof country === 'string' && country.trim().length > 0)
    ]);
    
    // Also get countries from city mapping for destinations without country field
    // Normalize city names to match cityCountryMap format (lowercase, hyphenated)
    const countriesFromCities = Array.from(uniqueCities)
      .map(city => {
        if (!city) return null;
        // Try exact match first
        let country = cityCountryMap[city];
        if (country) return country;
        
        // Try lowercase match
        const cityLower = city.toLowerCase();
        country = cityCountryMap[cityLower];
        if (country) return country;
        
        // Try hyphenated version (e.g., "New York" -> "new-york")
        const cityHyphenated = cityLower.replace(/\s+/g, '-');
        country = cityCountryMap[cityHyphenated];
        if (country) return country;
        
        // Try without hyphens (e.g., "new-york" -> "newyork" - less common but possible)
        const cityNoHyphens = cityLower.replace(/-/g, '');
        country = cityCountryMap[cityNoHyphens];
        
        return country || null;
      })
      .filter((country): country is string => country !== null && country !== undefined);
    
    const uniqueCountries = new Set([
      ...Array.from(countriesFromDestinations),
      ...countriesFromCities
    ]);
    
    // Extract visited destinations with coordinates for map
    const visitedDestinationsWithCoords = visitedPlaces
      .filter(p => p.destination)
      .map(p => ({
        city: p.destination!.city,
        latitude: p.destination!.latitude,
        longitude: p.destination!.longitude,
      }))
      .filter(d => d.latitude && d.longitude);

    const curationCompletionPercentage = totalDestinations > 0
      ? Math.round((visitedPlaces.length / totalDestinations) * 100)
      : 0;

    return {
      uniqueCities,
      uniqueCountries,
      visitedCount: visitedPlaces.length,
      savedCount: savedPlaces.length,
      collectionsCount: collections.length,
      curationCompletionPercentage,
      visitedDestinationsWithCoords
    };
  }, [savedPlaces, visitedPlaces, collections, totalDestinations]);

  // Show loading
  if (!authChecked || isLoadingData) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  // Show sign in screen
  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Account</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Sign in to save places, track visits, and create collections
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen">
      {/* Map Hero */}
      {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
        <section className="w-full h-[50vh] relative">
          <WorldMapVisualization
            visitedCountries={stats.uniqueCountries}
            visitedDestinations={stats.visitedDestinationsWithCoords}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-black pointer-events-none" />
        </section>
      )}

      <div className="px-6 md:px-10 py-12">
        {/* Journey Summary */}
        <header className="max-w-2xl mb-20">
          <p className="text-3xl md:text-4xl font-light leading-snug mb-8">
            {stats.visitedCount === 0 ? (
              <>Your journey begins here.</>
            ) : (
              <>
                You&apos;ve visited{' '}
                <span className="text-black dark:text-white">{stats.visitedCount} {stats.visitedCount === 1 ? 'place' : 'places'}</span>
                {stats.uniqueCities.size > 0 && (
                  <> across <span className="text-black dark:text-white">{stats.uniqueCities.size} {stats.uniqueCities.size === 1 ? 'city' : 'cities'}</span></>
                )}
                {stats.uniqueCountries.size > 0 && (
                  <> in <span className="text-black dark:text-white">{stats.uniqueCountries.size} {stats.uniqueCountries.size === 1 ? 'country' : 'countries'}</span></>
                )}.
              </>
            )}
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>{user.email}</span>
            <span>·</span>
            <button onClick={handleSignOut} className="hover:text-black dark:hover:text-white transition-colors">
              Sign out
            </button>
            <span>·</span>
            <button onClick={() => router.push('/account/settings')} className="hover:text-black dark:hover:text-white transition-colors">
              Settings
            </button>
          </div>
        </header>

        {/* Progress */}
        {totalDestinations > 0 && (
          <section className="max-w-2xl mb-20">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-gray-400">{stats.curationCompletionPercentage}% of curation explored</p>
              <p className="text-xs text-gray-400">{stats.visitedCount}/{totalDestinations}</p>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-800">
              <div className="h-px bg-black dark:bg-white transition-all duration-700" style={{ width: `${stats.curationCompletionPercentage}%` }} />
            </div>
          </section>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-20">
          {/* Left: Activity */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-8">Activity</h2>

            {visitedPlaces.length === 0 && savedPlaces.length === 0 ? (
              <p className="text-gray-400">
                No activity yet.{' '}
                <button onClick={() => router.push('/')} className="text-black dark:text-white hover:opacity-60">
                  Start exploring
                </button>
              </p>
            ) : (
              <div className="space-y-1">
                {/* Combine and sort by date */}
                {[
                  ...visitedPlaces.map(p => ({ ...p, type: 'visited' as const })),
                  ...savedPlaces.map(p => ({ ...p, type: 'saved' as const }))
                ]
                  .slice(0, 12)
                  .map((item) => (
                    <button
                      key={`${item.type}-${item.destination_slug}`}
                      onClick={() => router.push(`/destination/${item.destination_slug}`)}
                      className="w-full flex items-center gap-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 rounded transition-colors text-left group"
                    >
                      {item.destination?.image && (
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <Image src={item.destination.image} alt="" fill className="object-cover" sizes="48px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm group-hover:text-black dark:group-hover:text-white transition-colors">{item.destination?.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.destination && capitalizeCity(item.destination.city)}
                          <span className="mx-2">·</span>
                          {item.type === 'visited' ? 'Visited' : 'Saved'}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {(visitedPlaces.length > 12 || savedPlaces.length > 0) && (
              <div className="mt-6 flex gap-4 text-sm">
                {visitedPlaces.length > 0 && (
                  <button onClick={() => router.push('/account?tab=visited')} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    All visited ({visitedPlaces.length})
                  </button>
                )}
                {savedPlaces.length > 0 && (
                  <button onClick={() => router.push('/account?tab=saved')} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    All saved ({savedPlaces.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Organized */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-8">Organized</h2>

            {/* Collections */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Collections</p>
                <button onClick={() => setShowCreateModal(true)} className="text-sm text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  New
                </button>
              </div>
              {collections.length === 0 ? (
                <p className="text-gray-400 text-sm">No collections yet</p>
              ) : (
                <div className="space-y-1">
                  {collections.slice(0, 5).map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => router.push(`/collection/${collection.id}`)}
                      className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 rounded transition-colors text-left"
                    >
                      <span className="text-lg">{collection.emoji || '📚'}</span>
                      <span className="text-sm flex-1">{collection.name}</span>
                      <span className="text-xs text-gray-400">{collection.destination_count || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trips */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Trips</p>
                <button onClick={() => { setEditingTripId(null); setShowTripDialog(true); }} className="text-sm text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  New
                </button>
              </div>
              {trips.length === 0 ? (
                <p className="text-gray-400 text-sm">No trips planned</p>
              ) : (
                <div className="space-y-1">
                  {trips.slice(0, 5).map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => router.push(`/trips/${trip.id}`)}
                      className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 rounded transition-colors text-left"
                    >
                      <span className="text-sm flex-1">{trip.title}</span>
                      {trip.start_date && (
                        <span className="text-xs text-gray-400">
                          {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Achievements - Inline badges */}
        {stats.visitedCount > 0 && (
          <section className="mt-20 pt-12 border-t border-gray-100 dark:border-gray-800">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-6">Milestones</h2>
            <div className="flex flex-wrap gap-3">
              {stats.visitedCount >= 1 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">First visit</span>}
              {stats.savedCount >= 1 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">First save</span>}
              {stats.uniqueCities.size >= 5 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">5 cities</span>}
              {stats.uniqueCities.size >= 10 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">10 cities</span>}
              {stats.uniqueCountries.size >= 5 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">5 countries</span>}
              {stats.visitedCount >= 10 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">10 places</span>}
              {stats.visitedCount >= 25 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">25 places</span>}
              {stats.visitedCount >= 50 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">50 places</span>}
              {stats.visitedCount >= 100 && <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">Legend</span>}
            </div>
          </section>
        )}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-medium mb-6">New Collection</p>
            <input
              type="text"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="Name"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              autoFocus
            />
            <textarea
              value={newCollectionDescription}
              onChange={e => setNewCollectionDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creatingCollection}
                className="flex-1 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {creatingCollection ? '...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
