'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

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

  const themeLabels: Record<string, string> = {
    'first-steps': 'First Steps',
    'city-explorer': 'Exploration',
    'michelin': 'Fine Dining',
    'specialists': 'Specialist'
  };

  return (
    <div>
      {/* Header Stats */}
      <div className="pb-8 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-light">{unlockedCount}</span>
          <span className="text-sm text-gray-500">of {totalCount} unlocked</span>
        </div>
        <p className="text-xs text-gray-400">
          Track your journey through the world&apos;s best destinations
        </p>
      </div>

      {/* Achievement Sections */}
      {Object.entries(groupedAchievements).map(([theme, themeAchievements]) => {
        if (themeAchievements.length === 0) return null;

        const unlockedInTheme = themeAchievements.filter(a => a.unlocked).length;

        return (
          <div key={theme} className="py-8 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium">{themeLabels[theme]}</h3>
              <span className="text-xs text-gray-400">
                {unlockedInTheme}/{themeAchievements.length}
              </span>
            </div>

            {/* Achievement List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {themeAchievements.map((achievement) => {
                const isUnlocked = achievement.unlocked;
                const progressPercent = achievement.progress !== undefined && achievement.total !== undefined
                  ? Math.min(100, (achievement.progress / achievement.total) * 100)
                  : 0;

                return (
                  <div
                    key={achievement.id}
                    className={`py-4 flex items-start gap-4 ${!isUnlocked ? 'opacity-50' : ''}`}
                  >
                    {/* Emoji */}
                    <span className={`text-2xl ${!isUnlocked ? 'grayscale' : ''}`}>
                      {achievement.emoji}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{achievement.name}</span>
                        {isUnlocked && (
                          <span className="text-xs text-gray-400">Unlocked</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{achievement.description}</p>

                      {/* Progress bar for locked achievements */}
                      {!isUnlocked && achievement.progress !== undefined && achievement.total !== undefined && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-black dark:bg-white transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums">
                            {achievement.progress}/{achievement.total}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CTA for locked achievements */}
                    {!isUnlocked && achievement.ctaRoute && (
                      <button
                        onClick={() => router.push(achievement.ctaRoute!)}
                        className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
                      >
                        {achievement.ctaLabel}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
