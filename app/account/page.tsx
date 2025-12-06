'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus, Calendar, Trash2, Edit2 } from "lucide-react";
import { cityCountryMap } from "@/data/cityCountryMap";
import Image from "next/image";
import { EnhancedVisitedTab } from "@/components/EnhancedVisitedTab";
import { EnhancedSavedTab } from "@/components/EnhancedSavedTab";
import { WorldMapVisualization } from "@/components/WorldMapVisualization";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { PageLoader } from "@/components/LoadingStates";
import { NoCollectionsEmptyState } from "@/components/EmptyStates";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AccountPrivacyManager } from "@/components/AccountPrivacyManager";
import { SecuritySettings } from "@/components/SecuritySettings";
import { PreferencesTab } from "@/components/account/PreferencesTab";
import { openCookieSettings } from "@/components/CookieConsent";
import type { Collection, SavedPlace, VisitedPlace } from "@/types/common";
import { formatDestinationsFromField } from "@/types/trip";
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
  
  // Get initial tab from URL query param - use useEffect to avoid SSR issues
  const [activeTab, setActiveTab] = useState<'profile' | 'visited' | 'saved' | 'collections' | 'achievements' | 'settings' | 'trips' | 'preferences'>('profile');

  // Update tab from URL params after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const validTabs = ['profile', 'visited', 'saved', 'collections', 'achievements', 'settings', 'trips', 'preferences'] as const;
      if (tab && validTabs.includes(tab as typeof validTabs[number])) {
        setActiveTab(tab as typeof activeTab);
      }
    }
  }, []);
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
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="max-w-4xl">
        {/* Header */}
        <header className="mb-16">
          <h1 className="text-3xl font-light mb-2">Account</h1>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{user.email}</p>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Navigation */}
        <nav className="mb-12 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-8 -mb-px overflow-x-auto">
            {(['profile', 'visited', 'saved', 'collections', 'trips', 'achievements', 'preferences', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-black dark:border-white text-black dark:text-white font-medium'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="fade-in">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              {/* Progress */}
              <section className="mb-16">
                <p className="text-sm text-gray-500 mb-4">Curation Progress</p>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-5xl font-light tabular-nums">{stats.curationCompletionPercentage}</span>
                  <span className="text-2xl font-light text-gray-400 mb-1">%</span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-800 mb-3">
                  <div
                    className="h-px bg-black dark:bg-white transition-all duration-700"
                    style={{ width: `${stats.curationCompletionPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{stats.visitedCount} of {totalDestinations} places</p>
              </section>

              {/* Stats */}
              <section className="mb-16">
                <div className="grid grid-cols-4 gap-8">
                  <div>
                    <p className="text-3xl font-light tabular-nums">{stats.visitedCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Visited</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light tabular-nums">{stats.savedCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Saved</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light tabular-nums">{stats.uniqueCities.size}</p>
                    <p className="text-xs text-gray-500 mt-1">Cities</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light tabular-nums">{stats.uniqueCountries.size}</p>
                    <p className="text-xs text-gray-500 mt-1">Countries</p>
                  </div>
                </div>
              </section>

              {/* Map */}
              {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
                <section className="mb-16">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-gray-500">Travel Map</p>
                    <p className="text-xs text-gray-400">
                      {stats.uniqueCountries.size} {stats.uniqueCountries.size === 1 ? 'country' : 'countries'} · {stats.uniqueCities.size} {stats.uniqueCities.size === 1 ? 'city' : 'cities'}
                    </p>
                  </div>
                  <WorldMapVisualization
                    visitedCountries={stats.uniqueCountries}
                    visitedDestinations={stats.visitedDestinationsWithCoords}
                  />
                </section>
              )}

              {/* Recent */}
              {visitedPlaces.length > 0 && (
                <section>
                  <p className="text-sm text-gray-500 mb-6">Recent Visits</p>
                  {visitedPlaces.slice(0, 5).map((place, i) => (
                    <button
                      key={place.destination_slug}
                      onClick={() => router.push(`/destination/${place.destination_slug}`)}
                      className="w-full flex items-center gap-4 py-4 border-t border-gray-100 dark:border-gray-800 first:border-t-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 transition-colors text-left"
                    >
                      {place.destination?.image && (
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <Image src={place.destination.image} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{place.destination?.name}</p>
                        <p className="text-xs text-gray-400">{place.destination && capitalizeCity(place.destination.city)}</p>
                      </div>
                      <p className="text-xs text-gray-400">{place.visited_at && new Date(place.visited_at).toLocaleDateString()}</p>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}

          {/* Visited Tab */}
          {activeTab === 'visited' && (
            <EnhancedVisitedTab visitedPlaces={visitedPlaces} onPlaceAdded={loadUserData} />
          )}

          {/* Saved Tab */}
          {activeTab === 'saved' && (
            <EnhancedSavedTab savedPlaces={savedPlaces} />
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div>
              {collections.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-gray-400 mb-6">No collections yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm text-black dark:text-white hover:opacity-60 transition-opacity"
                  >
                    Create your first collection
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-sm text-gray-500">{collections.length} {collections.length === 1 ? 'collection' : 'collections'}</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="text-sm text-black dark:text-white hover:opacity-60 transition-opacity"
                    >
                      New
                    </button>
                  </div>
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => router.push(`/collection/${collection.id}`)}
                      className="w-full flex items-center gap-4 py-4 border-t border-gray-100 dark:border-gray-800 first:border-t-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 transition-colors text-left"
                    >
                      <span className="text-xl">{collection.emoji || '📚'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{collection.name}</p>
                        {collection.description && <p className="text-xs text-gray-400 truncate">{collection.description}</p>}
                      </div>
                      <p className="text-xs text-gray-400">{collection.destination_count || 0}</p>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Trips Tab */}
          {activeTab === 'trips' && (
            <div>
              {trips.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-gray-400 mb-6">No trips yet</p>
                  <button
                    onClick={() => { setEditingTripId(null); setShowTripDialog(true); }}
                    className="text-sm text-black dark:text-white hover:opacity-60 transition-opacity"
                  >
                    Plan your first trip
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-sm text-gray-500">{trips.length} {trips.length === 1 ? 'trip' : 'trips'}</p>
                    <button
                      onClick={() => { setEditingTripId(null); setShowTripDialog(true); }}
                      className="text-sm text-black dark:text-white hover:opacity-60 transition-opacity"
                    >
                      New
                    </button>
                  </div>
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      className="flex items-center gap-4 py-4 border-t border-gray-100 dark:border-gray-800 first:border-t-0"
                    >
                      <button
                        onClick={() => router.push(`/trips/${trip.id}`)}
                        className="flex-1 text-left hover:opacity-60 transition-opacity"
                      >
                        <p className="text-sm">{trip.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          {trip.destination && <span>{formatDestinationsFromField(trip.destination)}</span>}
                          {trip.start_date && (
                            <span>
                              {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => { setEditingTripId(trip.id); setShowTripDialog(true); }}
                        className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete "${trip.title}"?`)) {
                            const { error } = await supabase.from('trips').delete().eq('id', trip.id);
                            if (!error) await loadUserData();
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <AchievementsDisplay
              visitedPlaces={visitedPlaces}
              savedPlaces={savedPlaces}
              uniqueCities={stats.uniqueCities}
              uniqueCountries={stats.uniqueCountries}
            />
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && user && (
            <PreferencesTab userId={user.id} />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && user && (
            <div>
              <section className="mb-12">
                <p className="text-sm text-gray-500 mb-6">Profile</p>
                <ProfileEditor userId={user.id} onSaveComplete={() => toast.success('Saved')} />
              </section>

              <section className="mb-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 mb-6">Security</p>
                <SecuritySettings />
              </section>

              <section className="pt-8 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 mb-6">Privacy</p>
                <AccountPrivacyManager />
                <button
                  onClick={openCookieSettings}
                  className="mt-6 text-sm text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Cookie preferences
                </button>
              </section>
            </div>
          )}
        </div>
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
