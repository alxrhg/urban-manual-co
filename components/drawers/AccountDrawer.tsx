"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import Image from 'next/image';
import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";

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
      <div className="px-6 py-8 pb-24 space-y-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Account</h1>
          </div>
        </div>
        
        <UMCard className="p-6 space-y-4">
          <div className="space-y-2 text-center">
            <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
              Welcome to Urban Manual
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Sign in to save places, build trips, and sync your travel profile.
            </p>
          </div>
          <UMActionPill
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              onClose();
              router.push('/auth/login');
            }}
          >
            Sign In
          </UMActionPill>
        </UMCard>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 pb-24 space-y-10">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light">Account</h1>
          <button
            onClick={handleSignOut}
            className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{displayEmail}</p>
      </div>

      {/* PROFILE CARD */}
      <UMCard className="p-6 space-y-4">
          <div className="flex items-center gap-4">
              {avatarUrl ? (
            <div className="relative w-14 h-14 rounded-full overflow-hidden border border-neutral-200 dark:border-white/10">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                sizes="56px"
                  />
                </div>
              ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 border border-neutral-200 dark:border-white/10 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500 text-lg font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-semibold text-gray-900 dark:text-white truncate">
                {displayName}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  Admin
                </span>
              )}
            </div>
              {displayHandle && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {displayHandle}
              </p>
              )}
              {displayEmail && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {displayEmail}
              </p>
              )}
            </div>
          </div>
      </UMCard>

        {/* UPCOMING TRIP */}
        {upcomingTrip && (
        <section className="space-y-4">
          <UMSectionTitle>Upcoming Trip</UMSectionTitle>

          <UMCard
            className="p-4 space-y-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
            onClick={handleOpenTrip}
            >
              {upcomingTrip.coverImage && (
              <div className="relative w-full h-40 rounded-[16px] overflow-hidden">
                  <Image
                    src={upcomingTrip.coverImage}
                    alt={upcomingTrip.name || 'Trip'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                </div>
              )}

            <div className="space-y-1">
              <p className="font-medium text-[17px] text-gray-900 dark:text-white">
                  {upcomingTrip.name || upcomingTrip.title || 'Untitled Trip'}
                </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {upcomingTrip.city || upcomingTrip.destination || ''}
                {upcomingTrip.startDate && upcomingTrip.endDate && (
                  <> • {upcomingTrip.startDate} → {upcomingTrip.endDate}</>
                )}
              </p>
            </div>

            <UMActionPill className="w-full justify-center">
              View Trip →
            </UMActionPill>
          </UMCard>
        </section>
        )}

      {/* YOUR MANUAL SECTIONS */}
      <section className="space-y-4">
        <UMSectionTitle>Your Manual</UMSectionTitle>

        <div className="space-y-4">
          <UMCard
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={() => {
                onClose();
              openLegacyDrawer('saved-places');
              }}
          >
            <p className="font-medium text-[15px] text-gray-900 dark:text-white">
              Saved Places
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Your curated favorites
            </p>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={() => {
                onClose();
              openLegacyDrawer('visited-places');
              }}
          >
            <p className="font-medium text-[15px] text-gray-900 dark:text-white">
              Visited Places
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Your travel history
            </p>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={() => {
                onClose();
              router.push('/account?tab=collections');
            }}
          >
            <p className="font-medium text-[15px] text-gray-900 dark:text-white">
              Lists
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Organize destinations
            </p>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={() => {
                onClose();
                openSide('trip-list');
              }}
          >
            <p className="font-medium text-[15px] text-gray-900 dark:text-white">
              Trips
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage trip plans
            </p>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={() => {
                onClose();
              router.push('/account?tab=achievements');
              }}
          >
            <p className="font-medium text-[15px] text-gray-900 dark:text-white">
              Achievements
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Milestones & travel badges
            </p>
          </UMCard>
        </div>
      </section>

        {/* ACCOUNT SETTINGS */}
      <section className="space-y-4">
        <UMSectionTitle>Account & Settings</UMSectionTitle>

        <UMCard
          className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={() => {
                onClose();
            router.push('/account');
              }}
        >
          <p className="font-medium text-[15px] text-gray-900 dark:text-white">
            Profile & Preferences
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Notifications, privacy, theme
          </p>
        </UMCard>

        {isAdmin && (
          <UMCard
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
            onClick={() => {
              onClose();
              router.push('/admin');
            }}
          >
            <p className="font-medium text-[15px] text-gray-900 dark:text-white">
              Admin Panel
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage destinations, analytics
            </p>
          </UMCard>
        )}

        <UMCard
          className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
              onClick={handleSignOut}
        >
          <p className="font-medium text-[15px] text-red-600 dark:text-red-400">
            Sign Out
          </p>
        </UMCard>
      </section>
      </div>
  );
}
