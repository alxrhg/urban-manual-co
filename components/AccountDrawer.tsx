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
  Trophy,
  Folder,
  ArrowLeft,
  Plus,
  Camera,
  Share2,
  Download,
  Trash2,
  Calendar,
  User,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CARD_MEDIA, CARD_META, CARD_TITLE, CARD_WRAPPER } from "@/components/CardStyles";
import {
  EmptyState,
  NoCollectionsEmptyState,
  NoSavedPlacesEmptyState,
  NoVisitedPlacesEmptyState,
} from "@/components/EmptyStates";
import { DestinationGridSkeleton } from "@/components/skeletons/DestinationCardSkeleton";
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

  const getTripStatus = (trip: Trip) => {
    const today = new Date();
    const startDate = trip.start_date ? new Date(trip.start_date) : null;
    const endDate = trip.end_date ? new Date(trip.end_date) : null;

    if (startDate && endDate) {
      if (endDate < today) {
        return {
          label: 'Completed',
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-200',
        };
      }

      if (startDate <= today && endDate >= today) {
        return {
          label: 'In progress',
          className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200',
        };
      }

      return {
        label: 'Upcoming',
        className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200',
      };
    }

    if (startDate) {
      if (startDate > today) {
        return {
          label: 'Upcoming',
          className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200',
        };
      }

      return {
        label: 'In progress',
        className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200',
      };
    }

    return {
      label: 'Draft',
      className: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };
  };

  // Navigation handler
  const navigateToSubpage = (subpage: SubpageId, tripId?: string) => {
    if (tripId) {
      setSelectedTripId(tripId);
    }
    setCurrentSubpage(subpage);
  };

  const openChatDrawer = () => {
    openDrawer("chat");
  };

  const navigateBack = () => {
    if (currentSubpage === 'trip_details_subpage') {
      setCurrentSubpage('trips_subpage');
      setSelectedTripId(null);
    } else {
      setCurrentSubpage('main_drawer');
    }
  };

  const handleDrawerClose = () => {
    closeDrawer();
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
    description?: string,
    isDanger?: boolean
  ) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-left transition-all hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm ${
        isDanger ? 'hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/10' : ''
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        isDanger 
          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${
          isDanger 
            ? 'text-red-600 dark:text-red-400' 
            : 'text-gray-900 dark:text-white'
        }`}>{label}</p>
        {description && (
          <p className={`text-xs mt-0.5 ${
            isDanger 
              ? 'text-red-500 dark:text-red-500' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>{description}</p>
        )}
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
        isDanger ? 'text-red-400' : 'text-gray-400'
      }`} />
    </button>
  );

  // Render main drawer content (Tier 1)
  const renderMainDrawer = () => (
    <div className="px-6 py-6 space-y-6">
      {user ? (
        <>
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:bg-gray-800 text-2xl font-semibold text-gray-700 dark:text-gray-200">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  displayUsername.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={() => handleNavigateToFullPage("/account?tab=settings")}
                className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transition hover:scale-110 dark:hover:bg-gray-100"
                aria-label="Update profile photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{displayUsername}</p>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                <span>@{displayUsername.toLowerCase().replace(/\s+/g, '')}</span>
              </div>
              {user.email && (
                <p className="text-xs text-gray-500 dark:text-gray-500">{user.email}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2 w-full">
              <button
                onClick={() => handleNavigateToFullPage("/account")}
                className="flex-1 min-w-[120px] rounded-xl bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-gray-900 shadow-sm transition hover:bg-gray-800 dark:hover:bg-gray-100"
              >
                Edit profile
              </button>
              <button
                onClick={openChatDrawer}
                className="flex-1 min-w-[120px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Message concierge
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Visited', value: stats.visited, icon: MapPin, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Saved', value: stats.saved, icon: Bookmark, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Trips', value: stats.trips, icon: Compass, color: 'text-purple-600 dark:text-purple-400' }
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-4 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <Icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleNavigateToFullPage("/account?tab=settings")}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 text-center shadow-sm transition hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Add photo</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Personalize</p>
              </div>
            </button>
            <button
              onClick={openChatDrawer}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 text-center shadow-sm transition hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Invite</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Share</p>
              </div>
            </button>
          </div>

          {/* Your Manual Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Your manual</h3>
            <div className="space-y-2">
              {renderNavItem('Saved places', <Bookmark className="w-4 h-4" />, () => navigateToSubpage('saved_subpage'), `${stats.saved} items`)}
              {renderNavItem('Visited places', <MapPin className="w-4 h-4" />, () => navigateToSubpage('visited_subpage'), `${stats.visited} logged`)}
              {renderNavItem('Lists', <Folder className="w-4 h-4" />, () => navigateToSubpage('collections_subpage'), 'Organize favorites')}
              {renderNavItem('Trips', <Compass className="w-4 h-4" />, () => navigateToSubpage('trips_subpage'), `${stats.trips} planned`)}
              {renderNavItem('Achievements', <Trophy className="w-4 h-4" />, () => navigateToSubpage('achievements_subpage'), 'Milestones and badges')}
            </div>
          </div>

          {/* Account & Settings Section */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Account & settings</h3>
            <div className="space-y-2">
              {renderNavItem('Profile & preferences', <Settings className="w-4 h-4" />, () => navigateToSubpage('settings_subpage'), 'Notifications, privacy')}
              {renderNavItem('Sign out', <LogOut className="w-4 h-4" />, handleSignOut, 'Log out safely', true)}
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
    <div className="px-6 py-6 space-y-6">
      {loading ? (
        <DestinationGridSkeleton count={6} />
      ) : visitedPlaces.length > 0 ? (
        <div className="space-y-4">
          {visitedPlaces.map((visit, index) => (
            <button
              key={index}
              onClick={() => handleNavigateToFullPage(`/destination/${visit.slug}`)}
              className={`${CARD_WRAPPER} w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg/60 text-left p-1.5`}
            >
              <div className={`${CARD_MEDIA} aspect-[4/3]`}>
                {visit.destination?.image ? (
                  <Image
                    src={visit.destination.image}
                    alt={visit.destination.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 80vw, 40vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-700">
                    <MapPin className="h-8 w-8 opacity-60" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 pt-3 px-2 pb-1">
                <div className="min-w-0 space-y-1">
                  <p className={`${CARD_TITLE} truncate`}>{visit.destination?.name || visit.slug}</p>
                  <div className={`${CARD_META} flex-wrap gap-1.5`}>
                    {visit.destination?.city && (
                      <span className="capitalize">{visit.destination.city}</span>
                    )}
                    {visit.visited_at && (
                      <>
                        {visit.destination?.city && <span className="text-gray-300 dark:text-gray-700">•</span>}
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {new Date(visit.visited_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  Visited
                </Badge>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <NoVisitedPlacesEmptyState />
      )}
      {visitedPlaces.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleNavigateToFullPage('/account?tab=visited')}
          >
            View all visited
          </Button>
        </div>
      )}
    </div>
  );

  // Render saved subpage
  const renderSavedSubpage = () => (
    <div className="px-6 py-6 space-y-6">
      {loading ? (
        <DestinationGridSkeleton count={6} />
      ) : savedPlaces.length > 0 ? (
        <div className="space-y-4">
          {savedPlaces.map((saved, index) => (
            <button
              key={index}
              onClick={() => handleNavigateToFullPage(`/destination/${saved.slug}`)}
              className={`${CARD_WRAPPER} w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg/60 text-left p-1.5`}
            >
              <div className={`${CARD_MEDIA} aspect-[4/3]`}>
                {saved.destination?.image ? (
                  <Image
                    src={saved.destination.image}
                    alt={saved.destination.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 80vw, 40vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-700">
                    <Bookmark className="h-8 w-8 opacity-60" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 pt-3 px-2 pb-1">
                <div className="min-w-0 space-y-1">
                  <p className={`${CARD_TITLE} truncate`}>{saved.destination?.name || saved.slug}</p>
                  {saved.destination?.city && (
                    <div className={`${CARD_META}`}>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{saved.destination.city}</span>
                    </div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200"
                >
                  Saved
                </Badge>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <NoSavedPlacesEmptyState />
      )}
      {savedPlaces.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleNavigateToFullPage('/account?tab=saved')}
          >
            View all saved
          </Button>
        </div>
      )}
    </div>
  );

  // Render collections subpage
  const renderCollectionsSubpage = () => (
    <div className="px-6 py-6 space-y-6">
      {loading ? (
        <DestinationGridSkeleton count={4} />
      ) : collections.length > 0 ? (
        <div className="space-y-4">
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => handleNavigateToFullPage(`/collection/${collection.id}`)}
              className={`${CARD_WRAPPER} w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg/60 text-left p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-xl flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-800">
                  <span>{collection.emoji || '📚'}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`${CARD_TITLE} truncate`}>{collection.name}</p>
                    {collection.is_public && (
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200"
                      >
                        Public
                      </Badge>
                    )}
                  </div>
                  {collection.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <div className={`${CARD_META} gap-1.5`}>
                    <span>
                      {(collection.destination_count || 0).toLocaleString()} {collection.destination_count === 1 ? 'place' : 'places'}
                    </span>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {new Date(collection.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <NoCollectionsEmptyState onCreateCollection={() => handleNavigateToFullPage('/account?tab=collections')} />
      )}
      {collections.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleNavigateToFullPage('/account?tab=collections')}
          >
            Manage collections
          </Button>
        </div>
      )}
    </div>
  );

  // Render trips subpage
  const renderTripsSubpage = () => (
    <div className="px-6 py-6 space-y-6">
      <Button
        size="lg"
        className="w-full justify-center gap-2"
        onClick={() => {
          closeDrawer();
          setTimeout(() => {
            router.push('/trips');
          }, 200);
        }}
      >
        <Plus className="w-4 h-4" />
        New trip
      </Button>
      {loading ? (
        <DestinationGridSkeleton count={4} />
      ) : trips.length > 0 ? (
        <div className="space-y-4">
          {trips.map((trip) => {
            const status = getTripStatus(trip);
            return (
              <button
                key={trip.id}
                onClick={() => navigateToSubpage('trip_details_subpage', trip.id)}
                className={`${CARD_WRAPPER} w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg/60 text-left p-1.5`}
              >
                <div className={`${CARD_MEDIA} aspect-[4/3]`}>
                  {trip.cover_image ? (
                    <Image
                      src={trip.cover_image}
                      alt={trip.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 80vw, 40vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-700">
                      <Compass className="h-8 w-8 opacity-60" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 pt-3 px-2 pb-1">
                  <div className="min-w-0 space-y-1">
                    <p className={`${CARD_TITLE} truncate`}>{trip.title}</p>
                    {(trip.start_date || trip.end_date) && (
                      <div className={`${CARD_META} gap-1.5`}>
                        <span className="text-[11px] text-gray-600 dark:text-gray-400">
                          {trip.start_date
                            ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Unscheduled'}
                          {trip.end_date && ` — ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="🧭"
          title="No trips yet"
          description="Plan your next adventure and keep itineraries synced"
          actionLabel="Start a trip"
          onAction={() => handleNavigateToFullPage('/trips')}
        />
      )}
      {trips.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleNavigateToFullPage('/trips')}
          >
            View all trips
          </Button>
        </div>
      )}
    </div>
  );

  // Render trip details subpage
  const renderTripDetailsSubpage = () => {
    if (!selectedTrip) {
      return (
        <div className="px-6 py-6">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Compass className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Trip not found</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">This trip may have been deleted</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-6 py-6 space-y-6">
        {selectedTrip.cover_image && (
          <div className="relative w-full h-56 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-800">
            <Image
              src={selectedTrip.cover_image}
              alt={selectedTrip.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {selectedTrip.title}
            </h3>
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
          </div>

          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => handleNavigateToFullPage(`/trips/${selectedTrip.id}`)}
            className="w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-semibold shadow-sm hover:shadow-md"
          >
            Open Full Trip
          </button>
        </div>
      </div>
    );
  };

  // Render achievements subpage
  const renderAchievementsSubpage = () => (
    <div className="px-6 py-6 space-y-6">
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Achievements coming soon</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Track your travel milestones and unlock badges</p>
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=achievements")}
          className="w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-semibold shadow-sm hover:shadow-md"
        >
          View All Achievements
        </button>
      </div>
    </div>
  );

  // Render settings subpage
  const renderSettingsSubpage = () => (
    <div className="px-6 py-6 space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings, privacy preferences, and data.
        </p>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Profile & Preferences</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Edit your profile information</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Privacy & Data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Control your privacy settings</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className="w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-semibold shadow-sm hover:shadow-md"
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
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={navigateBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white transition hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex-1">{getDrawerTitle()}</h2>
        <div className="w-9" />
      </div>
    );
  };

  const wrapWithSubpageHeader = (content: ReactNode) => {
    if (currentSubpage === 'main_drawer') return content;

    return (
      <div className="flex h-full flex-col">
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
      onClose={handleDrawerClose}
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
