/**
 * Context-Aware Greeting System
 * Generates personalized greetings based on user profile, session history, and context
 */

import { getSeasonalContext } from '@/services/seasonality';
import { UserProfile } from '@/types/personalization';

export interface GreetingContext {
  userName?: string;
  userProfile?: UserProfile | null;
  lastSession?: {
    id: string;
    last_activity: string;
    context_summary?: {
      city?: string;
      category?: string;
      preferences?: string[];
      lastQuery?: string;
    };
  } | null;
  currentHour?: number;
  currentDay?: number; // 0-6 (Sunday-Saturday)
}

export interface GreetingResult {
  greeting: string;
  subtext?: string;
  type: 'basic' | 'returning' | 'favorite_city' | 'seasonal' | 'time_activity' | 'day_of_week';
}

/**
 * Get time-based greeting
 */
function getTimeGreeting(hour: number = new Date().getHours()): string {
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

/**
 * Get time-appropriate activity suggestion
 */
function getTimeActivity(hour: number): string | null {
  if (hour >= 6 && hour < 11) return 'Looking for breakfast spots?';
  if (hour >= 11 && hour < 14) return 'Lunch plans sorted?';
  if (hour >= 17 && hour < 21) return 'Dinner reservations needed?';
  if (hour >= 21 || hour < 2) return 'Late-night eats or cocktail bars?';
  return null;
}

/**
 * Get day-of-week context
 */
function getDayContext(day: number): string | null {
  switch (day) {
    case 1: return 'New week, new spots to discover!';
    case 5: return 'Weekend plans needed?';
    case 0: return 'Lazy Sunday brunch vibes?';
    default: return null;
  }
}

/**
 * Check if session is recent (within 24 hours)
 */
function isRecentSession(lastActivity: string): boolean {
  const lastActivityDate = new Date(lastActivity);
  const now = new Date();
  const diffHours = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

/**
 * Format time since last visit
 */
function getTimeSinceVisit(lastActivity: string): string {
  const lastActivityDate = new Date(lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - lastActivityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return 'a few minutes';
  if (diffHours < 2) return 'an hour';
  if (diffHours < 24) return `${diffHours} hours`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return 'a week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
  return 'a while';
}

/**
 * Generate context-aware greeting
 */
export function generateContextualGreeting(context: GreetingContext): GreetingResult {
  const hour = context.currentHour ?? new Date().getHours();
  const day = context.currentDay ?? new Date().getDay();
  const baseGreeting = getTimeGreeting(hour);
  const userNamePart = context.userName ? `, ${context.userName}` : '';

  // Priority 1: Returning user recognition (sessions < 24h)
  if (context.lastSession && isRecentSession(context.lastSession.last_activity)) {
    const summary = context.lastSession.context_summary;

    // If there's a specific last query
    if (summary?.lastQuery) {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: `Still exploring ${summary.lastQuery.toLowerCase()}?`,
        type: 'returning',
      };
    }

    // If there's a city in context
    if (summary?.city) {
      const category = summary.category ? ` ${summary.category.toLowerCase()}` : '';
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: `Ready to continue planning your ${summary.city}${category} adventure?`,
        type: 'returning',
      };
    }

    // Generic returning user
    const timeSince = getTimeSinceVisit(context.lastSession.last_activity);
    if (timeSince === 'a few minutes') {
      return {
        greeting: `${baseGreeting}${userNamePart}`,
        subtext: 'Still here! Need more options?',
        type: 'returning',
      };
    }
  }

  // Priority 2: Returning user after days
  if (context.lastSession && !isRecentSession(context.lastSession.last_activity)) {
    const timeSince = getTimeSinceVisit(context.lastSession.last_activity);
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: `Welcome back! It's been ${timeSince}. Ready for new discoveries?`,
      type: 'returning',
    };
  }

  // Priority 3: Seasonal event awareness (if user has favorite city)
  if (context.userProfile?.favorite_cities && context.userProfile.favorite_cities.length > 0) {
    const favoriteCity = context.userProfile.favorite_cities[0];
    const seasonalInfo = getSeasonalContext(favoriteCity);

    if (seasonalInfo) {
      // Check if it's an active event or upcoming
      const now = new Date();
      const isActive = now >= seasonalInfo.start && now <= seasonalInfo.end;

      if (isActive) {
        return {
          greeting: `${baseGreeting}${userNamePart}`,
          subtext: `${seasonalInfo.event} is happening now in ${favoriteCity}! Planning a visit?`,
          type: 'seasonal',
        };
      } else {
        // For upcoming events within 60 days
        const daysUntil = Math.ceil((seasonalInfo.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 60) {
          return {
            greeting: `${baseGreeting}${userNamePart}`,
            subtext: `${seasonalInfo.event} in ${favoriteCity} is ${daysUntil} days away. Time to plan?`,
            type: 'seasonal',
          };
        }
      }
    }

    // Priority 4: Favorite city greeting (no seasonal event)
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: `Want to discover more hidden gems in ${favoriteCity}?`,
      type: 'favorite_city',
    };
  }

  // Priority 5: Time-appropriate activity suggestions
  const timeActivity = getTimeActivity(hour);
  if (timeActivity) {
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: timeActivity,
      type: 'time_activity',
    };
  }

  // Priority 6: Day-of-week context
  const dayContext = getDayContext(day);
  if (dayContext) {
    return {
      greeting: `${baseGreeting}${userNamePart}`,
      subtext: dayContext,
      type: 'day_of_week',
    };
  }

  // Fallback: Basic greeting with generic prompt
  return {
    greeting: `${baseGreeting}${userNamePart}`,
    subtext: 'What are you craving today?',
    type: 'basic',
  };
}

/**
 * Generate context-aware placeholder text for search input
 */
export function generateContextualPlaceholder(context: GreetingContext): string {
  const hour = context.currentHour ?? new Date().getHours();

  // If returning user with context
  if (context.lastSession?.context_summary) {
    const summary = context.lastSession.context_summary;

    if (summary.city && summary.category) {
      return `More ${summary.category.toLowerCase()} in ${summary.city}...`;
    }

    if (summary.city) {
      return `What else in ${summary.city}?`;
    }

    if (summary.category) {
      return `More ${summary.category.toLowerCase()} spots...`;
    }
  }

  // If user has favorite city
  if (context.userProfile?.favorite_cities && context.userProfile.favorite_cities.length > 0) {
    const favoriteCity = context.userProfile.favorite_cities[0];

    // Check for seasonal events
    const seasonalInfo = getSeasonalContext(favoriteCity);
    if (seasonalInfo) {
      return `${seasonalInfo.event} experiences in ${favoriteCity}...`;
    }

    return `Hidden gems in ${favoriteCity}...`;
  }

  // Time-based suggestions
  if (hour >= 6 && hour < 11) {
    return 'Breakfast croissants in...';
  }
  if (hour >= 11 && hour < 14) {
    return 'Best lunch spots in...';
  }
  if (hour >= 17 && hour < 21) {
    return 'Romantic dinner in...';
  }
  if (hour >= 21 || hour < 2) {
    return 'Late-night cocktail bars...';
  }

  // Generic fallback
  return 'Ask me anything about travel';
}
