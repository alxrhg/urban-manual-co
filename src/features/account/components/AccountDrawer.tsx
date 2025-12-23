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
          background: `conic-gradient(var(--editorial-accent) ${progressDegrees}deg, var(--editorial-border) ${progressDegrees}deg)`,
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-[var(--editorial-border)] flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile"
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <span className="text-lg font-semibold text-[var(--editorial-text-secondary)]">
              {displayUsername.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-base font-semibold text-[var(--editorial-text-primary)] truncate">
            {displayUsername}
          </h3>
          <span className="flex-shrink-0 px-2 py-0.5 border border-[var(--editorial-border)] rounded-md text-[10px] font-medium text-[var(--editorial-text-tertiary)]">
            {badge.name}
          </span>
        </div>
        <p className="text-xs text-[var(--editorial-text-secondary)] truncate">
          {email}
        </p>
      </div>

      {/* Edit Button */}
      <button
        onClick={onEditClick}
        className="flex-shrink-0 p-2 hover:bg-[var(--editorial-border-subtle)] rounded-lg transition-colors"
        title="Edit profile"
      >
        <ChevronRight className="h-5 w-5 text-[var(--editorial-text-tertiary)]" />
      </button>
    </div>
  );
}

// Next Trip - Plain text, no card container
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

  const daysText = trip.days_until === 0
    ? 'Today'
    : trip.days_until === 1
    ? 'Tomorrow'
    : `in ${trip.days_until} days`;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-1">
        Next Trip · {daysText}
      </p>
      <p
        className="text-[15px] text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors"
        style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
      >
        {trip.title || destination}
        {trip.start_date && (
          <span className="text-[var(--editorial-text-secondary)]">
            {' · '}{formatDate(trip.start_date)}
            {trip.end_date && trip.end_date !== trip.start_date && (
              <> – {formatDate(trip.end_date)}</>
            )}
          </span>
        )}
      </p>
    </button>
  );
}

// Library Stats - Inline text, no cards
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
  const serifStyle = { fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" };
  const linkClass = "text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors";

  return (
    <div className="flex items-center gap-4" style={serifStyle}>
      <button onClick={onSavedClick} className={linkClass}>
        <span className="font-medium text-[var(--editorial-text-primary)]">{stats.saved}</span> saved
      </button>
      <span className="text-[var(--editorial-text-tertiary)]">·</span>
      <button onClick={onVisitedClick} className={linkClass}>
        <span className="font-medium text-[var(--editorial-text-primary)]">{stats.visited}</span> visited
      </button>
      <span className="text-[var(--editorial-text-tertiary)]">·</span>
      <button onClick={onTripsClick} className={linkClass}>
        <span className="font-medium text-[var(--editorial-text-primary)]">{stats.trips}</span> trips
      </button>
    </div>
  );
}

// Journey Progress - Plain text with minimal progress bar
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
  const serifStyle = { fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" };

  return (
    <div>
      <p className="text-[13px] text-[var(--editorial-text-secondary)] mb-2" style={serifStyle}>
        <span className="text-[var(--editorial-text-primary)]">{visited}</span> places
        {countries > 0 && (
          <>
            {' · '}
            <span className="text-[var(--editorial-text-primary)]">{countries}</span>
            {' '}{countries === 1 ? 'country' : 'countries'}
          </>
        )}
      </p>
      <div className="h-px bg-[var(--editorial-border)] overflow-hidden mb-2">
        <motion.div
          className="h-full bg-[var(--editorial-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[11px] text-[var(--editorial-text-tertiary)] italic" style={serifStyle}>{message}</p>
    </div>
  );
}

// Quick Actions Menu - Simple text links
function QuickActionsMenu({
  onSettingsClick,
  onHelpClick,
}: {
  onSettingsClick: () => void;
  onHelpClick: () => void;
}) {
  const serifStyle = { fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" };
  const linkClass = "text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors";

  return (
    <div className="flex items-center gap-4" style={serifStyle}>
      <button onClick={onSettingsClick} className={linkClass}>
        Settings
      </button>
      <span className="text-[var(--editorial-text-tertiary)]">·</span>
      <DarkModeToggle />
      <span className="text-[var(--editorial-text-tertiary)]">·</span>
      <button onClick={onHelpClick} className={linkClass}>
        Help
      </button>
    </div>
  );
}

// Dark Mode Toggle Row - kept for drawer layout
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
        <div className="w-8 h-8 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center">
          <Moon className="h-4 w-4 text-[var(--editorial-text-secondary)]" />
        </div>
        <span className="text-sm font-medium text-[var(--editorial-text-primary)]">
          Dark Mode
        </span>
      </div>
      {mounted ? (
        <div className="flex items-center gap-2">
          <Sun
            className={`w-3.5 h-3.5 ${isDark ? 'text-[var(--editorial-text-tertiary)]' : 'text-[var(--editorial-text-primary)]'}`}
          />
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            className="scale-75"
            aria-label="Toggle dark mode"
          />
          <Moon
            className={`w-3.5 h-3.5 ${isDark ? 'text-[var(--editorial-text-primary)]' : 'text-[var(--editorial-text-tertiary)]'}`}
          />
        </div>
      ) : (
        <Switch checked={false} disabled className="scale-75" />
      )}
    </div>
  );
}

// Dark Mode Toggle - Inline text toggle for Quick Actions
function DarkModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = resolvedTheme || theme || 'light';
  const isDark = currentTheme === 'dark';

  if (!mounted) return <span className="text-[13px] text-[var(--editorial-text-tertiary)]">Dark</span>;

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}

// Sign Out - Plain text link
function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      onClick={onSignOut}
      className="text-[13px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)] transition-colors"
      style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
    >
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
        <div className="h-full flex flex-col bg-[var(--editorial-bg-elevated)]">
          {/* Close button */}
          <div className="flex justify-end p-4">
            <button
              onClick={closeLegacyDrawer}
              className="p-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
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
            <div className="w-20 h-20 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center mb-6">
              <User className="h-8 w-8 text-[var(--editorial-text-tertiary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--editorial-text-primary)] mb-2">
              Start Your Journey
            </h3>
            <p className="text-sm text-[var(--editorial-text-secondary)] mb-8 max-w-xs mx-auto">
              Sign in to track your travels and unlock your personal travel
              achievements.
            </p>

            <button
              onClick={() => openLegacyDrawer('login')}
              className="w-full max-w-[280px] py-3 rounded-lg bg-[var(--editorial-accent)] text-white text-sm font-medium hover:bg-[var(--editorial-accent-hover)] transition-colors"
            >
              Get Started
            </button>

            <p className="text-xs text-[var(--editorial-text-tertiary)] mt-4">
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
      <div className="h-full flex flex-col bg-[var(--editorial-bg-elevated)]">
        {/* Close button */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg font-bold text-[var(--editorial-text-primary)]">
            Account
          </h2>
          <button
            onClick={closeLegacyDrawer}
            className="p-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors rounded-lg hover:bg-[var(--editorial-border-subtle)]"
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
          <div className="h-px bg-[var(--editorial-border)] mx-4" />

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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--editorial-text-tertiary)] mb-3">
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
          <div className="h-px bg-[var(--editorial-border)] mx-4" />

          {/* 5. Quick Actions */}
          <div className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--editorial-text-tertiary)] mb-2">
              Quick Access
            </p>
            <QuickActionsMenu
              onSettingsClick={() => handleNavigate('/account?tab=settings')}
              onHelpClick={() => handleNavigate('/help')}
            />
          </div>
        </div>

        {/* Sign Out Footer */}
        <div className="px-4 pb-5 pt-3 border-t border-[var(--editorial-border)]">
          <SignOutButton onSignOut={handleSignOut} />
        </div>
      </div>
    </Drawer>
  );
}
