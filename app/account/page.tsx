'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus, Calendar, Trash2, Edit2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
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
import { PreferencesTab } from "@/features/account/components/PreferencesTab";
import { MCPIntegration } from "@/features/account/components/MCPIntegration";
import { openCookieSettings } from "@/components/CookieConsent";
import type { Collection, SavedPlace, VisitedPlace } from "@/types/common";
import { formatDestinationsFromField } from "@/types/trip";
import type { Trip } from "@/types/trip";
import type { User } from "@supabase/supabase-js";
import { toast } from "@/lib/toast";

export const dynamic = 'force-dynamic';

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface ProfileData {
  display_name: string;
  email: string;
  phone: string;
  address: string;
  avatar_url: string | null;
  role: string;
}

type MainTab = 'profile' | 'places' | 'collections' | 'trips' | 'settings';
type PlacesSubTab = 'visited' | 'saved';
type SettingsSection = 'personal' | 'preferences' | 'integrations' | 'security' | 'privacy' | 'advanced';

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

  // Profile form state
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    email: '',
    phone: '',
    address: '',
    avatar_url: null,
    role: 'Member',
  });
  const [saving, setSaving] = useState(false);

  // Navigation state
  const [activeTab, setActiveTab] = useState<MainTab>('profile');
  const [placesSubTab, setPlacesSubTab] = useState<PlacesSubTab>('visited');
  const [expandedSettings, setExpandedSettings] = useState<Set<SettingsSection>>(new Set(['personal']));

  // Update tab from URL params after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      // Map old tab names to new structure
      const tabMap: Record<string, { main: MainTab; sub?: PlacesSubTab }> = {
        'profile': { main: 'profile' },
        'visited': { main: 'places', sub: 'visited' },
        'saved': { main: 'places', sub: 'saved' },
        'collections': { main: 'collections' },
        'trips': { main: 'trips' },
        'achievements': { main: 'settings' },
        'preferences': { main: 'settings' },
        'integrations': { main: 'settings' },
        'settings': { main: 'settings' },
        'places': { main: 'places' },
      };
      if (tab && tabMap[tab]) {
        setActiveTab(tabMap[tab].main);
        if (tabMap[tab].sub) {
          setPlacesSubTab(tabMap[tab].sub!);
        }
      }
    }
  }, []);

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

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      const [savedResult, visitedResult, collectionsResult, tripsResult, profileResponse] = await Promise.all([
        supabase.from('saved_places').select('destination_slug').eq('user_id', user.id),
        supabase.from('visited_places').select('destination_slug, visited_at, rating, notes').eq('user_id', user.id).order('visited_at', { ascending: false }),
        supabase.from('collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        fetch('/api/account/profile')
      ]);

      // Load profile data
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.profile) {
          setProfile({
            display_name: profileData.profile.display_name || user.user_metadata?.full_name || '',
            email: user.email || '',
            phone: profileData.profile.phone || '',
            address: profileData.profile.address || '',
            avatar_url: profileData.profile.avatar_url || user.user_metadata?.avatar_url || null,
            role: user.user_metadata?.role === 'admin' ? 'Administrator' : 'Member',
          });
        } else {
          setProfile({
            display_name: user.user_metadata?.full_name || '',
            email: user.email || '',
            phone: '',
            address: '',
            avatar_url: user.user_metadata?.avatar_url || null,
            role: user.user_metadata?.role === 'admin' ? 'Administrator' : 'Member',
          });
        }
      }

      // Collect all unique slugs
      const allSlugs = new Set<string>();
      interface SavedPlaceRow { destination_slug: string; }
      interface VisitedPlaceRow { destination_slug: string; visited_at?: string; rating?: number; notes?: string; }

      if (savedResult.data) {
        (savedResult.data as SavedPlaceRow[]).forEach((item) => allSlugs.add(item.destination_slug));
      }
      if (visitedResult.data) {
        (visitedResult.data as VisitedPlaceRow[]).forEach((item) => allSlugs.add(item.destination_slug));
      }

      // Fetch destinations
      if (allSlugs.size > 0) {
        interface DestRow { slug: string; name: string; city: string; category: string; image?: string; latitude?: number | null; longitude?: number | null; country?: string; }

        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));

        if (destData) {
          const typedDestData = destData as DestRow[];

          if (savedResult.data) {
            const typedSavedData = savedResult.data as SavedPlaceRow[];
            setSavedPlaces(typedSavedData.map((item) => {
              const dest = typedDestData.find((d) => d.slug === item.destination_slug);
              return dest ? { id: 0, user_id: user.id, destination_id: 0, destination_slug: dest.slug, created_at: '', destination: { slug: dest.slug, name: dest.name, city: dest.city, category: dest.category, image: dest.image, country: dest.country } } as SavedPlace : null;
            }).filter((item): item is SavedPlace => item !== null));
          }

          if (visitedResult.data) {
            const typedVisitedData = visitedResult.data as VisitedPlaceRow[];
            setVisitedPlaces(typedVisitedData.map((item) => {
              const dest = typedDestData.find((d) => d.slug === item.destination_slug);
              return dest ? { id: 0, user_id: user.id, destination_id: 0, destination_slug: dest.slug, visited_at: item.visited_at, rating: item.rating, notes: item.notes, created_at: '', destination: { slug: dest.slug, name: dest.name, city: dest.city, category: dest.category, image: dest.image, latitude: dest.latitude, longitude: dest.longitude, country: dest.country } } as VisitedPlace : null;
            }).filter((item): item is VisitedPlace => item !== null));
          }
        }
      }

      if (collectionsResult.data) setCollections(collectionsResult.data);
      if (tripsResult.data) setTrips(tripsResult.data);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: profile.display_name, phone: profile.phone, address: profile.address }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;
    setCreatingCollection(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim(), description: newCollectionDescription.trim() || null, is_public: newCollectionPublic, emoji: '📚', color: '#3B82F6' }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || responseData.details || 'Failed to create collection');
      const data = responseData.collection;
      if (!data) throw new Error('Invalid response from server');
      setCollections([data, ...collections]);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionPublic(true);
      setShowCreateModal(false);
      await loadUserData();
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create collection. Please try again.');
    } finally {
      setCreatingCollection(false);
    }
  };

  const toggleSettingsSection = (section: SettingsSection) => {
    setExpandedSettings(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter((city): city is string => typeof city === 'string'),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    const countriesFromDestinations = new Set([
      ...savedPlaces.map(p => p.destination?.country).filter((country): country is string => typeof country === 'string' && country.trim().length > 0),
      ...visitedPlaces.filter(p => p.destination?.country).map(p => p.destination!.country!).filter((country): country is string => typeof country === 'string' && country.trim().length > 0)
    ]);

    const countriesFromCities = Array.from(uniqueCities).map(city => {
      if (!city) return null;
      let country = cityCountryMap[city];
      if (country) return country;
      const cityLower = city.toLowerCase();
      country = cityCountryMap[cityLower];
      if (country) return country;
      const cityHyphenated = cityLower.replace(/\s+/g, '-');
      country = cityCountryMap[cityHyphenated];
      if (country) return country;
      const cityNoHyphens = cityLower.replace(/-/g, '');
      country = cityCountryMap[cityNoHyphens];
      return country || null;
    }).filter((country): country is string => country !== null && country !== undefined);

    const uniqueCountries = new Set([...Array.from(countriesFromDestinations), ...countriesFromCities]);

    const visitedDestinationsWithCoords = visitedPlaces.filter(p => p.destination).map(p => ({ city: p.destination!.city, latitude: p.destination!.latitude, longitude: p.destination!.longitude })).filter(d => d.latitude && d.longitude);

    const curationCompletionPercentage = totalDestinations > 0 ? Math.round((visitedPlaces.length / totalDestinations) * 100) : 0;

    return { uniqueCities, uniqueCountries, visitedCount: visitedPlaces.length, savedCount: savedPlaces.length, collectionsCount: collections.length, curationCompletionPercentage, visitedDestinationsWithCoords };
  }, [savedPlaces, visitedPlaces, collections, totalDestinations]);

  if (!authChecked || isLoadingData) {
    return <main className="w-full px-6 md:px-10 py-20"><PageLoader /></main>;
  }

  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Account</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Sign in to save places, track visits, and create collections</p>
            <button onClick={() => router.push('/auth/login')} className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity">Sign In</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-black dark:text-white">Account</h1>
            <button onClick={handleSignOut} className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors">Sign Out</button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal information and preferences</p>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-800 mb-6" />

        {/* Profile Card */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name || 'Profile'} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-xl font-medium">
                  {profile.display_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <button className="absolute -bottom-1 -left-1 w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" aria-label="Edit avatar">
              <Pencil className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-black dark:text-white">{profile.display_name || 'User'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">{profile.role}</span>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-800 mb-6" />

        {/* Tab Navigation - Simplified to 5 tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(['profile', 'places', 'collections', 'trips', 'settings'] as MainTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 border-b-2 transition-all ${
                  activeTab === tab
                    ? "border-black dark:border-white text-black dark:text-white font-medium"
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Tab - Stats & Dashboard */}
        {activeTab === 'profile' && (
          <div className="fade-in space-y-6">
            {/* Progress */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-light">{stats.curationCompletionPercentage}%</span>
                <span className="text-xs text-gray-400">{stats.visitedCount} / {totalDestinations} places</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-black dark:bg-white transition-all duration-500 ease-out" style={{ width: `${Math.min(stats.curationCompletionPercentage, 100)}%` }} />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="text-lg font-light">{stats.visitedCount}</div>
                <div className="text-xs text-gray-500">Visited</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="text-lg font-light">{stats.savedCount}</div>
                <div className="text-xs text-gray-500">Saved</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="text-lg font-light">{stats.uniqueCities.size}</div>
                <div className="text-xs text-gray-500">Cities</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="text-lg font-light">{stats.uniqueCountries.size}</div>
                <div className="text-xs text-gray-500">Countries</div>
              </div>
            </div>

            {/* World Map */}
            {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
              <WorldMapVisualization visitedCountries={stats.uniqueCountries} visitedDestinations={stats.visitedDestinationsWithCoords} />
            )}

            {/* Achievements */}
            <AchievementsDisplay visitedPlaces={visitedPlaces} savedPlaces={savedPlaces} uniqueCities={stats.uniqueCities} uniqueCountries={stats.uniqueCountries} />

            {/* Recent Activity */}
            {visitedPlaces.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Recent Visits</h3>
                <div className="space-y-2">
                  {visitedPlaces.slice(0, 5).map((place) => (
                    <button
                      key={place.destination_slug}
                      onClick={() => router.push(`/destinations/${place.destination_slug}`)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      {place.destination?.image && (
                        <Image src={place.destination.image} alt={place.destination.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{place.destination?.name}</p>
                        <p className="text-xs text-gray-500">{place.destination?.city && capitalizeCity(place.destination.city)}</p>
                      </div>
                      {place.visited_at && (
                        <span className="text-xs text-gray-400">{new Date(place.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Places Tab - Combined Visited & Saved */}
        {activeTab === 'places' && (
          <div className="fade-in">
            {/* Sub-navigation */}
            <div className="flex gap-4 mb-6">
              <button onClick={() => setPlacesSubTab('visited')} className={`text-sm pb-1 border-b-2 transition-all ${placesSubTab === 'visited' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                Visited ({stats.visitedCount})
              </button>
              <button onClick={() => setPlacesSubTab('saved')} className={`text-sm pb-1 border-b-2 transition-all ${placesSubTab === 'saved' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                Saved ({stats.savedCount})
              </button>
            </div>

            {placesSubTab === 'visited' && <EnhancedVisitedTab visitedPlaces={visitedPlaces} onPlaceAdded={loadUserData} />}
            {placesSubTab === 'saved' && <EnhancedSavedTab savedPlaces={savedPlaces} />}
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="fade-in">
            {collections.length === 0 ? (
              <NoCollectionsEmptyState onCreateCollection={() => setShowCreateModal(true)} />
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity">+ New Collection</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection) => (
                    <button key={collection.id} onClick={() => router.push(`/collection/${collection.id}`)} className="text-left p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{collection.emoji || '📚'}</span>
                        <h3 className="font-medium text-sm flex-1">{collection.name}</h3>
                      </div>
                      {collection.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{collection.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
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
            <div className="flex justify-end mb-4">
              <button onClick={() => { setEditingTripId(null); setShowTripDialog(true); }} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity flex items-center gap-2">
                <Plus className="h-3 w-3" />New Trip
              </button>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No trips yet</p>
                <button onClick={() => { setEditingTripId(null); setShowTripDialog(true); }} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity">Create your first trip</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trips.map((trip) => (
                  <div key={trip.id} className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <button onClick={() => router.push(`/trips/${trip.id}`)} className="text-left p-4 flex-1">
                      <h3 className="font-medium text-sm mb-2 line-clamp-2">{trip.title}</h3>
                      {trip.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{trip.description}</p>}
                      <div className="space-y-1 text-xs text-gray-400">
                        {trip.destination && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /><span>{formatDestinationsFromField(trip.destination)}</span></div>}
                        {(trip.start_date || trip.end_date) && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}{trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}</span>
                          </div>
                        )}
                        {trip.status && <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{trip.status}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 p-4 pt-0 border-t border-gray-200 dark:border-gray-800">
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/trips/${trip.id}`); }} className="flex-1 text-xs font-medium py-2 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">View</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTripId(trip.id); setShowTripDialog(true); }} className="p-2 rounded-xl text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={`Edit ${trip.title}`}><Edit2 className="h-3 w-3" /></button>
                      <button onClick={async (e) => { e.stopPropagation(); if (confirm(`Are you sure you want to delete "${trip.title}"?`)) { try { const { error } = await supabase.from('trips').delete().eq('id', trip.id); if (error) throw error; await loadUserData(); } catch (error) { console.error('Error deleting trip:', error); toast.error('Failed to delete trip'); } } }} className="p-2 rounded-xl text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20" aria-label={`Delete ${trip.title}`}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab - Consolidated with expandable sections */}
        {activeTab === 'settings' && user && (
          <div className="fade-in space-y-4">
            {/* Personal Information Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleSettingsSection('personal')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium">Personal Information</span>
                {expandedSettings.has('personal') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSettings.has('personal') && (
                <div className="p-4 pt-0 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Full Name</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">This name will be shown to your contacts.</p>
                    <input type="text" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent" placeholder="Enter your full name" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Email Address</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Make sure to use an active email address you check regularly</p>
                    <input type="email" value={profile.email} disabled className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Phone Number</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your phone number will be visible to your contacts</p>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <span className="text-base">🇺🇸</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">+1</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </div>
                      <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent" placeholder="(555) 456-7894" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Full Address</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Provide your current residential address.</p>
                    <textarea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} rows={3} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent resize-none" placeholder="742 Maple Ridge Lane&#10;Fairfield, OH 45014" />
                  </div>

                  <div className="pt-2">
                    <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Preferences Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleSettingsSection('preferences')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium">Preferences</span>
                {expandedSettings.has('preferences') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSettings.has('preferences') && (
                <div className="p-4 pt-0">
                  <PreferencesTab userId={user.id} />
                </div>
              )}
            </div>

            {/* Integrations Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleSettingsSection('integrations')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium">Integrations</span>
                {expandedSettings.has('integrations') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSettings.has('integrations') && (
                <div className="p-4 pt-0">
                  <MCPIntegration />
                </div>
              )}
            </div>

            {/* Security Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleSettingsSection('security')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium">Security</span>
                {expandedSettings.has('security') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSettings.has('security') && (
                <div className="p-4 pt-0">
                  <SecuritySettings />
                </div>
              )}
            </div>

            {/* Privacy & Data Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleSettingsSection('privacy')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium">Privacy & Data</span>
                {expandedSettings.has('privacy') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSettings.has('privacy') && (
                <div className="p-4 pt-0 space-y-4">
                  <AccountPrivacyManager />
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium">Cookie Preferences</p>
                    <p className="text-xs text-gray-500 mt-0.5">Control how we use cookies</p>
                    <button onClick={openCookieSettings} className="text-xs text-gray-500 hover:text-black dark:hover:text-white mt-2">Manage cookies</button>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Profile Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button onClick={() => toggleSettingsSection('advanced')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm font-medium">Advanced Profile</span>
                {expandedSettings.has('advanced') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedSettings.has('advanced') && (
                <div className="p-4 pt-0">
                  <ProfileEditor userId={user.id} onSaveComplete={() => { toast.success('Profile updated'); loadUserData(); }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light">Create Collection</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:opacity-60 transition-opacity"><span className="text-lg">×</span></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2">Collection Name *</label>
                <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="e.g., Tokyo Favorites" className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-black dark:focus:border-white text-sm" autoFocus maxLength={50} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2">Description</label>
                <textarea value={newCollectionDescription} onChange={(e) => setNewCollectionDescription(e.target.value)} placeholder="Optional description..." rows={3} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm" maxLength={200} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="collection-public" checked={newCollectionPublic} onChange={(e) => setNewCollectionPublic(e.target.checked)} className="rounded" />
                <label htmlFor="collection-public" className="text-xs">Make this collection public</label>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl hover:opacity-80 transition-opacity text-sm font-medium" disabled={creatingCollection}>Cancel</button>
                <button onClick={handleCreateCollection} disabled={!newCollectionName.trim() || creatingCollection} className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">{creatingCollection ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
