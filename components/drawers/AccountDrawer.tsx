'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import { DrawerHeader } from "@/components/ui/DrawerHeader";
import { DrawerSection } from "@/components/ui/DrawerSection";
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Edit3,
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

function ProfileAvatar({
  avatarUrl,
  displayUsername,
  size = "lg"
}: {
  avatarUrl: string | null;
  displayUsername: string;
  size?: "sm" | "lg";
}) {
  const sizeClasses = size === "lg" ? "h-20 w-20 sm:h-16 sm:w-16" : "h-12 w-12 sm:h-10 sm:w-10";
  const textClasses = size === "lg" ? "text-3xl sm:text-2xl" : "text-base sm:text-sm";

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center overflow-hidden rounded-full border-2 border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900`}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          fill
          className="object-cover"
          sizes={size === "lg" ? "80px" : "48px"}
        />
      ) : (
        <span className={`${textClasses} font-medium text-stone-400 dark:text-stone-500`}>
          {displayUsername.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-1 p-5 sm:p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800">
      <div className="p-2.5 sm:p-2 rounded-full bg-white dark:bg-stone-800 shadow-sm mb-1">
        <Icon className="h-5 w-5 sm:h-4 sm:w-4 text-stone-900 dark:text-white" />
      </div>
      <span className="text-2xl sm:text-xl font-semibold text-stone-900 dark:text-white tracking-tight">
        {value}
      </span>
      <span className="text-[11px] sm:text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</span>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  description,
  onClick,
  isDanger = false,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  isDanger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-4 sm:p-3 rounded-2xl sm:rounded-xl border border-transparent hover:border-stone-200 dark:hover:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 active:bg-stone-100 dark:active:bg-stone-800 transition-all duration-200 text-left min-h-[64px] sm:min-h-0 ${
        isDanger ? 'hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-100 dark:hover:border-red-900/30 active:bg-red-100 dark:active:bg-red-900/20' : ''
      }`}
    >
      <div
        className={`flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
          isDanger
            ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 group-hover:bg-white dark:group-hover:bg-stone-900 group-hover:text-stone-900 dark:group-hover:text-white group-hover:shadow-sm'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-base sm:text-sm font-medium ${
            isDanger
              ? 'text-red-600 dark:text-red-400'
              : 'text-stone-900 dark:text-white'
          }`}
        >
          {label}
        </p>
        {description && (
          <p
            className={`text-sm sm:text-xs mt-0.5 ${
              isDanger
                ? 'text-red-500/70 dark:text-red-400/70'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <ChevronRight
        className={`h-5 w-5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0 ${
          isDanger ? 'text-red-400' : 'text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400'
        }`}
      />
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
           // Fallback to user_profiles if needed, but sticking to profiles for consistency
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

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  if (!user) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-stone-950">
        <DrawerHeader
          title="Welcome"
          rightAccessory={
            <button
              onClick={onClose}
              className="p-3 sm:p-2 -mr-1 text-stone-400 hover:text-stone-900 dark:hover:text-white active:text-stone-900 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        />

        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-8 text-center">
          <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-full bg-stone-100 dark:bg-stone-900 flex items-center justify-center mb-6">
            <User className="h-10 w-10 sm:h-8 sm:w-8 text-stone-400" />
          </div>
          <h3 className="text-2xl sm:text-xl font-semibold text-stone-900 dark:text-white mb-2">
            Sign in to Urban Manual
          </h3>
          <p className="text-base sm:text-sm text-stone-500 dark:text-stone-400 mb-8 max-w-xs mx-auto">
            Unlock your personal travel guide. Save places, create trips, and sync across devices.
          </p>

          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-4 sm:py-3 rounded-2xl sm:rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-base sm:text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity min-h-[56px] sm:min-h-[48px]"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-stone-950">
      {/* Custom Header Area */}
      <div className="px-5 sm:px-6 pt-8 sm:pt-8 pb-6">
        <div className="flex items-start justify-between mb-6">
          <ProfileAvatar avatarUrl={avatarUrl} displayUsername={displayUsername} size="lg" />
          <button
            onClick={onClose}
            className="p-3 sm:p-2 -mr-1 text-stone-400 hover:text-stone-900 dark:hover:text-white active:text-stone-900 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <h2 className="text-2xl sm:text-2xl font-semibold text-stone-900 dark:text-white tracking-tight">
            {displayUsername}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {user.email}
          </p>
        </div>

        <button
          onClick={() => handleNavigate('/account')}
          className="mt-4 flex items-center gap-2 py-2 text-sm sm:text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white active:text-stone-900 transition-colors min-h-[44px] sm:min-h-0"
        >
          <Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          Edit Profile
        </button>
      </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Navigation Groups */}
          <div className="px-4 sm:px-4 space-y-8 pb-12 pb-safe">
          {/* Library */}
          <div>
            <h3 className="px-3 sm:px-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3 sm:mb-2">
              Library
            </h3>
            <div className="space-y-2 sm:space-y-1">
              <NavItem
                icon={Bookmark}
                label="Saved Places"
                description={`${stats.saved} curated spots`}
                onClick={() => {
                  onClose();
                  openLegacyDrawer('saved-places');
                }}
              />
              <NavItem
                icon={MapPin}
                label="Visited Places"
                description={`${stats.visited} experiences logged`}
                onClick={() => {
                  onClose();
                  openLegacyDrawer('visited-places');
                }}
              />
              <NavItem
                icon={Compass}
                label="Trip Plans"
                description={`${stats.trips} itineraries`}
                onClick={() => {
                  onClose();
                  openSide('trip-list');
                }}
              />
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="px-3 sm:px-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3 sm:mb-2">
              Preferences
            </h3>
            <div className="space-y-2 sm:space-y-1">
              <NavItem
                icon={Settings}
                label="Settings"
                description="App preferences & privacy"
                onClick={() => {
                  onClose();
                  openLegacyDrawer('settings');
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-4 border-t border-stone-100 dark:border-stone-900 pb-safe">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 p-4 sm:p-3 rounded-2xl sm:rounded-xl text-base sm:text-sm font-medium text-stone-500 hover:text-red-600 active:text-red-700 hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-900/10 dark:active:bg-red-900/20 transition-colors min-h-[56px] sm:min-h-0"
        >
          <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
