'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Drawer } from '@/ui/Drawer';
import { Switch } from '@/ui/switch';
import {
  getTravelBadge,
  getMilestoneProgress,
  getMilestoneMessage,
} from '@/lib/travel-achievements';
import { parseDestinations } from '@/types/trip';
import type { Trip } from '@/types/trip';
import {
  Settings,
  MapPin,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Moon,
  Sun,
  HelpCircle,
  Calendar,
  Plane,
  Map,
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  countries: number;
}

interface UpcomingTrip extends Trip {
  days_until: number;
}

// Compact Profile Header - Mobile optimized inline layout
function CompactProfileHeader({
  avatarUrl,
  displayUsername,
  email,
  progress,
  badge,
  onEditClick,
}: {
  avatarUrl: string | null;
  displayUsername: string;
  email: string;
  progress: number;
  badge: { name: string };
  onEditClick: () => void;
}) {
  const progressDegrees = (progress / 100) * 360;

  return (
    <div className="flex items-start gap-3 p-4">
      {/* Avatar with Progress Ring */}
      <div
        className="relative w-14 h-14 rounded-full p-0.5 flex-shrink-0"
        style={{
          background: `conic-gradient(#000 ${progressDegrees}deg, #e5e7eb ${progressDegrees}deg)`,
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile"
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              {displayUsername.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {displayUsername}
          </h3>
          <span className="flex-shrink-0 px-2 py-0.5 border border-gray-200 dark:border-gray-800 rounded-md text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {badge.name}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {email}
        </p>
      </div>

      {/* Edit Button */}
      <button
        onClick={onEditClick}
        className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
        title="Edit profile"
      >
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </button>
    </div>
  );
}

// Next Trip Hero Card - More prominent, actionable
function NextTripHeroCard({
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
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left"
    >
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Next Trip
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-md">
            {trip.days_until === 0
              ? 'Today'
              : trip.days_until === 1
              ? 'Tomorrow'
              : `${trip.days_until} days`}
          </span>
        </div>

        {/* Trip Details */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
              {trip.title || destination}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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

          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 flex-shrink-0">
            <span className="text-xs font-medium">View</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// Library Stats Grid - Compact, clickable tiles
function LibraryStatsGrid({
  stats,
  onSavedClick,
  onVisitedClick,
  onTripsClick,
}: {
  stats: UserStats;
  onSavedClick: () => void;
  onVisitedClick: () => void;
  onTripsClick: () => void;
}) {
  const tiles = [
    {
      icon: Bookmark,
      count: stats.saved,
      label: 'Saved',
      onClick: onSavedClick,
    },
    {
      icon: MapPin,
      count: stats.visited,
      label: 'Visited',
      onClick: onVisitedClick,
    },
    {
      icon: Map,
      count: stats.trips,
      label: 'Trips',
      onClick: onTripsClick,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <motion.button
          key={tile.label}
          onClick={tile.onClick}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-1 p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <tile.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {tile.count}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500">
            {tile.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

// Journey Progress Bar - Compact milestone tracker
function JourneyProgress({
  visited,
  countries,
  percentage,
  message,
}: {
  visited: number;
  countries: number;
  percentage: number;
  message: string;
}) {
  return (
    <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span className="font-semibold text-gray-900 dark:text-white">
          {visited}
        </span>{' '}
        places
        {countries > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {countries}
            </span>{' '}
            {countries === 1 ? 'country' : 'countries'}
          </>
        )}
      </p>
      <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-lg bg-black dark:bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500">{message}</p>
    </div>
  );
}

// Quick Actions Menu - Settings and navigation
function QuickActionsMenu({
  onSettingsClick,
  onHelpClick,
}: {
  onSettingsClick: () => void;
  onHelpClick: () => void;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={onSettingsClick}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Settings
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>

      <DarkModeRow />

      <button
        onClick={onHelpClick}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <HelpCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Help & Support
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>
    </div>
  );
}

// Dark Mode Toggle Row
function DarkModeRow() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = resolvedTheme || theme || 'light';
  const isDark = currentTheme === 'dark';

  return (
    <div className="w-full flex items-center justify-between p-3 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Dark Mode
        </span>
      </div>
      {mounted ? (
        <div className="flex items-center gap-2">
          <Sun
            className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}
          />
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            className="scale-75"
            aria-label="Toggle dark mode"
          />
          <Moon
            className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-gray-400'}`}
          />
        </div>
      ) : (
        <Switch checked={false} disabled className="scale-75" />
      )}
    </div>
  );
}

// Sign Out Button - Clean, understated
function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      onClick={onSignOut}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Sign Out
    </button>
  );
}

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    isDrawerOpen,
    closeDrawer: closeLegacyDrawer,
    openDrawer: openLegacyDrawer,
  } = useDrawer();
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

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0, countries: 0 });
        setUpcomingTrip(null);
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

        // Fetch all stats and upcoming trip in parallel
        const today = new Date().toISOString().split('T')[0];

        const [
          visitedResult,
          savedResult,
          tripsResult,
          countriesResult,
          upcomingTripResult,
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
          const daysUntil = Math.ceil(
            (tripDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          setUpcomingTrip({
            ...upcomingTripResult.data,
            days_until: Math.max(0, daysUntil),
          });
        } else {
          setUpcomingTrip(null);
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
  const email = user?.email || '';

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
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Welcome content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start Your Journey
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              Sign in to track your travels and unlock your personal travel
              achievements.
            </p>

            <button
              onClick={() => openLegacyDrawer('login')}
              className="w-full max-w-[280px] py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity"
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

  // Logged in state - Redesigned mobile-first layout
  return (
    <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Close button */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Account
          </h2>
          <button
            onClick={closeLegacyDrawer}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <span className="sr-only">Close</span>
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* 1. Compact Profile Header */}
          <CompactProfileHeader
            avatarUrl={avatarUrl}
            displayUsername={displayUsername}
            email={email}
            progress={milestoneProgress.percentage}
            badge={badge}
            onEditClick={() => handleNavigate('/account?tab=profile')}
          />

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4" />

          {/* 2. Next Trip Hero (if exists) */}
          <AnimatePresence>
            {upcomingTrip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-4 py-4"
              >
                <NextTripHeroCard
                  trip={upcomingTrip}
                  onClick={() => handleNavigate(`/trips/${upcomingTrip.id}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Library Stats */}
          <div className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Your Library
            </p>
            <LibraryStatsGrid
              stats={stats}
              onSavedClick={() => openLegacyDrawer('saved-places', 'account')}
              onVisitedClick={() =>
                openLegacyDrawer('visited-places', 'account')
              }
              onTripsClick={() => openLegacyDrawer('trips', 'account')}
            />
          </div>

          {/* 4. Journey Progress */}
          <div className="px-4 pb-4">
            <JourneyProgress
              visited={stats.visited}
              countries={stats.countries}
              percentage={milestoneProgress.percentage}
              message={milestoneMessage}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4" />

          {/* 5. Quick Actions */}
          <div className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Quick Access
            </p>
            <QuickActionsMenu
              onSettingsClick={() => handleNavigate('/account?tab=settings')}
              onHelpClick={() => handleNavigate('/help')}
            />
          </div>
        </div>

        {/* Sign Out Footer */}
        <div className="px-4 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <SignOutButton onSignOut={handleSignOut} />
        </div>
      </div>
    </Drawer>
  );
}
