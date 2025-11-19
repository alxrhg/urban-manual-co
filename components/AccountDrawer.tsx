"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDrawer } from "@/contexts/DrawerContext";
import {
  User,
  Settings,
  Heart,
  MapPin,
  Layers,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  Loader2,
  Trophy,
  Folder,
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
  countries: number;
  explorationProgress: number; // Percentage
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
  const [stats, setStats] = useState<UserStats>({ 
    visited: 0, 
    saved: 0, 
    trips: 0, 
    cities: 0, 
    countries: 0,
    explorationProgress: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [recentVisits, setRecentVisits] = useState<Array<{ 
    name: string; 
    visited_at: string;
    image: string | null;
    slug: string;
  }>>([]);
  const [totalDestinations, setTotalDestinations] = useState(0);
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();

  // Fetch user profile, avatar, stats, and recent activity
  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0, cities: 0, countries: 0, explorationProgress: 0 });
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

        // Fetch total destinations for progress calculation
        const { count: totalDest } = await supabaseClient
          .from("destinations")
          .select("*", { count: "exact", head: true });
        setTotalDestinations(totalDest || 0);

        // Fetch stats
        const [visitedResult, savedResult, tripsResult, visitedPlacesResult] = await Promise.all([
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
          supabaseClient
            .from("visited_places")
            .select("destination_slug, visited_at, destination:destinations(name, image)")
            .eq("user_id", user.id)
            .order("visited_at", { ascending: false })
            .limit(4),
        ]);

        const visitedCount = visitedResult.count || 0;
        const savedCount = savedResult.count || 0;
        const tripsCount = tripsResult.count || 0;

        // Count unique cities and countries from visited places
        const citiesSet = new Set<string>();
        const countriesSet = new Set<string>();
        if (visitedResult.data) {
          visitedResult.data.forEach((item: any) => {
            if (item.destination?.city) {
              citiesSet.add(item.destination.city);
            }
            if (item.destination?.country) {
              countriesSet.add(item.destination.country);
            }
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

        // Fetch recent trips
        const { data: tripsData } = await supabaseClient
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        setRecentTrips((tripsData as Trip[]) || []);

        // Set recent visits with thumbnails
        if (visitedPlacesResult.data) {
          const visits = visitedPlacesResult.data.map((item: any) => ({
            name: item.destination?.name || item.destination_slug,
            visited_at: item.visited_at,
            image: item.destination?.image || null,
            slug: item.destination_slug,
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

  // Section Card Component
  const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-5 py-4 bg-white dark:bg-gray-950 rounded-2xl ${className}`}>
      {children}
    </div>
  );

  const shortcuts = [
    { icon: MapPin, label: "Visited", action: () => runAfterClose(() => openDrawer('visited-places')) },
    { icon: Bookmark, label: "Saved", action: () => runAfterClose(() => openDrawer('saved-places')) },
    { icon: Layers, label: "Lists", action: () => handleNavigate("/account?tab=collections") },
    { icon: Compass, label: "Trips", action: () => runAfterClose(() => openDrawer('trips')) },
    { icon: Folder, label: "Collections", action: () => handleNavigate("/account?tab=collections") },
    { icon: Trophy, label: "Achievements", action: () => handleNavigate("/account?tab=achievements") },
  ];

  const accountContent = (
    <div className="px-6 py-8 space-y-12">
      {user ? (
        <>
          {/* Hero Card - Profile Header with Exploration Progress */}
          <SectionCard>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
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

              {/* Exploration Progress */}
              {statsLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Exploration Progress</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.explorationProgress}%
                    </span>
                  </div>
                  {/* Thin subtle progress bar */}
                  <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 dark:bg-white transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(stats.explorationProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Visited: {stats.visited}</span>
                    <span>Saved: {stats.saved}</span>
                    <span>Cities: {stats.cities}</span>
                    <span>Countries: {stats.countries}</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Shortcuts - Your Spaces */}
          <SectionCard>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Your Spaces
              </h3>
              <div className="space-y-1">
                {shortcuts.map((item) => {
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
            </div>
          </SectionCard>

          {/* Recent Activity - Recent Visits with Thumbnails */}
          {recentVisits.length > 0 && (
            <SectionCard>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Visits
                </h3>
                <div className="space-y-2">
                  {recentVisits.slice(0, 4).map((visit, index) => (
                    <button
                      key={index}
                      onClick={() => handleNavigate(`/destination/${visit.slug}`)}
                      className="w-full flex items-center gap-3 hover:opacity-70 transition-opacity"
                    >
                      {visit.image && (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <Image
                            src={visit.image}
                            alt={visit.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {visit.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(visit.visited_at).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Footer - Settings and Sign Out */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <button
              type="button"
              onClick={() => runAfterClose(() => openDrawer('settings'))}
              className="w-full flex items-center gap-3 px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-180 ease-out rounded-lg"
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left">Settings</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-0 py-2.5 h-11 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-180 ease-out rounded-lg"
            >
              <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          </div>
        </>
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
        title="Your Manual"
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="solid"
        backdropOpacity="15"
        keepStateOnClose={true}
      >
        {accountContent}
      </Drawer>
      {/* Sub-drawers - Only render when open */}
      {isDrawerOpen('saved-places') && (
        <SavedPlacesDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}
      {isDrawerOpen('visited-places') && (
        <VisitedPlacesDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}
      {isDrawerOpen('trips') && (
        <TripsDrawer isOpen={true} onClose={closeDrawer} />
      )}
      {isDrawerOpen('settings') && (
        <SettingsDrawer
          isOpen={true}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
