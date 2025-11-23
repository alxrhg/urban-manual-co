'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
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
  [key: string]: any;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openDrawer } = useDrawer();
  const openSide = useDrawerStore((s) => s.openSide);
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
  const displayHandle = username ? `@${username}` : user?.email || '';
  const displayEmail = user?.email || '';

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/');
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      desktopWidth="420px"
      position="right"
      style="solid"
      backdropOpacity="15"
      keepStateOnClose={true}
    >
      <div className="px-7 pt-10 pb-16 space-y-10">
        {/* HEADER */}
        <div className="space-y-4">
          <button
            onClick={onClose}
            className="text-sm text-[var(--um-text-muted)] hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[var(--um-border)]">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 border border-[var(--um-border)] flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-black dark:bg-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
                <span className="text-white dark:text-black text-[10px]">✎</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{displayName}</p>
              {displayHandle && (
                <p className="text-sm text-[var(--um-text-muted)]">{displayHandle}</p>
              )}
              {displayEmail && (
                <p className="text-sm text-[var(--um-text-muted)]">{displayEmail}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button className="px-4 py-2 rounded-full border border-[var(--um-border)] text-sm text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
              Edit Profile
            </button>
            <button className="px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm hover:opacity-90 transition-opacity">
              Concierge
            </button>
          </div>
        </div>

        {/* UPCOMING TRIP */}
        {upcomingTrip && (
          <div className="space-y-4">
            <p className="text-xs tracking-widest text-[var(--um-text-muted)] uppercase">
              UPCOMING TRIP
            </p>

            <div
              className="rounded-2xl border border-[var(--um-border)] p-4 space-y-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer bg-white dark:bg-gray-950"
              onClick={() => openSide('trip-overview-quick', { trip: upcomingTrip })}
            >
              {upcomingTrip.coverImage && (
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={upcomingTrip.coverImage}
                    alt={upcomingTrip.name || 'Trip'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                </div>
              )}

              <div>
                <p className="font-medium text-lg text-gray-900 dark:text-white">
                  {upcomingTrip.name || upcomingTrip.title || 'Untitled Trip'}
                </p>
                {upcomingTrip.startDate && upcomingTrip.endDate && (
                  <p className="text-sm text-[var(--um-text-muted)]">
                    {upcomingTrip.startDate} – {upcomingTrip.endDate}
                  </p>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">View Trip →</p>
            </div>
          </div>
        )}

        {/* YOUR MANUAL */}
        <div className="space-y-4">
          <p className="text-xs tracking-widest text-[var(--um-text-muted)] uppercase">
            YOUR MANUAL
          </p>

          <div className="rounded-2xl border border-[var(--um-border)] divide-y divide-[var(--um-border)] bg-white dark:bg-gray-950">
            <button
              onClick={() => {
                onClose();
                openDrawer('saved-places');
              }}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Saved Places</span>
              <span className="text-[var(--um-text-muted)] opacity-30">→</span>
            </button>
            <button
              onClick={() => {
                onClose();
                openDrawer('visited-places');
              }}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Visited Places</span>
              <span className="text-[var(--um-text-muted)] opacity-30">→</span>
            </button>
            <button
              onClick={() => {
                onClose();
                // TODO: Implement lists drawer
              }}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Lists</span>
              <span className="text-[var(--um-text-muted)] opacity-30">→</span>
            </button>
            <button
              onClick={() => {
                onClose();
                openSide('trip-list');
              }}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Trips</span>
              <span className="text-[var(--um-text-muted)] opacity-30">→</span>
            </button>
            <button
              onClick={() => {
                onClose();
                // TODO: Implement achievements drawer
              }}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Achievements</span>
              <span className="text-[var(--um-text-muted)] opacity-30">→</span>
            </button>
          </div>
        </div>

        {/* ACCOUNT SETTINGS */}
        <div className="space-y-4">
          <p className="text-xs tracking-widest text-[var(--um-text-muted)] uppercase">
            ACCOUNT & SETTINGS
          </p>

          <div className="rounded-2xl border border-[var(--um-border)] divide-y divide-[var(--um-border)] bg-white dark:bg-gray-950">
            <button
              onClick={() => {
                onClose();
                openDrawer('settings');
              }}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Profile & Preferences</span>
              <span className="text-[var(--um-text-muted)] opacity-30">→</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex justify-between items-center w-full text-left py-4 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-red-600 dark:text-red-400"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

