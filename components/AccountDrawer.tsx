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
  ArrowLeft,
  Plus,
  Share2,
  Download,
  Trash2,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Drawer } from "@/components/ui/Drawer";
import type { Trip } from "@/types/trip";

const ACCOUNT_DRAWER_THEME = {
  text: "var(--account-drawer-foreground)",
  muted: "var(--account-drawer-muted)",
  subtle: "var(--account-drawer-subtle)",
  divider: "var(--account-drawer-divider)",
  buttonBg: "var(--account-drawer-button-bg)",
  buttonHover: "var(--account-drawer-button-hover)",
  buttonActive: "var(--account-drawer-button-active)",
  tileHover: "var(--account-drawer-tile-hover)",
  tileActive: "var(--account-drawer-tile-active)",
  pillBg: "var(--account-drawer-pill-bg)",
  pillHover: "var(--account-drawer-pill-hover)",
  pillActive: "var(--account-drawer-pill-active)",
  pillBorder: "var(--account-drawer-pill-border)",
  icon: "var(--account-drawer-icon)",
  headerBg: "var(--account-drawer-header-bg)",
} as const;

const CTA_BUTTON_BASE_CLASSES =
  "w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ease-out flex items-center justify-center gap-2";
const CTA_BUTTON_THEME_CLASSES =
  "text-[var(--account-drawer-foreground)] bg-[var(--account-drawer-button-bg)] hover:bg-[var(--account-drawer-button-hover)] active:bg-[var(--account-drawer-button-active)]";
const GHOST_BUTTON_CLASSES =
  "w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium rounded-lg transition-colors duration-200";
const GHOST_BUTTON_THEME_CLASSES =
  "text-[var(--account-drawer-foreground)] hover:bg-[var(--account-drawer-tile-hover)] active:bg-[var(--account-drawer-tile-active)]";
const TILE_BUTTON_CLASSES =
  "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200 text-[var(--account-drawer-foreground)]";
const TILE_BUTTON_THEME_CLASSES =
  "hover:bg-[var(--account-drawer-tile-hover)] active:bg-[var(--account-drawer-tile-active)]";

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

export function AccountDrawer({
  isOpen,
  onClose,
  onOpenChat,
}: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
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
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
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
        setStatsLoading(true);
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

        // Fetch recent trips (limit 3)
        const { data: tripsData } = await supabaseClient
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        setRecentTrips((tripsData as Trip[]) || []);
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

    if (currentSubpage !== 'main_drawer' && currentSubpage !== 'settings_subpage' && currentSubpage !== 'achievements_subpage' && currentSubpage !== 'collections_subpage') {
      fetchSubpageData();
    }
  }, [user, isOpen, currentSubpage, selectedTripId]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push("/");
  };

  const handleNavigateToFullPage = (path: string) => {
    onClose();
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

  // Render main drawer content (Tier 1)
  const renderMainDrawer = () => (
    <div className="space-y-0" style={{ padding: '30px 26px', paddingTop: '30px', paddingBottom: '30px', paddingLeft: '26px', paddingRight: '26px' }}>
      {user ? (
        <>
          {/* Header: Avatar, Name, Username */}
          <div className="flex items-center gap-3" style={{ gap: '12px', marginBottom: '14px' }}>
            <div
              className="relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border"
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: ACCOUNT_DRAWER_THEME.buttonBg,
                borderColor: ACCOUNT_DRAWER_THEME.divider,
              }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <User className="w-8 h-8" style={{ color: ACCOUNT_DRAWER_THEME.icon, opacity: 0.55 }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--account-drawer-foreground)] truncate leading-tight" style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.2px' }}>
                {displayUsername}
              </p>
              <p className="text-[var(--account-drawer-foreground)] truncate leading-tight mt-0.5" style={{ fontSize: '14px', opacity: 0.55 }}>
                @{displayUsername.toLowerCase().replace(/\s+/g, '')}
              </p>
            </div>
            <button
              onClick={() => handleNavigateToFullPage("/account")}
              className="flex items-center gap-1.5 rounded-full transition-colors"
              style={{
                height: '38px',
                paddingLeft: '18px',
                paddingRight: '18px',
                borderRadius: '999px',
                backgroundColor: ACCOUNT_DRAWER_THEME.buttonBg,
                color: ACCOUNT_DRAWER_THEME.text,
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.buttonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.buttonBg;
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.buttonActive;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.buttonHover;
              }}
            >
              View Full Profile
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Stats Bar: Horizontal Layout */}
          <div className="flex items-center" style={{ paddingTop: '16px', paddingBottom: '16px', marginBottom: '28px', gap: '22px' }}>
            <div className="flex-1 text-center">
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.visited}
              </div>
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Visited
              </div>
            </div>
            <div className="w-px h-8" style={{ width: '1px', backgroundColor: ACCOUNT_DRAWER_THEME.divider }} />
            <div className="flex-1 text-center">
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.saved}
              </div>
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Saved
              </div>
            </div>
            <div className="w-px h-8" style={{ width: '1px', backgroundColor: ACCOUNT_DRAWER_THEME.divider }} />
            <div className="flex-1 text-center">
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.trips}
              </div>
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Trips
              </div>
            </div>
            <div className="w-px h-8" style={{ width: '1px', backgroundColor: ACCOUNT_DRAWER_THEME.divider }} />
            <div className="flex-1 text-center">
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.cities}
              </div>
              <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Cities
              </div>
            </div>
          </div>

          {/* Your Spaces Section */}
          <div className="space-y-0" style={{ marginBottom: '28px' }}>
            <h3 className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '13px', opacity: 0.45, letterSpacing: '0.3px', paddingBottom: '8px' }}>
              Your Spaces
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => navigateToSubpage('saved_subpage')}
                className="w-full flex items-center gap-3 transition-colors"
                style={{
                  height: '50px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.1px',
                  color: ACCOUNT_DRAWER_THEME.text,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileActive;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
              >
                <Bookmark className="text-[var(--account-drawer-foreground)]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Saved</span>
                <ChevronRight className="text-[var(--account-drawer-foreground)]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('visited_subpage')}
                className="w-full flex items-center gap-3 transition-colors"
                style={{
                  height: '50px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.1px',
                  color: ACCOUNT_DRAWER_THEME.text,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileActive;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
              >
                <MapPin className="text-[var(--account-drawer-foreground)]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Visited</span>
                <ChevronRight className="text-[var(--account-drawer-foreground)]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('collections_subpage')}
                className="w-full flex items-center gap-3 transition-colors"
                style={{
                  height: '50px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.1px',
                  color: ACCOUNT_DRAWER_THEME.text,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileActive;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
              >
                <Folder className="text-[var(--account-drawer-foreground)]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Lists</span>
                <ChevronRight className="text-[var(--account-drawer-foreground)]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('trips_subpage')}
                className="w-full flex items-center gap-3 transition-colors"
                style={{
                  height: '50px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.1px',
                  color: ACCOUNT_DRAWER_THEME.text,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileActive;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
              >
                <Compass className="text-[var(--account-drawer-foreground)]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Trips</span>
                <ChevronRight className="text-[var(--account-drawer-foreground)]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('settings_subpage')}
                className="w-full flex items-center gap-3 transition-colors"
                style={{
                  height: '50px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.1px',
                  color: ACCOUNT_DRAWER_THEME.text,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileActive;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
                }}
              >
                <Settings className="text-[var(--account-drawer-foreground)]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Settings</span>
                <ChevronRight className="text-[var(--account-drawer-foreground)]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
            </div>
          </div>

          {/* Contextual Section: Continue Planning */}
          {recentTrips.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <button
                onClick={() => navigateToSubpage('trip_details_subpage', recentTrips[0].id)}
                className="w-full text-left transition-all"
                style={{
                  background: ACCOUNT_DRAWER_THEME.pillBg,
                  borderRadius: '18px',
                  border: `1px solid ${ACCOUNT_DRAWER_THEME.pillBorder}`,
                  padding: '18px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.pillHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.pillBg;
                }}
              >
                {recentTrips[0].cover_image && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden bg-[var(--account-drawer-button-bg)] mb-3">
                    <Image
                      src={recentTrips[0].cover_image}
                      alt={recentTrips[0].title}
                      fill
                      className="object-cover"
                      sizes="100%"
                    />
                  </div>
                )}
                <div className="text-[var(--account-drawer-foreground)] mb-1" style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px' }}>
                  {recentTrips[0].title}
                </div>
                {recentTrips[0].start_date && (
                  <div className="text-[var(--account-drawer-foreground)]" style={{ fontSize: '13px', opacity: 0.55 }}>
                    {new Date(recentTrips[0].start_date).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Footer: Sign Out */}
          <div className="border-t" style={{ paddingTop: '28px', borderColor: ACCOUNT_DRAWER_THEME.divider }}>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 text-[var(--account-drawer-foreground)] transition-colors"
              style={{
                fontSize: '15px',
                paddingTop: '16px',
                paddingBottom: '16px',
                opacity: 0.75,
                borderRadius: '12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = ACCOUNT_DRAWER_THEME.tileHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span>Sign Out</span>
            </button>
            <div className="text-center text-[var(--account-drawer-foreground)]" style={{ fontSize: '12px', opacity: 0.35, marginTop: '6px' }}>
              © {new Date().getFullYear()} Urban Manual
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[var(--account-drawer-foreground)] tracking-tight">
              Join The Urban Manual
            </h3>
            <p className="text-xs font-light text-[var(--account-drawer-muted)]">
              Sign in to save places, build trips, and sync your travel profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigateToFullPage("/auth/login")}
            className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
          >
            Sign In
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
          <Loader2 className="w-6 h-6 animate-spin text-[var(--account-drawer-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--account-drawer-muted)]">Loading...</p>
        </div>
      ) : visitedPlaces.length > 0 ? (
        <div className="space-y-2">
          {visitedPlaces.map((visit, index) => (
            <button
              key={index}
              onClick={() => handleNavigateToFullPage(`/destination/${visit.slug}`)}
              className={`${TILE_BUTTON_CLASSES} ${TILE_BUTTON_THEME_CLASSES}`}
            >
              {visit.destination?.image && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[var(--account-drawer-button-bg)] flex-shrink-0">
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
                <p className="text-sm font-medium text-[var(--account-drawer-foreground)] truncate">
                    {visit.destination?.name || visit.slug}
                  </p>
                  {visit.visited_at && (
                  <p className="text-xs text-[var(--account-drawer-muted)]">
                    {new Date(visit.visited_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                      })}
                    </p>
                  )}
                </div>
              <ChevronRight className="w-4 h-4" style={{ color: ACCOUNT_DRAWER_THEME.icon, opacity: 0.45 }} />
              </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--account-drawer-muted)]">No visited places yet</p>
        </div>
      )}
      <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=visited")}
          className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
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
          <Loader2 className="w-6 h-6 animate-spin text-[var(--account-drawer-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--account-drawer-muted)]">Loading...</p>
        </div>
      ) : savedPlaces.length > 0 ? (
        <div className="space-y-2">
          {savedPlaces.map((saved, index) => (
            <button
              key={index}
              onClick={() => handleNavigateToFullPage(`/destination/${saved.slug}`)}
              className={`${TILE_BUTTON_CLASSES} ${TILE_BUTTON_THEME_CLASSES}`}
            >
              {saved.destination?.image && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[var(--account-drawer-button-bg)] flex-shrink-0">
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
                <p className="text-sm font-medium text-[var(--account-drawer-foreground)] truncate">
                    {saved.destination?.name || saved.slug}
                  </p>
                  {saved.destination?.city && (
                  <p className="text-xs text-[var(--account-drawer-muted)]">
                      {saved.destination.city}
                    </p>
                  )}
                </div>
              <ChevronRight className="w-4 h-4" style={{ color: ACCOUNT_DRAWER_THEME.icon, opacity: 0.45 }} />
              </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--account-drawer-muted)]">No saved places yet</p>
        </div>
      )}
      <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=saved")}
          className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
        >
          View Full Saved
        </button>
      </div>
    </div>
  );

  // Render collections subpage
  const renderCollectionsSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      <div className="text-center py-12">
        <p className="text-sm text-[var(--account-drawer-muted)]">Collections coming soon</p>
      </div>
      <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=collections")}
          className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
        >
          View All Collections
        </button>
      </div>
    </div>
  );

  // Render trips subpage
  const renderTripsSubpage = () => (
    <div className="px-6 py-6 space-y-4">
      <button
        onClick={() => {
          onClose();
          setTimeout(() => {
            router.push('/trips');
          }, 200);
        }}
        className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
      >
        <Plus className="w-4 h-4" />
        New Trip
      </button>
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--account-drawer-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--account-drawer-muted)]">Loading...</p>
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-2">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => navigateToSubpage('trip_details_subpage', trip.id)}
              className={`${TILE_BUTTON_CLASSES} ${TILE_BUTTON_THEME_CLASSES}`}
            >
              {trip.cover_image && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[var(--account-drawer-button-bg)] flex-shrink-0">
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
                <p className="text-sm font-medium text-[var(--account-drawer-foreground)] truncate">
                  {trip.title}
                </p>
                {trip.start_date && (
                  <p className="text-xs text-[var(--account-drawer-muted)]">
                    {new Date(trip.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: ACCOUNT_DRAWER_THEME.icon, opacity: 0.45 }} />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--account-drawer-muted)]">No trips yet</p>
        </div>
      )}
      <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
        <button
          onClick={() => handleNavigateToFullPage("/trips")}
          className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
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
            <p className="text-sm text-[var(--account-drawer-muted)]">Trip not found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="px-6 py-6 space-y-4">
        {selectedTrip.cover_image && (
          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-[var(--account-drawer-button-bg)]">
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
          <div className="flex items-center gap-2 text-sm text-[var(--account-drawer-muted)]">
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
          <button className="flex-1 px-4 py-2 bg-[var(--account-drawer-button-bg)] text-[var(--account-drawer-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex-1 px-4 py-2 bg-[var(--account-drawer-button-bg)] text-[var(--account-drawer-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-[var(--account-drawer-button-bg)] text-[var(--account-drawer-foreground)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
          <button
            onClick={() => handleNavigateToFullPage(`/trips/${selectedTrip.id}`)}
            className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
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
        <p className="text-sm text-[var(--account-drawer-muted)]">Achievements coming soon</p>
      </div>
      <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=achievements")}
          className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
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
          className={`${GHOST_BUTTON_CLASSES} ${GHOST_BUTTON_THEME_CLASSES}`}
        >
          <span>Settings</span>
          <ChevronRight className="w-4 h-4" style={{ color: ACCOUNT_DRAWER_THEME.icon, opacity: 0.45 }} />
        </button>
      </div>
      <div className="pt-4 border-t" style={{ borderColor: ACCOUNT_DRAWER_THEME.divider }}>
        <button
          onClick={() => handleNavigateToFullPage("/account?tab=settings")}
          className={`${CTA_BUTTON_BASE_CLASSES} ${CTA_BUTTON_THEME_CLASSES}`}
        >
          Open Full Settings
        </button>
      </div>
    </div>
  );

  // Render content based on current subpage
  const renderContent = () => {
    switch (currentSubpage) {
      case 'visited_subpage':
        return renderVisitedSubpage();
      case 'saved_subpage':
        return renderSavedSubpage();
      case 'collections_subpage':
        return renderCollectionsSubpage();
      case 'trips_subpage':
        return renderTripsSubpage();
      case 'trip_details_subpage':
        return renderTripDetailsSubpage();
      case 'achievements_subpage':
        return renderAchievementsSubpage();
      case 'settings_subpage':
        return renderSettingsSubpage();
      default:
        return renderMainDrawer();
    }
  };

  // Render header with back button for subpages (Tier 2)
  const renderHeader = () => {
    if (currentSubpage === 'main_drawer') {
      return undefined; // Use default header
    }

    return (
      <div 
        className="flex items-center gap-3 px-6 h-14"
        style={{
          background: ACCOUNT_DRAWER_THEME.headerBg,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <button
          onClick={navigateBack}
          className="p-2 flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-[var(--account-drawer-button-hover)] active:bg-[var(--account-drawer-button-active)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--account-drawer-foreground)]" />
        </button>
        <h2 className="text-[20px] font-semibold text-[var(--account-drawer-foreground)] flex-1" style={{ fontWeight: 600 }}>
          {getDrawerTitle()}
        </h2>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>
    );
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
      title={currentSubpage === 'main_drawer' ? undefined : getDrawerTitle()}
      headerContent={currentSubpage !== 'main_drawer' ? renderHeader() : undefined}
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
