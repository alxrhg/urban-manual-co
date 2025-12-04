'use client';

import { useState, useEffect } from 'react';
import { AchievementProgress, RARITY_COLORS, RARITY_BORDERS } from '@/types/achievement';
import { getUserAchievementsWithProgress, checkAndAwardAchievements } from '@/services/gamification/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Trophy, Lock } from 'lucide-react';

interface AchievementsProps {
  className?: string;
}

export function Achievements({ className }: AchievementsProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      loadAchievements();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadAchievements = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // First check for new achievements
      await checkAndAwardAchievements(user.id);
      
      // Then load all achievements with progress
      const data = await getUserAchievementsWithProgress(user.id);
      setAchievements(data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'travel', 'food', 'exploration', 'social'];
  const filteredAchievements = activeCategory === 'all'
    ? achievements
    : achievements.filter(a => a.achievement.category === activeCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ''}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Stats Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Achievements</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {unlockedCount} of {totalCount} unlocked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <span className="text-2xl font-bold">{unlockedCount}</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No achievements found in this category
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievementProgress) => {
            const { achievement, unlocked, current_progress, progress_percentage } = achievementProgress;
            const isComplete = unlocked || current_progress >= achievement.requirement_value;

            return (
              <div
                key={achievement.id}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  unlocked
                    ? `${RARITY_BORDERS[achievement.rarity]} bg-white dark:bg-gray-900`
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-60'
                }`}
              >
                {/* Achievement Badge */}
                <div className="flex items-start gap-4">
                  {/* Emoji Icon */}
                  <div
                    className={`text-4xl flex-shrink-0 ${
                      unlocked ? '' : 'grayscale opacity-50'
                    }`}
                  >
                    {achievement.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 truncate">
                          {achievement.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {achievement.description}
                        </p>
                      </div>
                      {unlocked && (
                        <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      )}
                      {!unlocked && (
                        <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          {current_progress} / {achievement.requirement_value}
                        </span>
                        {unlocked && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Unlocked!
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          unlocked ? '' : 'bg-gray-400'
                        }`}
                        style={{
                          width: `${progress_percentage}%`,
                          backgroundColor: unlocked
                            ? RARITY_COLORS[achievement.rarity] || '#f59e0b'
                            : '#9ca3af',
                        }}
                      />
                      </div>
                    </div>

                    {/* Rarity Badge */}
                    <div className="mt-3">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium border"
                        style={{
                          color: unlocked
                            ? RARITY_COLORS[achievement.rarity] || '#f59e0b'
                            : '#9ca3af',
                          borderColor: unlocked
                            ? RARITY_COLORS[achievement.rarity] || '#f59e0b'
                            : '#9ca3af',
                        }}
                      >
                        {achievement.rarity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

