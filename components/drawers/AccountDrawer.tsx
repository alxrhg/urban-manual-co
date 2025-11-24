"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import Image from 'next/image';

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

        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-light mb-2 text-gray-900 dark:text-white">
            Welcome to Urban Manual
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in to save places, build trips, and sync your profile.
          </p>
        </div>

        {/* Sign In Button - Pill Style */}
        <button
          onClick={() => {
            onClose();
            router.push('/auth/login');
          }}
          className="flex h-[44px] items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90 dark:bg-white dark:text-black"
          style={{ borderRadius: '9999px' }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-2">
          Account
        </h1>
        <p className="text-xs text-gray-400">{displayEmail}</p>
      </div>

      {/* Profile Section */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
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
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
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

        {/* Action Buttons - Pill Style */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=settings');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Edit Profile
          </button>
          <button
            onClick={() => {
              onClose();
              openLegacyDrawer('chat');
            }}
            className="flex h-[44px] items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90 dark:bg-white dark:text-black"
            style={{ borderRadius: '9999px' }}
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
              <div className="relative w-full h-32">
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
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {upcomingTrip.name || upcomingTrip.title || 'Untitled Trip'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {upcomingTrip.city || upcomingTrip.destination}
                {upcomingTrip.startDate && upcomingTrip.endDate && (
                  <> • {upcomingTrip.startDate} → {upcomingTrip.endDate}</>
                )}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Your Manual - Pill Buttons */}
      <div className="mb-12">
        <h2 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-4">
          Your Manual
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              onClose();
              openLegacyDrawer('saved-places');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Saved Places
          </button>

          <button
            onClick={() => {
              onClose();
              openLegacyDrawer('visited-places');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Visited Places
          </button>

          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=collections');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Lists
          </button>

          <button
            onClick={() => {
              onClose();
              openSide('trip-list');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Trips
          </button>

          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=achievements');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Achievements
          </button>
        </div>
      </div>

      {/* Account & Settings - Pill Buttons */}
      <div className="mb-12">
        <h2 className="text-xs uppercase tracking-[2px] font-medium text-gray-500 mb-4">
          Account & Settings
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              onClose();
              router.push('/account?tab=settings');
            }}
            className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
            style={{ borderRadius: '9999px' }}
          >
            Settings
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                onClose();
                router.push('/admin');
              }}
              className="flex h-[44px] items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
              style={{ borderRadius: '9999px' }}
            >
              Admin Panel
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="flex h-[44px] items-center justify-center rounded-full border border-red-200 bg-white px-5 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
            style={{ borderRadius: '9999px' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
