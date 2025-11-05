'use client';

import { Heart, Users, TrendingUp } from 'lucide-react';

interface Props {
  savesCount?: number;
  visitsCount?: number;
  recentActivity?: number; // Last 7 days
  compact?: boolean;
}

export function SocialProofBadge({ savesCount = 0, visitsCount = 0, recentActivity = 0, compact = false }: Props) {
  // Don't show if no data
  if (savesCount === 0 && visitsCount === 0 && recentActivity === 0) return null;

  const totalEngagement = savesCount + visitsCount;

  // Determine which badge to show
  let badge: { icon: React.ReactNode; label: string; color: string } | null = null;

  if (recentActivity >= 10) {
    badge = {
      icon: <TrendingUp className="h-3 w-3" />,
      label: 'Trending',
      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
    };
  } else if (savesCount >= 50) {
    badge = {
      icon: <Heart className="h-3 w-3" />,
      label: `${savesCount} saves`,
      color: 'bg-red-50 dark:bg-red-900/20 text-red-600'
    };
  } else if (totalEngagement >= 100) {
    badge = {
      icon: <Users className="h-3 w-3" />,
      label: 'Popular',
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
    };
  } else if (savesCount >= 20) {
    badge = {
      icon: <Heart className="h-3 w-3" />,
      label: `${savesCount} saves`,
      color: 'bg-red-50 dark:bg-red-900/20 text-red-600'
    };
  }

  if (!badge) return null;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        <span>{badge.label}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      {badge.icon}
      <span>{badge.label}</span>
    </div>
  );
}
