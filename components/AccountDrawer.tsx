'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  MapPin,
  Compass,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Pencil,
} from 'lucide-react';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  badge?: number;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, description, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors group-hover:bg-white group-hover:text-gray-900 group-hover:shadow-sm dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-900 dark:group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && badge > 0 && (
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-gray-600" />
      </div>
    </button>
  );
}

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDrawerOpen, closeDrawer, openDrawer } = useDrawer();
  const { openSide } = useDrawerStore();
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
  const userInitials = displayUsername.charAt(0).toUpperCase();

  // Logged out state
  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={closeDrawer} position="right">
        <div className="flex h-full flex-col">
          <div className="p-6 pb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Welcome</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your personal travel guide
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Sign in to Urban Manual
            </h3>
            <p className="mb-8 max-w-xs text-sm text-gray-500 dark:text-gray-400">
              Unlock your personal travel guide. Save places, create trips, and sync across devices.
            </p>

            <Button
              onClick={() => openDrawer('login')}
              className="w-full"
              size="lg"
            >
              Sign In / Sign Up
            </Button>
          </div>
        </div>
      </Drawer>
    );
  }

  // Logged in state
  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer} position="right">
      <div className="flex h-full flex-col bg-white dark:bg-gray-950">
        {/* Header with profile */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-gray-100 dark:border-gray-800">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayUsername} />}
              <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {displayUsername}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('/account')}
                className="mt-2 -ml-3 h-8 text-xs text-gray-600 dark:text-gray-400"
              >
                <Pencil className="h-3 w-3" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 p-6">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              {stats.saved}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Saved
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              {stats.visited}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Visited
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              {stats.trips}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Trips
            </span>
          </div>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Library section */}
            <div>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Library
              </h3>
              <div className="space-y-1">
                <NavItem
                  icon={Bookmark}
                  label="Saved Places"
                  description="Your curated spots"
                  badge={stats.saved}
                  onClick={() => openDrawer('saved-places', 'account')}
                />
                <NavItem
                  icon={MapPin}
                  label="Visited Places"
                  description="Experiences logged"
                  badge={stats.visited}
                  onClick={() => openDrawer('visited-places', 'account')}
                />
                <NavItem
                  icon={Compass}
                  label="Trip Plans"
                  description="Your itineraries"
                  badge={stats.trips}
                  onClick={() => {
                    closeDrawer();
                    openSide('trip-list');
                  }}
                />
              </div>
            </div>

            {/* Preferences section */}
            <div>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Preferences
              </h3>
              <div className="space-y-1">
                <NavItem
                  icon={Settings}
                  label="Settings"
                  description="App preferences & privacy"
                  onClick={() => openDrawer('settings', 'account')}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
