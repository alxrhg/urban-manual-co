'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawer } from '@/contexts/DrawerContext';
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  User,
  X,
  Sparkles,
  Plus,
  Plane,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { formatTripDateRange } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';
import { Button } from '@/components/ui/button';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
}

interface Trip {
  id: string;
  name?: string;
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  coverImage?: string;
  status?: string;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrawerView = 'main' | 'trips';

// Minimal close button
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2.5 sm:p-2 rounded-full bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700 hover:text-stone-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
    >
      <X className="w-5 h-5 sm:w-4 sm:h-4" />
    </button>
  );
}

// Back button
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
    >
      <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-gray-400" />
    </button>
  );
}

// Quick stat pill
function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-gray-800">
      <span className="text-sm sm:text-xs font-semibold text-stone-900 dark:text-white">{value}</span>
      <span className="text-xs text-stone-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

// Quick action card
function QuickAction({
  icon: Icon,
  label,
  count,
  onClick,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-2 p-5 sm:p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] min-h-[100px] sm:min-h-[88px] ${
        accent
          ? 'bg-stone-900 dark:bg-white border-stone-900 dark:border-white hover:bg-stone-800 dark:hover:bg-gray-100'
          : 'bg-white dark:bg-gray-900 border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-sm'
      }`}
    >
      <div className={`p-2.5 sm:p-2 rounded-xl transition-transform group-hover:scale-110 ${
        accent
          ? 'bg-white/20 dark:bg-gray-900/20'
          : 'bg-stone-100 dark:bg-gray-800'
      }`}>
        <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${
          accent ? 'text-white dark:text-gray-900' : 'text-stone-600 dark:text-gray-300'
        }`} />
      </div>
      <div className="text-center">
        <p className={`text-sm sm:text-xs font-medium ${
          accent ? 'text-white dark:text-gray-900' : 'text-stone-900 dark:text-white'
        }`}>
          {label}
        </p>
        {count !== undefined && (
          <p className={`text-xs mt-0.5 ${
            accent ? 'text-white/70 dark:text-gray-900/70' : 'text-stone-500 dark:text-gray-400'
          }`}>
            {count} {count === 1 ? 'place' : 'places'}
          </p>
        )}
      </div>
    </button>
  );
}

// Settings row item
function SettingsItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:py-3 rounded-xl transition-colors min-h-[52px] sm:min-h-[44px] ${
        danger
          ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 active:bg-red-100 dark:active:bg-red-900/20'
          : 'text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
        <span className="text-base sm:text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
        danger ? 'text-red-400 dark:text-red-500' : 'text-stone-400 dark:text-gray-500'
      }`} />
    </button>
  );
}

// Trip status config
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return {
        label: 'Planning',
        bg: 'bg-blue-500/10 backdrop-blur-md',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: 'bg-amber-500/10 backdrop-blur-md',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
      };
    case 'ongoing':
      return {
        label: 'Ongoing',
        bg: 'bg-green-500/10 backdrop-blur-md',
        text: 'text-green-600 dark:text-green-400',
        dot: 'bg-green-500 animate-pulse',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-gray-500/10 backdrop-blur-md',
        text: 'text-gray-600 dark:text-gray-400',
        dot: 'bg-gray-400',
      };
    default:
      return {
        label: 'Planning',
        bg: 'bg-blue-500/10 backdrop-blur-md',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
      };
  }
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openDrawer: openLegacyDrawer } = useDrawer();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
  });

  // Sub-view state
  const [currentView, setCurrentView] = useState<DrawerView>('main');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Reset view when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView('main');
    }
  }, [isOpen]);

  // Fetch trips when switching to trips view
  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      return;
    }

    setTripsLoading(true);
    try {
      const supabaseClient = createClient();
      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setTripsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (currentView === 'trips' && isOpen) {
      fetchTrips();
    }
  }, [currentView, isOpen, fetchTrips]);

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0 });
        return;
      }

      try {
        const supabaseClient = createClient();

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
        } else {
          const { data: userProfileData } = await supabaseClient
            .from('user_profiles')
            .select('username')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userProfileData?.username) {
            setUsername(userProfileData.username);
          }
        }

        const [visitedResult, savedResult, tripsResult] = await Promise.all([
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
        ]);

        setStats({
          visited: visitedResult.count || 0,
          saved: savedResult.count || 0,
          trips: tripsResult.count || 0,
        });
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
    onClose();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => router.push(path), 200);
  };

  const handleSelectTrip = (tripId: string) => {
    onClose();
    setTimeout(() => router.push(`/trips/${tripId}`), 200);
  };

  const handleNewTrip = async () => {
    if (!user) {
      onClose();
      router.push('/auth/login');
      return;
    }

    try {
      const supabaseClient = createClient();
      const { data, error } = await supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          title: 'New Trip',
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;

      onClose();
      if (data) {
        setTimeout(() => router.push(`/trips/${data.id}`), 200);
      }
    } catch (err) {
      console.error('Error creating trip:', err);
    }
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  // Logged out state - welcoming and inviting
  if (!user) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="flex justify-end p-4 sm:p-5">
          <CloseButton onClick={onClose} />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-10 pb-8 text-center">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900 flex items-center justify-center">
              <Sparkles className="w-12 h-12 sm:w-10 sm:h-10 text-stone-400 dark:text-gray-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-stone-900 dark:bg-white flex items-center justify-center">
              <User className="w-5 h-5 sm:w-4 sm:h-4 text-white dark:text-gray-900" />
            </div>
          </div>

          {/* Text */}
          <h2 className="text-2xl sm:text-xl font-semibold text-stone-900 dark:text-white mb-3">
            Your travel companion
          </h2>
          <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 mb-10 max-w-[280px] leading-relaxed">
            Sign in to save places, plan trips, and keep track of everywhere you&apos;ve been.
          </p>

          {/* CTA */}
          <button
            onClick={() => handleNavigate('/auth/login')}
            className="w-full max-w-[280px] py-4 sm:py-3.5 rounded-2xl sm:rounded-xl bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-base sm:text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all min-h-[56px] sm:min-h-[48px]"
          >
            Get Started
          </button>

          <p className="text-xs text-stone-400 dark:text-gray-500 mt-4">
            Free to use, no credit card required
          </p>
        </div>
      </div>
    );
  }

  // Trips sub-view
  if (currentView === 'trips') {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-6 sm:pt-5 pb-4">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => setCurrentView('main')} />
            <div>
              <h1 className="text-xl sm:text-lg font-semibold text-stone-900 dark:text-white">
                Trips
              </h1>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-gray-400">
                {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
              </p>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {/* New Trip Button */}
        <div className="px-5 sm:px-6 pb-4">
          <Button onClick={handleNewTrip} className="w-full h-12 rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-safe">
          {tripsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16">
              <Loader2 className="w-8 h-8 sm:w-6 sm:h-6 animate-spin text-stone-300 dark:text-gray-600" />
              <p className="mt-4 text-base sm:text-sm text-stone-500 dark:text-gray-400">
                Loading trips...
              </p>
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16 px-8 text-center">
              <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <Plane className="w-9 h-9 sm:w-7 sm:h-7 text-stone-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
                No trips yet
              </h3>
              <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 max-w-[240px]">
                Start planning your next adventure
              </p>
            </div>
          ) : (
            <div className="px-4 sm:px-5 space-y-3 pb-4">
              {trips.map((trip) => {
                const tripName = trip.name || trip.title || 'Untitled Trip';
                const dateRange = formatTripDateRange(trip.start_date, trip.end_date);
                const coverImage = trip.cover_image || trip.coverImage;
                const statusConfig = getStatusConfig(trip.status);

                return (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip.id)}
                    className="group relative w-full border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all text-left bg-white dark:bg-gray-900"
                  >
                    <div className="flex">
                      {/* Left: Image */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 self-center">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={tripName}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="120px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Right: Content */}
                      <div className="flex-1 p-3.5 flex flex-col justify-between min-h-[96px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {tripName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              {statusConfig && (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                  <span className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
                                  {statusConfig.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                          <div className="flex flex-col text-xs text-gray-500">
                            {trip.destination && (
                              <span className="flex items-center gap-1 truncate max-w-[120px]">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {formatDestinationsFromField(trip.destination)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            {dateRange ? (
                              <span>{dateRange}</span>
                            ) : (
                              <span className="italic">No dates</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {trips.length > 0 && (
          <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-100 dark:border-gray-900">
            <button
              onClick={() => handleNavigate('/trips')}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-h-[52px] sm:min-h-[44px]"
            >
              View all trips
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Main logged in state - clean and functional
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header with profile */}
      <div className="px-5 sm:px-6 pt-6 sm:pt-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          {/* Profile info */}
          <button
            onClick={() => handleNavigate('/account')}
            className="flex items-center gap-3.5 sm:gap-3 group min-w-0 py-1"
          >
            {/* Avatar */}
            <div className="relative w-14 h-14 sm:w-12 sm:h-12 flex-shrink-0 rounded-full overflow-hidden bg-stone-100 dark:bg-gray-800 ring-2 ring-stone-200 dark:ring-stone-700 group-hover:ring-stone-300 dark:group-hover:ring-stone-600 transition-all">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xl sm:text-lg font-medium text-stone-400 dark:text-gray-500">
                    {displayUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name and email */}
            <div className="min-w-0 text-left">
              <h2 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white truncate group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                {displayUsername}
              </h2>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-gray-400 truncate">
                View profile
              </p>
            </div>
          </button>

          <CloseButton onClick={onClose} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar">
          <StatPill value={stats.saved} label="saved" />
          <StatPill value={stats.visited} label="visited" />
          <StatPill value={stats.trips} label="trips" />
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="px-5 sm:px-6 py-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-2">
          <QuickAction
            icon={Bookmark}
            label="Saved"
            count={stats.saved}
            onClick={() => {
              onClose();
              openLegacyDrawer('saved-places');
            }}
          />
          <QuickAction
            icon={MapPin}
            label="Visited"
            count={stats.visited}
            onClick={() => {
              onClose();
              openLegacyDrawer('visited-places');
            }}
          />
          <QuickAction
            icon={Compass}
            label="Trips"
            count={stats.trips}
            onClick={() => setCurrentView('trips')}
            accent
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="px-5 sm:px-6 pb-5 pb-safe space-y-1">
        <SettingsItem
          icon={Settings}
          label="Settings"
          onClick={() => {
            onClose();
            openLegacyDrawer('settings');
          }}
        />
        <SettingsItem
          icon={LogOut}
          label="Sign out"
          onClick={handleSignOut}
          danger
        />
      </div>
    </div>
  );
}
