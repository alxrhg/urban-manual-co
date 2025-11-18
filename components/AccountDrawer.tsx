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
  ChevronLeft,
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
  initialSubpage?: SubpageId; // Allow opening directly to a subpage
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
  | 'create_trip_subpage'
  | 'achievements_subpage'
  | 'settings_subpage';

export function AccountDrawer({
  isOpen,
  onClose,
  onOpenChat,
  initialSubpage,
}: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [currentSubpage, setCurrentSubpage] = useState<SubpageId>(initialSubpage || 'main_drawer');
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
  // Create trip form state
  const [tripName, setTripName] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripHotel, setTripHotel] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Reset to main drawer when drawer closes, or set initial subpage when opening
  useEffect(() => {
    if (!isOpen) {
      setCurrentSubpage('main_drawer');
      setSelectedTripId(null);
      setSelectedTrip(null);
      // Reset create trip form
      setTripName('');
      setTripDestination('');
      setTripHotel('');
      setTripStartDate('');
      setTripEndDate('');
    } else if (initialSubpage && initialSubpage !== 'main_drawer') {
      // If drawer opens with an initial subpage, navigate to it
      setCurrentSubpage(initialSubpage);
      // If opening to trips subpage, also open create trip after a short delay
      if (initialSubpage === 'trips_subpage') {
        setTimeout(() => {
          setCurrentSubpage('create_trip_subpage');
        }, 300);
      }
    }
  }, [isOpen, initialSubpage]);

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
      case 'create_trip_subpage':
        return 'Create Trip';
      case 'achievements_subpage':
        return 'Achievements';
      case 'settings_subpage':
        return 'Settings';
      default:
        return 'Your Manual';
    }
  };

  // Get drawer subtitle based on current subpage
  const getDrawerSubtitle = () => {
    switch (currentSubpage) {
      case 'create_trip_subpage':
        return 'Plan your next getaway';
      default:
        return undefined;
    }
  };

  // Render main drawer content (Tier 1)
  const renderMainDrawer = () => (
    <div className="space-y-0" style={{ padding: '30px 26px', paddingTop: '30px', paddingBottom: '30px', paddingLeft: '26px', paddingRight: '26px' }}>
      {user ? (
        <>
          {/* Header: Avatar, Name, Username */}
          <div className="flex items-center gap-3" style={{ gap: '12px', marginBottom: '14px' }}>
            <div className="relative rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700" style={{ width: '64px', height: '64px' }}>
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#F5F5F5] dark:text-[#F5F5F5] truncate leading-tight" style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.2px' }}>
                {displayUsername}
              </p>
              <p className="text-[#F5F5F5] dark:text-[#F5F5F5] truncate leading-tight mt-0.5" style={{ fontSize: '14px', opacity: 0.55 }}>
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
                backgroundColor: 'rgba(255,255,255,0.09)',
                color: '#F5F5F5',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.09)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
              }}
            >
              View Full Profile
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Stats Bar: Horizontal Layout */}
          <div className="flex items-center" style={{ paddingTop: '16px', paddingBottom: '16px', marginBottom: '28px', gap: '22px' }}>
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.visited}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Visited
              </div>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" style={{ width: '1px' }} />
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.saved}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Saved
              </div>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" style={{ width: '1px' }} />
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.trips}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Trips
              </div>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" style={{ width: '1px' }} />
            <div className="flex-1 text-center">
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '18px', fontWeight: 600 }}>
                {stats.cities}
              </div>
              <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.48 }}>
                Cities
              </div>
            </div>
          </div>

          {/* Your Spaces Section */}
          <div className="space-y-0" style={{ marginBottom: '28px' }}>
            <h3 className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.45, letterSpacing: '0.3px', paddingBottom: '8px' }}>
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
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <Bookmark className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Saved</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
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
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <MapPin className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Visited</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
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
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <Folder className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Lists</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
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
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <Compass className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Trips</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
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
                  color: '#F5F5F5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <Settings className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                <span className="flex-1 text-left">Settings</span>
                <ChevronRight className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ width: '16px', height: '16px', opacity: 0.5 }} />
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
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '18px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
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
                <div className="text-[#F5F5F5] dark:text-[#F5F5F5] mb-1" style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px' }}>
                  {recentTrips[0].title}
                </div>
                {recentTrips[0].start_date && (
                  <div className="text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '13px', opacity: 0.55 }}>
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
          <div className="border-t border-[rgba(255,255,255,0.12)] dark:border-[rgba(255,255,255,0.12)]" style={{ paddingTop: '28px' }}>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 text-[#F5F5F5] dark:text-[#F5F5F5] transition-colors"
              style={{
                fontSize: '15px',
                paddingTop: '16px',
                paddingBottom: '16px',
                opacity: 0.75,
                borderRadius: '12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span>Sign Out</span>
            </button>
            <div className="text-center text-[#F5F5F5] dark:text-[#F5F5F5]" style={{ fontSize: '12px', opacity: 0.35, marginTop: '6px' }}>
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
    <div style={{ padding: '12px 12px 24px 12px' }}>
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : visitedPlaces.length > 0 ? (
        <div className="space-y-1">
          {visitedPlaces.map((visit, index) => (
            <button
              key={index}
              onClick={() => handleNavigateToFullPage(`/destination/${visit.slug}`)}
              className="w-full flex items-center transition-colors text-left"
              style={{
                height: '52px',
                padding: '0 20px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                fontSize: '16px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.88)',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
            >
              {visit.destination?.image && (
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 mr-3">
                  <Image
                    src={visit.destination.image}
                    alt={visit.destination.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.88)' }}>
                  {visit.destination?.name || visit.slug}
                </p>
                {visit.visited_at && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                    {new Date(visit.visited_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                )}
              </div>
              <ChevronRight className="flex-shrink-0" style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>No visited places yet</p>
        </div>
      )}
    </div>
  );

  // Render saved subpage
  const renderSavedSubpage = () => (
    <div style={{ padding: '12px 12px 24px 12px' }}>
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : savedPlaces.length > 0 ? (
        <div className="space-y-1">
          {savedPlaces.map((saved, index) => (
            <button
              key={index}
              onClick={() => handleNavigateToFullPage(`/destination/${saved.slug}`)}
              className="w-full flex items-center transition-colors text-left"
              style={{
                height: '52px',
                padding: '0 20px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                fontSize: '16px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.88)',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
            >
              {saved.destination?.image && (
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 mr-3">
                  <Image
                    src={saved.destination.image}
                    alt={saved.destination.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.88)' }}>
                  {saved.destination?.name || saved.slug}
                </p>
                {saved.destination?.city && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                    {saved.destination.city}
                  </p>
                )}
              </div>
              <ChevronRight className="flex-shrink-0" style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>No saved places yet</p>
        </div>
      )}
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
    <div style={{ padding: '12px 12px 24px 12px' }}>
      <button
        onClick={() => navigateToSubpage('create_trip_subpage')}
        className="w-full flex items-center justify-center gap-2 transition-colors mb-4"
        style={{
          height: '52px',
          padding: '0 20px',
          borderRadius: '14px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          fontSize: '16px',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.88)',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
        }}
      >
        <Plus className="w-4 h-4" />
        <span>New Trip</span>
      </button>
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-1">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => navigateToSubpage('trip_details_subpage', trip.id)}
              className="w-full flex items-center transition-colors text-left"
              style={{
                height: '52px',
                padding: '0 20px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                fontSize: '16px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.88)',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              }}
            >
              {trip.cover_image && (
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 mr-3">
                  <Image
                    src={trip.cover_image}
                    alt={trip.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.88)' }}>
                  {trip.title}
                </p>
                {trip.start_date && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
                    {new Date(trip.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                )}
              </div>
              <ChevronRight className="flex-shrink-0" style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>No trips yet</p>
        </div>
      )}
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

  // Render create trip subpage (Tier 3)
  const renderCreateTripSubpage = () => {
    return (
      <div style={{ padding: '28px', maxWidth: '360px', margin: '0 auto' }}>
        <div className="space-y-5" style={{ gap: '20px' }}>
          {/* Trip Name */}
          <div>
            <label 
              htmlFor="trip-name"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Trip Name *
            </label>
            <input
              id="trip-name"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Summer in Tokyo"
              required
              style={{
                width: '100%',
                height: '42px',
                padding: '0 18px',
                borderRadius: '22px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
              }}
              className="focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          {/* Destination */}
          <div>
            <label 
              htmlFor="trip-destination"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Destination *
            </label>
            <input
              id="trip-destination"
              type="text"
              value={tripDestination}
              onChange={(e) => setTripDestination(e.target.value)}
              placeholder="e.g., Tokyo, Japan"
              required
              style={{
                width: '100%',
                height: '42px',
                padding: '0 18px',
                borderRadius: '22px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
              }}
              className="focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          {/* Hotel / Base Location */}
          <div>
            <label 
              htmlFor="trip-hotel"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Hotel / Base Location
            </label>
            <input
              id="trip-hotel"
              type="text"
              value={tripHotel}
              onChange={(e) => setTripHotel(e.target.value)}
              placeholder="e.g., Four Seasons Hotel"
              style={{
                width: '100%',
                height: '42px',
                padding: '0 18px',
                borderRadius: '22px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
              }}
              className="focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="start-date"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Start Date *
              </label>
              <input
                id="start-date"
                type="date"
                value={tripStartDate}
                onChange={(e) => setTripStartDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 18px',
                  borderRadius: '22px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                }}
                className="focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div>
              <label 
                htmlFor="end-date"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                End Date *
              </label>
              <input
                id="end-date"
                type="date"
                value={tripEndDate}
                onChange={(e) => setTripEndDate(e.target.value)}
                min={tripStartDate}
                required
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 18px',
                  borderRadius: '22px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                }}
                className="focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render achievements subpage
  const renderAchievementsSubpage = () => (
    <div style={{ padding: '12px 12px 24px 12px' }}>
      <div className="text-center py-12">
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>Achievements coming soon</p>
      </div>
    </div>
  );

  // Render settings subpage
  const renderSettingsSubpage = () => (
    <div style={{ padding: '12px 12px 24px 12px' }}>
      <div className="space-y-1">
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=privacy")}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            height: '52px',
            padding: '0 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
        >
          <span>Privacy</span>
          <ChevronRight style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=personalization")}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            height: '52px',
            padding: '0 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
        >
          <span>Personalization</span>
          <ChevronRight style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=notifications")}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            height: '52px',
            padding: '0 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
        >
          <span>Notifications</span>
          <ChevronRight style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/account")}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            height: '52px',
            padding: '0 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
        >
          <span>Account Info</span>
          <ChevronRight style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
        </button>
        <button
          onClick={() => handleNavigateToFullPage("/settings?section=profile")}
          className="w-full flex items-center justify-between transition-colors"
          style={{
            height: '52px',
            padding: '0 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
          }}
        >
          <span>Public Profile</span>
          <ChevronRight style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.35)' }} />
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
      case 'create_trip_subpage':
        return renderCreateTripSubpage();
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
        className="flex items-center"
        style={{
          height: '64px',
          padding: '0 20px',
          background: '#101010',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={navigateBack}
          className="flex items-center justify-center transition-opacity hover:opacity-70"
          style={{
            width: '40px',
            height: '40px',
          }}
          aria-label="Back"
        >
          <ChevronLeft className="text-[rgba(255,255,255,0.85)]" style={{ width: '22px', height: '22px' }} strokeWidth={1.5} />
        </button>
        <h2 
          className="flex-1 text-center"
          style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {getDrawerTitle()}
        </h2>
        <div style={{ width: '40px' }} /> {/* Spacer for centering */}
      </div>
    );
  };

  // Determine z-index based on subpage tier
  const getZIndex = () => {
    if (currentSubpage === 'main_drawer') {
      return 1000; // Tier 1
    }
    return 1200; // Tier 2 (subDrawer)
  };

  const isTier1 = currentSubpage === 'main_drawer';
  const isTier2 = currentSubpage !== 'main_drawer' && currentSubpage !== 'create_trip_subpage';
  const isTier3 = currentSubpage === 'create_trip_subpage';

  // Handle create trip
  const handleCreateTrip = async () => {
    if (!tripName || !tripDestination || !tripStartDate || !tripEndDate) {
      return;
    }

    setIsCreatingTrip(true);
    try {
      const supabaseClient = createClient();
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        return;
      }

      const { data: newTrip, error } = await supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          title: tripName,
          destination: tripDestination,
          hotel: tripHotel || null,
          start_date: tripStartDate,
          end_date: tripEndDate,
          status: 'planning',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating trip:', error);
        return;
      }

      // Close create trip drawer and open trip details
      if (newTrip) {
        setSelectedTripId(newTrip.id);
        setCurrentSubpage('trip_details_subpage');
        // Refresh trips list
        const { data: tripsData } = await supabaseClient
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setTrips((tripsData as Trip[]) || []);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // Render footer for create trip subpage
  const renderCreateTripFooter = () => {
    if (currentSubpage !== 'create_trip_subpage') return null;

    return (
      <div className="flex gap-2.5" style={{ gap: '10px' }}>
        <button
          onClick={handleCreateTrip}
          disabled={isCreatingTrip || !tripName || !tripDestination || !tripStartDate || !tripEndDate}
          className="flex-1 flex items-center justify-center transition-all"
          style={{
            height: '48px',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: 600,
            backgroundColor: 'rgba(255,255,255,0.92)',
            color: '#000',
            opacity: (!tripName || !tripDestination || !tripStartDate || !tripEndDate) ? 0.5 : 1,
          }}
        >
          {isCreatingTrip ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Trip'}
        </button>
      </div>
    );
  };

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose}
      title={currentSubpage === 'main_drawer' ? undefined : getDrawerTitle()}
      subtitle={isTier3 ? getDrawerSubtitle() : undefined}
      headerContent={currentSubpage !== 'main_drawer' && !isTier3 ? renderHeader() : undefined}
      mobileVariant="bottom"
      desktopSpacing="right-4 top-4 bottom-4"
      desktopWidth={isTier1 ? "420px" : isTier3 ? "420px" : "92vw"}
      position="right"
      style="glassy"
      backdropOpacity={isTier1 ? "18" : isTier3 ? "0" : "35"}
      keepStateOnClose={true}
      zIndex={getZIndex()}
      tier={isTier1 ? 'tier1' : isTier3 ? 'tier3' : 'tier2'}
      noOverlay={isTier3}
      footerContent={isTier3 ? renderCreateTripFooter() : undefined}
      showHandle={isTier1}
      customBorderRadius={isTier1 
        ? { topLeft: '22px', topRight: '22px', bottomLeft: '22px', bottomRight: '22px' }
        : { topLeft: '24px', topRight: '24px', bottomLeft: '24px', bottomRight: '24px' }
      }
      customShadow={isTier1 ? '0 12px 40px rgba(0,0,0,0.55)' : '0 12px 40px rgba(0,0,0,0.45)'}
      customBlur={isTier1 ? '22px' : '12px'}
      customMargin={isTier1 ? { bottom: '16px', right: '16px' } : undefined}
      customBackground={isTier1 ? 'rgba(18,18,18,0.78)' : '#101010'}
      customBorder={isTier1 ? { color: 'rgba(255,255,255,0.08)', thickness: '1px' } : undefined}
    >
      <div className={`transition-opacity duration-200 ${currentSubpage !== 'main_drawer' ? 'opacity-100' : 'opacity-100'}`}>
        {renderContent()}
      </div>
    </Drawer>
  );
}
