"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDrawer } from "@/contexts/DrawerContext";
import { createClient } from "@/lib/supabase/client";
import { Drawer } from "@/components/ui/Drawer";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Trip } from "@/types/trip";
import type { Collection } from "@/types/common";

// Sub-components
import { AccountMain } from "./account/AccountMain";
import { VisitedSubpage } from "./account/VisitedSubpage";
import { SavedSubpage } from "./account/SavedSubpage";
import { CollectionsSubpage } from "./account/CollectionsSubpage";
import { TripsSubpage } from "./account/TripsSubpage";
import { TripDetailsSubpage } from "./account/TripDetailsSubpage";

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

  // Inline components for simple subpages
  const AchievementsSubpage = () => (
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

  const SettingsSubpage = () => (
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

  const renderContent = () => {
    switch (currentSubpage) {
      case 'main_drawer':
        return (
          <AccountMain
            user={user}
            stats={stats}
            avatarUrl={avatarUrl}
            displayUsername={displayUsername}
            onNavigate={handleNavigateToFullPage}
            onSubpageNavigate={navigateToSubpage}
            onSignOut={handleSignOut}
            onOpenChat={openChatDrawer}
          />
        );
      case 'visited_subpage':
        return (
          <VisitedSubpage
            loading={loading}
            visitedPlaces={visitedPlaces}
            onNavigate={handleNavigateToFullPage}
          />
        );
      case 'saved_subpage':
        return (
          <SavedSubpage
            loading={loading}
            savedPlaces={savedPlaces}
            onNavigate={handleNavigateToFullPage}
          />
        );
      case 'collections_subpage':
        return (
          <CollectionsSubpage
            loading={loading}
            collections={collections}
            onNavigate={handleNavigateToFullPage}
          />
        );
      case 'trips_subpage':
        return (
          <TripsSubpage
            loading={loading}
            trips={trips}
            onNavigate={handleNavigateToFullPage}
            onTripSelect={(id) => navigateToSubpage('trip_details_subpage', id)}
            onCloseDrawer={closeDrawer}
          />
        );
      case 'trip_details_subpage':
        return (
          <TripDetailsSubpage
            trip={selectedTrip}
            onNavigate={handleNavigateToFullPage}
          />
        );
      case 'achievements_subpage':
        return <AchievementsSubpage />;
      case 'settings_subpage':
        return <SettingsSubpage />;
      default:
        return null;
    }
  };

  const headerContent = currentSubpage !== 'main_drawer' ? (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={navigateBack}
        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <span className="font-semibold text-lg">{getDrawerTitle()}</span>
    </div>
  ) : undefined;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleDrawerClose}
      title={undefined}
      headerContent={headerContent}
      mobileVariant="bottom"
      desktopSpacing="right-4 top-4 bottom-4"
      desktopWidth="420px"
      position="right"
      style="glassy"
      backdropOpacity="18"
      keepStateOnClose={true}
      zIndex={currentSubpage === 'main_drawer' ? 1000 : 1100}
    >
      <div className={`transition-opacity duration-200 ${currentSubpage !== 'main_drawer' ? 'opacity-100' : 'opacity-100'}`}>
        {renderContent()}
      </div>
    </Drawer>
  );
}
