'use client';

import React from 'react';
import { Check, Lock } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

interface EndorsementsPageProps {
  achievements: Achievement[];
  stats: {
    visitedCount: number;
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
  };
}

// Endorsement seal component
function EndorsementSeal({
  achievement,
  size = 'medium',
}: {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-20 h-20 md:w-24 md:h-24',
    large: 'w-28 h-28 md:w-32 md:h-32',
  };

  const iconSizes = {
    small: 'text-xl',
    medium: 'text-2xl md:text-3xl',
    large: 'text-3xl md:text-4xl',
  };

  const unlockedDate = achievement.unlockedAt
    ? new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).toUpperCase()
    : null;

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Seal background */}
      <div
        className={`
          absolute inset-0 rounded-full
          ${achievement.unlocked
            ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 border-2 border-amber-400/50'
            : 'bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'
          }
        `}
      />

      {/* Seal content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {achievement.unlocked ? (
          <>
            <span className={iconSizes[size]}>{achievement.icon}</span>
            {size !== 'small' && unlockedDate && (
              <span className="passport-data text-[7px] text-amber-700 dark:text-amber-400 mt-1">
                {unlockedDate}
              </span>
            )}
          </>
        ) : (
          <Lock className="w-1/3 h-1/3 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Official seal border decoration */}
      {achievement.unlocked && (
        <div className="absolute inset-0 rounded-full border-4 border-double border-amber-500/30 pointer-events-none" />
      )}

      {/* Check mark for unlocked */}
      {achievement.unlocked && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

// Generate achievements from stats
function generateAchievements(stats: EndorsementsPageProps['stats']): Achievement[] {
  const { visitedCount, uniqueCities, uniqueCountries } = stats;

  return [
    // Visit milestones
    {
      id: 'first-stamp',
      name: 'First Stamp',
      description: 'Mark your first destination as visited',
      icon: '🎯',
      unlocked: visitedCount >= 1,
      progress: Math.min(visitedCount, 1),
      maxProgress: 1,
    },
    {
      id: 'explorer-5',
      name: 'Explorer',
      description: 'Visit 5 destinations',
      icon: '🧭',
      unlocked: visitedCount >= 5,
      progress: Math.min(visitedCount, 5),
      maxProgress: 5,
    },
    {
      id: 'adventurer-25',
      name: 'Adventurer',
      description: 'Visit 25 destinations',
      icon: '🏔️',
      unlocked: visitedCount >= 25,
      progress: Math.min(visitedCount, 25),
      maxProgress: 25,
    },
    {
      id: 'globetrotter-50',
      name: 'Globetrotter',
      description: 'Visit 50 destinations',
      icon: '🌍',
      unlocked: visitedCount >= 50,
      progress: Math.min(visitedCount, 50),
      maxProgress: 50,
    },
    {
      id: 'master-100',
      name: 'Master Explorer',
      description: 'Visit 100 destinations',
      icon: '👑',
      unlocked: visitedCount >= 100,
      progress: Math.min(visitedCount, 100),
      maxProgress: 100,
    },
    // City milestones
    {
      id: 'city-hopper-3',
      name: 'City Hopper',
      description: 'Visit destinations in 3 cities',
      icon: '🏙️',
      unlocked: uniqueCities.size >= 3,
      progress: Math.min(uniqueCities.size, 3),
      maxProgress: 3,
    },
    {
      id: 'city-hopper-10',
      name: 'Urban Nomad',
      description: 'Visit destinations in 10 cities',
      icon: '🌆',
      unlocked: uniqueCities.size >= 10,
      progress: Math.min(uniqueCities.size, 10),
      maxProgress: 10,
    },
    // Country milestones
    {
      id: 'border-crosser-3',
      name: 'Border Crosser',
      description: 'Visit destinations in 3 countries',
      icon: '🛂',
      unlocked: uniqueCountries.size >= 3,
      progress: Math.min(uniqueCountries.size, 3),
      maxProgress: 3,
    },
    {
      id: 'world-traveler-10',
      name: 'World Traveler',
      description: 'Visit destinations in 10 countries',
      icon: '✈️',
      unlocked: uniqueCountries.size >= 10,
      progress: Math.min(uniqueCountries.size, 10),
      maxProgress: 10,
    },
    {
      id: 'global-citizen-25',
      name: 'Global Citizen',
      description: 'Visit destinations in 25 countries',
      icon: '🌐',
      unlocked: uniqueCountries.size >= 25,
      progress: Math.min(uniqueCountries.size, 25),
      maxProgress: 25,
    },
  ];
}

export function EndorsementsPage({ stats }: EndorsementsPageProps) {
  const achievements = generateAchievements(stats);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="passport-data text-[10px] text-gray-400">ENDORSEMENTS</p>
          <p className="text-xs text-gray-500 mt-1">
            {unlockedCount} of {achievements.length} unlocked
          </p>
        </div>
      </div>

      {/* Main endorsements page */}
      <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Official header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="passport-data text-[10px] text-gray-400">OFFICIAL ENDORSEMENTS</p>
              <p className="passport-data text-xs font-medium mt-1">TRAVEL ACHIEVEMENT RECORD</p>
            </div>
            <div className="text-right">
              <p className="passport-data text-[10px] text-gray-400">VALID</p>
              <p className="passport-data text-xs">PERMANENT</p>
            </div>
          </div>
        </div>

        {/* Endorsement seals grid */}
        <div className="p-6">
          {/* Featured unlocked achievements */}
          {unlockedCount > 0 && (
            <div className="mb-8">
              <p className="passport-data text-[10px] text-gray-400 mb-4">ACTIVE ENDORSEMENTS</p>
              <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
                {achievements.filter(a => a.unlocked).map((achievement) => (
                  <div key={achievement.id} className="flex flex-col items-center gap-2">
                    <EndorsementSeal achievement={achievement} size="medium" />
                    <div className="text-center max-w-[80px]">
                      <p className="passport-data text-[9px] font-medium leading-tight">{achievement.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked achievements */}
          <div>
            <p className="passport-data text-[10px] text-gray-400 mb-4">PENDING ENDORSEMENTS</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {achievements.filter(a => !a.unlocked).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700"
                >
                  <EndorsementSeal achievement={achievement} size="small" />
                  <div className="flex-1 min-w-0">
                    <p className="passport-data text-[10px] font-medium truncate">{achievement.name}</p>
                    <p className="text-[9px] text-gray-400 line-clamp-2">{achievement.description}</p>
                    {achievement.progress !== undefined && achievement.maxProgress && (
                      <div className="mt-1.5">
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          />
                        </div>
                        <p className="passport-data text-[8px] text-gray-400 mt-0.5">
                          {achievement.progress}/{achievement.maxProgress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <p className="passport-data text-[8px] text-gray-400 text-center">
            ENDORSEMENTS ARE PERMANENT AND CANNOT BE REVOKED • CONTINUE EXPLORING TO UNLOCK MORE
          </p>
        </div>
      </div>
    </div>
  );
}
