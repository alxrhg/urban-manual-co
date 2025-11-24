"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import Image from 'next/image';
import { MapPin, Bookmark, Calendar, Settings, LogOut } from 'lucide-react';

interface UpcomingTrip {
  id?: string;
  name?: string;
  title?: string;
  startDate?: string;
  start_date?: string | null;
  endDate?: string;
  end_date?: string | null;
  coverImage?: string;
  cover_image?: string;
  city?: string;
  destination?: string;
  [key: string]: any;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const openSide = useDrawerStore((s) => s.openSide);
  const { openDrawer: openLegacyDrawer } = useDrawer();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user profile and upcoming trip
  useEffect(() => {
    async function fetchUserData() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setUpcomingTrip(null);
        return;
      }

      try {
        setLoading(true);
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
        } else {
          const { data: userProfileData } = await supabaseClient
            .from('user_profiles')
            .select('username')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userProfileData?.username) {
            setUsername(userProfileData.username);
          }
          setAvatarUrl(null);
        }

        // Fetch upcoming trip (most recent trip with future start date)
        const today = new Date().toISOString().split('T')[0];
        const { data: tripsData } = await supabaseClient
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_date', today)
          .order('start_date', { ascending: true })
          .limit(1);

        if (tripsData && tripsData.length > 0) {
          const trip = tripsData[0];
          const formatDate = (dateStr: string | null) => {
            if (!dateStr) return null;
            return new Date(dateStr).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          };

          setUpcomingTrip({
            ...trip,
            name: trip.title || trip.name,
            startDate: formatDate(trip.start_date),
            endDate: formatDate(trip.end_date),
            coverImage: trip.cover_image,
            city: trip.destination || trip.city,
          });
        } else {
          setUpcomingTrip(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchUserData();
    }
  }, [user, isOpen]);

  const displayName = username || user?.email?.split('@')[0] || 'User';
  const displayHandle = username ? `@${username.toLowerCase().replace(/\s+/g, '')}` : '';
  const displayEmail = user?.email || '';
  const isAdmin = (user?.app_metadata as Record<string, any> | null)?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/');
  };

  const handleOpenTrip = () => {
    if (upcomingTrip) {
      onClose();
      openSide('trip-overview-quick', { trip: upcomingTrip });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-12">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-2">
            Account
          </h1>
        </div>

        {/* Welcome Card */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Welcome to Urban Manual
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Sign in to save places, build trips, and sync your profile.
          </p>
          <button
            onClick={() => {
              onClose();
              router.push('/auth/login');
            }}
            className="w-full px-4 py-2.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-12">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-2">
          Account
        </h1>
        <p className="text-xs text-gray-400">{displayEmail}</p>
      </div>

      {/* Profile Section */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-600 text-lg font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName}
              </p>
              {isAdmin && (
                <span className="text-[10px] font-medium px-2 py-0.5 border border-gray-200 dark:border-gray-800 rounded-md text-gray-600 dark:text-gray-400">
                  ADMIN
                </span>
              )}
            </div>
            {displayHandle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {displayHandle}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=settings');
            }}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            Edit Profile
          </button>
          <button
            onClick={() => {
              onClose();
              openLegacyDrawer('chat');
            }}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
          >
            Concierge
          </button>
        </div>
      </div>

      {/* Upcoming Trip */}
      {upcomingTrip && (
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-4">
            Upcoming Trip
          </h2>
          <button
            onClick={handleOpenTrip}
            className="w-full border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors text-left"
          >
            {upcomingTrip.coverImage && (
              <div className="relative w-full h-48">
                <Image
                  src={upcomingTrip.coverImage}
                  alt={upcomingTrip.name || 'Trip'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 420px"
                />
              </div>
            )}
            <div className="p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                {upcomingTrip.name || upcomingTrip.title || 'Untitled Trip'}
              </p>
              <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                {(upcomingTrip.city || upcomingTrip.destination) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span>{upcomingTrip.city || upcomingTrip.destination}</span>
                  </div>
                )}
                {upcomingTrip.startDate && upcomingTrip.endDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{upcomingTrip.startDate} → {upcomingTrip.endDate}</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Your Manual */}
      <div className="mb-12">
        <h2 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-4">
          Your Manual
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => {
              onClose();
              openLegacyDrawer('saved-places');
            }}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Saved Places</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your curated favorites</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              openLegacyDrawer('visited-places');
            }}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Visited Places</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your travel history</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=collections');
            }}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 text-gray-400 flex items-center justify-center">
                <div className="w-3 h-3 border border-current rounded" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Lists</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Organize destinations</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              openSide('trip-list');
            }}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Trips</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage trip plans</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=achievements');
            }}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 text-gray-400 flex items-center justify-center">
                <div className="w-3 h-3 border border-current" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Achievements</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Milestones & badges</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Account & Settings */}
      <div className="mb-12">
        <h2 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-4">
          Account & Settings
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=settings');
            }}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Profile & Preferences</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notifications, privacy, theme</p>
              </div>
            </div>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                onClose();
                router.push('/admin');
              }}
              className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">Admin Panel</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage destinations, analytics</p>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Sign Out</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Log out of your account</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
