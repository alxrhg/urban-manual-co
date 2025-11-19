"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDrawer } from "@/contexts/DrawerContext";
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  Loader2,
  Trophy,
  Folder,
  ArrowLeft,
  Plus,
  Camera,
  Share2,
  Download,
  Trash2,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import type { Trip } from "@/types/trip";
import type { Collection } from "@/types/common";

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  cities: number;
  countries: number;
  explorationProgress: number;
}

type SubpageId = 
  | 'main_drawer'
  | 'visited_subpage'
  | 'saved_subpage'
  | 'collections_subpage'
  | 'trips_subpage'
  | 'trip_details_subpage'
  | 'achievements_subpage'
  | 'settings_subpage';

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen("account");
  const [currentSubpage, setCurrentSubpage] = useState<SubpageId>('main_drawer');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({ 
    visited: 0, 
    saved: 0, 
    trips: 0, 
    cities: 0, 
    countries: 0,
    explorationProgress: 0,
  });
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset to main drawer when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSubpage('main_drawer');
      setSelectedTripId(null);
      setSelectedTrip(null);
    }
  }, [isOpen]);

  // Fetch user profile, avatar, stats, and data
  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0, cities: 0, countries: 0, explorationProgress: 0 });
        return;
      }

      try {
        const supabaseClient = createClient();
        
        // Fetch profile
        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("avatar_url, username")
          .eq("id", user.id)
          .maybeSingle();

        if (profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
        } else {
          const { data: userProfileData } = await supabaseClient
            .from("user_profiles")
            .select("username")
            .eq("user_id", user.id)
            .maybeSingle();

          if (userProfileData?.username) {
            setUsername(userProfileData.username);
          }
          setAvatarUrl(null);
        }

        // Fetch total destinations for progress calculation
        const { count: totalDest } = await supabaseClient
          .from("destinations")
          .select("*", { count: "exact", head: true });
        const totalDestinations = totalDest || 0;

        // Fetch stats
        const [visitedResult, savedResult, tripsResult] = await Promise.all([
          supabaseClient
            .from("visited_places")
            .select("destination_slug, destination:destinations(city, country)", { count: "exact" })
            .eq("user_id", user.id),
          supabaseClient
            .from("saved_places")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("trips")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const visitedCount = visitedResult.count || 0;
        const savedCount = savedResult.count || 0;
        const tripsCount = tripsResult.count || 0;

        // Count unique cities and countries
        const citiesSet = new Set<string>();
        const countriesSet = new Set<string>();
        if (visitedResult.data) {
          visitedResult.data.forEach((item: any) => {
            if (item.destination?.city) citiesSet.add(item.destination.city);
            if (item.destination?.country) countriesSet.add(item.destination.country);
          });
        }
        const citiesCount = citiesSet.size;
        const countriesCount = countriesSet.size;

        // Calculate exploration progress
        const explorationProgress = totalDestinations > 0
          ? Math.round((visitedCount / totalDestinations) * 100)
          : 0;

        setStats({
          visited: visitedCount,
          saved: savedCount,
          trips: tripsCount,
          cities: citiesCount,
          countries: countriesCount,
          explorationProgress,
        });

      } catch (error) {
        console.error("Error fetching profile and stats:", error);
      } finally {
      }
    }

    if (isOpen && user) {
      fetchProfileAndStats();
    }
  }, [user, isOpen]);

  // Fetch data for subpages
  useEffect(() => {
    async function fetchSubpageData() {
      if (!user?.id || !isOpen) return;

      const supabaseClient = createClient();
      setLoading(true);

      try {
        if (currentSubpage === 'visited_subpage') {
          const { data: visitedResult } = await supabaseClient
            .from('visited_places')
            .select('destination_slug, visited_at, destination:destinations(name, image, city)')
            .eq('user_id', user.id)
            .order('visited_at', { ascending: false })
            .limit(20);

          if (visitedResult) {
            const mapped = visitedResult.map((item: any) => ({
              slug: item.destination_slug,
              visited_at: item.visited_at,
              destination: item.destination,
            }));
            setVisitedPlaces(mapped);
          }
        } else if (currentSubpage === 'saved_subpage') {
          const { data: savedResult } = await supabaseClient
            .from('saved_places')
            .select('destination_slug, destination:destinations(name, image, city)')
            .eq('user_id', user.id)
            .limit(20);

          if (savedResult) {
            const mapped = savedResult.map((item: any) => ({
              slug: item.destination_slug,
              destination: item.destination,
            }));
            setSavedPlaces(mapped);
          }
        } else if (currentSubpage === 'collections_subpage') {
          const { data: collectionsResult } = await supabaseClient
            .from('collections')
            .select('id, name, description, emoji, color, destination_count, is_public, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          setCollections((collectionsResult as Collection[]) || []);
        } else if (currentSubpage === 'trips_subpage' || currentSubpage === 'trip_details_subpage') {
          const { data: tripsData } = await supabaseClient
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          setTrips((tripsData as Trip[]) || []);

          if (selectedTripId && currentSubpage === 'trip_details_subpage') {
            const trip = tripsData?.find((t: Trip) => t.id === selectedTripId);
            setSelectedTrip(trip || null);
          }
        }
      } catch (error) {
        console.error('Error fetching subpage data:', error);
      } finally {
        setLoading(false);
      }
    }

      const shouldFetch = [
        'visited_subpage',
        'saved_subpage',
        'collections_subpage',
        'trips_subpage',
        'trip_details_subpage'
      ].includes(currentSubpage);

      if (shouldFetch) {
        fetchSubpageData();
      }
  }, [user, isOpen, currentSubpage, selectedTripId]);

  const handleSignOut = async () => {
    await signOut();
    closeDrawer();
    router.push("/");
  };

  const handleNavigateToFullPage = (path: string) => {
    closeDrawer();
    setTimeout(() => {
      router.push(path);
    }, 200);
  };

  const displayUsername = username || user?.email?.split("@")[0] || "user";

  // Navigation handler
  const navigateToSubpage = (subpage: SubpageId, tripId?: string) => {
    if (tripId) {
      setSelectedTripId(tripId);
    }
    setCurrentSubpage(subpage);
  };

  const navigateBack = () => {
    if (currentSubpage === 'trip_details_subpage') {
      setCurrentSubpage('trips_subpage');
      setSelectedTripId(null);
    } else {
      setCurrentSubpage('main_drawer');
    }
  };

  // Get drawer title based on current subpage
  const getDrawerTitle = () => {
    switch (currentSubpage) {
      case 'visited_subpage':
        return 'Visited';
      case 'saved_subpage':
        return 'Saved';
      case 'collections_subpage':
        return 'Collections';
      case 'trips_subpage':
        return 'Your Trips';
      case 'trip_details_subpage':
        return selectedTrip?.title || 'Trip Details';
      case 'achievements_subpage':
        return 'Achievements';
      case 'settings_subpage':
        return 'Settings';
      default:
        return 'Your Manual';
    }
  };

  const renderNavItem = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    description?: string
  ) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/70"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );

  // Render main drawer content (Tier 1)
  const renderMainDrawer = () => (
    <div className="px-6 py-6 space-y-6">
      {user ? (
        <>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-lg font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  displayUsername.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={() => handleNavigateToFullPage("/account?tab=settings")}
                className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                aria-label="Update profile photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{displayUsername}</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                <span>@{displayUsername.toLowerCase().replace(/\s+/g, '')}</span>
              </div>
              {user.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleNavigateToFullPage("/account")}
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
              >
                Edit profile
              </button>
              {onOpenChat && (
                <button
                  onClick={onOpenChat}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                >
                  Message concierge
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Visited', value: stats.visited }, { label: 'Saved', value: stats.saved }, { label: 'Trips', value: stats.trips }].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleNavigateToFullPage("/account?tab=settings")}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Add a profile photo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Personalize your account</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => (onOpenChat ? onOpenChat() : handleNavigateToFullPage("/account"))}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Invite friends</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Share Urban Manual with others</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Your manual</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">Shortcuts</span>
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {renderNavItem('Saved places', <Bookmark className="w-4 h-4" />, () => navigateToSubpage('saved_subpage'), `${stats.saved} items`)}
              {renderNavItem('Visited places', <MapPin className="w-4 h-4" />, () => navigateToSubpage('visited_subpage'), `${stats.visited} logged`)}
              {renderNavItem('Lists', <Folder className="w-4 h-4" />, () => navigateToSubpage('collections_subpage'), 'Organize favorites')}
              {renderNavItem('Trips', <Compass className="w-4 h-4" />, () => navigateToSubpage('trips_subpage'), `${stats.trips} planned`)}
              {renderNavItem('Achievements', <Trophy className="w-4 h-4" />, () => navigateToSubpage('achievements_subpage'), 'Milestones and badges')}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Account & settings</h3>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {renderNavItem('Profile & preferences', <Settings className="w-4 h-4" />, () => navigateToSubpage('settings_subpage'), 'Notifications, privacy')}
              {renderNavItem('Sign out', <LogOut className="w-4 h-4" />, handleSignOut, 'Log out safely')}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Welcome to Urban Manual</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to save places, build trips, and sync your travel profile across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigateToFullPage("/auth/login")}
            className="w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          >
            Sign in to continue
          </button>
        </div>
      )}
    </div>
  );

  // Render visited subpage
  const renderVisitedSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : visitedPlaces.length > 0 ? (
        <div className="space-y-2">
          {visitedPlaces.map((visit, index) => (
              <button
                key={index}
                onClick={() => handleNavigateToFullPage(`/destination/${visit.slug}`)}
              className="w-full flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
            >
              {visit.destination?.image && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <Image
                    src={visit.destination.image}
                    alt={visit.destination.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              )}
                <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {visit.destination?.name || visit.slug}
                  </p>
                  {visit.visited_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(visit.visited_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                      })}
                    </p>
                  )}
                </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">No visited places yet</p>
        </div>
      )}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=visited")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
        >
          View All Visited
        </button>
      </div>
    </div>
  );

  // Render saved subpage
  const renderSavedSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : savedPlaces.length > 0 ? (
        <div className="space-y-2">
          {savedPlaces.map((saved, index) => (
              <button
                key={index}
                onClick={() => handleNavigateToFullPage(`/destination/${saved.slug}`)}
              className="w-full flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
            >
              {saved.destination?.image && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <Image
                    src={saved.destination.image}
                    alt={saved.destination.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              )}
                <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {saved.destination?.name || saved.slug}
                  </p>
                  {saved.destination?.city && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      {saved.destination.city}
                    </p>
                  )}
                </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">No saved places yet</p>
        </div>
      )}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=saved")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
        >
          View Full Saved
        </button>
      </div>
    </div>
  );

  // Render collections subpage
  const renderCollectionsSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading collections...</p>
        </div>
      ) : collections.length > 0 ? (
        <div className="space-y-2">
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => handleNavigateToFullPage(`/collection/${collection.id}`)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-800">
                  <span>{collection.emoji || '📚'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{collection.name}</p>
                  {collection.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{collection.description}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {(collection.destination_count || 0).toLocaleString()} places
                    {collection.is_public && <span className="ml-1">• Public</span>}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center dark:border-gray-800 dark:bg-gray-900/50">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">No collections yet</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Create lists to group your favorite places.</p>
          <button
            onClick={() => handleNavigateToFullPage('/account?tab=collections')}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
          >
            Start a collection
          </button>
        </div>
      )}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=collections")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
        >
          Manage Collections
        </button>
      </div>
    </div>
  );

  // Render trips subpage
  const renderTripsSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      <button
        onClick={() => {
          closeDrawer();
          setTimeout(() => {
            router.push('/trips');
          }, 200);
        }}
        className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        New Trip
      </button>
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-2">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => navigateToSubpage('trip_details_subpage', trip.id)}
              className="w-full flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
            >
              {trip.cover_image && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <Image
                  src={trip.cover_image}
                  alt={trip.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                />
              </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {trip.title}
                </p>
                {trip.start_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(trip.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">No trips yet</p>
        </div>
      )}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/trips")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
        >
          View All Trips
        </button>
      </div>
    </div>
  );

  // Render trip details subpage
  const renderTripDetailsSubpage = () => {
    if (!selectedTrip) {
      return (
        <div className="px-6 py-6">
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">Trip not found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-6 py-6 space-y-4">
        {selectedTrip.cover_image && (
          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={selectedTrip.cover_image}
              alt={selectedTrip.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}
        {selectedTrip.start_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(selectedTrip.start_date).toLocaleDateString("en-US", { 
                month: "long", 
                day: "numeric",
                year: "numeric"
              })}
              {selectedTrip.end_date && ` - ${new Date(selectedTrip.end_date).toLocaleDateString("en-US", { 
                month: "long", 
                day: "numeric",
                year: "numeric"
              })}`}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => handleNavigateToFullPage(`/trips/${selectedTrip.id}`)}
            className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
          >
            Open Full Trip
          </button>
        </div>
      </div>
    );
  };

  // Render achievements subpage
  const renderAchievementsSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">Achievements coming soon</p>
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=achievements")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
        >
          View All Achievements
        </button>
      </div>
    </div>
  );

  // Render settings subpage
  const renderSettingsSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      <div className="space-y-2">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className="w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all rounded-lg"
        >
          <span>Settings</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
        >
          Open Full Settings
        </button>
      </div>
    </div>
  );

  // Render header with back button for subpages (Tier 2)
  const renderHeader = () => {
    if (currentSubpage === 'main_drawer') {
      return null;
    }

    return (
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 pb-4 pt-5">
        <button
          onClick={navigateBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/80 text-white shadow-sm ring-1 ring-white/15 transition hover:bg-gray-800/90 dark:bg-white/10 dark:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-white drop-shadow-sm dark:text-white flex-1">{getDrawerTitle()}</h2>
        <div className="w-10" />
      </div>
    );
  };

  const wrapWithSubpageHeader = (content: ReactNode) => {
    if (currentSubpage === 'main_drawer') return content;

    return (
      <div className="relative flex h-full flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-gray-950/80 via-gray-950/50 to-transparent dark:from-black/80 dark:via-black/40" />
        {renderHeader()}
        <div className="flex-1 overflow-y-auto">{content}</div>
      </div>
    );
  };

  // Render content based on current subpage
  const renderContent = () => {
    switch (currentSubpage) {
      case 'visited_subpage':
        return wrapWithSubpageHeader(renderVisitedSubpage());
      case 'saved_subpage':
        return wrapWithSubpageHeader(renderSavedSubpage());
      case 'collections_subpage':
        return wrapWithSubpageHeader(renderCollectionsSubpage());
      case 'trips_subpage':
        return wrapWithSubpageHeader(renderTripsSubpage());
      case 'trip_details_subpage':
        return wrapWithSubpageHeader(renderTripDetailsSubpage());
      case 'achievements_subpage':
        return wrapWithSubpageHeader(renderAchievementsSubpage());
      case 'settings_subpage':
        return wrapWithSubpageHeader(renderSettingsSubpage());
      default:
        return renderMainDrawer();
    }
  };

  // Determine z-index based on subpage tier
  const getZIndex = () => {
    if (currentSubpage === 'main_drawer') {
      return 1000; // Tier 1
    }
    return 1100; // Tier 2
  };

  const isTier1 = currentSubpage === 'main_drawer';
  const isTier2 = currentSubpage !== 'main_drawer';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={undefined}
      headerContent={undefined}
      mobileVariant="bottom"
      desktopSpacing="right-4 top-4 bottom-4"
      desktopWidth="420px"
      position="right"
      style="glassy"
      backdropOpacity={isTier1 ? "18" : "18"}
      keepStateOnClose={true}
      zIndex={getZIndex()}
    >
      <div className={`transition-opacity duration-200 ${currentSubpage !== 'main_drawer' ? 'opacity-100' : 'opacity-100'}`}>
        {renderContent()}
      </div>
    </Drawer>
  );
}
