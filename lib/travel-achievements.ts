/**
 * Travel Achievement System
 * Gamification utilities for user travel accomplishments
 */

export interface TravelBadge {
  id: string;
  name: string;
  minPlaces: number;
  maxPlaces: number | null;
}

export interface MilestoneProgress {
  current: number;
  target: number;
  percentage: number;
  remaining: number;
  badge: TravelBadge;
  nextBadge: TravelBadge | null;
}

// Badge definitions ordered by minPlaces
export const TRAVEL_BADGES: TravelBadge[] = [
  {
    id: 'newcomer',
    name: 'Newcomer',
    minPlaces: 0,
    maxPlaces: 10,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    minPlaces: 11,
    maxPlaces: 25,
  },
  {
    id: 'adventurer',
    name: 'Adventurer',
    minPlaces: 26,
    maxPlaces: 50,
  },
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    minPlaces: 51,
    maxPlaces: 100,
  },
  {
    id: 'world-traveler',
    name: 'World Traveler',
    minPlaces: 101,
    maxPlaces: null,
  },
];

// Milestone thresholds for progress tracking
export const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300, 500];

/**
 * Get the badge for a given number of visited places
 */
export function getTravelBadge(visitedCount: number): TravelBadge {
  // Find the badge where visitedCount is within range
  for (let i = TRAVEL_BADGES.length - 1; i >= 0; i--) {
    const badge = TRAVEL_BADGES[i];
    if (visitedCount >= badge.minPlaces) {
      return badge;
    }
  }
  return TRAVEL_BADGES[0];
}

/**
 * Get the next badge after the current one
 */
export function getNextBadge(currentBadge: TravelBadge): TravelBadge | null {
  const currentIndex = TRAVEL_BADGES.findIndex(b => b.id === currentBadge.id);
  if (currentIndex < TRAVEL_BADGES.length - 1) {
    return TRAVEL_BADGES[currentIndex + 1];
  }
  return null;
}

/**
 * Get the next milestone target based on current count
 */
export function getNextMilestone(visitedCount: number): number {
  for (const milestone of MILESTONES) {
    if (visitedCount < milestone) {
      return milestone;
    }
  }
  // If beyond all milestones, return the next 100 milestone
  return Math.ceil((visitedCount + 1) / 100) * 100;
}

/**
 * Calculate milestone progress including percentage and remaining
 */
export function getMilestoneProgress(visitedCount: number): MilestoneProgress {
  const currentBadge = getTravelBadge(visitedCount);
  const nextBadge = getNextBadge(currentBadge);
  const target = getNextMilestone(visitedCount);

  // Calculate progress percentage towards next milestone
  const previousMilestone = MILESTONES.find((m, i) =>
    i > 0 && MILESTONES[i - 1] < visitedCount && m >= visitedCount
  ) ? MILESTONES[MILESTONES.findIndex(m => m >= visitedCount) - 1] || 0 : 0;

  const progressRange = target - previousMilestone;
  const currentProgress = visitedCount - previousMilestone;
  const percentage = Math.min(Math.round((currentProgress / progressRange) * 100), 100);

  return {
    current: visitedCount,
    target,
    percentage,
    remaining: target - visitedCount,
    badge: currentBadge,
    nextBadge,
  };
}

/**
 * Get a motivational message based on progress
 */
export function getMilestoneMessage(progress: MilestoneProgress): string {
  const { remaining, target, nextBadge } = progress;

  if (remaining <= 5) {
    return `Almost there! ${remaining} more to reach ${target}`;
  }

  if (nextBadge && target === nextBadge.minPlaces) {
    return `${remaining} more to become ${nextBadge.name}`;
  }

  return `${remaining} more to reach ${target} places`;
}
