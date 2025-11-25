'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Globe,
  Calendar,
  Trophy,
  List,
} from 'lucide-react';
import Image from 'next/image';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  countries: number;
}

// Passport-style user card
function UserPassportCard({
  avatarUrl,
  displayUsername,
  email,
  memberSince,
  stats,
}: {
  avatarUrl: string | null;
  displayUsername: string;
  email?: string;
  memberSince?: string;
  stats: UserStats;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black p-5">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
      </div>

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Urban Manual</span>
      </div>

      {/* Profile section */}
      <div className="relative flex items-center gap-4 mb-5">
        {avatarUrl ? (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden ring-2 ring-white/20">
            <Image
              src={avatarUrl}
              alt={displayUsername}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-gray-700 ring-2 ring-white/20 flex items-center justify-center">
            <span className="text-white text-2xl font-semibold">
              {displayUsername.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xl font-semibold text-white truncate">
            {displayUsername}
          </p>
          {email && (
            <p className="text-sm text-gray-400 truncate">
              {email}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="relative flex flex-wrap items-center gap-2">
        {memberSince && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white">
            <Calendar className="w-3 h-3 mr-1.5" />
            Since {memberSince}
          </span>
        )}
        {stats.visited > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white">
            <MapPin className="w-3 h-3 mr-1.5" />
            {stats.visited} places
          </span>
        )}
        {stats.countries > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white">
            <Globe className="w-3 h-3 mr-1.5" />
            {stats.countries} countries
          </span>
        )}
      </div>
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
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        isDanger
          ? 'hover:bg-red-50 dark:hover:bg-red-900/10'
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          isDanger
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[15px] font-medium ${
            isDanger
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {label}
        </p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {description}
          </p>
        )}
      </div>
      <ChevronRight
        className={`h-5 w-5 ${isDanger ? 'text-red-400' : 'text-gray-400 dark:text-gray-600'}`}
      />
    </button>
  );
}

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDrawerOpen, closeDrawer, openDrawer } = useDrawer();
  const isOpen = isDrawerOpen('account');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | undefined>();
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
    countries: 0,
  });

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setMemberSince(undefined);
        setStats({ visited: 0, saved: 0, trips: 0, countries: 0 });
        return;
      }

      try {
        const supabaseClient = createClient();

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('avatar_url, username, created_at')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          setAvatarUrl(profileData.avatar_url || null);
          setUsername(profileData.username || null);
          if (profileData.created_at) {
            const date = new Date(profileData.created_at);
            setMemberSince(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
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

        // Fetch countries visited
        const { data: visitedData } = await supabaseClient
          .from('visited_places')
          .select('destinations!inner(country)')
          .eq('user_id', user.id);

        let countriesCount = 0;
        if (visitedData) {
          const uniqueCountries = new Set(
            visitedData.map((v: any) => v.destinations?.country).filter(Boolean)
          );
          countriesCount = uniqueCountries.size;
        }

        setStats({
          visited: visitedResult.count || 0,
          saved: savedResult.count || 0,
          trips: tripsResult.count || 0,
          countries: countriesCount,
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
    closeDrawer();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path), 200);
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={closeDrawer}>
        <DrawerHeader
          title="Account"
          subtitle="Sign in to get started"
        />

        <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
          <DrawerSection>
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-gray-400 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Urban Manual
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Sign in to save places, build trips, and sync your travel profile across devices.
              </p>
            </div>
          </DrawerSection>
        </div>

        <DrawerActionBar>
          <button
            onClick={() => openDrawer('login')}
            className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
          >
            Sign In
          </button>
        </DrawerActionBar>
      </Drawer>
    );
  }

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer}>
      <DrawerHeader
        title="Account"
        rightAccessory={
          <button
            onClick={handleSignOut}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Sign Out
          </button>
        }
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        {/* User Passport Card */}
        <DrawerSection>
          <UserPassportCard
            avatarUrl={avatarUrl}
            displayUsername={displayUsername}
            email={user.email || undefined}
            memberSince={memberSince}
            stats={stats}
          />
        </DrawerSection>

        {/* Your Manual */}
        <DrawerSection>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Your Manual
          </p>
          <div className="space-y-1">
            <NavItem
              icon={Bookmark}
              label="Saved Places"
              description="Your curated favorites"
              onClick={() => openDrawer('saved-places', 'account')}
            />
            <NavItem
              icon={MapPin}
              label="Visited Places"
              description="Your travel history"
              onClick={() => openDrawer('visited-places', 'account')}
            />
            <NavItem
              icon={List}
              label="Lists"
              description="Organize destinations"
              onClick={() => handleNavigate('/account?tab=collections')}
            />
            <NavItem
              icon={Compass}
              label="Trips"
              description="Manage trip plans"
              onClick={() => openDrawer('trips', 'account')}
            />
            <NavItem
              icon={Trophy}
              label="Achievements"
              description="Milestones & badges"
              onClick={() => handleNavigate('/account?tab=achievements')}
            />
          </div>
        </DrawerSection>

        {/* Account */}
        <DrawerSection>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Account
          </p>
          <div className="space-y-1">
            <NavItem
              icon={Settings}
              label="Settings"
              description="Preferences & privacy"
              onClick={() => openDrawer('settings', 'account')}
            />
            <NavItem
              icon={LogOut}
              label="Sign Out"
              onClick={handleSignOut}
              isDanger
            />
          </div>
        </DrawerSection>
      </div>

      <DrawerActionBar>
        <button
          onClick={() => handleNavigate('/account')}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
        >
          Edit Profile
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
