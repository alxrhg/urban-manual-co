'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Heart, Award, Sparkles, ArrowRight } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
  theme: 'first-steps' | 'city-explorer' | 'michelin' | 'specialists';
  ctaRoute?: string;
  ctaLabel?: string;
}

interface AchievementsDisplayProps {
  visitedPlaces: any[];
  savedPlaces: any[];
  uniqueCities: Set<string>;
  uniqueCountries: Set<string>;
}

export function AchievementsDisplay({
  visitedPlaces,
  savedPlaces,
  uniqueCities,
  uniqueCountries
}: AchievementsDisplayProps) {
  const router = useRouter();

  const achievements = useMemo<Achievement[]>(() => {
    const michelinCount = visitedPlaces.filter(p =>
      p.destination && (p.destination as any).michelin_stars > 0
    ).length;

    const cityVisitCounts: Record<string, number> = {};
    visitedPlaces.forEach(p => {
      if (p.destination) {
        const city = p.destination.city;
        cityVisitCounts[city] = (cityVisitCounts[city] || 0) + 1;
      }
    });

    const maxCityVisits = Math.max(0, ...Object.values(cityVisitCounts));
    const topCity = Object.keys(cityVisitCounts).find(
      city => cityVisitCounts[city] === maxCityVisits
    );

    // Category counts
    const categoryCounts: Record<string, number> = {};
    visitedPlaces.forEach(p => {
      if (p.destination) {
        const category = p.destination.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    return [
      // First Steps
      {
        id: 'first-save',
        name: 'Getting Started',
        description: 'Saved your first place',
        emoji: '🌟',
        unlocked: savedPlaces.length >= 1,
        progress: Math.min(savedPlaces.length, 1),
        total: 1,
        theme: 'first-steps',
        ctaRoute: '/',
        ctaLabel: 'Browse destinations'
      },
      {
        id: 'first-visit',
        name: 'First Adventure',
        description: 'Marked your first visit',
        emoji: '👣',
        unlocked: visitedPlaces.length >= 1,
        progress: Math.min(visitedPlaces.length, 1),
        total: 1,
        theme: 'first-steps',
        ctaRoute: '/',
        ctaLabel: 'Explore places'
      },

      // City Explorer
      {
        id: 'city-5',
        name: 'City Explorer',
        description: 'Visited 5 different cities',
        emoji: '🗺️',
        unlocked: uniqueCities.size >= 5,
        progress: uniqueCities.size,
        total: 5,
        theme: 'city-explorer',
        ctaRoute: '/cities',
        ctaLabel: 'Discover cities'
      },
      {
        id: 'city-10',
        name: 'World Traveler',
        description: 'Visited 10 different cities',
        emoji: '✈️',
        unlocked: uniqueCities.size >= 10,
        progress: uniqueCities.size,
        total: 10,
        theme: 'city-explorer',
        ctaRoute: '/cities',
        ctaLabel: 'Explore more cities'
      },
      {
        id: 'country-5',
        name: 'Globe Trotter',
        description: 'Visited 5 different countries',
        emoji: '🌍',
        unlocked: uniqueCountries.size >= 5,
        progress: uniqueCountries.size,
        total: 5,
        theme: 'city-explorer',
        ctaRoute: '/cities',
        ctaLabel: 'See all countries'
      },
      {
        id: 'visit-10',
        name: 'Explorer',
        description: 'Visited 10 places',
        emoji: '🧭',
        unlocked: visitedPlaces.length >= 10,
        progress: visitedPlaces.length,
        total: 10,
        theme: 'city-explorer',
        ctaRoute: '/',
        ctaLabel: 'Continue exploring'
      },
      {
        id: 'visit-25',
        name: 'Adventurer',
        description: 'Visited 25 places',
        emoji: '🏔️',
        unlocked: visitedPlaces.length >= 25,
        progress: visitedPlaces.length,
        total: 25,
        theme: 'city-explorer',
        ctaRoute: '/',
        ctaLabel: 'Keep exploring'
      },
      {
        id: 'visit-50',
        name: 'Veteran Traveler',
        description: 'Visited 50 places',
        emoji: '🏆',
        unlocked: visitedPlaces.length >= 50,
        progress: visitedPlaces.length,
        total: 50,
        theme: 'city-explorer',
        ctaRoute: '/',
        ctaLabel: 'Explore more'
      },
      {
        id: 'visit-100',
        name: 'Legend',
        description: 'Visited 100 places',
        emoji: '👑',
        unlocked: visitedPlaces.length >= 100,
        progress: visitedPlaces.length,
        total: 100,
        theme: 'city-explorer',
        ctaRoute: '/',
        ctaLabel: 'Discover more'
      },

      // Michelin Stars
      {
        id: 'michelin-1',
        name: 'Fine Dining Initiate',
        description: 'Visited 1 Michelin-starred restaurant',
        emoji: '⭐',
        unlocked: michelinCount >= 1,
        progress: michelinCount,
        total: 1,
        theme: 'michelin',
        ctaRoute: '/?michelin=true',
        ctaLabel: 'Find Michelin restaurants'
      },
      {
        id: 'michelin-5',
        name: 'Michelin Enthusiast',
        description: 'Visited 5 Michelin-starred restaurants',
        emoji: '🌟',
        unlocked: michelinCount >= 5,
        progress: michelinCount,
        total: 5,
        theme: 'michelin',
        ctaRoute: '/?michelin=true',
        ctaLabel: 'Explore Michelin places'
      },
      {
        id: 'michelin-10',
        name: 'Michelin Connoisseur',
        description: 'Visited 10 Michelin-starred restaurants',
        emoji: '💫',
        unlocked: michelinCount >= 10,
        progress: michelinCount,
        total: 10,
        theme: 'michelin',
        ctaRoute: '/?michelin=true',
        ctaLabel: 'Discover more'
      },

      // City Master (20+ visits in one city)
      ...(maxCityVisits >= 20 && topCity ? [{
        id: `city-master-${topCity}`,
        name: `${topCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Master`,
        description: `Visited 20+ places in ${topCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
        emoji: '🏙️',
        unlocked: true,
        theme: 'specialists' as const,
        ctaRoute: `/city/${topCity}`,
        ctaLabel: `Explore ${topCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
      }] : []),

      // Category Specialist (10+ in one category)
      ...Object.entries(categoryCounts)
        .filter(([_, count]) => count >= 10)
        .map(([category, count]) => ({
          id: `category-${category}`,
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} Specialist`,
          description: `Visited 10+ ${category} places`,
          emoji: category === 'restaurant' ? '🍽️' : category === 'bar' ? '🍸' : category === 'cafe' ? '☕' : '🏛️',
          unlocked: true,
          theme: 'specialists' as const,
          ctaRoute: `/?category=${category}`,
          ctaLabel: `Find more ${category} places`
        }))
    ];
  }, [visitedPlaces, savedPlaces, uniqueCities, uniqueCountries]);

  // Group achievements by theme
  const groupedAchievements = useMemo(() => {
    const groups: Record<string, Achievement[]> = {
      'first-steps': [],
      'city-explorer': [],
      'michelin': [],
      'specialists': []
    };

    achievements.forEach(achievement => {
      groups[achievement.theme].push(achievement);
    });

    return groups;
  }, [achievements]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  // Helper to calculate remaining progress
  const getProgressText = (achievement: Achievement): string => {
    if (achievement.unlocked) return 'Unlocked';
    if (achievement.progress !== undefined && achievement.total !== undefined) {
      const remaining = achievement.total - achievement.progress;
      if (remaining === 1) {
        return '1 away';
      }
      return `${remaining} away`;
    }
    return 'Locked';
  };

  // Empty state messages by theme
  const getEmptyStateMessage = (theme: string): { title: string; description: string; cta: string; route: string } => {
    switch (theme) {
      case 'first-steps':
        return {
          title: 'Begin Your Journey',
          description: 'Save your first place or mark your first visit to get started.',
          cta: 'Browse destinations',
          route: '/'
        };
      case 'city-explorer':
        return {
          title: 'Explore the World',
          description: 'Visit different cities and countries to unlock exploration achievements.',
          cta: 'Discover cities',
          route: '/cities'
        };
      case 'michelin':
        return {
          title: 'Fine Dining Awaits',
          description: 'Visit Michelin-starred restaurants to unlock culinary achievements.',
          cta: 'Find Michelin restaurants',
          route: '/?michelin=true'
        };
      case 'specialists':
        return {
          title: 'Become a Specialist',
          description: 'Deep dive into a city or category to earn specialist badges.',
          cta: 'Explore destinations',
          route: '/'
        };
      default:
        return {
          title: 'Start Exploring',
          description: 'Visit places to unlock achievements.',
          cta: 'Browse destinations',
          route: '/'
        };
    }
  };

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Manifesto Block */}
      <div className="space-y-6">
        <h2 className="text-4xl md:text-5xl font-light leading-tight">
          Your Achievements
        </h2>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
          Track your journey through the world's best destinations. Each milestone tells a story of discovery, from your first saved place to becoming a city specialist.
        </p>
        <div className="flex items-center gap-6 pt-4">
          <div>
            <div className="text-3xl md:text-4xl font-light mb-1">{unlockedCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
              Unlocked
            </div>
          </div>
          <div className="h-12 w-px bg-gray-200 dark:bg-gray-800" />
          <div>
            <div className="text-3xl md:text-4xl font-light mb-1">{totalCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
              Total
            </div>
          </div>
        </div>
      </div>

      {/* Themed Sections */}
      {Object.entries(groupedAchievements).map(([theme, themeAchievements]) => {
        if (themeAchievements.length === 0) return null;

        const unlocked = themeAchievements.filter(a => a.unlocked);
        const locked = themeAchievements.filter(a => !a.unlocked);
        const emptyState = getEmptyStateMessage(theme);

        const themeConfig = {
          'first-steps': { title: 'First Steps', icon: Sparkles, color: 'from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10' },
          'city-explorer': { title: 'City Explorer', icon: MapPin, color: 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10' },
          'michelin': { title: 'Michelin', icon: Award, color: 'from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10' },
          'specialists': { title: 'Specialists', icon: Heart, color: 'from-gray-50 to-gray-100 dark:from-gray-900/10 dark:to-gray-800/10' }
        }[theme] || { title: theme, icon: Award, color: '' };

        const IconComponent = themeConfig.icon;

        return (
          <div key={theme} className="space-y-8">
            {/* Section Header */}
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${themeConfig.color} border border-gray-100 dark:border-gray-800`}>
                <IconComponent className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-light mb-1">{themeConfig.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {unlocked.length} of {themeAchievements.length} unlocked
                </p>
              </div>
            </div>

            {/* Achievements Grid/Timeline */}
            {themeAchievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {themeAchievements.map((achievement) => {
                  const isUnlocked = achievement.unlocked;
                  const progressText = getProgressText(achievement);
                  const progressPercent = achievement.progress !== undefined && achievement.total !== undefined
                    ? Math.min(100, (achievement.progress / achievement.total) * 100)
                    : 0;

                  return (
                    <div
                      key={achievement.id}
                      className={`relative p-6 rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-75'
                      }`}
                    >
                      {/* Unlocked accent */}
                      {isUnlocked && (
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-100/50 to-orange-100/50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-bl-full" />
                      )}

                      <div className="relative">
                        {/* Emoji/Icon */}
                        <div className={`text-4xl mb-4 ${!isUnlocked ? 'grayscale opacity-50' : ''}`}>
                          {achievement.emoji}
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                          <div>
                            <h4 className={`text-base font-medium mb-1 ${isUnlocked ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                              {achievement.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              {achievement.description}
                            </p>
                          </div>

                          {/* Progress */}
                          {!isUnlocked && achievement.progress !== undefined && achievement.total !== undefined && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-500">{progressText}</span>
                                <span className="text-gray-400 dark:text-gray-600">
                                  {achievement.progress} / {achievement.total}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-black dark:bg-white h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* CTA */}
                          {achievement.ctaRoute && achievement.ctaLabel && (
                            <button
                              onClick={() => router.push(achievement.ctaRoute!)}
                              className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                                isUnlocked
                                  ? 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                                  : 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                              }`}
                            >
                              <span>{achievement.ctaLabel}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State for Theme */
              <div className="p-12 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-center">
                <div className="text-4xl mb-4 opacity-50">
                  <IconComponent className="h-12 w-12 mx-auto text-gray-400" />
                </div>
                <h4 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">{emptyState.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 max-w-md mx-auto">
                  {emptyState.description}
                </p>
                <button
                  onClick={() => router.push(emptyState.route)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg transition-colors"
                >
                  <span>{emptyState.cta}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
