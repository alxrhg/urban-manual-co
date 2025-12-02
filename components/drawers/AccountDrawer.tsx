'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  X,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Minimal close button - Square UI style
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2.5 sm:p-2 rounded-full bg-stone-100/80 dark:bg-gray-800/80 text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700 hover:text-stone-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center backdrop-blur-sm"
    >
      <X className="w-5 h-5 sm:w-4 sm:h-4" />
    </button>
  );
}

// Quick stat pill - Square UI style with category colors
function StatPill({ value, label, color }: { value: number; label: string; color?: string }) {
  const colorClasses = {
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    default: 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-300',
  };
  const classes = colorClasses[color as keyof typeof colorClasses] || colorClasses.default;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${classes}`}>
      <span className="text-sm sm:text-xs font-semibold">{value}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}

// Quick action card - Square UI style with stripe accent
function QuickAction({
  icon: Icon,
  label,
  count,
  onClick,
  accent = false,
  stripeColor = '#94a3b8',
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  onClick: () => void;
  accent?: boolean;
  stripeColor?: string;
}) {
  const stripePattern = `repeating-linear-gradient(90deg, ${stripeColor} 0px, ${stripeColor} 4px, transparent 4px, transparent 8px)`;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center gap-2 p-5 sm:p-4 rounded-2xl border overflow-hidden transition-all duration-200 active:scale-[0.98] min-h-[100px] sm:min-h-[88px] ${
        accent
          ? 'bg-stone-900 dark:bg-white border-stone-900 dark:border-white hover:bg-stone-800 dark:hover:bg-gray-100 shadow-lg'
          : 'bg-white dark:bg-gray-900 border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-md'
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

      {/* Square UI stripe pattern at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1.5"
        style={{ background: stripePattern }}
      />
    </button>
  );
}

// Settings row item - Square UI style
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
      className={`group w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:py-3 rounded-xl transition-all duration-200 min-h-[52px] sm:min-h-[44px] ${
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

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const openSide = useDrawerStore((s) => s.openSide);
  const { openDrawer: openLegacyDrawer } = useDrawer();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
  });

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

  const handleOpenSettings = () => {
    onClose();
    // Small delay to allow drawer animation to complete
    setTimeout(() => {
      openLegacyDrawer('settings');
    }, 100);
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  // Logged out state - welcoming and inviting
  if (!user) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-950 rounded-2xl">
        {/* Header */}
        <div className="flex justify-end p-4 sm:p-5">
          <CloseButton onClick={onClose} />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-10 pb-8 text-center">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900 flex items-center justify-center shadow-inner">
              <Sparkles className="w-12 h-12 sm:w-10 sm:h-10 text-stone-400 dark:text-gray-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-stone-900 dark:bg-white flex items-center justify-center shadow-lg">
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
            className="w-full max-w-[280px] py-4 sm:py-3.5 rounded-2xl sm:rounded-xl bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-base sm:text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all min-h-[56px] sm:min-h-[48px] shadow-lg"
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

  // Logged in state - clean and functional with Square UI elements
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950 rounded-2xl">
      {/* Header with profile */}
      <div className="px-5 sm:px-6 pt-6 sm:pt-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          {/* Profile info */}
          <button
            onClick={() => handleNavigate('/account')}
            className="flex items-center gap-3.5 sm:gap-3 group min-w-0 py-1"
          >
            {/* Avatar */}
            <div className="relative w-14 h-14 sm:w-12 sm:h-12 flex-shrink-0 rounded-full overflow-hidden bg-stone-100 dark:bg-gray-800 ring-2 ring-stone-200 dark:ring-stone-700 group-hover:ring-stone-300 dark:group-hover:ring-stone-600 transition-all shadow-md">
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

        {/* Stats row - Square UI colors */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar">
          <StatPill value={stats.saved} label="saved" color="orange" />
          <StatPill value={stats.visited} label="visited" color="blue" />
          <StatPill value={stats.trips} label="trips" color="emerald" />
        </div>
      </div>

      {/* Quick actions grid - Square UI style with stripes */}
      <div className="px-5 sm:px-6 py-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-2">
          <QuickAction
            icon={Bookmark}
            label="Saved"
            count={stats.saved}
            stripeColor="#f97316"
            onClick={() => {
              onClose();
              openLegacyDrawer('saved-places');
            }}
          />
          <QuickAction
            icon={MapPin}
            label="Visited"
            count={stats.visited}
            stripeColor="#3b82f6"
            onClick={() => {
              onClose();
              openLegacyDrawer('visited-places');
            }}
          />
          <QuickAction
            icon={Compass}
            label="Trips"
            count={stats.trips}
            stripeColor="#10b981"
            onClick={() => {
              onClose();
              openSide('trip-list');
            }}
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
          onClick={handleOpenSettings}
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
