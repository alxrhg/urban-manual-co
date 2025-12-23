'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  User, MapPin, Calendar, Globe, Award, Edit2, Share2,
  Camera, Utensils, Hotel, Star, Plane, TrendingUp
} from 'lucide-react';
import type { VisitedPlace, SavedPlace } from '@/types/common';
import { WorldMapVisualization } from '@/components/WorldMapVisualization';

interface UserProfile {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  travel_style?: string;
  favorite_categories?: string[];
  interests?: string[];
  created_at?: string;
  is_public?: boolean;
}

interface EnhancedProfileTabProps {
  userId: string;
  userEmail?: string;
  visitedPlaces: VisitedPlace[];
  savedPlaces: SavedPlace[];
  stats: {
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
    visitedCount: number;
    savedCount: number;
    visitedDestinationsWithCoords: Array<{
      city: string;
      latitude?: number | null;
      longitude?: number | null;
    }>;
  };
  onEditProfile: () => void;
}

const TRAVEL_STYLE_ICONS: Record<string, string> = {
  'Luxury': 'crown',
  'Budget': 'piggy-bank',
  'Adventure': 'mountain',
  'Relaxation': 'spa',
  'Balanced': 'scale',
};

const CATEGORY_ICONS: Record<string, typeof Utensils> = {
  'restaurant': Utensils,
  'hotel': Hotel,
  'Hotels': Hotel,
  'Restaurants': Utensils,
};

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function EnhancedProfileTab({
  userId,
  userEmail,
  visitedPlaces,
  savedPlaces,
  stats,
  onEditProfile,
}: EnhancedProfileTabProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const response = await fetch('/api/account/profile');
      if (!response.ok) throw new Error('Failed to load profile');
      const data = await response.json();
      setProfile(data.profile || {});
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate achievements
  const achievements = useMemo(() => {
    const milestones = [
      { id: 'first_visit', label: 'First Visit', icon: '🎯', done: visitedPlaces.length >= 1, description: 'Mark your first place as visited' },
      { id: 'first_save', label: 'First Save', icon: '💝', done: savedPlaces.length >= 1, description: 'Save your first destination' },
      { id: 'visits_10', label: 'Explorer', icon: '🗺️', done: visitedPlaces.length >= 10, description: 'Visit 10 places' },
      { id: 'visits_25', label: 'Adventurer', icon: '🏔️', done: visitedPlaces.length >= 25, description: 'Visit 25 places' },
      { id: 'visits_50', label: 'Globetrotter', icon: '✈️', done: visitedPlaces.length >= 50, description: 'Visit 50 places' },
      { id: 'cities_5', label: 'City Hopper', icon: '🏙️', done: stats.uniqueCities.size >= 5, description: 'Explore 5 cities' },
      { id: 'cities_10', label: 'Urban Explorer', icon: '🌆', done: stats.uniqueCities.size >= 10, description: 'Explore 10 cities' },
      { id: 'countries_5', label: 'World Traveler', icon: '🌍', done: stats.uniqueCountries.size >= 5, description: 'Visit 5 countries' },
    ];

    const completed = milestones.filter(m => m.done);
    return { milestones, completed, total: milestones.length };
  }, [visitedPlaces, savedPlaces, stats]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    visitedPlaces.forEach(place => {
      const category = place.destination?.category || 'other';
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [visitedPlaces]);

  // Get top cities
  const topCities = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    visitedPlaces.forEach(place => {
      const city = place.destination?.city;
      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    });
    return Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([city, count]) => ({ city: capitalizeCity(city), count }));
  }, [visitedPlaces]);

  // Calculate member since date
  const memberSince = useMemo(() => {
    if (!profile?.created_at) return null;
    return new Date(profile.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }, [profile]);

  const handleShareProfile = async () => {
    const url = profile?.username
      ? `https://urbanmanual.co/user/${profile.username}`
      : `https://urbanmanual.co/user/${userId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || 'My'} Urban Manual Profile`,
          url,
        });
      } catch {
        // User cancelled sharing
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse space-y-6">
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium truncate">
                {profile?.display_name || 'Traveler'}
              </h2>
              {profile?.username && (
                <p className="text-sm text-gray-500">@{profile.username}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEditProfile}
                className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                title="Edit profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {profile?.is_public && (
                <button
                  onClick={handleShareProfile}
                  className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  title="Share profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
            {profile?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {capitalizeCity(profile.location)}
              </span>
            )}
            {memberSince && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Member since {memberSince}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {stats.uniqueCountries.size} {stats.uniqueCountries.size === 1 ? 'country' : 'countries'}
            </span>
          </div>
        </div>
      </div>

      {/* Travel Style Tags */}
      {(profile?.travel_style || (profile?.interests && profile.interests.length > 0)) && (
        <div className="flex flex-wrap gap-2">
          {profile.travel_style && (
            <span className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md">
              {profile.travel_style}
            </span>
          )}
          {profile.interests?.slice(0, 4).map(interest => (
            <span
              key={interest}
              className="px-3 py-1 text-xs bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-800"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* Travel Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-2xl font-medium">{stats.visitedCount}</p>
          <p className="text-xs text-gray-500 mt-1">Places Visited</p>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-2xl font-medium">{stats.savedCount}</p>
          <p className="text-xs text-gray-500 mt-1">Saved for Later</p>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-2xl font-medium">{stats.uniqueCities.size}</p>
          <p className="text-xs text-gray-500 mt-1">Cities Explored</p>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-2xl font-medium">{stats.uniqueCountries.size}</p>
          <p className="text-xs text-gray-500 mt-1">Countries Visited</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-3">Category Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {categoryBreakdown.map(([category, count]) => (
              <div
                key={category}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <span className="text-xs capitalize">{category}</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Cities */}
      {topCities.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-3">Most Visited Cities</h3>
          <div className="flex flex-wrap gap-2">
            {topCities.map(({ city, count }) => (
              <span
                key={city}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {city} ({count}x)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* World Map */}
      {stats.uniqueCountries.size > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-3">Travel Map</h3>
          <WorldMapVisualization
            visitedCountries={stats.uniqueCountries}
            visitedDestinations={stats.visitedDestinationsWithCoords}
          />
          <p className="mt-4 text-sm text-gray-500">
            {Array.from(stats.uniqueCountries).sort().join(' · ')}
          </p>
        </div>
      )}

      {/* Achievements Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-gray-500">Achievements</h3>
          <span className="text-xs text-gray-400">
            {achievements.completed.length} of {achievements.total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
            style={{ width: `${(achievements.completed.length / achievements.total) * 100}%` }}
          />
        </div>

        {/* Recent achievements */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {achievements.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`aspect-square rounded-lg flex items-center justify-center text-lg border transition-all ${
                milestone.done
                  ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-40'
              }`}
              title={`${milestone.label}: ${milestone.description}`}
            >
              {milestone.icon}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Visits */}
      {visitedPlaces.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-4">Recent Visits</h3>
          <div className="space-y-3">
            {visitedPlaces.slice(0, 5).map((place) => (
              <button
                key={place.destination_slug}
                onClick={() => router.push(`/destination/${place.destination_slug}`)}
                className="block text-left text-sm hover:opacity-60 transition-opacity w-full"
              >
                <span className="font-medium">{place.destination?.name}</span>
                <span className="text-gray-500"> · {place.destination && capitalizeCity(place.destination.city)}</span>
                {place.visited_at && (
                  <span className="text-gray-400 ml-2 text-xs">
                    {new Date(place.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </button>
            ))}
          </div>
          {visitedPlaces.length > 5 && (
            <button
              onClick={() => {
                // Switch to visited tab - this would need to be passed as prop
              }}
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white mt-4"
            >
              View all {visitedPlaces.length} visits →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
