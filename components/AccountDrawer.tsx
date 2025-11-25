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
} from 'lucide-react';
import Image from 'next/image';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
}

function ProfileAvatar({
  avatarUrl,
  displayUsername,
}: {
  avatarUrl: string | null;
  displayUsername: string;
}) {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 font-semibold text-gray-700 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900 dark:text-gray-200">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          fill
          className="object-cover"
          sizes="48px"
        />
      ) : (
        displayUsername.charAt(0).toUpperCase()
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
    <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-3">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-lg font-medium text-gray-900 dark:text-white">
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
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
          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          isDanger
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isDanger
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {label}
        </p>
        {description && (
          <p
            className={`text-xs ${
              isDanger
                ? 'text-red-500/70 dark:text-red-400/70'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <ChevronRight
        className={`h-4 w-4 ${isDanger ? 'text-red-400' : 'text-gray-400'}`}
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
          title="Welcome"
          subtitle="Sign in to get started"
          leftAccessory={
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <User className="h-5 w-5 text-gray-500" />
            </div>
          }
        />

        <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
          <DrawerSection>
            <p className="text-sm text-muted-foreground">
              Sign in to save places, build trips, and sync your travel profile
              across devices.
            </p>
          </DrawerSection>
        </div>

        <DrawerActionBar>
          <button
            onClick={() => openDrawer('login')}
            className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
          >
            Sign in
          </button>
        </DrawerActionBar>
      </Drawer>
    );
  }

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer}>
      <DrawerHeader
        title={displayUsername}
        subtitle={user.email || undefined}
        leftAccessory={
          <ProfileAvatar avatarUrl={avatarUrl} displayUsername={displayUsername} />
        }
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        {/* Stats */}
        <DrawerSection bordered>
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={MapPin} value={stats.visited} label="Visited" />
            <StatCard icon={Bookmark} value={stats.saved} label="Saved" />
            <StatCard icon={Compass} value={stats.trips} label="Trips" />
          </div>
        </DrawerSection>

        {/* Navigation */}
        <DrawerSection bordered>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Your Manual
          </p>
          <div className="-mx-3">
            <NavItem
              icon={Bookmark}
              label="Saved places"
              description={`${stats.saved} items`}
              onClick={() => openDrawer('saved-places', 'account')}
            />
            <NavItem
              icon={MapPin}
              label="Visited places"
              description={`${stats.visited} logged`}
              onClick={() => openDrawer('visited-places', 'account')}
            />
            <NavItem
              icon={Compass}
              label="Trips"
              description={`${stats.trips} planned`}
              onClick={() => openDrawer('trips', 'account')}
            />
          </div>
        </DrawerSection>

        {/* Account */}
        <DrawerSection>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Account
          </p>
          <div className="-mx-3">
            <NavItem
              icon={Settings}
              label="Settings"
              description="Preferences & privacy"
              onClick={() => openDrawer('settings', 'account')}
            />
            <NavItem
              icon={LogOut}
              label="Sign out"
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
          Edit profile
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
