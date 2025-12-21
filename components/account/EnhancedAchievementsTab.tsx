'use client';

import { useMemo } from 'react';
import { Share2, Lock } from 'lucide-react';
import type { VisitedPlace, SavedPlace } from '@/types/common';

interface EnhancedAchievementsTabProps {
  visitedPlaces: VisitedPlace[];
  savedPlaces: SavedPlace[];
  stats: {
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
  };
}

interface Milestone {
  id: string;
  label: string;
  icon: string;
  category: 'explorer' | 'curator' | 'geography';
  description: string;
  done: boolean;
  progress: number;
  target: number;
  unlockedAt?: string;
}

export function EnhancedAchievementsTab({
  visitedPlaces,
  savedPlaces,
  stats,
}: EnhancedAchievementsTabProps) {
  const achievements = useMemo(() => {
    // Find earliest visit date for timeline
    const visitDates = visitedPlaces
      .filter(p => p.visited_at)
      .map(p => new Date(p.visited_at!).getTime())
      .sort((a, b) => a - b);

    const milestones: Milestone[] = [
      // Explorer achievements
      {
        id: 'first_visit',
        label: 'First Steps',
        icon: '🎯',
        category: 'explorer',
        description: 'Mark your first place as visited',
        done: visitedPlaces.length >= 1,
        progress: Math.min(visitedPlaces.length, 1),
        target: 1,
        unlockedAt: visitDates[0] ? new Date(visitDates[0]).toLocaleDateString() : undefined,
      },
      {
        id: 'visits_10',
        label: 'Explorer',
        icon: '🗺️',
        category: 'explorer',
        description: 'Visit 10 different places',
        done: visitedPlaces.length >= 10,
        progress: Math.min(visitedPlaces.length, 10),
        target: 10,
      },
      {
        id: 'visits_25',
        label: 'Adventurer',
        icon: '🏔️',
        category: 'explorer',
        description: 'Visit 25 different places',
        done: visitedPlaces.length >= 25,
        progress: Math.min(visitedPlaces.length, 25),
        target: 25,
      },
      {
        id: 'visits_50',
        label: 'Globetrotter',
        icon: '✈️',
        category: 'explorer',
        description: 'Visit 50 different places',
        done: visitedPlaces.length >= 50,
        progress: Math.min(visitedPlaces.length, 50),
        target: 50,
      },
      {
        id: 'visits_100',
        label: 'World Traveler',
        icon: '🌟',
        category: 'explorer',
        description: 'Visit 100 different places',
        done: visitedPlaces.length >= 100,
        progress: Math.min(visitedPlaces.length, 100),
        target: 100,
      },

      // Curator achievements
      {
        id: 'first_save',
        label: 'Curator',
        icon: '💝',
        category: 'curator',
        description: 'Save your first destination',
        done: savedPlaces.length >= 1,
        progress: Math.min(savedPlaces.length, 1),
        target: 1,
      },
      {
        id: 'saves_10',
        label: 'Collector',
        icon: '📚',
        category: 'curator',
        description: 'Save 10 destinations to your wishlist',
        done: savedPlaces.length >= 10,
        progress: Math.min(savedPlaces.length, 10),
        target: 10,
      },
      {
        id: 'saves_25',
        label: 'Connoisseur',
        icon: '🎨',
        category: 'curator',
        description: 'Save 25 destinations to your wishlist',
        done: savedPlaces.length >= 25,
        progress: Math.min(savedPlaces.length, 25),
        target: 25,
      },

      // Geography achievements
      {
        id: 'cities_5',
        label: 'City Hopper',
        icon: '🏙️',
        category: 'geography',
        description: 'Explore destinations in 5 different cities',
        done: stats.uniqueCities.size >= 5,
        progress: Math.min(stats.uniqueCities.size, 5),
        target: 5,
      },
      {
        id: 'cities_10',
        label: 'Urban Explorer',
        icon: '🌆',
        category: 'geography',
        description: 'Explore destinations in 10 different cities',
        done: stats.uniqueCities.size >= 10,
        progress: Math.min(stats.uniqueCities.size, 10),
        target: 10,
      },
      {
        id: 'cities_20',
        label: 'Metro Master',
        icon: '🚇',
        category: 'geography',
        description: 'Explore destinations in 20 different cities',
        done: stats.uniqueCities.size >= 20,
        progress: Math.min(stats.uniqueCities.size, 20),
        target: 20,
      },
      {
        id: 'countries_5',
        label: 'Border Crosser',
        icon: '🌍',
        category: 'geography',
        description: 'Visit destinations in 5 different countries',
        done: stats.uniqueCountries.size >= 5,
        progress: Math.min(stats.uniqueCountries.size, 5),
        target: 5,
      },
      {
        id: 'countries_10',
        label: 'Continental',
        icon: '🗺️',
        category: 'geography',
        description: 'Visit destinations in 10 different countries',
        done: stats.uniqueCountries.size >= 10,
        progress: Math.min(stats.uniqueCountries.size, 10),
        target: 10,
      },
    ];

    const completed = milestones.filter(m => m.done);
    const inProgress = milestones.filter(m => !m.done && m.progress > 0);
    const locked = milestones.filter(m => !m.done && m.progress === 0);

    return { milestones, completed, inProgress, locked, total: milestones.length };
  }, [visitedPlaces, savedPlaces, stats]);

  const handleShare = async () => {
    const text = `I've unlocked ${achievements.completed.length} of ${achievements.total} achievements on Urban Manual! 🏆`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url: 'https://urbanmanual.co' });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const overallProgress = (achievements.completed.length / achievements.total) * 100;

  const categories = [
    { id: 'explorer', label: 'Explorer', icon: '🗺️' },
    { id: 'curator', label: 'Curator', icon: '💝' },
    { id: 'geography', label: 'Geography', icon: '🌍' },
  ] as const;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header with overall progress */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">Achievements</h2>
            <p className="text-sm text-gray-500 mt-1">
              {achievements.completed.length} of {achievements.total} unlocked
            </p>
          </div>
          <button
            onClick={handleShare}
            className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            title="Share achievements"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gray-400 to-black dark:from-gray-600 dark:to-white rounded-full transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">{Math.round(overallProgress)}% complete</p>
      </div>

      {/* Badge grid preview */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {achievements.milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`aspect-square rounded-xl flex items-center justify-center text-xl border transition-all cursor-default ${
              milestone.done
                ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm'
                : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-30 grayscale'
            }`}
            title={`${milestone.label}: ${milestone.description} ${
              milestone.done ? '(Unlocked)' : `(${milestone.progress}/${milestone.target})`
            }`}
          >
            {milestone.icon}
          </div>
        ))}
      </div>

      {/* Achievements by category */}
      {categories.map(category => {
        const categoryMilestones = achievements.milestones.filter(m => m.category === category.id);
        const categoryCompleted = categoryMilestones.filter(m => m.done).length;

        return (
          <div key={category.id}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <span>{category.icon}</span>
                {category.label} Achievements
              </h3>
              <span className="text-xs text-gray-400">
                {categoryCompleted}/{categoryMilestones.length}
              </span>
            </div>

            <div className="space-y-3">
              {categoryMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    milestone.done
                      ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Badge */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        milestone.done
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-100 dark:bg-gray-800/50 opacity-50 grayscale'
                      }`}
                    >
                      {milestone.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${!milestone.done && 'text-gray-400'}`}>
                          {milestone.label}
                        </h4>
                        {milestone.done && (
                          <span className="text-xs text-green-600">Unlocked</span>
                        )}
                        {!milestone.done && milestone.progress === 0 && (
                          <Lock className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${milestone.done ? 'text-gray-500' : 'text-gray-400'}`}>
                        {milestone.description}
                      </p>

                      {/* Progress bar for incomplete achievements */}
                      {!milestone.done && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{milestone.progress}/{milestone.target}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-400 dark:bg-gray-600 rounded-full transition-all duration-500"
                              style={{ width: `${(milestone.progress / milestone.target) * 100}%` }}
                            />
                          </div>
                          {milestone.progress > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {milestone.target - milestone.progress} more to unlock
                            </p>
                          )}
                        </div>
                      )}

                      {/* Unlock date for completed achievements */}
                      {milestone.done && milestone.unlockedAt && (
                        <p className="text-xs text-gray-400 mt-2">
                          Unlocked on {milestone.unlockedAt}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Tips section */}
      {achievements.inProgress.length > 0 && (
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Next Up
          </h4>
          <div className="space-y-2">
            {achievements.inProgress.slice(0, 3).map(milestone => (
              <div key={milestone.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{milestone.icon}</span>
                  <span>{milestone.label}</span>
                </span>
                <span className="text-xs text-gray-400">
                  {milestone.target - milestone.progress} more
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
