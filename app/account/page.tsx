'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  MapPin, Heart, CheckCircle2, Map, Loader2, User, Settings, LogOut, Plus, Lock, Globe, Trash2, X
} from "lucide-react";
import VisitedCountriesMap from "@/components/VisitedCountriesMap";
import { Badge } from "@/components/ui/badge";
import { cityCountryMap } from "@/data/cityCountryMap";

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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [birthday, setBirthday] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'visited' | 'profile' | 'lists'>('overview');
  
  // Lists state
  const [lists, setLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListPublic, setNewListPublic] = useState(true);
  const [creatingList, setCreatingList] = useState(false);

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

  // Load user data and places
  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      // Check admin via server env
      try {
        const res = await fetch('/api/is-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        });
        const j = await res.json();
        setIsAdmin(!!j.isAdmin);
      } catch {}

      try {
        setIsLoadingData(true);

        const [profileResult, savedResult, visitedResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
            .then(result => {
              // Handle 406/400 errors gracefully (RLS or missing table)
              if (result.error && (result.error.code === 'PGRST116' || result.error.code === 'PGRST301')) {
                return { data: null, error: null };
              }
              return result;
            }),
          supabase
            .from('saved_places')
            .select('destination_slug')
            .eq('user_id', user.id)
            .then(result => {
              // Handle 406/400 errors gracefully (RLS or missing table)
              if (result.error && (result.error.code === 'PGRST116' || result.error.code === 'PGRST301')) {
                return { data: [], error: null };
              }
              return result;
            }),
          supabase
            .from('visited_places')
            .select('destination_slug, visited_at, rating, notes')
            .eq('user_id', user.id)
            .order('visited_at', { ascending: false })
            .then(result => {
              // Handle 406/400 errors gracefully (RLS or missing table)
              if (result.error && (result.error.code === 'PGRST116' || result.error.code === 'PGRST301')) {
                return { data: [], error: null };
              }
              return result;
            })
        ]);

        if (profileResult.data) {
          setUserProfile(profileResult.data);
          setBirthday(profileResult.data.birthday || "");
        }

        const allSlugs = new Set<string>();
        if (savedResult.data) {
          savedResult.data.forEach(item => allSlugs.add(item.destination_slug));
        }
        if (visitedResult.data) {
          visitedResult.data.forEach(item => allSlugs.add(item.destination_slug));
        }

        if (allSlugs.size > 0) {
          const { data: destData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, image')
            .in('slug', Array.from(allSlugs));

          if (destData) {
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
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadUserData();
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const profileData = {
        user_id: user.id,
        birthday,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setUserProfile(profileData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Memoize statistics
  const stats = useMemo(() => {
    const uniqueCities = new Set<string>([
      ...savedPlaces.map(p => p.destination?.city).filter((city): city is string => Boolean(city)),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city).filter((city): city is string => Boolean(city))
    ]);

    const uniqueCountries = new Set(
      Array.from(uniqueCities).map(city => cityCountryMap[city as keyof typeof cityCountryMap] || 'Other')
    );

    return {
      uniqueCities,
      uniqueCountries
    };
  }, [savedPlaces, visitedPlaces]);

  // Show loading state
  if (!authChecked || isLoadingData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <main className="px-6 md:px-10 py-12">
          <div className="max-w-7xl mx-auto flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </main>
      </div>
    );
  }

  // Show coming soon screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <main className="px-6 md:px-10 py-12 dark:text-white">
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <h1 className="text-2xl font-bold text-center mb-4">Account</h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                User accounts are coming soon. You'll be able to save your favorite places, track visits, and plan trips.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Browse Destinations
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="px-6 md:px-10 py-12 dark:text-white">
        <div className="max-w-7xl mx-auto">
          {/* Header - Vercel style */}
          <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold">Account</h1>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Admin
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{user.email}</span>
              {isAdmin && (
                <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Admin
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation Tabs - Vercel style */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'saved'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Saved
              </button>
              <button
                onClick={() => setActiveTab('visited')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'visited'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Visited
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('lists')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'lists'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Lists
              </button>
            </nav>
          </div>

          {/* Content Area */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-bold mb-1">{visitedPlaces.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Places Visited</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Across {stats.uniqueCities.size} cities
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-bold mb-1">{savedPlaces.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Saved</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Wishlist items</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-bold mb-1">{stats.uniqueCities.size}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cities</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Explored</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-bold mb-1">{stats.uniqueCountries.size}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Countries</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Visited</div>
                </div>
              </div>

              {/* World Map */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Travel Map</h2>
                <VisitedCountriesMap 
                  visitedPlaces={visitedPlaces}
                  savedPlaces={savedPlaces}
                />
              </div>

              {/* Recent Activity */}
              {visitedPlaces.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold">Recent Visits</h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {visitedPlaces.filter(place => place.destination).slice(0, 10).map((place) => {
                      const dest = place.destination!;
                      return (
                        <div
                          key={place.destination_slug}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => router.push(`/destination/${place.destination_slug}`)}
                        >
                          <div className="flex items-center gap-4">
                            {dest.image && (
                              <img
                                src={dest.image}
                                alt={dest.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{dest.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {capitalizeCity(dest.city)} • {dest.category}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {new Date(place.visited_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold">Saved Places ({savedPlaces.length})</h2>
              </div>
              {savedPlaces.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  No saved places yet. Start exploring and save your favorites!
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {savedPlaces.filter(place => place.destination).map((place) => {
                    const dest = place.destination!;
                    return (
                      <div
                        key={place.destination_slug}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => router.push(`/destination/${place.destination_slug}`)}
                      >
                        <div className="flex items-center gap-4">
                          {dest.image && (
                            <img
                              src={dest.image}
                              alt={dest.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{dest.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                              {capitalizeCity(dest.city)}
                            </div>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {dest.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'visited' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold">Visited Places ({visitedPlaces.length})</h2>
              </div>
              {visitedPlaces.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  No visited places yet. Mark places you've been to!
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {visitedPlaces.filter(place => place.destination).map((place) => {
                    const dest = place.destination!;
                    return (
                      <div
                        key={place.destination_slug}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => router.push(`/destination/${place.destination_slug}`)}
                      >
                        <div className="flex items-center gap-4">
                          {dest.image && (
                            <img
                              src={dest.image}
                              alt={dest.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{dest.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                              {capitalizeCity(dest.city)}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {dest.category}
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {new Date(place.visited_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Profile Information</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage your personal information
                  </p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium mb-2">
                    Birthday
                  </label>
                  <input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    disabled={!isEditingProfile}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your birthday helps us personalize your experience
                  </p>
                </div>

                {isEditingProfile && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setBirthday(userProfile?.birthday || "");
                      }}
                      disabled={isSavingProfile}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
