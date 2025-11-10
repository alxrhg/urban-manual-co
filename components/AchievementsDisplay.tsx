'use client';

import { useMemo } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
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
        total: 1
      },
      {
        id: 'first-visit',
        name: 'First Adventure',
        description: 'Marked your first visit',
        emoji: '👣',
        unlocked: visitedPlaces.length >= 1,
        progress: Math.min(visitedPlaces.length, 1),
        total: 1
      },

      // City Explorer
      {
        id: 'city-5',
        name: 'City Explorer',
        description: 'Visited 5 different cities',
        emoji: '🗺️',
        unlocked: uniqueCities.size >= 5,
        progress: uniqueCities.size,
        total: 5
      },
      {
        id: 'city-10',
        name: 'World Traveler',
        description: 'Visited 10 different cities',
        emoji: '✈️',
        unlocked: uniqueCities.size >= 10,
        progress: uniqueCities.size,
        total: 10
      },
      {
        id: 'country-5',
        name: 'Globe Trotter',
        description: 'Visited 5 different countries',
        emoji: '🌍',
        unlocked: uniqueCountries.size >= 5,
        progress: uniqueCountries.size,
        total: 5
      },

      // Visit Milestones
      {
        id: 'visit-10',
        name: 'Explorer',
        description: 'Visited 10 places',
        emoji: '🧭',
        unlocked: visitedPlaces.length >= 10,
        progress: visitedPlaces.length,
        total: 10
      },
      {
        id: 'visit-25',
        name: 'Adventurer',
        description: 'Visited 25 places',
        emoji: '🏔️',
        unlocked: visitedPlaces.length >= 25,
        progress: visitedPlaces.length,
        total: 25
      },
      {
        id: 'visit-50',
        name: 'Veteran Traveler',
        description: 'Visited 50 places',
        emoji: '🏆',
        unlocked: visitedPlaces.length >= 50,
        progress: visitedPlaces.length,
        total: 50
      },
      {
        id: 'visit-100',
        name: 'Legend',
        description: 'Visited 100 places',
        emoji: '👑',
        unlocked: visitedPlaces.length >= 100,
        progress: visitedPlaces.length,
        total: 100
      },

      // Michelin Stars
      {
        id: 'michelin-1',
        name: 'Fine Dining Initiate',
        description: 'Visited 1 Michelin-starred restaurant',
        emoji: '⭐',
        unlocked: michelinCount >= 1,
        progress: michelinCount,
        total: 1
      },
      {
        id: 'michelin-5',
        name: 'Michelin Enthusiast',
        description: 'Visited 5 Michelin-starred restaurants',
        emoji: '🌟',
        unlocked: michelinCount >= 5,
        progress: michelinCount,
        total: 5
      },
      {
        id: 'michelin-10',
        name: 'Michelin Connoisseur',
        description: 'Visited 10 Michelin-starred restaurants',
        emoji: '💫',
        unlocked: michelinCount >= 10,
        progress: michelinCount,
        total: 10
      },

      // City Master (20+ visits in one city)
      ...(maxCityVisits >= 20 && topCity ? [{
        id: `city-master-${topCity}`,
        name: `${topCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Master`,
        description: `Visited 20+ places in ${topCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
        emoji: '🏙️',
        unlocked: true
      }] : []),

      // Category Specialist (10+ in one category)
      ...Object.entries(categoryCounts)
        .filter(([_, count]) => count >= 10)
        .map(([category, count]) => ({
          id: `category-${category}`,
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} Specialist`,
          description: `Visited 10+ ${category} places`,
          emoji: category === 'restaurant' ? '🍽️' : category === 'bar' ? '🍸' : category === 'cafe' ? '☕' : '🏛️',
          unlocked: true
        }))
    ];
  }, [visitedPlaces, savedPlaces, uniqueCities, uniqueCountries]);

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="text-center pb-6 border-b border-gray-200 dark:border-dark-blue-600">
        <div className="text-3xl font-light mb-2">{unlockedAchievements.length}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {unlockedAchievements.length} of {achievements.length} achievements unlocked
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Unlocked</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlockedAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="p-4 border border-gray-200 dark:border-dark-blue-600 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10"
              >
                <div className="text-3xl mb-2">{achievement.emoji}</div>
                <h4 className="text-xs font-medium mb-1">{achievement.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {achievement.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Locked</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lockedAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="p-4 border border-gray-200 dark:border-dark-blue-600 rounded-2xl opacity-50"
              >
                <div className="text-3xl mb-2 grayscale">{achievement.emoji}</div>
                <h4 className="text-xs font-medium mb-1">{achievement.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {achievement.description}
                </p>
                {achievement.progress !== undefined && achievement.total !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-dark-blue-800 rounded-full h-1.5 mb-1">
                      <div
                        className="bg-black dark:bg-white h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (achievement.progress / achievement.total) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400">
                      {achievement.progress} / {achievement.total}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unlockedAchievements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-sm text-gray-500">No achievements yet</p>
          <p className="text-xs text-gray-400 mt-2">Start visiting places to unlock achievements!</p>
        </div>
      )}
    </div>
  );
}
