'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/switch';
import {
  getTravelBadge,
  getMilestoneProgress,
  getMilestoneMessage,
} from '@/lib/travel-achievements';
import { parseDestinations } from '@/types/trip';
import type { Trip } from '@/types/trip';
import type { Destination } from '@/types/destination';
import {
  Settings,
  MapPin,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Edit3,
  Compass,
  Moon,
  Sun,
  HelpCircle,
  Calendar,
  Plane,
  Sparkles,
  Globe,
} from 'lucide-react';
import Image from 'next/image';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  countries: number;
}

interface UpcomingTrip extends Trip {
  days_until: number;
}

// Avatar with Progress Ring - uses black/gray per design system
function AvatarWithRing({
  avatarUrl,
  displayUsername,
  progress,
}: {
  avatarUrl: string | null;
  displayUsername: string;
  progress: number;
}) {
  const progressDegrees = (progress / 100) * 360;

  return (
    <div
      className="relative w-[72px] h-[72px] rounded-full p-1 flex items-center justify-center"
      style={{
        background: `conic-gradient(#000 ${progressDegrees}deg, #e5e7eb ${progressDegrees}deg)`,
      }}
    >
      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile"
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <span className="text-2xl font-semibold text-gray-500 dark:text-gray-400">
            {displayUsername.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// Travel Badge Component - neutral gray style per design system
function TravelBadge({ badge }: { badge: { name: string } }) {
  return (
    <span className="mt-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
      {badge.name}
    </span>
  );
}

// Upcoming Trip Card
function UpcomingTripCard({
  trip,
  onClick,
}: {
  trip: UpcomingTrip;
  onClick: () => void;
}) {
  const destinations = parseDestinations(trip.destination);
  const destination = destinations[0] || 'Trip';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {trip.days_until === 0
                ? 'Today'
                : trip.days_until === 1
                ? 'Tomorrow'
                : `In ${trip.days_until} days`}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {trip.title || destination}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {destination}
            {trip.start_date && (
              <>
                {' · '}
                {formatDate(trip.start_date)}
                {trip.end_date && trip.end_date !== trip.start_date && (
                  <> - {formatDate(trip.end_date)}</>
                )}
              </>
            )}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// Recommendation Card
function RecommendationCard({
  destination,
  onClick,
}: {
  destination: Destination;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left w-full group"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {destination.image ? (
          <Image
            src={destination.image}
            alt={destination.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {destination.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {destination.city}
          {destination.category && ` · ${destination.category}`}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
    </button>
  );
}

// Library Tile Component - minimal card style
function LibraryTile({
  icon: Icon,
  count,
  label,
  onClick,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 active:scale-[0.98] transition-all"
    >
      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-1" />
      <span className="text-xl font-semibold text-gray-900 dark:text-white">
        {count}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500">
        {label}
      </span>
    </button>
  );
}

// Settings Row Component
function SettingsRow({
  icon: Icon,
  label,
  onClick,
  rightElement,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
}) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      </div>
      {rightElement || (
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 transition-transform group-hover:translate-x-0.5" />
      )}
    </Component>
  );
}

// Dark Mode Toggle Component
function DarkModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={false} disabled className="scale-75" />
      </div>
    );
  }

  const currentTheme = resolvedTheme || theme || 'light';
  const isDark = currentTheme === 'dark';

  return (
    <div className="flex items-center gap-2">
      <Sun className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-900'}`} />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        className="scale-75"
        aria-label="Toggle dark mode"
      />
      <Moon className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-400'}`} />
    </div>
  );
}

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDrawerOpen, closeDrawer: closeLegacyDrawer, openDrawer: openLegacyDrawer } = useDrawer();
  const isOpen = isDrawerOpen('account');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
    countries: 0,
  });
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0, countries: 0 });
        setUpcomingTrip(null);
        setRecommendations([]);
        return;
      }

      try {
        const supabaseClient = createClient();

        // Fetch profile
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
        }

        // Fetch all stats, upcoming trip, and recommendations in parallel
        const today = new Date().toISOString().split('T')[0];

        const [
          visitedResult,
          savedResult,
          tripsResult,
          countriesResult,
          upcomingTripResult,
          recentVisitedResult,
        ] = await Promise.all([
          supabaseClient
            .from('visited_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseClient
            .from('saved_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseClient
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseClient
            .from('visited_places')
            .select('destinations!inner(country)')
            .eq('user_id', user.id),
          // Get upcoming trip (soonest future trip)
          supabaseClient
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .gte('start_date', today)
            .order('start_date', { ascending: true })
            .limit(1)
            .maybeSingle(),
          // Get recent visited places to find cities for recommendations
          supabaseClient
            .from('visited_places')
            .select('destinations!inner(city)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        // Calculate unique countries
        const uniqueCountries = new Set(
          (countriesResult.data || [])
            .map((item: Record<string, unknown>) => {
              const dest = item.destinations;
              if (Array.isArray(dest)) {
                return dest[0]?.country;
              }
              return (dest as { country?: string | null } | null)?.country;
            })
            .filter(Boolean)
        );

        setStats({
          visited: visitedResult.count || 0,
          saved: savedResult.count || 0,
          trips: tripsResult.count || 0,
          countries: uniqueCountries.size,
        });

        // Set upcoming trip with days until
        if (upcomingTripResult.data) {
          const tripDate = new Date(upcomingTripResult.data.start_date);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          tripDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((tripDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

          setUpcomingTrip({
            ...upcomingTripResult.data,
            days_until: Math.max(0, daysUntil),
          });
        } else {
          setUpcomingTrip(null);
        }

        // Get recommendations based on visited cities
        const visitedCities = new Set(
          (recentVisitedResult.data || [])
            .map((item: Record<string, unknown>) => {
              const dest = item.destinations;
              if (Array.isArray(dest)) {
                return dest[0]?.city;
              }
              return (dest as { city?: string | null } | null)?.city;
            })
            .filter(Boolean)
        );

        // Fetch recommendations from cities user has visited
        if (visitedCities.size > 0) {
          const cities = Array.from(visitedCities).slice(0, 3);
          const { data: recData } = await supabaseClient
            .from('destinations')
            .select('id, slug, name, city, category, image')
            .in('city', cities)
            .not('slug', 'in', `(${(await supabaseClient
              .from('visited_places')
              .select('destinations!inner(slug)')
              .eq('user_id', user.id)
            ).data?.map((d: Record<string, unknown>) => {
              const dest = d.destinations;
              if (Array.isArray(dest)) return `"${dest[0]?.slug}"`;
              return `"${(dest as { slug?: string })?.slug}"`;
            }).join(',') || '""'})`)
            .limit(3);

          setRecommendations((recData as Destination[]) || []);
        }
      } catch (error) {
        console.error('Error fetching profile and stats:', error);
      }
    }

    if (isOpen && user) {
      fetchProfileAndStats();
    }
  }, [user, isOpen]);

  const handleSignOut = async () => {
    await signOut();
    closeLegacyDrawer();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    closeLegacyDrawer();
    setTimeout(() => router.push(path), 200);
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  // Calculate badge and progress
  const badge = getTravelBadge(stats.visited);
  const milestoneProgress = getMilestoneProgress(stats.visited);
  const milestoneMessage = getMilestoneMessage(milestoneProgress);

  // Logged out state
  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
          {/* Close button */}
          <div className="flex justify-end p-4">
            <button
              onClick={closeLegacyDrawer}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Welcome content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start Your Journey
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              Sign in to track your travels and unlock your personal travel achievements.
            </p>

            <button
              onClick={() => openLegacyDrawer('login')}
              className="w-full max-w-[280px] py-3 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Get Started
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Free to use, no credit card required
            </p>
          </div>
        </div>
      </Drawer>
    );
  }

  // Logged in state
  return (
    <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Close button */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={closeLegacyDrawer}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header with Avatar Ring */}
          <div className="flex flex-col items-center px-5 pb-4">
            <AvatarWithRing
              avatarUrl={avatarUrl}
              displayUsername={displayUsername}
              progress={milestoneProgress.percentage}
            />
            <TravelBadge badge={badge} />

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-3 text-center">
              {displayUsername}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center truncate max-w-full">
              {user.email}
            </p>

            <button
              onClick={() => handleNavigate('/account')}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>

          {/* Upcoming Trip - Priority section */}
          {upcomingTrip && (
            <div className="px-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Next Trip
                </h3>
              </div>
              <UpcomingTripCard
                trip={upcomingTrip}
                onClick={() => handleNavigate(`/trips/${upcomingTrip.id}`)}
              />
            </div>
          )}

          {/* For You - Recommendations */}
          {recommendations.length > 0 && (
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    For You
                  </h3>
                </div>
                <button
                  onClick={() => handleNavigate('/discover')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  See all
                </button>
              </div>
              <div className="space-y-2">
                {recommendations.map((dest) => (
                  <RecommendationCard
                    key={dest.slug}
                    destination={dest}
                    onClick={() => handleNavigate(`/destinations/${dest.slug}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Journey Progress - Compact */}
          <div className="px-5 mb-4">
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">{stats.visited}</span> places
                {stats.countries > 0 && (
                  <>
                    {' · '}
                    <span className="font-semibold text-gray-900 dark:text-white">{stats.countries}</span> {stats.countries === 1 ? 'country' : 'countries'}
                  </>
                )}
              </p>
              <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-black dark:bg-white transition-all duration-500"
                  style={{ width: `${milestoneProgress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {milestoneMessage}
              </p>
            </div>
          </div>

          {/* Digital Passport */}
          {stats.countries > 0 && (
            <div className="px-5 mb-4">
              <button
                onClick={() => openLegacyDrawer('passport', 'account')}
                className="w-full p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-lg">🛂</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        Digital Passport
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {stats.countries} {stats.countries === 1 ? 'stamp' : 'stamps'} collected
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          )}

          {/* Library Grid */}
          <div className="px-5 mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Your Library
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <LibraryTile
                icon={Bookmark}
                count={stats.saved}
                label="Saved"
                onClick={() => openLegacyDrawer('saved-places', 'account')}
              />
              <LibraryTile
                icon={MapPin}
                count={stats.visited}
                label="Visited"
                onClick={() => openLegacyDrawer('visited-places', 'account')}
              />
              <LibraryTile
                icon={Compass}
                count={stats.trips}
                label="Trips"
                onClick={() => openLegacyDrawer('trips', 'account')}
              />
            </div>
          </div>
        </div>

        {/* Quick Settings */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <SettingsRow
            icon={Settings}
            label="Settings"
            onClick={() => handleNavigate('/account?tab=settings')}
          />
          <SettingsRow
            icon={Moon}
            label="Dark Mode"
            rightElement={<DarkModeToggle />}
          />
          <SettingsRow
            icon={HelpCircle}
            label="Help & Support"
            onClick={() => handleNavigate('/help')}
          />
        </div>

        {/* Sign Out Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 py-3 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </Drawer>
  );
}
