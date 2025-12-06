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
      <div className="w-full">
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

        {/* Tab Navigation - Pill buttons following design system */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-2">
            {(['profile', 'visited', 'saved', 'collections', 'trips', 'achievements', 'preferences', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
                  activeTab === tab
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="fade-in">
            {/* Curation Progress */}
            <div className="pb-8 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-light">{stats.curationCompletionPercentage}%</span>
                <span className="text-sm text-gray-500">of curation explored</span>
              </div>
              <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(stats.curationCompletionPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {stats.visitedCount} of {totalDestinations} places visited
              </p>
            </div>

            {/* Stats Row */}
            <div className="py-8 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap gap-x-12 gap-y-4">
                <div>
                  <div className="text-2xl font-light">{stats.visitedCount}</div>
                  <div className="text-xs text-gray-500">Visited</div>
                </div>
                <div>
                  <div className="text-2xl font-light">{stats.savedCount}</div>
                  <div className="text-xs text-gray-500">Saved</div>
                </div>
                <div>
                  <div className="text-2xl font-light">{stats.uniqueCities.size}</div>
                  <div className="text-xs text-gray-500">Cities</div>
                </div>
                <div>
                  <div className="text-2xl font-light">{stats.uniqueCountries.size}</div>
                  <div className="text-xs text-gray-500">Countries</div>
                </div>
              </div>
            </div>

            {/* World Map */}
            {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
              <div className="py-8 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium">Travel Map</h2>
                  <p className="text-xs text-gray-500">
                    {stats.uniqueCountries.size > 0 && `${stats.uniqueCountries.size} ${stats.uniqueCountries.size === 1 ? 'country' : 'countries'}`}
                    {stats.uniqueCountries.size > 0 && stats.uniqueCities.size > 0 && ' · '}
                    {stats.uniqueCities.size > 0 && `${stats.uniqueCities.size} ${stats.uniqueCities.size === 1 ? 'city' : 'cities'}`}
                  </p>
                </div>
                <WorldMapVisualization
                  visitedCountries={stats.uniqueCountries}
                  visitedDestinations={stats.visitedDestinationsWithCoords}
                />
              </div>
            )}

            {/* Recent Visits */}
            {visitedPlaces.length > 0 && (
              <div className="py-8">
                <h2 className="text-sm font-medium mb-6">Recent Visits</h2>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visitedPlaces.slice(0, 5).map((place) => (
                    <button
                      key={place.destination_slug}
                      onClick={() => router.push(`/destination/${place.destination_slug}`)}
                      className="w-full flex items-center gap-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 transition-colors text-left"
                    >
                      {place.destination?.image && (
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <Image
                            src={place.destination.image}
                            alt={place.destination.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{place.destination?.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {place.destination && capitalizeCity(place.destination.city)} · {place.destination?.category}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {place.visited_at && new Date(place.visited_at).toLocaleDateString()}
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
            <EnhancedVisitedTab
              visitedPlaces={visitedPlaces}
              onPlaceAdded={loadUserData}
            />
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
              <NoCollectionsEmptyState onCreateCollection={() => setShowCreateModal(true)} />
            ) : (
              <>
                <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <h2 className="text-sm font-medium">{collections.length} {collections.length === 1 ? 'Collection' : 'Collections'}</h2>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                  >
                    New Collection
                  </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => router.push(`/collection/${collection.id}`)}
                      className="w-full flex items-center gap-4 py-5 hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 transition-colors text-left"
                    >
                      <span className="text-2xl">{collection.emoji || '📚'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{collection.name}</div>
                        {collection.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{collection.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{collection.destination_count || 0} places</span>
                        {collection.is_public && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">Public</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div className="fade-in">
            {trips.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500 mb-6">No trips yet</p>
                <button
                  onClick={() => {
                    if (!user) {
                      router.push('/auth/login');
                    } else {
                      setEditingTripId(null);
                      setShowTripDialog(true);
                    }
                  }}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                >
                  {user ? "Create your first trip" : "Sign in to create trip"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <h2 className="text-sm font-medium">{trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}</h2>
                  </div>
                  <button
                    onClick={() => {
                      if (!user) {
                        router.push('/auth/login');
                      } else {
                        setEditingTripId(null);
                        setShowTripDialog(true);
                      }
                    }}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    New Trip
                  </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      className="py-5 -mx-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => router.push(`/trips/${trip.id}`)}
                          className="flex-1 text-left min-w-0"
                        >
                          <h3 className="text-sm font-medium line-clamp-1">{trip.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                            {trip.destination && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {formatDestinationsFromField(trip.destination)}
                              </span>
                            )}
                            {(trip.start_date || trip.end_date) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                              </span>
                            )}
                            {trip.status && (
                              <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                                {trip.status}
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTripId(trip.id);
                              setShowTripDialog(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label={`Edit ${trip.title}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete "${trip.title}"?`)) {
                                try {
                                  const { error } = await supabase
                                    .from('trips')
                                    .delete()
                                    .eq('id', trip.id);
                                  if (error) throw error;
                                  await loadUserData();
                                } catch (error) {
                                  console.error('Error deleting trip:', error);
                                  toast.error('Failed to delete trip');
                                }
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`Delete ${trip.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="fade-in">
            <AchievementsDisplay
              visitedPlaces={visitedPlaces}
              savedPlaces={savedPlaces}
              uniqueCities={stats.uniqueCities}
              uniqueCountries={stats.uniqueCountries}
            />
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && user && (
          <div className="fade-in">
            <PreferencesTab userId={user.id} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && user && (
          <div className="fade-in">
            {/* Profile Section */}
            <section className="pb-8 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-medium mb-6">Profile</h2>
              <ProfileEditor
                userId={user.id}
                onSaveComplete={() => {
                  toast.success('Profile updated');
                }}
              />
            </section>

            {/* Security Section */}
            <section className="py-8 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-medium mb-6">Security</h2>
              <SecuritySettings />
            </section>

            {/* Privacy & Data Section */}
            <section className="py-8">
              <h2 className="text-sm font-medium mb-6">Privacy & Data</h2>
              <AccountPrivacyManager />

              {/* Cookie Settings */}
              <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                <div>
                  <p className="text-sm font-medium">Cookie Preferences</p>
                  <p className="text-xs text-gray-500 mt-0.5">Control how we use cookies</p>
                </div>
                <button
                  onClick={openCookieSettings}
                  className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  Manage
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium mb-6">Create Collection</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2">Description</label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none text-sm"
                  maxLength={200}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Make this collection public</span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                disabled={creatingCollection}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creatingCollection}
                className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {creatingCollection ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
