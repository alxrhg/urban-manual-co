'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Button } from '@/ui/button';
import {
  User,
  Settings,
  LogOut,
  Bookmark,
  MapPin,
  Map,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useChristmasTheme } from '@/contexts/ChristmasThemeContext';

export function AccountDropdown() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openDrawer } = useDrawer();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isChristmasMode } = useChristmasTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
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
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const handleOpenDrawer = (drawer: 'saved-places' | 'visited-places' | 'trips') => {
    setOpen(false);
    openDrawer(drawer);
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const currentTheme = resolvedTheme || theme || 'light';
  const isDark = currentTheme === 'dark';

  // Not logged in - show sign in button
  if (!user) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => openDrawer('login')}
        aria-label="Sign in"
      >
        <User className="w-4 h-4" />
        <span>Sign In</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="pl-1.5 pr-4"
          aria-label="Open account menu"
        >
          {avatarUrl ? (
            <span className="relative w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 overflow-visible">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
              {isChristmasMode && (
                <svg
                  className="absolute -top-3 -left-1 w-5 h-5 -rotate-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M12 2L4 14H20L12 2Z" fill="#C41E3A" />
                  <path d="M12 2L4 14H20L12 2Z" fill="url(#hat-gradient-dropdown)" />
                  <ellipse cx="12" cy="14" rx="9" ry="2" fill="#FFFFFF" />
                  <circle cx="12" cy="2" r="2" fill="#FFFFFF" />
                  <defs>
                    <linearGradient id="hat-gradient-dropdown" x1="12" y1="2" x2="12" y2="14" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#E63946" />
                      <stop offset="1" stopColor="#9A1C2B" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
            </span>
          ) : (
            <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              {isChristmasMode && (
                <svg
                  className="absolute -top-3 -left-2 w-4 h-4 -rotate-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M12 2L4 14H20L12 2Z" fill="#C41E3A" />
                  <ellipse cx="12" cy="14" rx="9" ry="2" fill="#FFFFFF" />
                  <circle cx="12" cy="2" r="2" fill="#FFFFFF" />
                </svg>
              )}
            </span>
          )}
          <span className="hidden sm:inline">Account</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2">
        {/* User Profile Header */}
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {displayUsername.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {displayUsername}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Main Menu Items */}
        <DropdownMenuItem
          onClick={() => handleNavigate('/account?tab=profile')}
          className="gap-3 py-2.5 px-2 cursor-pointer"
        >
          <User className="w-4 h-4 text-gray-500" />
          <span>Account</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleOpenDrawer('saved-places')}
          className="gap-3 py-2.5 px-2 cursor-pointer"
        >
          <Bookmark className="w-4 h-4 text-gray-500" />
          <span>Saved Places</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleOpenDrawer('visited-places')}
          className="gap-3 py-2.5 px-2 cursor-pointer"
        >
          <MapPin className="w-4 h-4 text-gray-500" />
          <span>Visited Places</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleOpenDrawer('trips')}
          className="gap-3 py-2.5 px-2 cursor-pointer"
        >
          <Map className="w-4 h-4 text-gray-500" />
          <span>Trips</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            if (mounted) {
              setTheme(isDark ? 'light' : 'dark');
            }
          }}
          className="gap-3 py-2.5 px-2 cursor-pointer"
        >
          {mounted && isDark ? (
            <Sun className="w-4 h-4 text-gray-500" />
          ) : (
            <Moon className="w-4 h-4 text-gray-500" />
          )}
          <span>Appearance</span>
          <span className="ml-auto text-xs text-gray-400">
            {mounted ? (isDark ? 'Dark' : 'Light') : ''}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleNavigate('/account?tab=settings')}
          className="gap-3 py-2.5 px-2 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-3 py-2.5 px-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
