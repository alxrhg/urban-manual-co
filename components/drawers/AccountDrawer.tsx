'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import {
  Bookmark,
  MapPin,
  List,
  Plane,
  Trophy,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Globe,
  Calendar
} from 'lucide-react';

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

// Badge pill component (matching destination drawer style)
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'admin' | 'stat' }) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    stat: 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

// User Passport Card component
function UserPassportCard({
  avatarUrl,
  displayName,
  displayHandle,
  displayEmail,
  isAdmin,
  memberSince,
  placesVisited,
  countriesVisited
}: {
  avatarUrl: string | null;
  displayName: string;
  displayHandle: string;
  displayEmail: string;
  isAdmin: boolean;
  memberSince?: string;
  placesVisited?: number;
  countriesVisited?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black p-5">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
      </div>

      {/* Header with badges */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Urban Manual</span>
        </div>
        {isAdmin && (
          <Badge variant="admin">Admin</Badge>
        )}
      </div>

      {/* Profile section */}
      <div className="relative flex items-center gap-4 mb-5">
        {avatarUrl ? (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden ring-2 ring-white/20">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-gray-700 ring-2 ring-white/20 flex items-center justify-center">
            <span className="text-white text-2xl font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xl font-semibold text-white truncate">
            {displayName}
          </p>
          {displayHandle && (
            <p className="text-sm text-gray-400 truncate">
              {displayHandle}
            </p>
          )}
          {displayEmail && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {displayEmail}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="relative flex items-center gap-2">
        {memberSince && (
          <Badge variant="stat">
            <Calendar className="w-3 h-3 mr-1" />
            Since {memberSince}
          </Badge>
        )}
        {placesVisited !== undefined && placesVisited > 0 && (
          <Badge variant="stat">
            <MapPin className="w-3 h-3 mr-1" />
            {placesVisited} places
          </Badge>
        )}
        {countriesVisited !== undefined && countriesVisited > 0 && (
          <Badge variant="stat">
            <Globe className="w-3 h-3 mr-1" />
            {countriesVisited} countries
          </Badge>
        )}
      </div>
    </div>
  );
}

// Upcoming trip card component
function UpcomingTripCard({ trip, onClick }: { trip: UpcomingTrip; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {trip.coverImage && (
        <div className="relative w-full h-32">
          <Image
            src={trip.coverImage}
            alt={trip.name || 'Trip'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 420px"
          />
        </div>
      )}
      <div className="p-4">
        <p className="font-medium text-gray-900 dark:text-white">
          {trip.name || trip.title || 'Untitled Trip'}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {trip.city || trip.destination || ''}
          {trip.startDate && trip.endDate && (
            <> · {trip.startDate} – {trip.endDate}</>
          )}
        </p>
      </div>
    </button>
  );
}

// Menu item component
function MenuItem({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'default'
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        variant === 'danger'
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-gray-100 dark:bg-gray-800'
      }`}>
        <Icon className={`w-5 h-5 ${
          variant === 'danger'
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-400'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-medium ${
          variant === 'danger'
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-900 dark:text-white'
        }`}>
          {label}
        </p>
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {description}
          </p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600" />
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
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberSince, setMemberSince] = useState<string | undefined>();
  const [placesVisited, setPlacesVisited] = useState<number>(0);
  const [countriesVisited, setCountriesVisited] = useState<number>(0);

  // Fetch user profile and upcoming trip
  useEffect(() => {
    async function fetchUserData() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setUpcomingTrip(null);
        setMemberSince(undefined);
        setPlacesVisited(0);
        setCountriesVisited(0);
        return;
      }

      try {
        setLoading(true);
        const supabaseClient = createClient();

        // Fetch profile
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

        // Fetch visited places count
        const { count: visitedCount } = await supabaseClient
          .from('visited_places')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setPlacesVisited(visitedCount || 0);

        // Fetch countries visited (unique countries from visited places)
        const { data: visitedData } = await supabaseClient
          .from('visited_places')
          .select('destinations!inner(country)')
          .eq('user_id', user.id);

        if (visitedData) {
          const uniqueCountries = new Set(visitedData.map((v: any) => v.destinations?.country).filter(Boolean));
          setCountriesVisited(uniqueCountries.size);
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

  const navigate = (path: string) => {
    onClose();
    router.push(path);
  };

  // Signed out state
  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose}>
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
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Sign in to save places, build trips, and sync your travel profile across devices.
              </p>
            </div>
          </DrawerSection>
        </div>

        <DrawerActionBar>
          <button
            onClick={() => navigate('/auth/login')}
            className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </DrawerActionBar>
      </Drawer>
    );
  }

  // Signed in state
  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
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
            displayName={displayName}
            displayHandle={displayHandle}
            displayEmail={displayEmail}
            isAdmin={isAdmin}
            memberSince={memberSince}
            placesVisited={placesVisited}
            countriesVisited={countriesVisited}
          />
        </DrawerSection>

        {/* Upcoming Trip */}
        {upcomingTrip && (
          <DrawerSection bordered>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              Upcoming Trip
            </p>
            <UpcomingTripCard trip={upcomingTrip} onClick={handleOpenTrip} />
          </DrawerSection>
        )}

        {/* Your Manual */}
        <DrawerSection bordered>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
            Your Manual
          </p>
          <div className="space-y-1">
            <MenuItem
              icon={Bookmark}
              label="Saved Places"
              description="Your curated favorites"
              onClick={() => {
                onClose();
                openLegacyDrawer('saved-places');
              }}
            />
            <MenuItem
              icon={MapPin}
              label="Visited Places"
              description="Your travel history"
              onClick={() => {
                onClose();
                openLegacyDrawer('visited-places');
              }}
            />
            <MenuItem
              icon={List}
              label="Lists"
              description="Organize destinations"
              onClick={() => navigate('/account?tab=collections')}
            />
            <MenuItem
              icon={Plane}
              label="Trips"
              description="Manage trip plans"
              onClick={() => {
                onClose();
                openSide('trip-list');
              }}
            />
            <MenuItem
              icon={Trophy}
              label="Achievements"
              description="Milestones & badges"
              onClick={() => navigate('/account?tab=achievements')}
            />
          </div>
        </DrawerSection>

        {/* Account & Settings */}
        <DrawerSection bordered>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
            Account & Settings
          </p>
          <div className="space-y-1">
            <MenuItem
              icon={Settings}
              label="Profile & Preferences"
              description="Notifications, privacy, theme"
              onClick={() => navigate('/account')}
            />
            {isAdmin && (
              <MenuItem
                icon={Shield}
                label="Admin Panel"
                description="Manage destinations, analytics"
                onClick={() => navigate('/admin')}
              />
            )}
            <MenuItem
              icon={LogOut}
              label="Sign Out"
              onClick={handleSignOut}
              variant="danger"
            />
          </div>
        </DrawerSection>
      </div>

      <DrawerActionBar>
        <button
          onClick={() => navigate('/account')}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Open Account Page
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
