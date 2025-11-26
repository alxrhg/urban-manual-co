'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus, Calendar, Trash2, Edit2, Bookmark, Compass, User, Settings } from "lucide-react";
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
import { PreferencesTab } from "@/components/account/PreferencesTab";
import { openCookieSettings } from "@/components/CookieConsent";
import type { Collection, SavedPlace, VisitedPlace } from "@/types/common";
import type { Trip } from "@/types/trip";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function AccountStatCard({ icon: Icon, value, label }: { icon: any, value: number, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
      <div className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-sm mb-1">
        <Icon className="h-5 w-5 text-gray-900 dark:text-white" />
      </div>
      <span className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
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
      alert(errorMessage);
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

    // Get countries logic (simplified for brevity but kept functional)
    const countriesFromDestinations = new Set([
      ...savedPlaces.map(p => p.destination?.country).filter((country): country is string => typeof country === 'string' && country.trim().length > 0),
      ...visitedPlaces.filter(p => p.destination?.country).map(p => p.destination!.country!).filter((country): country is string => typeof country === 'string' && country.trim().length > 0)
    ]);
    
    const countriesFromCities = Array.from(uniqueCities)
      .map(city => {
        if (!city) return null;
        let country = cityCountryMap[city];
        if (country) return country;
        const cityLower = city.toLowerCase();
        country = cityCountryMap[cityLower];
        if (country) return country;
        const cityHyphenated = cityLower.replace(/\s+/g, '-');
        country = cityCountryMap[cityHyphenated];
        return country || null;
      })
      .filter((country): country is string => country !== null && country !== undefined);
    
    const uniqueCountries = new Set([
      ...Array.from(countriesFromDestinations),
      ...countriesFromCities
    ]);
    
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
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-6 mx-auto">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-semibold mb-3">Sign in to Urban Manual</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Unlock your personal travel guide. Save places, create trips, and sync across devices.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Sign In / Sign Up
            </button>
          </div>
        </div>
      </main>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Overview' },
    { id: 'visited', label: 'Visited' },
    { id: 'saved', label: 'Saved' },
    { id: 'trips', label: 'Trips' },
    { id: 'collections', label: 'Collections' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'settings', label: 'Settings' },
  ] as const;

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Header Background */}
      <div className="h-48 w-full bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-10 -mt-24">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
          <div className="flex items-end gap-6">
            <div className="relative h-32 w-32 rounded-full border-4 border-white dark:border-gray-950 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                <span className="text-4xl font-medium text-gray-400">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3 mb-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-800 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="pb-20">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-10 fade-in">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AccountStatCard icon={MapPin} value={stats.visitedCount} label="Visited" />
                <AccountStatCard icon={Bookmark} value={stats.savedCount} label="Saved" />
                <AccountStatCard icon={Compass} value={stats.collectionsCount + trips.length} label="Plans" />
                <AccountStatCard icon={User} value={stats.uniqueCountries.size} label="Countries" />
              </div>

              {/* Curation Progress */}
              <div className="p-8 border border-gray-200 dark:border-gray-800 rounded-3xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Explorer Level</h3>
                      <p className="text-sm text-gray-500">Your journey through our curated destinations</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{stats.curationCompletionPercentage}%</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">Complete</div>
                    </div>
                  </div>
                  
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black dark:bg-white transition-all duration-1000 ease-out"
                      style={{ width: `${Math.max(stats.curationCompletionPercentage, 2)}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-4 font-medium">
                    {stats.visitedCount} of {totalDestinations} curated places visited
                  </p>
                </div>
              </div>

              {/* World Map */}
              {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Travel Map</h3>
                  <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 h-[400px]">
                    <WorldMapVisualization 
                      visitedCountries={stats.uniqueCountries}
                      visitedDestinations={stats.visitedDestinationsWithCoords}
                    />
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
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Your Collections</h3>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                      + New Collection
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => router.push(`/collection/${collection.id}`)}
                        className="text-left p-5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            {collection.emoji || '📚'}
                          </div>
                          <h3 className="font-semibold text-base flex-1 truncate">{collection.name}</h3>
                        </div>
                        {collection.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{collection.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wide pt-2 border-t border-gray-100 dark:border-gray-800">
                          <span>{collection.destination_count || 0} places</span>
                          {collection.is_public && <span>• Public</span>}
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Your Trips</h3>
                <button
                  onClick={() => {
                    setEditingTripId(null);
                    setShowTripDialog(true);
                  }}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Trip
                </button>
              </div>

              {trips.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
                  <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">No trips planned yet</p>
                  <button
                    onClick={() => {
                      setEditingTripId(null);
                      setShowTripDialog(true);
                    }}
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Create your first trip
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all bg-white dark:bg-gray-900"
                    >
                      <button
                        onClick={() => router.push(`/trips/${trip.id}`)}
                        className="text-left p-5 flex-1"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg line-clamp-1">{trip.title}</h3>
                          {trip.status && (
                            <span className="capitalize text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 uppercase tracking-wider">
                              {trip.status}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          {trip.destination && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="h-4 w-4" />
                              <span>{trip.destination}</span>
                            </div>
                          )}
                          {(trip.start_date || trip.end_date) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-2 p-4 pt-0 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/trips/${trip.id}`);
                          }}
                          className="flex-1 text-xs font-medium py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Delete trip "${trip.title}"?`)) {
                              try {
                                const { error } = await supabase
                                  .from('trips')
                                  .delete()
                                  .eq('id', trip.id);
                                if (error) throw error;
                                await loadUserData();
                              } catch (error) {
                                console.error('Error deleting trip:', error);
                              }
                            }
                          }}
                          className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold mb-6">Preferences</h3>
                <PreferencesTab userId={user.id} />
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && user && (
            <div className="fade-in space-y-12 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold mb-6">Edit Profile</h3>
                <ProfileEditor
                  userId={user.id}
                  onSaveComplete={() => {
                    alert('Profile updated successfully!');
                  }}
                />
              </div>
              
              <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
                <AccountPrivacyManager />
              </div>

              <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-2">Privacy & Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Manage your cookie preferences and data settings.
                </p>
                <button
                  onClick={openCookieSettings}
                  className="px-5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm font-medium"
                >
                  Cookie Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">New Collection</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Name</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Description</label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="What's this collection about?"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none text-sm"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="collection-public"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="collection-public" className="text-sm font-medium cursor-pointer">
                  Make this collection public
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                  disabled={creatingCollection}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || creatingCollection}
                  className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {creatingCollection ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
