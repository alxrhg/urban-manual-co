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
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Account
          </h1>
        </div>

        <UMCard className="p-8 space-y-5 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/50 border-2 border-gray-100 dark:border-gray-800 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-4xl shadow-xl">
              👋
            </div>
          </div>
          <div className="space-y-3 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              Welcome to Urban Manual
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Sign in to save places, build trips, and sync your travel profile across all your devices.
            </p>
          </div>
          <UMActionPill
            variant="primary"
            className="w-full justify-center font-bold py-3 shadow-lg hover:scale-[1.02] transition-transform"
            onClick={() => {
              onClose();
              router.push('/auth/login');
            }}
          >
            Sign In to Continue
          </UMActionPill>
        </UMCard>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 pb-24 space-y-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Account
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{displayEmail}</p>
      </div>

      {/* PROFILE CARD */}
      <UMCard className="p-6 space-y-5 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/50 border-2 border-gray-100 dark:border-gray-800 shadow-lg">
          <div className="flex items-center gap-4">
              {avatarUrl ? (
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-xl ring-2 ring-gray-100 dark:ring-gray-800">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                sizes="64px"
                  />
                </div>
              ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 border-2 border-white dark:border-gray-800 shadow-xl ring-2 ring-gray-100 dark:ring-gray-800 flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {displayName}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm">
                  ADMIN
                </span>
              )}
            </div>
              {displayHandle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate font-medium">
                {displayHandle}
              </p>
              )}
            </div>
          </div>

        <div className="flex gap-3 pt-2">
          <UMActionPill
            onClick={() => {
              onClose();
              router.push('/account?tab=settings');
            }}
            className="flex-1 justify-center font-semibold hover:scale-[1.02] transition-transform"
          >
              Edit Profile
          </UMActionPill>
          <UMActionPill
            variant="primary"
            onClick={() => {
              onClose();
              openLegacyDrawer('chat');
            }}
            className="flex-1 justify-center font-semibold hover:scale-[1.02] transition-transform shadow-md"
          >
              Concierge
          </UMActionPill>
        </div>
      </UMCard>

        {/* UPCOMING TRIP */}
        {upcomingTrip && (
        <section className="space-y-4">
          <UMSectionTitle className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Upcoming Trip</span>
            <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700"></span>
          </UMSectionTitle>

          <UMCard
            className="p-0 space-y-0 cursor-pointer overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-gray-100 dark:border-gray-800"
            onClick={handleOpenTrip}
            >
              {upcomingTrip.coverImage && (
              <div className="relative w-full h-48 overflow-hidden">
                  <Image
                    src={upcomingTrip.coverImage}
                    alt={upcomingTrip.name || 'Trip'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p className="font-bold text-lg drop-shadow-lg">
                      {upcomingTrip.name || upcomingTrip.title || 'Untitled Trip'}
                    </p>
                  </div>
                </div>
              )}

            <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
              {!upcomingTrip.coverImage && (
                <p className="font-bold text-lg text-gray-900 dark:text-white">
                  {upcomingTrip.name || upcomingTrip.title || 'Untitled Trip'}
                </p>
              )}
              <div className="space-y-1.5">
                {(upcomingTrip.city || upcomingTrip.destination) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    📍 {upcomingTrip.city || upcomingTrip.destination}
                  </p>
                )}
                {upcomingTrip.startDate && upcomingTrip.endDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    🗓️ {upcomingTrip.startDate} → {upcomingTrip.endDate}
                  </p>
                )}
              </div>

              <UMActionPill className="w-full justify-center font-semibold group-hover:scale-[1.05] transition-transform shadow-sm">
                View Trip Details →
              </UMActionPill>
            </div>
          </UMCard>
        </section>
        )}

      {/* YOUR MANUAL SECTIONS */}
      <section className="space-y-4">
        <UMSectionTitle className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Your Manual</span>
          <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700"></span>
        </UMSectionTitle>

        <div className="grid grid-cols-2 gap-3">
          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border-2 border-gray-100 dark:border-gray-800 group"
              onClick={() => {
                onClose();
              openLegacyDrawer('saved-places');
              }}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                ⭐
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Saved Places
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Curated favorites
                </p>
              </div>
            </div>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border-2 border-gray-100 dark:border-gray-800 group"
              onClick={() => {
                onClose();
              openLegacyDrawer('visited-places');
              }}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 dark:from-green-500 dark:to-emerald-600 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                ✓
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Visited
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Travel history
                </p>
              </div>
            </div>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border-2 border-gray-100 dark:border-gray-800 group"
              onClick={() => {
                onClose();
              router.push('/account?tab=collections');
            }}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                📚
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Lists
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Collections
                </p>
              </div>
            </div>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border-2 border-gray-100 dark:border-gray-800 group"
              onClick={() => {
                onClose();
                openSide('trip-list');
              }}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 dark:from-purple-500 dark:to-pink-600 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                ✈️
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Trips
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Trip plans
                </p>
              </div>
            </div>
          </UMCard>

          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border-2 border-gray-100 dark:border-gray-800 group col-span-2"
              onClick={() => {
                onClose();
              router.push('/account?tab=achievements');
              }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                🏆
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Achievements
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Milestones & travel badges
                </p>
              </div>
            </div>
          </UMCard>
        </div>
      </section>

        {/* ACCOUNT SETTINGS */}
      <section className="space-y-4">
        <UMSectionTitle className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Account & Settings</span>
          <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700"></span>
        </UMSectionTitle>

        <div className="space-y-3">
          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 border-gray-100 dark:border-gray-800 group"
                onClick={() => {
                  onClose();
              router.push('/account?tab=settings');
                }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                ⚙️
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Profile & Preferences
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Notifications, privacy, theme
                </p>
              </div>
            </div>
          </UMCard>

          {isAdmin && (
            <UMCard
              className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 border-blue-100 dark:border-blue-900 group bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30"
              onClick={() => {
                onClose();
                router.push('/admin');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                  👑
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    Admin Panel
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Manage destinations, analytics
                  </p>
                </div>
              </div>
            </UMCard>
          )}

          <UMCard
            className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 border-red-100 dark:border-red-900 group bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/30"
                onClick={handleSignOut}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                🚪
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-red-600 dark:text-red-400">
                  Sign Out
                </p>
                <p className="text-xs text-red-500 dark:text-red-500">
                  Log out of your account
                </p>
              </div>
            </div>
          </UMCard>
        </div>
      </section>
      </div>
  );
}
