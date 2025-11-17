"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Settings,
  Heart,
  Check,
  Map,
  LogOut,
  Bookmark,
  ChevronRight,
  Layers,
  Trophy,
  Compass,
  Pin,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import { SavedPlacesDrawer } from "@/components/SavedPlacesDrawer";
import { VisitedPlacesDrawer } from "@/components/VisitedPlacesDrawer";
import { TripsDrawer } from "@/components/TripsDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import type { Trip } from "@/types/trip";

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  cities: number;
}

export function AccountDrawer({
  isOpen,
  onClose,
  onOpenChat,
}: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({ visited: 0, saved: 0, trips: 0, cities: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [recentVisits, setRecentVisits] = useState<Array<{ name: string; visited_at: string }>>([]);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isVisitedPlacesOpen, setIsVisitedPlacesOpen] = useState(false);
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch user profile, avatar, and stats
  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0, cities: 0 });
        return;
      }

      try {
        setStatsLoading(true);
        const supabaseClient = createClient();
        
        // Fetch profile
        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("avatar_url, username")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profileData) {
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

        // Fetch stats
        const [visitedResult, savedResult, tripsResult, visitedPlacesResult] = await Promise.all([
          supabaseClient
            .from("visited_places")
            .select("destination_slug, destination:destinations(city)", { count: "exact" })
            .eq("user_id", user.id),
          supabaseClient
            .from("saved_places")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("trips")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabaseClient
            .from("visited_places")
            .select("destination_slug, visited_at, destination:destinations(name)")
            .eq("user_id", user.id)
            .order("visited_at", { ascending: false })
            .limit(3),
        ]);

        const visitedCount = visitedResult.count || 0;
        const savedCount = savedResult.count || 0;
        const tripsCount = tripsResult.count || 0;

        // Count unique cities from visited places
        const citiesSet = new Set<string>();
        if (visitedResult.data) {
          visitedResult.data.forEach((item: any) => {
            if (item.destination?.city) {
              citiesSet.add(item.destination.city);
            }
          });
        }
        const citiesCount = citiesSet.size;

        setStats({
          visited: visitedCount,
          saved: savedCount,
          trips: tripsCount,
          cities: citiesCount,
        });

        // Fetch recent trips
        const { data: tripsData } = await supabaseClient
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        setRecentTrips((tripsData as Trip[]) || []);

        // Set recent visits
        if (visitedPlacesResult.data) {
          const visits = visitedPlacesResult.data.map((item: any) => ({
            name: item.destination?.name || item.destination_slug,
            visited_at: item.visited_at,
          }));
          setRecentVisits(visits);
        }
      } catch (error) {
        console.error("Error fetching profile and stats:", error);
      } finally {
        setStatsLoading(false);
      }
    }

    if (isOpen && user) {
      fetchProfileAndStats();
    }
  }, [user, isOpen]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push("/");
  };

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path);
    }, 200);
  };

  const displayUsername = username || user?.email?.split("@")[0] || "user";

  const runAfterClose = (callback: () => void) => {
    onClose();
    setTimeout(callback, 200);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const navigationItems = [
    { icon: Bookmark, label: "Saved", action: () => handleNavigate("/account?tab=saved") },
    { icon: Pin, label: "Visited", action: () => handleNavigate("/account?tab=visited") },
    { icon: Layers, label: "Collections", action: () => handleNavigate("/account?tab=collections") },
    { icon: Compass, label: "Trips", action: () => handleNavigate("/trips") },
    { icon: Trophy, label: "Achievements", action: () => handleNavigate("/account?tab=achievements") },
    { icon: Settings, label: "Settings", action: () => runAfterClose(() => setIsSettingsOpen(true)) },
  ];

  const accountContent = (
    <div className="px-6 py-6">
      {user ? (
        <div className="space-y-7">
          {/* Profile Header - Compact Card */}
          <div className="flex items-center gap-3 pb-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {displayUsername}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={() => handleNavigate("/account")}
              className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              View Full Profile
              <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>

          {/* Quick Stats - Horizontal Pills */}
          <div className="flex flex-wrap gap-2">
            {statsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-[10px] bg-white dark:bg-gray-950">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    Visited: {stats.visited}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-[10px] bg-white dark:bg-gray-950">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    Saved: {stats.saved}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-[10px] bg-white dark:bg-gray-950">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    Trips: {stats.trips}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-[10px] bg-white dark:bg-gray-950">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    Cities: {stats.cities}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Navigation List */}
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-180 ease-out rounded-lg"
                >
                  <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* My Trips Preview */}
          {recentTrips.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                My Trips
              </h3>
              <div className="space-y-2">
                {recentTrips.slice(0, 3).map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleNavigate(`/trips/${trip.id}`)}
                    className="w-full text-left space-y-0.5 hover:opacity-70 transition-opacity"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {trip.title}
                    </p>
                    {trip.destination && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {trip.destination}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Visits */}
          {recentVisits.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Recent Visits
              </h3>
              <div className="space-y-2">
                {recentVisits.slice(0, 3).map((visit, index) => (
                  <div key={index} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {visit.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign Out */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:opacity-70 transition-opacity"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
              Join The Urban Manual
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
              Sign in to save places, build trips, and sync your travel profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate("/auth/login")}
            className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer 
        isOpen={isOpen} 
        onClose={onClose} 
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Account</h2>
          </div>
        }
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="360px"
        position="right"
        style="solid"
      >
        {accountContent}
      </Drawer>
      <SavedPlacesDrawer
        isOpen={isSavedPlacesOpen}
        onClose={() => setIsSavedPlacesOpen(false)}
      />
      <VisitedPlacesDrawer
        isOpen={isVisitedPlacesOpen}
        onClose={() => setIsVisitedPlacesOpen(false)}
      />
      <TripsDrawer isOpen={isTripsOpen} onClose={() => setIsTripsOpen(false)} />
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
