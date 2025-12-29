'use client';

import { MapPin, Star, FileText, Heart, Users, Trophy, Flame } from 'lucide-react';
import type { UserStats } from '@/types/features';

interface UserStatsCardProps {
  stats: UserStats;
  showAllStats?: boolean;
}

export function UserStatsCard({ stats, showAllStats = false }: UserStatsCardProps) {
  const mainStats = [
    {
      icon: MapPin,
      label: 'Places Visited',
      value: stats.destinations_visited,
      color: 'text-blue-500',
    },
    {
      icon: Heart,
      label: 'Places Saved',
      value: stats.destinations_saved,
      color: 'text-red-500',
    },
    {
      icon: Star,
      label: 'Reviews',
      value: stats.reviews_written,
      color: 'text-yellow-500',
    },
    {
      icon: FileText,
      label: 'Lists',
      value: stats.lists_created,
      color: 'text-green-500',
    },
  ];

  const additionalStats = [
    {
      icon: MapPin,
      label: 'Cities',
      value: stats.cities_visited,
    },
    {
      icon: MapPin,
      label: 'Countries',
      value: stats.countries_visited,
    },
    {
      icon: Users,
      label: 'Followers',
      value: stats.followers_count,
    },
    {
      icon: Users,
      label: 'Following',
      value: stats.following_count,
    },
    {
      icon: Trophy,
      label: 'Points',
      value: stats.total_points,
    },
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${stats.current_streak_days} days`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mainStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center"
          >
            <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      {showAllStats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {additionalStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center"
            >
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Longest Streak */}
      {showAllStats && stats.longest_streak_days > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            <span className="font-medium">Longest Streak</span>
          </div>
          <p className="text-3xl font-bold mt-1">{stats.longest_streak_days} days</p>
        </div>
      )}
    </div>
  );
}
