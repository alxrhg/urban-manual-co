'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Drawer } from '@/ui/Drawer';
import { Switch } from '@/ui/switch';
import {
  getTravelBadge,
  getMilestoneProgress,
  getMilestoneMessage,
} from '@/lib/travel-achievements';
import { parseDestinations } from '@/types/trip';
import type { Trip } from '@/types/trip';
import type { Destination } from '@/types/destination';
import {
  Settings,
  MapPin,
  LogOut,
  Bookmark,
  ChevronRight,
  User,
  Edit3,
  Compass,
  Moon,
  Sun,
  HelpCircle,
  Calendar,
  Plane,
  Sparkles,
  Trophy,
  Share2,
  FolderOpen,
  Clock,
  Utensils,
  Coffee,
  Building2,
  Wine,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from '@/ui/sonner';

interface UserStats {
  visited: number;
  saved: number;
  trips: number;
  countries: number;
  categoryBreakdown: Record<string, number>;
}

interface UserPreferences {
  travel_style?: string;
  interests?: string[];
  favorite_categories?: string[];
  price_preference?: number;
}

interface Collection {
  id: string;
  name: string;
  emoji: string;
  destination_count: number;
}

interface RecentActivity {
  id: string;
  type: 'visited' | 'saved';
  destination_name: string;
  destination_slug: string;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

interface UpcomingTrip extends Trip {
  days_until: number;
}

// Avatar with Progress Ring - uses black/gray per design system
function AvatarWithRing({
  avatarUrl,
  displayUsername,
  progress,
}: {
  avatarUrl: string | null;
  displayUsername: string;
  progress: number;
}) {
  const progressDegrees = (progress / 100) * 360;

  return (
    <div
      className="relative w-[72px] h-[72px] rounded-full p-1 flex items-center justify-center"
      style={{
        background: `conic-gradient(#000 ${progressDegrees}deg, #e5e7eb ${progressDegrees}deg)`,
      }}
    >
      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile"
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <span className="text-2xl font-semibold text-gray-500 dark:text-gray-400">
            {displayUsername.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// Travel Badge Component - neutral gray style per design system
function TravelBadge({ badge }: { badge: { name: string } }) {
  return (
    <span className="mt-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
      {badge.name}
    </span>
  );
}

// Upcoming Trip Card
function UpcomingTripCard({
  trip,
  onClick,
}: {
  trip: UpcomingTrip;
  onClick: () => void;
}) {
  const destinations = parseDestinations(trip.destination);
  const destination = destinations[0] || 'Trip';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {trip.days_until === 0
                ? 'Today'
                : trip.days_until === 1
                ? 'Tomorrow'
                : `In ${trip.days_until} days`}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {trip.title || destination}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {destination}
            {trip.start_date && (
              <>
                {' · '}
                {formatDate(trip.start_date)}
                {trip.end_date && trip.end_date !== trip.start_date && (
                  <> - {formatDate(trip.end_date)}</>
                )}
              </>
            )}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// Recommendation Card
function RecommendationCard({
  destination,
  onClick,
}: {
  destination: Destination;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left w-full group"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {destination.image ? (
          <Image
            src={destination.image}
            alt={destination.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {destination.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {destination.city}
          {destination.category && ` · ${destination.category}`}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
    </button>
  );
}

// Library Tile Component - minimal card style
function LibraryTile({
  icon: Icon,
  count,
  label,
  onClick,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 active:scale-[0.98] transition-all"
    >
      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mb-1" />
      <span className="text-xl font-semibold text-gray-900 dark:text-white">
        {count}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500">
        {label}
      </span>
    </button>
  );
}

// Settings Row Component
function SettingsRow({
  icon: Icon,
  label,
  onClick,
  rightElement,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
}) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      </div>
      {rightElement || (
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 transition-transform group-hover:translate-x-0.5" />
      )}
    </Component>
  );
}

// Dark Mode Toggle Component
function DarkModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={false} disabled className="scale-75" />
      </div>
    );
  }

  const currentTheme = resolvedTheme || theme || 'light';
  const isDark = currentTheme === 'dark';

  return (
    <div className="flex items-center gap-2">
      <Sun className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-900'}`} />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        className="scale-75"
        aria-label="Toggle dark mode"
      />
      <Moon className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-400'}`} />
    </div>
  );
}

// Achievement Card Component
function AchievementCard({
  achievement,
  onClick,
}: {
  achievement: Achievement;
  onClick: () => void;
}) {
  const progressPercent =
    achievement.progress !== undefined && achievement.total !== undefined
      ? Math.min(100, (achievement.progress / achievement.total) * 100)
      : 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 border rounded-2xl transition-colors text-left w-full group ${
        achievement.unlocked
          ? 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
          : 'border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50'
      }`}
    >
      <div
        className={`text-2xl flex-shrink-0 ${!achievement.unlocked ? 'grayscale opacity-50' : ''}`}
      >
        {achievement.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium text-sm truncate ${
            achievement.unlocked
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-500'
          }`}
        >
          {achievement.name}
        </h4>
        {!achievement.unlocked &&
          achievement.progress !== undefined &&
          achievement.total !== undefined && (
            <div className="mt-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                  {achievement.progress}/{achievement.total}
                </span>
              </div>
            </div>
          )}
        {achievement.unlocked && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">Unlocked</span>
        )}
      </div>
    </button>
  );
}

// Travel Style Tag Component
function TravelStyleTag({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
    </span>
  );
}

// Collection Card Component
function CollectionCard({
  collection,
  onClick,
}: {
  collection: Collection;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left w-full group"
    >
      <span className="text-xl flex-shrink-0">{collection.emoji || '📚'}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {collection.name}
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {collection.destination_count} {collection.destination_count === 1 ? 'place' : 'places'}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
    </button>
  );
}

// Recent Activity Item Component
function ActivityItem({
  activity,
  onClick,
}: {
  activity: RecentActivity;
  onClick: () => void;
}) {
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg px-2 -mx-2 transition-colors text-left w-full group"
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          activity.type === 'visited'
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-blue-100 dark:bg-blue-900/30'
        }`}
      >
        {activity.type === 'visited' ? (
          <MapPin className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white truncate">
          {activity.type === 'visited' ? 'Visited' : 'Saved'}{' '}
          <span className="font-medium">{activity.destination_name}</span>
        </p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {formatTimeAgo(activity.created_at)}
      </span>
    </button>
  );
}

// Category Stats Bar Component
function CategoryStatsBar({
  categoryBreakdown,
  total,
}: {
  categoryBreakdown: Record<string, number>;
  total: number;
}) {
  const categories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('restaurant') || lower.includes('dining')) return Utensils;
    if (lower.includes('cafe') || lower.includes('coffee')) return Coffee;
    if (lower.includes('hotel') || lower.includes('stay')) return Building2;
    if (lower.includes('bar') || lower.includes('drink')) return Wine;
    return MapPin;
  };

  const getCategoryColor = (category: string, index: number) => {
    const colors = [
      'bg-gray-900 dark:bg-white',
      'bg-gray-600 dark:bg-gray-300',
      'bg-gray-400 dark:bg-gray-500',
      'bg-gray-200 dark:bg-gray-700',
    ];
    return colors[index] || colors[3];
  };

  if (categories.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
        {categories.map(([category, count], index) => {
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={category}
              className={`h-full ${getCategoryColor(category, index)} transition-all`}
              style={{ width: `${percent}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {categories.map(([category, count], index) => {
          const Icon = getCategoryIcon(category);
          return (
            <div key={category} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getCategoryColor(category, index)}`} />
              <Icon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {category.split('_').join(' ')} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AccountDrawer() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDrawerOpen, closeDrawer: closeLegacyDrawer, openDrawer: openLegacyDrawer } = useDrawer();
  const isOpen = isDrawerOpen('account');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    visited: 0,
    saved: 0,
    trips: 0,
    countries: 0,
    categoryBreakdown: {},
  });
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    async function fetchProfileAndStats() {
      if (!user?.id) {
        setAvatarUrl(null);
        setUsername(null);
        setStats({ visited: 0, saved: 0, trips: 0, countries: 0, categoryBreakdown: {} });
        setUpcomingTrip(null);
        setRecommendations([]);
        setPreferences(null);
        setCollections([]);
        setRecentActivity([]);
        setAchievements([]);
        return;
      }

      try {
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
        }

        // Fetch all stats, upcoming trip, and recommendations in parallel
        const today = new Date().toISOString().split('T')[0];

        const [
          visitedResult,
          savedResult,
          tripsResult,
          countriesResult,
          upcomingTripResult,
          recentVisitedResult,
          preferencesResult,
          collectionsResult,
          recentVisitedActivityResult,
          recentSavedActivityResult,
          categoryDataResult,
        ] = await Promise.all([
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
          supabaseClient
            .from('visited_places')
            .select('destinations!inner(country)')
            .eq('user_id', user.id),
          // Get upcoming trip (soonest future trip)
          supabaseClient
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .gte('start_date', today)
            .order('start_date', { ascending: true })
            .limit(1)
            .maybeSingle(),
          // Get recent visited places to find cities for recommendations
          supabaseClient
            .from('visited_places')
            .select('destinations!inner(city)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          // Get user preferences
          supabaseClient
            .from('user_profiles')
            .select('travel_style, interests, favorite_categories, price_preference')
            .eq('user_id', user.id)
            .maybeSingle(),
          // Get user collections
          supabaseClient
            .from('collections')
            .select('id, name, emoji, destination_count')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(3),
          // Get recent visited activity
          supabaseClient
            .from('visited_places')
            .select('id, created_at, destinations!inner(name, slug)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          // Get recent saved activity
          supabaseClient
            .from('saved_places')
            .select('id, created_at, destinations!inner(name, slug)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          // Get visited places with categories for breakdown
          supabaseClient
            .from('visited_places')
            .select('destinations!inner(category)')
            .eq('user_id', user.id),
        ]);

        // Calculate unique countries
        const uniqueCountries = new Set(
          (countriesResult.data || [])
            .map((item: Record<string, unknown>) => {
              const dest = item.destinations;
              if (Array.isArray(dest)) {
                return dest[0]?.country;
              }
              return (dest as { country?: string | null } | null)?.country;
            })
            .filter(Boolean)
        );

        // Calculate category breakdown
        const categoryBreakdown: Record<string, number> = {};
        (categoryDataResult.data || []).forEach((item: Record<string, unknown>) => {
          const dest = item.destinations;
          let category: string | undefined;
          if (Array.isArray(dest)) {
            category = dest[0]?.category;
          } else {
            category = (dest as { category?: string | null } | null)?.category || undefined;
          }
          if (category) {
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
          }
        });

        setStats({
          visited: visitedResult.count || 0,
          saved: savedResult.count || 0,
          trips: tripsResult.count || 0,
          countries: uniqueCountries.size,
          categoryBreakdown,
        });

        // Set user preferences
        if (preferencesResult.data) {
          setPreferences(preferencesResult.data as UserPreferences);
        } else {
          setPreferences(null);
        }

        // Set collections
        setCollections((collectionsResult.data as Collection[]) || []);

        // Combine and sort recent activity
        const visitedActivities: RecentActivity[] = (recentVisitedActivityResult.data || []).map(
          (item: Record<string, unknown>) => {
            const dest = item.destinations;
            const destData = Array.isArray(dest) ? dest[0] : dest;
            return {
              id: `visited-${item.id}`,
              type: 'visited' as const,
              destination_name: (destData as { name?: string })?.name || 'Unknown',
              destination_slug: (destData as { slug?: string })?.slug || '',
              created_at: item.created_at as string,
            };
          }
        );

        const savedActivities: RecentActivity[] = (recentSavedActivityResult.data || []).map(
          (item: Record<string, unknown>) => {
            const dest = item.destinations;
            const destData = Array.isArray(dest) ? dest[0] : dest;
            return {
              id: `saved-${item.id}`,
              type: 'saved' as const,
              destination_name: (destData as { name?: string })?.name || 'Unknown',
              destination_slug: (destData as { slug?: string })?.slug || '',
              created_at: item.created_at as string,
            };
          }
        );

        const combinedActivity = [...visitedActivities, ...savedActivities]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentActivity(combinedActivity);

        // Calculate achievements
        const visitedCount = visitedResult.count || 0;
        const savedCount = savedResult.count || 0;
        const cityCount = new Set(
          (recentVisitedResult.data || []).map((item: Record<string, unknown>) => {
            const dest = item.destinations;
            if (Array.isArray(dest)) return dest[0]?.city;
            return (dest as { city?: string })?.city;
          }).filter(Boolean)
        ).size;

        const michelinCount = 0; // Would need to fetch this separately if needed

        const calculatedAchievements: Achievement[] = [
          {
            id: 'first-visit',
            name: 'First Adventure',
            emoji: '👣',
            unlocked: visitedCount >= 1,
            progress: Math.min(visitedCount, 1),
            total: 1,
          },
          {
            id: 'visit-10',
            name: 'Explorer',
            emoji: '🧭',
            unlocked: visitedCount >= 10,
            progress: Math.min(visitedCount, 10),
            total: 10,
          },
          {
            id: 'visit-25',
            name: 'Adventurer',
            emoji: '🏔️',
            unlocked: visitedCount >= 25,
            progress: Math.min(visitedCount, 25),
            total: 25,
          },
          {
            id: 'city-5',
            name: 'City Explorer',
            emoji: '🗺️',
            unlocked: cityCount >= 5,
            progress: Math.min(cityCount, 5),
            total: 5,
          },
          {
            id: 'country-5',
            name: 'Globe Trotter',
            emoji: '🌍',
            unlocked: uniqueCountries.size >= 5,
            progress: Math.min(uniqueCountries.size, 5),
            total: 5,
          },
        ];

        // Sort: unlocked first, then by progress percentage
        calculatedAchievements.sort((a, b) => {
          if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
          const aProgress = (a.progress || 0) / (a.total || 1);
          const bProgress = (b.progress || 0) / (b.total || 1);
          return bProgress - aProgress;
        });

        setAchievements(calculatedAchievements.slice(0, 3));

        // Set upcoming trip with days until
        if (upcomingTripResult.data) {
          const tripDate = new Date(upcomingTripResult.data.start_date);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          tripDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((tripDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

          setUpcomingTrip({
            ...upcomingTripResult.data,
            days_until: Math.max(0, daysUntil),
          });
        } else {
          setUpcomingTrip(null);
        }

        // Get recommendations based on visited cities
        const visitedCities = new Set(
          (recentVisitedResult.data || [])
            .map((item: Record<string, unknown>) => {
              const dest = item.destinations;
              if (Array.isArray(dest)) {
                return dest[0]?.city;
              }
              return (dest as { city?: string | null } | null)?.city;
            })
            .filter(Boolean)
        );

        // Fetch recommendations from cities user has visited
        if (visitedCities.size > 0) {
          const cities = Array.from(visitedCities).slice(0, 3);
          const { data: recData } = await supabaseClient
            .from('destinations')
            .select('id, slug, name, city, category, image')
            .in('city', cities)
            .not('slug', 'in', `(${(await supabaseClient
              .from('visited_places')
              .select('destinations!inner(slug)')
              .eq('user_id', user.id)
            ).data?.map((d: Record<string, unknown>) => {
              const dest = d.destinations;
              if (Array.isArray(dest)) return `"${dest[0]?.slug}"`;
              return `"${(dest as { slug?: string })?.slug}"`;
            }).join(',') || '""'})`)
            .limit(3);

          setRecommendations((recData as Destination[]) || []);
        }
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
    closeLegacyDrawer();
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    closeLegacyDrawer();
    setTimeout(() => router.push(path), 200);
  };

  const displayUsername = username || user?.email?.split('@')[0] || 'User';

  // Calculate badge and progress
  const badge = getTravelBadge(stats.visited);
  const milestoneProgress = getMilestoneProgress(stats.visited);
  const milestoneMessage = getMilestoneMessage(milestoneProgress);

  // Logged out state
  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
          {/* Close button */}
          <div className="flex justify-end p-4">
            <button
              onClick={closeLegacyDrawer}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Welcome content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-6">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start Your Journey
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              Sign in to track your travels and unlock your personal travel achievements.
            </p>

            <button
              onClick={() => openLegacyDrawer('login')}
              className="w-full max-w-[280px] py-3 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Get Started
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Free to use, no credit card required
            </p>
          </div>
        </div>
      </Drawer>
    );
  }

  // Logged in state
  return (
    <Drawer isOpen={isOpen} onClose={closeLegacyDrawer} position="right">
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Close button */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={closeLegacyDrawer}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header with Avatar Ring */}
          <div className="flex flex-col items-center px-5 pb-4">
            <AvatarWithRing
              avatarUrl={avatarUrl}
              displayUsername={displayUsername}
              progress={milestoneProgress.percentage}
            />
            <TravelBadge badge={badge} />

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-3 text-center">
              {displayUsername}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center truncate max-w-full">
              {user.email}
            </p>

            <button
              onClick={() => handleNavigate('/account')}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>

          {/* Upcoming Trip - Priority section */}
          {upcomingTrip && (
            <div className="px-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Next Trip
                </h3>
              </div>
              <UpcomingTripCard
                trip={upcomingTrip}
                onClick={() => handleNavigate(`/trips/${upcomingTrip.id}`)}
              />
            </div>
          )}

          {/* For You - Recommendations */}
          {recommendations.length > 0 && (
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    For You
                  </h3>
                </div>
                <button
                  onClick={() => handleNavigate('/discover')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  See all
                </button>
              </div>
              <div className="space-y-2">
                {recommendations.map((dest) => (
                  <RecommendationCard
                    key={dest.slug}
                    destination={dest}
                    onClick={() => handleNavigate(`/destinations/${dest.slug}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Journey Progress - Enhanced */}
          <div className="px-5 mb-4">
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{stats.visited}</span> places
                  {stats.countries > 0 && (
                    <>
                      {' · '}
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.countries}</span> {stats.countries === 1 ? 'country' : 'countries'}
                    </>
                  )}
                </p>
                <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-black dark:bg-white transition-all duration-500"
                    style={{ width: `${milestoneProgress.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {milestoneMessage}
                </p>
              </div>

              {/* Category Breakdown */}
              {Object.keys(stats.categoryBreakdown).length > 0 && (
                <CategoryStatsBar
                  categoryBreakdown={stats.categoryBreakdown}
                  total={stats.visited}
                />
              )}
            </div>
          </div>

          {/* Library Grid */}
          <div className="px-5 mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Your Library
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <LibraryTile
                icon={Bookmark}
                count={stats.saved}
                label="Saved"
                onClick={() => openLegacyDrawer('saved-places', 'account')}
              />
              <LibraryTile
                icon={MapPin}
                count={stats.visited}
                label="Visited"
                onClick={() => openLegacyDrawer('visited-places', 'account')}
              />
              <LibraryTile
                icon={Compass}
                count={stats.trips}
                label="Trips"
                onClick={() => openLegacyDrawer('trips', 'account')}
              />
            </div>
          </div>

          {/* Achievements Preview */}
          {achievements.length > 0 && (
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Achievements
                  </h3>
                </div>
                <button
                  onClick={() => handleNavigate('/account?tab=achievements')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    onClick={() => handleNavigate('/account?tab=achievements')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Travel Style Preview */}
          {preferences && (preferences.travel_style || (preferences.interests && preferences.interests.length > 0)) && (
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Your Travel Style
                  </h3>
                </div>
                <button
                  onClick={() => handleNavigate('/account?tab=preferences')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex flex-wrap gap-2">
                  {preferences.travel_style && (
                    <TravelStyleTag label={preferences.travel_style} />
                  )}
                  {preferences.interests?.slice(0, 3).map((interest) => (
                    <TravelStyleTag key={interest} label={interest} />
                  ))}
                  {preferences.interests && preferences.interests.length > 3 && (
                    <span className="px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400">
                      +{preferences.interests.length - 3} more
                    </span>
                  )}
                </div>
                {preferences.price_preference && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Budget: <span className="font-medium text-gray-700 dark:text-gray-300">{'$'.repeat(preferences.price_preference)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collections Preview */}
          {collections.length > 0 && (
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Collections
                  </h3>
                </div>
                <button
                  onClick={() => handleNavigate('/account?tab=collections')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onClick={() => handleNavigate(`/collection/${collection.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="px-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Recent Activity
                </h3>
              </div>
              <div className="space-y-1">
                {recentActivity.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onClick={() => handleNavigate(`/destinations/${activity.destination_slug}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Settings */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <SettingsRow
            icon={Settings}
            label="Settings"
            onClick={() => handleNavigate('/account?tab=settings')}
          />
          <SettingsRow
            icon={Moon}
            label="Dark Mode"
            rightElement={<DarkModeToggle />}
          />
          <SettingsRow
            icon={Share2}
            label="Share Profile"
            onClick={async () => {
              const profileUrl = `${window.location.origin}/profile/${username || user?.id}`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `${displayUsername}'s Travel Profile`,
                    text: `Check out ${displayUsername}'s travel journey on Urban Manual`,
                    url: profileUrl,
                  });
                } catch {
                  // User cancelled or share failed
                }
              } else {
                await navigator.clipboard.writeText(profileUrl);
                toast.success('Profile link copied to clipboard');
              }
            }}
          />
          <SettingsRow
            icon={HelpCircle}
            label="Help & Support"
            onClick={() => handleNavigate('/help')}
          />
        </div>

        {/* Sign Out Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 py-3 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </Drawer>
  );
}
