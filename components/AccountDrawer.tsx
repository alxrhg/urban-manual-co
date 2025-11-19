"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import { SavedPlacesDrawer } from "@/components/SavedPlacesDrawer";
import { VisitedPlacesDrawer } from "@/components/VisitedPlacesDrawer";
import { TripsDrawer } from "@/components/TripsDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";

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
  const [recentVisits, setRecentVisits] = useState<Array<{
    name: string; 
    visited_at: string;
    image: string | null;
    slug: string;
  }>>([]);
  const [totalDestinations, setTotalDestinations] = useState(0);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isVisitedPlacesOpen, setIsVisitedPlacesOpen] = useState(false);
  const [isTripsOpen, setIsTripsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
  const SectionCard = ({
    children,
    className = "",
    title,
    description,
  }: {
    children: ReactNode;
    className?: string;
    title?: string;
    description?: string;
  }) => (
    <section
      className={`px-5 py-4 bg-white dark:bg-gray-950 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] ring-1 ring-black/5 dark:ring-white/5 ${className}`}
    >
      {(title || description) && (
        <div className="mb-4 space-y-1">
          {title && (
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">{title}</p>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );

  type OptionRowConfig = {
    label: string;
    description?: string;
    value?: string;
    action?: () => void;
  };

  const OptionRow = ({ label, description, value, action }: OptionRowConfig) => (
    <button
      type="button"
      onClick={action}
      className="w-full flex items-center justify-between gap-4 py-3 text-left transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white rounded-2xl"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {value && <span className="text-xs font-medium text-gray-500 dark:text-gray-300">{value}</span>}
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      </div>
    </button>
  );

  const accountOptions: OptionRowConfig[] = [
    {
      label: "Manage Profile",
      description: "Update your details, avatar, and preferences.",
      action: () => handleNavigate("/account?tab=profile"),
    },
    {
      label: "Password & Security",
      description: "Change password and review sign-in access.",
      action: () => handleNavigate("/account?tab=settings"),
    },
    {
      label: "Notifications",
      description: "Delivery summary and concierge reminders.",
      action: () => handleNavigate("/account?tab=settings#notifications"),
    },
  ];

  const travelOptions: OptionRowConfig[] = [
    {
      label: "Visited Places",
      description: `${stats.visited} check-ins across ${stats.cities} cities`,
      action: () => runAfterClose(() => setIsVisitedPlacesOpen(true)),
    },
    {
      label: "Saved Places",
      description: `${stats.saved} inspirations ready to explore`,
      action: () => runAfterClose(() => setIsSavedPlacesOpen(true)),
    },
    {
      label: "Trips",
      description: "Plan itineraries and appointments.",
      action: () => runAfterClose(() => setIsTripsOpen(true)),
    },
    {
      label: "Collections",
      description: "Organize guides and lists.",
      action: () => handleNavigate("/account?tab=collections"),
    },
    {
      label: "Achievements",
      description: "Track streaks and milestones.",
      action: () => handleNavigate("/account?tab=achievements"),
    },
  ];

  const preferencesOptions: OptionRowConfig[] = [
    {
      label: "Language",
      description: "Used across recommendations and guides.",
      value: "English",
      action: () => handleNavigate("/account?tab=settings"),
    },
    {
      label: "Timezone",
      description: "Auto-detected for local suggestions.",
      value: "Automatic",
      action: () => handleNavigate("/account?tab=settings"),
    },
    {
      label: "About Us",
      description: "Meet the Urban Manual team.",
      action: () => handleNavigate("/about"),
    },
  ];

  const supportOptions: OptionRowConfig[] = [
    {
      label: "Help Center",
      description: "Guides, privacy, and troubleshooting.",
      action: () => handleNavigate("/contact"),
    },
    {
      label: "Contact Concierge",
      description: "Chat with our team for recommendations.",
      action: () => {
        if (onOpenChat) {
          runAfterClose(() => onOpenChat());
        }
      },
    },
    {
      label: "Data & Privacy",
      description: "Manage requests and exports.",
      action: () => handleNavigate("/privacy"),
    },
  ];

  const highlightStats = [
    { label: "Visited", value: stats.visited.toString() },
    { label: "Saved", value: stats.saved.toString() },
    { label: "Cities", value: stats.cities.toString() },
    { label: "Countries", value: stats.countries.toString() },
  ];

  const accountContent = (
    <div className="px-6 py-8 space-y-8 bg-gradient-to-b from-gray-50/80 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 min-h-full">
      {user ? (
        <>
          {/* Hero Card */}
          <SectionCard className="relative overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-br from-gray-50/90 to-transparent dark:from-white/5 pointer-events-none"
              aria-hidden
            />
            <div className="relative space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center flex-shrink-0 border border-white/70 dark:border-gray-800 shadow-inner">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{displayUsername}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => handleNavigate("/account")}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  View Profile
                  <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Exploration</p>
                  {statsLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Syncing profile…</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                      {stats.explorationProgress}%
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <p>Your manual stays synced</p>
                  <p>across every device.</p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Highlights */}
          <SectionCard title="Highlights" description="A snapshot of your travel life">
            {statsLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {highlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="px-4 py-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Travel spaces */}
          <SectionCard title="Your Spaces" description="Quick links to the essentials">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {travelOptions.map((item) => (
                <OptionRow key={item.label} {...item} />
              ))}
            </div>
          </SectionCard>

          {/* Account */}
          <SectionCard title="Account" description="Control access and privacy">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {accountOptions.map((item) => (
                <OptionRow key={item.label} {...item} />
              ))}
            </div>
          </SectionCard>

          {/* Preferences */}
          <SectionCard title="Preferences" description="Language, info, and timezone">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {preferencesOptions.map((item) => (
                <OptionRow key={item.label} {...item} />
              ))}
            </div>
          </SectionCard>

          {/* Support */}
          <SectionCard title="Support" description="We're here whenever you need">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {supportOptions.map((item) => (
                <OptionRow key={item.label} {...item} />
              ))}
            </div>
          </SectionCard>

          {/* Recent Activity - Recent Visits with Thumbnails */}
          {recentVisits.length > 0 && (
            <SectionCard title="Recent Visits" description="Jump back into the last places you explored">
              <div className="space-y-3">
                {recentVisits.slice(0, 4).map((visit, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavigate(`/destination/${visit.slug}`)}
                    className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    {visit.image && (
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        <Image
                          src={visit.image}
                          alt={visit.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{visit.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(visit.visited_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Footer - Settings and Sign Out */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <button
              type="button"
              onClick={() => runAfterClose(() => setIsSettingsOpen(true))}
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
