'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";
import { cityCountryMap } from "@/data/cityCountryMap";
import Image from "next/image";
import { WorldMapVisualization } from "@/components/WorldMapVisualization";
import { PageLoader } from "@/components/LoadingStates";
import { NoCollectionsEmptyState } from "@/components/EmptyStates";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AccountPrivacyManager } from "@/components/AccountPrivacyManager";
import { SecuritySettings } from "@/components/SecuritySettings";
import { PreferencesTab } from "@/components/account/PreferencesTab";
import { MCPIntegration } from "@/components/account/MCPIntegration";
import { openCookieSettings } from "@/components/CookieConsent";
// Passport components
import { IdentityPage } from "@/components/account/passport/IdentityPage";
import { VisaPages } from "@/components/account/passport/VisaPages";
import { BucketListPage } from "@/components/account/passport/BucketListPage";
import { EndorsementsPage } from "@/components/account/passport/EndorsementsPage";
import { TripsWallet } from "@/components/account/TripsWallet";
import { PassportNav, type PassportSection } from "@/components/account/passport/PassportNav";
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
  
  // Get initial section from URL query param - use useEffect to avoid SSR issues
  const [activeSection, setActiveSection] = useState<PassportSection>('identity');

  // Update section from URL params after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      // Map old tab names to new passport sections
      const tabToSection: Record<string, PassportSection> = {
        'profile': 'identity',
        'visited': 'stamps',
        'saved': 'bucketlist',
        'collections': 'albums',
        'trips': 'wallet',
        'achievements': 'endorsements',
        'preferences': 'preferences',
        'settings': 'settings',
        // New section names also work
        'identity': 'identity',
        'stamps': 'stamps',
        'bucketlist': 'bucketlist',
        'albums': 'albums',
        'wallet': 'wallet',
        'endorsements': 'endorsements',
      };
      if (tab && tabToSection[tab]) {
        setActiveSection(tabToSection[tab]);
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

  // Show passport application screen (sign in)
  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Passport Application Form */}
            <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Foil strip */}
              <div className="passport-foil h-2" />

              <div className="p-8 text-center">
                {/* Emblem */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-400" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>

                <p className="passport-data text-[10px] text-gray-400 tracking-[0.3em] mb-2">URBAN MANUAL</p>
                <h1 className="passport-data text-xl tracking-widest mb-2">PASSPORT</h1>
                <p className="passport-data text-[10px] text-gray-400 tracking-wider mb-8">APPLICATION FORM</p>

                <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto">
                  Sign in to begin your travel journey. Track visits, collect stamps, and unlock achievements.
                </p>

                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full max-w-xs mx-auto px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
                >
                  Apply for Passport
                </button>

                <p className="passport-data text-[8px] text-gray-400 mt-6">
                  FREE APPLICATION • NO CREDIT CARD REQUIRED
                </p>
              </div>

              {/* Foil strip */}
              <div className="passport-foil h-2" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full">
        {/* Header - Passport Style */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-light">Passport</h1>
              <p className="passport-data text-[10px] text-gray-400 mt-1">Urban Manual Travel Identity</p>
            </div>
            <button
              onClick={handleSignOut}
              className="passport-data text-[10px] text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="passport-data text-[10px] text-gray-400">{user.email}</p>
        </div>

        {/* Passport Navigation */}
        <div className="mb-8">
          <PassportNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            stats={{
              stamps: stats.visitedCount,
              pending: stats.savedCount,
              trips: trips.length,
              endorsements: stats.visitedCount >= 1 ? Math.min(Math.floor(stats.visitedCount / 5) + 1, 10) : 0,
            }}
          />
        </div>

        {/* Identity Page - Passport ID */}
        {activeSection === 'identity' && (
          <div className="space-y-8 fade-in">
            {/* Identity Card */}
            <IdentityPage
              user={user}
              stats={stats}
              onEditProfile={() => {
                // Could open profile editor modal
              }}
            />

            {/* World Map */}
            {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
              <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="passport-data text-[10px] text-gray-400">TRAVEL MAP</p>
                  <p className="passport-data text-[10px] text-gray-400">
                    {stats.uniqueCountries.size > 0 && `${stats.uniqueCountries.size} ${stats.uniqueCountries.size === 1 ? 'NATION' : 'NATIONS'}`}
                    {stats.uniqueCountries.size > 0 && stats.uniqueCities.size > 0 && ' • '}
                    {stats.uniqueCities.size > 0 && `${stats.uniqueCities.size} ${stats.uniqueCities.size === 1 ? 'CITY' : 'CITIES'}`}
                  </p>
                </div>
                <WorldMapVisualization
                  visitedCountries={stats.uniqueCountries}
                  visitedDestinations={stats.visitedDestinationsWithCoords}
                />
              </div>
            )}

            {/* Recent Entries */}
            {visitedPlaces.length > 0 && (
              <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800">
                  <p className="passport-data text-[10px] text-gray-400">RECENT ENTRIES</p>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {visitedPlaces.slice(0, 5).map((place) => (
                      <button
                        key={place.destination_slug}
                        onClick={() => router.push(`/destination/${place.destination_slug}`)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors text-left"
                      >
                        {place.destination?.image && (
                          <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <Image
                              src={place.destination.image}
                              alt={place.destination.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{place.destination?.name}</div>
                          <div className="passport-data text-[10px] text-gray-500 mt-0.5">
                            {place.destination && capitalizeCity(place.destination.city).toUpperCase()} • {place.destination?.category?.toUpperCase()}
                          </div>
                          <div className="passport-data text-[9px] text-gray-400 mt-0.5">
                            {place.visited_at && new Date(place.visited_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stamps Page - Visa Pages */}
        {activeSection === 'stamps' && (
          <div className="fade-in">
            <VisaPages visitedPlaces={visitedPlaces} />
          </div>
        )}

        {/* Bucket List Page - Saved Places */}
        {activeSection === 'bucketlist' && (
          <div className="fade-in">
            <BucketListPage savedPlaces={savedPlaces} />
          </div>
        )}

        {/* Travel Albums - Collections */}
        {activeSection === 'albums' && (
          <div className="fade-in">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="passport-data text-[10px] text-gray-400">TRAVEL ALBUMS</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {collections.length} {collections.length === 1 ? 'album' : 'albums'}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  New Album
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="passport-paper passport-guilloche rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 md:p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-3xl">
                    📚
                  </div>
                  <h3 className="passport-data text-sm mb-2">NO ALBUMS YET</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mb-6">
                    Create travel albums to organize your favorite destinations by theme.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                  >
                    Create First Album
                  </button>
                </div>
              ) : (
                <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <p className="passport-data text-[10px] text-gray-400">YOUR COLLECTIONS</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {collections.map((collection) => (
                        <button
                          key={collection.id}
                          onClick={() => router.push(`/collection/${collection.id}`)}
                          className="text-left p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{collection.emoji || '📚'}</span>
                            <h3 className="font-medium text-sm flex-1 truncate">{collection.name}</h3>
                          </div>
                          {collection.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{collection.description}</p>
                          )}
                          <div className="flex items-center gap-2 passport-data text-[10px] text-gray-400">
                            <span>{collection.destination_count || 0} PLACES</span>
                            {collection.is_public && <span>• PUBLIC</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Wallet - Trips */}
        {activeSection === 'wallet' && (
          <div className="fade-in">
            <TripsWallet
              trips={trips}
              onNewTrip={() => {
                if (!user) {
                  router.push('/auth/login');
                } else {
                  setEditingTripId(null);
                  setShowTripDialog(true);
                }
              }}
            />
          </div>
        )}

        {/* Endorsements - Achievements */}
        {activeSection === 'endorsements' && (
          <div className="fade-in">
            <EndorsementsPage
              achievements={[]}
              stats={stats}
            />
          </div>
        )}

        {/* Preferences */}
        {activeSection === 'preferences' && user && (
          <div className="fade-in">
            <div className="space-y-6">
              <div>
                <p className="passport-data text-[10px] text-gray-400 mb-4">TRAVELER PREFERENCES</p>
              </div>
              <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <PreferencesTab userId={user.id} />
              </div>
              <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <p className="passport-data text-[10px] text-gray-400 mb-4">INTEGRATIONS</p>
                <MCPIntegration />
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeSection === 'settings' && user && (
          <div className="fade-in space-y-6">
            <div>
              <p className="passport-data text-[10px] text-gray-400 mb-4">PASSPORT SETTINGS</p>
            </div>

            {/* Profile Section */}
            <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="passport-data text-[10px] text-gray-400">HOLDER INFORMATION</p>
              </div>
              <div className="p-6">
                <ProfileEditor
                  userId={user.id}
                  onSaveComplete={() => {
                    toast.success('Profile updated');
                  }}
                />
              </div>
            </div>

            {/* Security Section */}
            <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="passport-data text-[10px] text-gray-400">SECURITY FEATURES</p>
              </div>
              <div className="p-6">
                <SecuritySettings />
              </div>
            </div>

            {/* Privacy & Data Section */}
            <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="passport-data text-[10px] text-gray-400">PRIVACY & DATA</p>
              </div>
              <div className="p-6">
                <AccountPrivacyManager />

                {/* Cookie Settings */}
                <div className="py-4 border-t border-gray-200 dark:border-gray-800 mt-6">
                  <div>
                    <p className="text-sm font-medium">Cookie Preferences</p>
                    <p className="text-sm text-gray-500 mt-0.5">Control how we use cookies</p>
                  </div>
                  <button
                    onClick={openCookieSettings}
                    className="passport-data text-[10px] text-gray-500 hover:text-black dark:hover:text-white mt-2"
                  >
                    [MANAGE COOKIES]
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light">Create Collection</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:opacity-60 transition-opacity"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
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
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="collection-public"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="collection-public" className="text-xs">
                  Make this collection public
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-80 transition-opacity text-sm font-medium"
                  disabled={creatingCollection}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || creatingCollection}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {creatingCollection ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
