'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Drawer } from '@/ui/Drawer';
import { getTravelBadge } from '@/lib/travel-achievements';
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
  Plane,
  Compass,
} from 'lucide-react';
import Image from 'next/image';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
}

interface UpcomingTrip extends Trip {
  days_until: number;
}

// Compact Avatar Component
function Avatar({
  avatarUrl,
  displayUsername,
  size = 'md',
}: {
  avatarUrl: string | null;
  displayUsername: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-16 h-16 text-xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          width={size === 'lg' ? 64 : size === 'md' ? 56 : 40}
          height={size === 'lg' ? 64 : size === 'md' ? 56 : 40}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="font-semibold text-gray-500 dark:text-gray-400">
          {displayUsername.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// Menu Row Component
function MenuRow({
  icon: Icon,
  label,
  value,
  onClick,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
        variant === 'danger'
          ? 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
        <span className="text-[15px] text-gray-900 dark:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value !== undefined && (
          <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
            {value}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </div>
    </button>
  );
}

// Theme Toggle Component
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
        <div className="w-20 h-8" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          !isDark
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-3.5 h-3.5" />
        <span>Light</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          isDark
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-3.5 h-3.5" />
        <span>Dark</span>
      </button>
    </div>
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
  });
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null);

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0 });
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

        // Fetch stats and upcoming trip in parallel
        const today = new Date().toISOString().split('T')[0];

        const [visitedResult, savedResult, tripsResult, upcomingTripResult] =
          await Promise.all([
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
              .from('trips')
              .select('*')
              .eq('user_id', user.id)
              .gte('start_date', today)
              .order('start_date', { ascending: true })
              .limit(1)
              .maybeSingle(),
          ]);

        setStats({
          visited: visitedResult.count || 0,
          saved: savedResult.count || 0,
          trips: tripsResult.count || 0,
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
  const badge = getTravelBadge(stats.visited);

  // Logged out state
  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
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

  // Format trip dates
  const formatTripDates = (trip: UpcomingTrip) => {
    const destinations = parseDestinations(trip.destination);
    const destination = destinations[0] || 'Trip';

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const dateRange = trip.start_date
      ? `${formatDate(trip.start_date)}${
          trip.end_date && trip.end_date !== trip.start_date
            ? ` - ${formatDate(trip.end_date)}`
            : ''
        }`
      : '';

    return { destination, dateRange };
  };

  // Logged in state
  return (
    <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Profile Header */}
        <div className="px-5 pt-2 pb-5">
          <div className="flex items-start gap-4">
            <Avatar avatarUrl={avatarUrl} displayUsername={displayUsername} />
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {displayUsername}
              </h2>
              <span className="inline-block mt-1 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full">
                {badge.name}
              </span>
              <button
                onClick={() => handleNavigate('/account')}
                className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Trip */}
        {upcomingTrip && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => handleNavigate(`/trips/${upcomingTrip.id}`)}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Plane className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 dark:text-white truncate">
                    {upcomingTrip.title || formatTripDates(upcomingTrip).destination}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {upcomingTrip.days_until === 0
                      ? 'Today'
                      : upcomingTrip.days_until === 1
                      ? 'Tomorrow'
                      : `In ${upcomingTrip.days_until} days`}
                    {formatTripDates(upcomingTrip).dateRange &&
                      ` · ${formatTripDates(upcomingTrip).dateRange}`}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <div className="border-t border-gray-100 dark:border-gray-800">
            <MenuRow
              icon={Bookmark}
              label="Saved Places"
              value={stats.saved}
              onClick={() => openLegacyDrawer('saved-places', 'account')}
            />
            <MenuRow
              icon={MapPin}
              label="Visited Places"
              value={stats.visited}
              onClick={() => openLegacyDrawer('visited-places', 'account')}
            />
            <MenuRow
              icon={Compass}
              label="My Trips"
              value={stats.trips}
              onClick={() => openLegacyDrawer('trips', 'account')}
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800">
            <MenuRow
              icon={Settings}
              label="Settings"
              onClick={() => handleNavigate('/account?tab=settings')}
            />
            <MenuRow
              icon={HelpCircle}
              label="Help & Support"
              onClick={() => handleNavigate('/help')}
            />
          </div>

          {/* Theme Toggle */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-gray-900 dark:text-white">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 text-[15px] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </Drawer>
  );
}
