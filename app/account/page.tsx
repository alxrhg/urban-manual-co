'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  MapPin, Heart, CheckCircle2, Map, Loader2, User, Settings, LogOut, Plus, Lock, Globe, Trash2, X
} from "lucide-react";
import TravelMap from "@/components/TravelMap";
import { Badge } from "@/components/ui/badge";
import { cityCountryMap } from "@/data/cityCountryMap";
import { VisitHistoryComponent } from "@/components/VisitHistory";
import { useCollections } from "@/hooks/useCollections";
import Image from 'next/image';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'visited' | 'profile' | 'lists' | 'collections' | 'history'>('overview');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { collections, loading: loadingCollections } = useCollections(user?.id);
  
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

  // Load lists when lists tab is active
  useEffect(() => {
    if (activeTab === 'lists' && user) {
      fetchLists();
    }
  }, [activeTab, user]);

  const fetchLists = async () => {
    if (!user) return;
    setLoadingLists(true);

    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        // Handle missing table gracefully
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          setLists([]);
          setLoadingLists(false);
          return;
        }
        console.error('Error fetching lists:', error);
      } else if (data) {
        // Fetch counts and cities for each list
        const listsWithCounts = await Promise.all(
          data.map(async (list) => {
            try {
              const { count: itemCount } = await supabase
                .from('list_items')
                .select('*', { count: 'exact', head: true })
                .eq('list_id', list.id);

              const { count: likeCount } = await supabase
                .from('list_likes')
                .select('*', { count: 'exact', head: true })
                .eq('list_id', list.id);

              // Fetch destination cities for this list
              let cities: string[] = [];
              const { data: listItems } = await supabase
                .from('list_items')
                .select('destination_slug')
                .eq('list_id', list.id);

              if (listItems && listItems.length > 0) {
                const slugs = listItems.map((item: any) => item.destination_slug);
                const { data: destinations } = await supabase
                  .from('destinations')
                  .select('city')
                  .in('slug', slugs);

                if (destinations) {
                  cities = Array.from(new Set(destinations.map((d: any) => d.city)));
                }
              }

              return {
                ...list,
                item_count: itemCount || 0,
                like_count: likeCount || 0,
                cities,
              };
            } catch (err) {
              // Handle missing tables gracefully
              return {
                ...list,
                item_count: 0,
                like_count: 0,
                cities: [],
              };
            }
          })
        );

        setLists(listsWithCounts);
      }
    } catch (error) {
      console.error('Error in fetchLists:', error);
      setLists([]);
    } finally {
      setLoadingLists(false);
    }
  };

  const createList = async () => {
    if (!user || !newListName.trim()) return;

    setCreatingList(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            user_id: user.id,
            name: newListName.trim(),
            description: newListDescription.trim() || null,
            is_public: newListPublic,
            is_collaborative: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating list:', error);
        alert('Failed to create list');
      } else if (data) {
        setLists([{ ...data, item_count: 0, like_count: 0, cities: [] }, ...lists]);
        setShowCreateListModal(false);
        setNewListName("");
        setNewListDescription("");
        setNewListPublic(true);
      }
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  const deleteList = async (listId: string, listName: string) => {
    if (!confirm(`Are you sure you want to delete "${listName}"?`)) return;

    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);

      if (error) {
        console.error('Error deleting list:', error);
        alert('Failed to delete list');
      } else {
        setLists(lists.filter(l => l.id !== listId));
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    }
  };

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
            .from('saved_destinations')
            .select('destination_id, collection_id, collection:collections(id, name, emoji, color), saved_at')
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
          setAvatarUrl(profileResult.data.avatar_url || null);
        }

        // Get destination IDs from saved_destinations
        const savedDestinationIds = new Set<number>();
        const savedCollections: Record<number, any> = {};
        
        if (savedResult.data) {
          savedResult.data.forEach((item: any) => {
            savedDestinationIds.add(item.destination_id);
            if (item.collection_id && item.collection) {
              savedCollections[item.destination_id] = item.collection;
            }
          });
        }

        // Get visited slugs (still using old table for now)
        const allVisitedSlugs = new Set<string>();
        if (visitedResult.data) {
          visitedResult.data.forEach(item => allVisitedSlugs.add(item.destination_slug));
        }

        // Fetch destinations by ID for saved places
        if (savedDestinationIds.size > 0) {
          const { data: savedDestData } = await supabase
            .from('destinations')
            .select('id, slug, name, city, category, image')
            .in('id', Array.from(savedDestinationIds));

          if (savedDestData) {
            setSavedPlaces(savedDestData.map((dest: any) => ({
              destination_id: dest.id,
              destination_slug: dest.slug,
              collection: savedCollections[dest.id],
              destination: {
                name: dest.name,
                city: dest.city,
                category: dest.category,
                image: dest.image
              }
            })));
          }
        }

        // Fetch destinations by slug for visited places
        if (allVisitedSlugs.size > 0) {
          const { data: visitedDestData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, image')
            .in('slug', Array.from(allVisitedSlugs));

          if (visitedDestData && visitedResult.data) {
            setVisitedPlaces(visitedResult.data.map((item: any) => {
              const dest = visitedDestData.find((d: any) => d.slug === item.destination_slug);
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
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadUserData();
  }, [user?.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setAvatarUrl(data.url);

      // Update user profile state
      if (userProfile) {
        setUserProfile({ ...userProfile, avatar_url: data.url });
      }

      // Trigger a page reload to update header avatar
      window.location.reload();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(`Failed to upload photo: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setAvatarUrl(null);
      if (userProfile) {
        setUserProfile({ ...userProfile, avatar_url: null });
      }

      // Trigger a page reload to update header avatar
      window.location.reload();
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Failed to remove photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const profileData = {
        user_id: user.id,
        birthday,
        avatar_url: avatarUrl,
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
      <main className="px-4 md:px-8 lg:px-10 py-8 md:py-12 dark:text-white">
        <div className="max-w-7xl mx-auto">
          {/* Header - Minimal style */}
          <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">Account</h1>
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

          {/* Navigation Tabs - Horizontally scrollable on mobile */}
          <div className="mb-8 border-b border-gray-200 dark:border-gray-800 overflow-x-auto -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 scrollbar-hide">
            <nav className="flex gap-6 md:gap-8 min-w-max md:min-w-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'saved'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Saved
              </button>
              <button
                onClick={() => setActiveTab('visited')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'visited'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Visited
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('lists')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'lists'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Lists
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'collections'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Collections
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                History
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
                <TravelMap 
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
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <Image
                                  src={dest.image}
                                  alt={dest.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover rounded"
                                  quality={75}
                                  loading="lazy"
                                />
                              </div>
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
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {dest.category}
                              </Badge>
                              {place.collection && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs flex items-center gap-1"
                                  style={{ borderColor: place.collection.color, color: place.collection.color }}
                                >
                                  <span>{place.collection.emoji}</span>
                                  <span>{place.collection.name}</span>
                                </Badge>
                              )}
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

          {activeTab === 'history' && user && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold">Visit History</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Destinations you've recently viewed
                </p>
              </div>
              <div className="p-6">
                <VisitHistoryComponent userId={user.id} limit={50} />
              </div>
            </div>
          )}

          {activeTab === 'collections' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Collections</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Organize your saved destinations
                  </p>
                </div>
                <button
                  onClick={() => router.push('/profile')}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Manage Preferences
                </button>
              </div>
              {loadingCollections ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading collections...</p>
                </div>
              ) : collections.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-3">📍</div>
                  <p>No collections yet</p>
                  <p className="text-sm mt-1">Create collections when you save destinations</p>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      onClick={() => {
                        // TODO: Navigate to collection detail page
                      }}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
                        >
                          {collection.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{collection.name}</div>
                          {collection.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {collection.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {collection.destination_count || 0} {collection.destination_count === 1 ? 'place' : 'places'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lists' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">My Lists</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Organize destinations into collections
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateListModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span>New List</span>
                </button>
              </div>
              <div className="p-6">
                {loadingLists ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-48"></div>
                    ))}
                  </div>
                ) : lists.length === 0 ? (
                  <div className="text-center py-20">
                    <Heart className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <span className="text-xl text-gray-400 dark:text-gray-500 mb-6 block">No lists yet</span>
                    <button
                      onClick={() => setShowCreateListModal(true)}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
                    >
                      Create Your First List
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lists.map((list) => (
                      <div
                        key={list.id}
                        onClick={() => router.push(`/lists/${list.id}`)}
                        className="group bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{list.name}</h3>
                            {list.description && (
                              <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {list.description}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteList(list.id, list.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{list.item_count || 0} {(list.item_count || 0) === 1 ? 'place' : 'places'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {list.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              <span>{list.is_public ? 'Public' : 'Private'}</span>
                            </div>
                          </div>

                          {list.cities && list.cities.length > 0 && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {list.cities.slice(0, 3).map((city: string) => capitalizeCity(city)).join(', ')}
                              {list.cities.length > 3 && ` +${list.cities.length - 3} more`}
                            </div>
                          )}
                        </div>

                        {(list.like_count || 0) > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                            <span>{list.like_count} {list.like_count === 1 ? 'like' : 'likes'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <Image
                          src={avatarUrl}
                          alt="Profile"
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-medium text-gray-600 dark:text-gray-400">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar || !isEditingProfile}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className={`inline-block px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm ${
                          uploadingAvatar || !isEditingProfile ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingAvatar ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          'Upload Photo'
                        )}
                      </label>
                      {avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar || !isEditingProfile}
                          className="ml-2 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>
                </div>

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

          {/* Create List Modal */}
          {showCreateListModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Create New List</h2>
                  <button
                    onClick={() => setShowCreateListModal(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">List Name *</label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="e.g., Tokyo Favorites"
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="public"
                      checked={newListPublic}
                      onChange={(e) => setNewListPublic(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="public" className="text-sm">
                      Make this list public
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreateListModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      disabled={creatingList}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createList}
                      disabled={!newListName.trim() || creatingList}
                      className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {creatingList ? 'Creating...' : 'Create List'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
