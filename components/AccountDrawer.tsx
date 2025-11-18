"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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

  // Section Card Component
  const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-5 py-4 bg-white dark:bg-gray-950 rounded-2xl ${className}`}>
      {children}
    </div>
  );

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
    <div className="p-6 space-y-0" style={{ padding: '24px' }}>
      {user ? (
        <>
          {/* Header: Avatar, Name, Username */}
          <div className="flex items-center gap-3 mb-6" style={{ gap: '12px' }}>
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700" style={{ width: '56px', height: '56px' }}>
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <User className="w-7 h-7 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#F5F5F5] dark:text-[#F5F5F5] truncate leading-tight" style={{ fontSize: '20px', fontWeight: 600 }}>
                {displayUsername}
              </p>
              <p className="text-[#F5F5F5] dark:text-[#F5F5F5] truncate leading-tight mt-0.5" style={{ fontSize: '15px', opacity: 0.7 }}>
                @{displayUsername.toLowerCase().replace(/\s+/g, '')}
              </p>
            </div>
            <button
              onClick={() => handleNavigateToFullPage("/account")}
              className="flex items-center gap-1.5 rounded-full transition-colors"
              style={{
                height: '36px',
                paddingLeft: '14px',
                paddingRight: '14px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#F5F5F5',
                fontSize: '14px',
              }}
            >
              View Full Profile
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Stats Bar: Horizontal Layout */}
          <div className="flex items-center py-3 mb-6" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '16px', fontWeight: 600 }}>
                {stats.visited}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.65 }}>
                Visited
              </div>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)]" style={{ width: '1px' }} />
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '16px', fontWeight: 600 }}>
                {stats.saved}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.65 }}>
                Saved
              </div>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)]" style={{ width: '1px' }} />
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '16px', fontWeight: 600 }}>
                {stats.trips}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.65 }}>
                Trips
              </div>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)]" style={{ width: '1px' }} />
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '16px', fontWeight: 600 }}>
                {stats.cities}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.65 }}>
                Cities
              </div>
            </div>
          </div>

          {/* Your Spaces Section */}
          <div className="space-y-0">
            <h3 className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '14px', opacity: 0.6, paddingTop: '12px', paddingBottom: '6px' }}>
              Your Spaces
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => navigateToSubpage('saved_subpage')}
                className="w-full flex items-center gap-3 transition-colors rounded-xl"
                style={{
                  height: '48px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Bookmark className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '18px', height: '18px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Saved</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('visited_subpage')}
                className="w-full flex items-center gap-3 transition-colors rounded-xl"
                style={{
                  height: '48px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <MapPin className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '18px', height: '18px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Visited</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('collections_subpage')}
                className="w-full flex items-center gap-3 transition-colors rounded-xl"
                style={{
                  height: '48px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Folder className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '18px', height: '18px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Lists</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('trips_subpage')}
                className="w-full flex items-center gap-3 transition-colors rounded-xl"
                style={{
                  height: '48px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Compass className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '18px', height: '18px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Trips</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
              <button
                onClick={() => navigateToSubpage('settings_subpage')}
                className="w-full flex items-center gap-3 transition-colors rounded-xl"
                style={{
                  height: '48px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Settings className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '18px', height: '18px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Settings</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
              </button>
            </div>
          </div>

          {/* Contextual Section: Continue Planning */}
          {recentTrips.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => navigateToSubpage('trip_details_subpage', recentTrips[0].id)}
                className="w-full text-left transition-all rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginTop: '16px',
                }}
              >
                {recentTrips[0].cover_image && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
                    <Image
                      src={recentTrips[0].cover_image}
                      alt={recentTrips[0].title}
                      fill
                      className="object-cover"
                      sizes="100%"
                    />
                  </div>
                )}
                <div className="text-[#F5F5F5] dark:text-[#F5F5F5] mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>
                  {recentTrips[0].title}
                </div>
                {recentTrips[0].start_date && (
                  <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '14px', opacity: 0.65 }}>
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
          <div className="pt-6 mt-6 border-t border-[rgba(255,255,255,0.12)] dark:border-[rgba(255,255,255,0.12)]">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 text-[#F5F5F5] dark:text-[#F5F5F5] transition-opacity"
              style={{
                fontSize: '15px',
                paddingTop: '18px',
                paddingBottom: '18px',
                opacity: 0.75,
              }}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span>Sign Out</span>
            </button>
            <div className="text-center text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '12px', opacity: 0.45, marginTop: '8px' }}>
              © {new Date().getFullYear()} Urban Manual
            </div>
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
            onClick={() => handleNavigateToFullPage("/auth/login")}
            className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
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
          onClick={() => handleNavigateToFullPage("/visited")}
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
          onClick={() => handleNavigateToFullPage("/saved")}
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
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">Collections coming soon</p>
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/collections")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
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
          // Open trip planner - you may need to pass a callback or use a context
          onClose();
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
          onClick={() => handleNavigateToFullPage("/achievements")}
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
          onClick={() => handleNavigateToFullPage("/settings?section=privacy")}
          className="w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all rounded-lg"
        >
          <span>Privacy</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=personalization")}
          className="w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all rounded-lg"
        >
          <span>Personalization</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=notifications")}
          className="w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all rounded-lg"
        >
          <span>Notifications</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/account")}
          className="w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all rounded-lg"
        >
          <span>Account Info</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=profile")}
          className="w-full flex items-center justify-between px-0 py-2.5 h-11 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all rounded-lg"
        >
          <span>Public Profile</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => handleNavigateToFullPage("/settings")}
          className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
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
          background: 'rgba(18,18,18,0.6)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <button
          onClick={navigateBack}
          className="p-2 flex items-center justify-center hover:opacity-70 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-[#F5F5F5] dark:text-[#F5F5F5]" />
        </button>
        <h2 className="text-[20px] font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] flex-1" style={{ fontWeight: 600 }}>
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
      tier={isTier1 ? 'tier1' : 'tier2'}
      showHandle={isTier1}
      customBorderRadius={isTier1 ? { topLeft: '20px', topRight: '0' } : undefined}
      customShadow={isTier1 ? '0 4px 28px rgba(0,0,0,0.45)' : undefined}
      customBlur={isTier1 ? '14px' : undefined}
    >
      <div className={`transition-opacity duration-200 ${currentSubpage !== 'main_drawer' ? 'opacity-100' : 'opacity-100'}`}>
        {renderContent()}
      </div>
    </Drawer>
  );
}
