'use client';

import { useState, useCallback, useEffect, memo, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Star,
  Bookmark,
  Share2,
  Navigation,
  ExternalLink,
  Clock,
  Phone,
  Globe,
  Building2,
  ChevronRight,
  Check,
  Plus,
  Loader2,
  Edit,
  Utensils,
  Coffee,
  Wine,
  Mountain,
  Sparkles,
  Users,
  Heart,
  Camera,
  Palette,
  TreePine,
  ShoppingBag,
  Bed,
  Award,
  BadgeCheck,
  CalendarDays,
  Info,
  Copy,
  Mail,
  MessageCircle,
  Twitter,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { CITY_TIMEZONES } from '@/lib/constants';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/ui/sonner';

// ============================================
// SMART CATEGORY DETECTION
// ============================================

type CategoryType = 'dining' | 'hotel' | 'culture' | 'nightlife' | 'shopping' | 'outdoor' | 'architecture' | 'general';

function getCategoryType(category?: string): CategoryType {
  if (!category) return 'general';
  const c = category.toLowerCase();

  // Dining: restaurants, cafes, bakeries, food
  if (c.includes('restaurant') || c.includes('cafe') || c.includes('coffee') ||
      c.includes('bakery') || c.includes('food') || c.includes('dining') ||
      c.includes('bistro') || c.includes('eatery') || c.includes('pizzeria') ||
      c.includes('sushi') || c.includes('ramen') || c.includes('brunch')) {
    return 'dining';
  }

  // Hotels & Stays
  if (c.includes('hotel') || c.includes('hostel') || c.includes('resort') ||
      c.includes('ryokan') || c.includes('inn') || c.includes('lodge') ||
      c.includes('stay') || c.includes('accommodation')) {
    return 'hotel';
  }

  // Culture: museums, galleries, temples, landmarks
  if (c.includes('museum') || c.includes('gallery') || c.includes('temple') ||
      c.includes('shrine') || c.includes('church') || c.includes('landmark') ||
      c.includes('monument') || c.includes('historic') || c.includes('palace')) {
    return 'culture';
  }

  // Nightlife: bars, clubs
  if (c.includes('bar') || c.includes('club') || c.includes('cocktail') ||
      c.includes('pub') || c.includes('lounge') || c.includes('speakeasy') ||
      c.includes('wine') || c.includes('sake')) {
    return 'nightlife';
  }

  // Shopping
  if (c.includes('shop') || c.includes('store') || c.includes('market') ||
      c.includes('boutique') || c.includes('mall') || c.includes('retail')) {
    return 'shopping';
  }

  // Outdoor: parks, gardens, nature
  if (c.includes('park') || c.includes('garden') || c.includes('nature') ||
      c.includes('beach') || c.includes('trail') || c.includes('outdoor')) {
    return 'outdoor';
  }

  // Architecture
  if (c.includes('architecture') || c.includes('building') || c.includes('tower') ||
      c.includes('bridge') || c.includes('structure')) {
    return 'architecture';
  }

  return 'general';
}

// ============================================
// LOCAL TIME HELPER
// ============================================

/**
 * Get local time at destination for context
 * Returns formatted time string like "10:30 AM local"
 * Uses timezone_id or city timezone mapping for accuracy
 */
function getLocalTimeAtDestination(
  utcOffsetMinutes: number | null | undefined,
  city?: string | null,
  timezoneId?: string | null
): string | null {
  const now = new Date();

  // Best: Use timezone_id (handles DST automatically)
  if (timezoneId) {
    try {
      return now.toLocaleTimeString('en-US', {
        timeZone: timezoneId,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      // Invalid timezone, fall through
    }
  }

  // Good: Use city timezone mapping
  if (city) {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-');
    const cityTimezone = CITY_TIMEZONES[cityKey];
    if (cityTimezone) {
      try {
        return now.toLocaleTimeString('en-US', {
          timeZone: cityTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        // Invalid timezone, fall through
      }
    }
  }

  // Okay: Use UTC offset (static, doesn't handle DST)
  if (utcOffsetMinutes != null) {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    return `${hour12}:${minuteStr} ${ampm}`;
  }

  return null;
}

/**
 * Get destination local hour and day of week
 * Uses timezone_id, city timezone mapping, or utc_offset for accuracy
 * Falls back to UTC (not user's local time) if no timezone info available
 */
function getDestinationLocalTime(
  utcOffsetMinutes: number | null | undefined,
  city?: string | null,
  timezoneId?: string | null
): { hour: number; dayOfWeek: number; isWeekend: boolean } {
  const now = new Date();

  // Best: Use timezone_id (handles DST automatically)
  if (timezoneId) {
    try {
      const localString = now.toLocaleString('en-US', { timeZone: timezoneId });
      const localTime = new Date(localString);
      const hour = localTime.getHours();
      const dayOfWeek = localTime.getDay();
      return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
    } catch {
      // Invalid timezone, fall through
    }
  }

  // Good: Use city timezone mapping
  if (city) {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-');
    const cityTimezone = CITY_TIMEZONES[cityKey];
    if (cityTimezone) {
      try {
        const localString = now.toLocaleString('en-US', { timeZone: cityTimezone });
        const localTime = new Date(localString);
        const hour = localTime.getHours();
        const dayOfWeek = localTime.getDay();
        return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
      } catch {
        // Invalid timezone, fall through
      }
    }
  }

  // Okay: Use UTC offset (static, doesn't handle DST)
  if (utcOffsetMinutes != null) {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
    const hour = localTime.getHours();
    const dayOfWeek = localTime.getDay();
    return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
  }

  // Fallback: Use UTC (not user's local time for consistency)
  const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const utcTime = new Date(utcString);
  const hour = utcTime.getHours();
  const dayOfWeek = utcTime.getDay();
  return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
}

// ============================================
// SUBTLE INTELLIGENCE - Works automatically
// ============================================

interface SubtleContext {
  timeSignal?: string;      // "Perfect for dinner right now"
  priceSignal?: string;     // "Above average for the area"
  availabilityHint?: string; // "Usually busy on weekends"
  proximityHint?: string;   // "5 min walk" (if we have location)
  mealContext?: 'breakfast' | 'lunch' | 'dinner' | 'late-night' | null;
  urgencyLevel?: 'low' | 'medium' | 'high';
}

/**
 * Analyze context subtly based on time, category, and data
 * No user interaction required - just works
 * Uses destination's local time based on city timezone or utcOffsetMinutes
 */
function getSubtleContext(
  categoryType: CategoryType,
  priceLevel?: number,
  rating?: number,
  reviewCount?: number,
  isOpen?: boolean | null,
  utcOffsetMinutes?: number | null,
  city?: string | null
): SubtleContext {
  // Use destination's local time, not user's
  const { hour, isWeekend } = getDestinationLocalTime(utcOffsetMinutes, city);
  const context: SubtleContext = {};

  // Determine meal context based on time
  if (hour >= 6 && hour < 11) context.mealContext = 'breakfast';
  else if (hour >= 11 && hour < 15) context.mealContext = 'lunch';
  else if (hour >= 17 && hour < 22) context.mealContext = 'dinner';
  else if (hour >= 22 || hour < 4) context.mealContext = 'late-night';

  // Time-aware signals for dining
  if (categoryType === 'dining') {
    if (context.mealContext === 'dinner' && isOpen) {
      context.timeSignal = 'Great timing for dinner';
    } else if (context.mealContext === 'lunch' && isOpen) {
      context.timeSignal = 'Good for lunch';
    } else if (context.mealContext === 'breakfast' && isOpen) {
      context.timeSignal = 'Open for breakfast';
    }

    // Availability hints based on rating/reviews
    if (reviewCount && reviewCount > 500 && rating && rating >= 4.5) {
      context.availabilityHint = 'Popular spot';
      context.urgencyLevel = 'high';
    } else if (reviewCount && reviewCount > 200) {
      context.availabilityHint = isWeekend ? 'Busy on weekends' : undefined;
    }
  }

  // Nightlife time signals
  if (categoryType === 'nightlife') {
    if (hour >= 17 && hour < 20) {
      context.timeSignal = 'Happy hour';
    } else if (hour >= 21 && hour < 24) {
      context.timeSignal = 'Prime time';
    } else if (hour >= 0 && hour < 3) {
      context.timeSignal = 'Late night';
    }
  }

  // Culture/museum signals
  if (categoryType === 'culture') {
    if (hour >= 9 && hour < 11 && !isWeekend) {
      context.timeSignal = 'Quiet hours';
    } else if (isWeekend && hour >= 11 && hour < 16) {
      context.availabilityHint = 'Peak visitor hours';
    }
  }

  // Price context (subtle, relative)
  if (priceLevel) {
    if (priceLevel >= 4) {
      context.priceSignal = 'Splurge-worthy';
    } else if (priceLevel === 1) {
      context.priceSignal = 'Budget-friendly';
    }
    // Don't show anything for average prices - that's the default expectation
  }

  return context;
}

/**
 * Get a subtle recommendation reason based on context
 * Returns null if nothing notable - silence is golden
 */
function getSubtleRecommendation(
  categoryType: CategoryType,
  destination: Destination,
  userVisitedCount?: number,
  hasArchitect?: boolean
): string | null {
  // Only show if there's something genuinely notable
  if (destination.michelin_stars && destination.michelin_stars > 0) {
    return null; // Michelin badge already shows this
  }

  if (destination.crown) {
    return 'Editor\'s pick';
  }

  if (hasArchitect && categoryType === 'architecture') {
    return null; // Architecture section already highlights this
  }

  if (userVisitedCount && userVisitedCount >= 5 && categoryType === 'dining') {
    return 'Matches your taste';
  }

  return null;
}

// ============================================
// KEY HIGHLIGHTS - Visual feature badges
// ============================================

interface HighlightBadge {
  icon: React.ReactNode;
  label: string;
  color: 'gray' | 'blue' | 'green' | 'amber' | 'purple' | 'rose';
}

/**
 * Generate key highlight badges based on destination data
 * Shows atmosphere, features, and vibe at a glance
 */
function getKeyHighlights(
  destination: Destination,
  categoryType: CategoryType,
  priceLevel?: number | null,
  hasArchitect?: boolean,
  michelin?: number
): HighlightBadge[] {
  const highlights: HighlightBadge[] = [];
  const IconClass = "w-3 h-3";

  // Category-based highlights
  if (categoryType === 'dining') {
    highlights.push({ icon: <Utensils className={IconClass} />, label: 'Dining', color: 'gray' });
    if (michelin && michelin > 0) {
      highlights.push({ icon: <Star className={IconClass} />, label: `${michelin} Michelin Star${michelin > 1 ? 's' : ''}`, color: 'amber' });
    }
  } else if (categoryType === 'nightlife') {
    highlights.push({ icon: <Wine className={IconClass} />, label: 'Cocktails', color: 'purple' });
  } else if (categoryType === 'hotel') {
    highlights.push({ icon: <Bed className={IconClass} />, label: 'Accommodation', color: 'blue' });
  } else if (categoryType === 'culture') {
    highlights.push({ icon: <Palette className={IconClass} />, label: 'Culture', color: 'rose' });
  } else if (categoryType === 'shopping') {
    highlights.push({ icon: <ShoppingBag className={IconClass} />, label: 'Shopping', color: 'green' });
  } else if (categoryType === 'outdoor') {
    highlights.push({ icon: <TreePine className={IconClass} />, label: 'Outdoor', color: 'green' });
  }

  // Architecture highlight
  if (hasArchitect) {
    highlights.push({ icon: <Building2 className={IconClass} />, label: 'Notable Design', color: 'blue' });
  }

  // Price level highlights
  if (priceLevel) {
    if (priceLevel >= 4) {
      highlights.push({ icon: <Sparkles className={IconClass} />, label: 'Luxury', color: 'amber' });
    } else if (priceLevel === 1) {
      highlights.push({ icon: <Heart className={IconClass} />, label: 'Great Value', color: 'green' });
    }
  }

  // Crown / Editor's pick
  if (destination.crown) {
    highlights.push({ icon: <Award className={IconClass} />, label: "Editor's Pick", color: 'amber' });
  }

  // Parse tags if available
  if (destination.tags && Array.isArray(destination.tags)) {
    const tagMappings: Record<string, { icon: React.ReactNode; color: HighlightBadge['color'] }> = {
      'family-friendly': { icon: <Users className={IconClass} />, color: 'blue' },
      'romantic': { icon: <Heart className={IconClass} />, color: 'rose' },
      'scenic': { icon: <Mountain className={IconClass} />, color: 'green' },
      'photogenic': { icon: <Camera className={IconClass} />, color: 'purple' },
      'cozy': { icon: <Coffee className={IconClass} />, color: 'amber' },
    };

    destination.tags.slice(0, 3).forEach(tag => {
      const mapping = tagMappings[tag.toLowerCase()];
      if (mapping) {
        highlights.push({ icon: mapping.icon, label: tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' '), color: mapping.color });
      }
    });
  }

  // Limit to 5 highlights
  return highlights.slice(0, 5);
}

/**
 * Generate insider tips based on category and context
 */
function getInsiderTips(
  categoryType: CategoryType,
  destination: Destination,
  priceLevel?: number | null,
  rating?: number | null,
  reviewCount?: number | null
): string[] {
  const tips: string[] = [];

  // Category-based tips
  if (categoryType === 'dining') {
    if (priceLevel && priceLevel >= 3) {
      tips.push('Reservations recommended, especially weekends');
    }
    if (rating && rating >= 4.5 && reviewCount && reviewCount > 200) {
      tips.push('Popular spot - arrive early or book ahead');
    }
    if (destination.michelin_stars) {
      tips.push('Smart casual dress code typically expected');
    }
  } else if (categoryType === 'hotel') {
    tips.push('Book directly for best rate guarantee');
    if (priceLevel && priceLevel >= 4) {
      tips.push('Ask about complimentary upgrades at check-in');
    }
  } else if (categoryType === 'culture') {
    tips.push('Visit weekday mornings for fewer crowds');
    tips.push('Check for free admission days');
  } else if (categoryType === 'nightlife') {
    tips.push('Arrive before 10 PM to avoid lines');
    if (priceLevel && priceLevel >= 3) {
      tips.push('Smart casual dress code may apply');
    }
  } else if (categoryType === 'shopping') {
    tips.push('Ask about tax-free shopping for tourists');
  } else if (categoryType === 'outdoor') {
    tips.push('Best visited during golden hour for photos');
    tips.push('Check weather conditions before visiting');
  }

  // Architecture tips
  if (destination.architect || destination.architect_id) {
    tips.push('Take time to appreciate the architectural details');
  }

  return tips.slice(0, 3);
}

/**
 * Estimate visit duration based on category
 */
function getEstimatedDuration(categoryType: CategoryType): string {
  const durations: Record<CategoryType, string> = {
    dining: '1-2 hours',
    hotel: 'Overnight stay',
    culture: '1-3 hours',
    nightlife: '2-4 hours',
    shopping: '30 min - 2 hours',
    outdoor: '1-3 hours',
    architecture: '30 min - 1 hour',
    general: '1-2 hours',
  };
  return durations[categoryType];
}

/**
 * Get "best for" audience suggestions
 */
function getBestForAudience(
  categoryType: CategoryType,
  destination: Destination,
  priceLevel?: number | null
): string[] {
  const audiences: string[] = [];

  if (categoryType === 'dining') {
    if (priceLevel && priceLevel >= 4) {
      audiences.push('Special occasions', 'Date night');
    } else if (priceLevel && priceLevel <= 2) {
      audiences.push('Casual dining', 'Groups');
    } else {
      audiences.push('Foodies', 'Couples');
    }
  } else if (categoryType === 'hotel') {
    if (priceLevel && priceLevel >= 4) {
      audiences.push('Luxury travelers', 'Honeymooners');
    } else {
      audiences.push('Business travelers', 'Families');
    }
  } else if (categoryType === 'culture') {
    audiences.push('Art lovers', 'History buffs', 'Families');
  } else if (categoryType === 'nightlife') {
    audiences.push('Night owls', 'Cocktail enthusiasts');
  } else if (categoryType === 'outdoor') {
    audiences.push('Nature lovers', 'Photographers', 'Families');
  } else if (categoryType === 'architecture') {
    audiences.push('Design enthusiasts', 'Photographers');
  } else {
    audiences.push('Curious travelers');
  }

  return audiences.slice(0, 3);
}

// Section priority by category type (lower = higher priority)
const SECTION_PRIORITIES: Record<CategoryType, Record<string, number>> = {
  dining: {
    quickfacts: 1,   // Essential info at a glance
    booking: 2,      // Reservation options
    description: 3,
    insidertips: 4,  // Helpful tips
    reviews: 5,      // Social proof
    parent: 6,
    nested: 7,
    architecture: 8,
    map: 9,
    trip: 10,
    similar: 11,
    related: 12,
    share: 13,
  },
  hotel: {
    quickfacts: 1,   // Address/contact first for hotels
    booking: 2,      // Booking options
    description: 3,
    nested: 4,       // Show venues inside hotel
    insidertips: 5,
    reviews: 6,
    architecture: 7,
    map: 8,
    trip: 9,
    similar: 10,
    parent: 11,
    related: 12,
    share: 13,
  },
  culture: {
    description: 1,  // Story matters for museums
    quickfacts: 2,
    insidertips: 3,
    reviews: 4,
    architecture: 5,
    nested: 6,
    parent: 7,
    map: 8,
    trip: 9,
    similar: 10,
    related: 11,
    share: 12,
    booking: 13,
  },
  nightlife: {
    quickfacts: 1,   // When it's open matters
    description: 2,
    insidertips: 3,
    reviews: 4,
    architecture: 5,
    map: 6,
    trip: 7,
    similar: 8,
    parent: 9,
    nested: 10,
    related: 11,
    share: 12,
    booking: 13,
  },
  architecture: {
    architecture: 1, // Architect info is primary
    description: 2,
    quickfacts: 3,
    insidertips: 4,
    reviews: 5,
    nested: 6,
    parent: 7,
    map: 8,
    trip: 9,
    similar: 10,
    related: 11,
    share: 12,
    booking: 13,
  },
  shopping: {
    quickfacts: 1,
    description: 2,
    insidertips: 3,
    reviews: 4,
    map: 5,
    trip: 6,
    similar: 7,
    architecture: 8,
    parent: 9,
    nested: 10,
    related: 11,
    share: 12,
    booking: 13,
  },
  outdoor: {
    description: 1,
    quickfacts: 2,
    insidertips: 3,
    map: 4,          // Location matters for outdoor
    reviews: 5,
    trip: 6,
    similar: 7,
    architecture: 8,
    parent: 9,
    nested: 10,
    related: 11,
    share: 12,
    booking: 13,
  },
  general: {
    description: 1,
    quickfacts: 2,
    insidertips: 3,
    reviews: 4,
    architecture: 5,
    nested: 6,
    parent: 7,
    map: 8,
    trip: 9,
    similar: 10,
    related: 11,
    share: 12,
    booking: 13,
  },
};

// Lazy load map
const GoogleStaticMap = dynamic(() => import('@/features/maps/components/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

// ============================================
// SKELETON COMPONENTS
// ============================================

const SkeletonPulse = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const SectionSkeleton = ({ type }: { type: string }) => {
  switch (type) {
    case 'description':
      return (
        <div className="mt-5 space-y-2">
          <SkeletonPulse className="h-4 w-full" />
          <SkeletonPulse className="h-4 w-5/6" />
          <SkeletonPulse className="h-4 w-4/6" />
        </div>
      );
    case 'quickfacts':
      return (
        <div className="mt-6 space-y-3">
          <SkeletonPulse className="h-3 w-24" />
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'architecture':
      return (
        <div className="mt-6 space-y-2">
          <SkeletonPulse className="h-3 w-32" />
          <div className="flex items-center gap-3 py-2">
            <SkeletonPulse className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <SkeletonPulse className="h-3 w-16" />
              <SkeletonPulse className="h-4 w-32" />
            </div>
          </div>
        </div>
      );
    case 'similar':
      return (
        <div className="mt-6">
          <SkeletonPulse className="h-3 w-24 mb-3" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-28">
                <SkeletonPulse className="aspect-square rounded-xl mb-2" />
                <SkeletonPulse className="h-3 w-20 mb-1" />
                <SkeletonPulse className="h-2.5 w-14" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="mt-6">
          <SkeletonPulse className="aspect-[2/1] rounded-xl" />
        </div>
      );
    case 'insidertips':
      return (
        <div className="mt-6">
          <SkeletonPulse className="h-3 w-24 mb-3" />
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
            <SkeletonPulse className="h-4 w-full" />
            <SkeletonPulse className="h-4 w-5/6" />
          </div>
        </div>
      );
    case 'reviews':
      return (
        <div className="mt-6 space-y-4">
          <SkeletonPulse className="h-3 w-24" />
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonPulse className="h-3 w-24" />
              <SkeletonPulse className="h-4 w-full" />
              <SkeletonPulse className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      );
    case 'booking':
      return (
        <div className="mt-6">
          <SkeletonPulse className="h-3 w-32 mb-3" />
          <SkeletonPulse className="h-12 w-full rounded-xl" />
        </div>
      );
    case 'share':
      return (
        <div className="mt-6">
          <SkeletonPulse className="h-3 w-24 mb-3" />
          <div className="flex gap-2">
            <SkeletonPulse className="h-11 flex-1 rounded-xl" />
            <SkeletonPulse className="h-11 w-11 rounded-xl" />
            <SkeletonPulse className="h-11 w-11 rounded-xl" />
            <SkeletonPulse className="h-11 w-11 rounded-xl" />
          </div>
        </div>
      );
    default:
      return (
        <div className="mt-6 space-y-2">
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-4 w-full" />
        </div>
      );
  }
};

type SourceContext = 'trip' | 'explore' | 'search' | 'similar' | 'general';

interface DestinationContentProps {
  destination: Destination;
  related?: Destination[];
  whyThis?: string;
  tripContext?: {
    day?: number;
    fit?: string;
  };
  /** Where the drawer was opened from - affects action priority */
  source?: SourceContext;
  onOpenRelated: (destination: Destination) => void;
  onShowSimilar: () => void;
  onShowWhyThis: () => void;
}

interface GoogleReview {
  author_name?: string;
  rating?: number;
  text?: string;
  relative_time_description?: string;
  time?: number;
}

interface EnrichedData {
  formatted_address?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { weekday_text?: string[] };
  utc_offset?: number | null; // Minutes offset from UTC for local time display
  architect_obj?: { id: string; name: string; slug: string; image_url?: string };
  interior_designer_obj?: { id: string; name: string; slug: string };
  design_firm_obj?: { id: string; name: string; slug: string };
  movement_obj?: { id: string; name: string; slug: string };
  architectural_style?: string;
  reviews?: GoogleReview[];
  architect_destination_count?: number;
}

/**
 * DestinationContent - Smart destination view with category-adaptive layout
 */
const DestinationContent = memo(function DestinationContent({
  destination,
  related = [],
  tripContext,
  source = 'general',
  onOpenRelated,
  onShowSimilar,
}: DestinationContentProps) {
  const { user } = useAuth();
  const { activeTrip, addToTrip, startTrip } = useTripBuilder();

  // Smart category detection
  const categoryType = getCategoryType(destination.category);
  const sectionPriorities = SECTION_PRIORITIES[categoryType];

  // Source-aware: if from trip planner, trip actions are more important
  const isFromTrip = source === 'trip' || !!tripContext?.day;

  // State
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [similarPlaces, setSimilarPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Progressive reveal state
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  // AI summary state
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userRelatedContext, setUserRelatedContext] = useState<string | null>(null);

  // Admin edit mode state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Auto-suggest parent based on address
  const [suggestedParent, setSuggestedParent] = useState<Destination | null>(null);
  const [editForm, setEditForm] = useState({
    name: destination.name || '',
    city: destination.city || '',
    country: destination.country || '',
    category: destination.category || '',
    micro_description: destination.micro_description || '',
    description: destination.description || '',
    image: destination.image || '',
    formatted_address: '',
    international_phone_number: '',
    website: destination.website || '',
    latitude: destination.latitude?.toString() || '',
    longitude: destination.longitude?.toString() || '',
    price_level: destination.price_level?.toString() || '',
    rating: destination.rating?.toString() || '',
    michelin_stars: destination.michelin_stars?.toString() || '',
    brand: destination.brand || '',
  });

  // Update form when destination or enrichedData changes
  useEffect(() => {
    setEditForm(prev => ({
      ...prev,
      name: destination.name || '',
      city: destination.city || '',
      country: destination.country || '',
      category: destination.category || '',
      micro_description: destination.micro_description || '',
      description: destination.description || '',
      image: destination.image || '',
      website: destination.website || '',
      latitude: destination.latitude?.toString() || '',
      longitude: destination.longitude?.toString() || '',
      price_level: destination.price_level?.toString() || '',
      rating: destination.rating?.toString() || '',
      michelin_stars: destination.michelin_stars?.toString() || '',
      brand: destination.brand || '',
    }));
  }, [destination]);

  // Sync enriched data to form when loaded
  useEffect(() => {
    if (enrichedData) {
      setEditForm(prev => ({
        ...prev,
        formatted_address: enrichedData.formatted_address || prev.formatted_address,
        international_phone_number: enrichedData.international_phone_number || prev.international_phone_number,
        website: enrichedData.website || prev.website,
        rating: enrichedData.rating?.toString() || prev.rating,
        price_level: enrichedData.price_level?.toString() || prev.price_level,
      }));
    }
  }, [enrichedData]);

  const imageUrl = destination.image || destination.image_thumbnail;

  // Load enriched data
  useEffect(() => {
    async function loadData() {
      if (!destination?.slug) return;
      setLoading(true);

      try {
        const supabase = createClient();

        // Fetch enriched destination data with relations
        // Include id and parent_destination_id for nested/parent loading
        const { data } = await supabase
          .from('destinations')
          .select(`
            id,
            parent_destination_id,
            formatted_address,
            international_phone_number,
            website,
            rating,
            user_ratings_total,
            price_level,
            opening_hours_json,
            utc_offset,
            architectural_style,
            reviews_json,
            architect_id,
            architect:architects!architect_id(id, name, slug, image_url),
            design_firm:design_firms(id, name, slug),
            interior_designer:architects!interior_designer_id(id, name, slug),
            movement:design_movements(id, name, slug)
          `)
          .eq('slug', destination.slug)
          .single();

        if (data) {
          const enriched: EnrichedData = {
            formatted_address: data.formatted_address,
            international_phone_number: data.international_phone_number,
            website: data.website,
            rating: data.rating,
            user_ratings_total: data.user_ratings_total,
            price_level: data.price_level,
            utc_offset: data.utc_offset,
            architectural_style: data.architectural_style,
          };

          // Parse opening hours
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours = typeof data.opening_hours_json === 'string'
                ? JSON.parse(data.opening_hours_json)
                : data.opening_hours_json;
            } catch {}
          }

          // Parse reviews
          if (data.reviews_json) {
            try {
              const reviewsData = typeof data.reviews_json === 'string'
                ? JSON.parse(data.reviews_json)
                : data.reviews_json;
              if (Array.isArray(reviewsData)) {
                enriched.reviews = reviewsData.slice(0, 5) as GoogleReview[];
              }
            } catch {}
          }

          // Extract architect objects
          const d = data as any;
          if (d.architect) {
            const obj = Array.isArray(d.architect) ? d.architect[0] : d.architect;
            if (obj?.name) enriched.architect_obj = obj;
          }
          if (d.interior_designer) {
            const obj = Array.isArray(d.interior_designer) ? d.interior_designer[0] : d.interior_designer;
            if (obj?.name) enriched.interior_designer_obj = obj;
          }
          if (d.design_firm?.name) enriched.design_firm_obj = d.design_firm;
          if (d.movement) {
            const obj = Array.isArray(d.movement) ? d.movement[0] : d.movement;
            if (obj?.name) enriched.movement_obj = obj;
          }

          // Fetch architect destination count if architect exists
          if (data.architect_id) {
            const { count } = await supabase
              .from('destinations')
              .select('id', { count: 'exact', head: true })
              .eq('architect_id', data.architect_id)
              .neq('slug', destination.slug);
            if (count) enriched.architect_destination_count = count;
          }

          setEnrichedData(enriched);
        }

        // Load saved/visited status
        if (user) {
          const [savedRes, visitedRes] = await Promise.all([
            supabase.from('saved_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
            supabase.from('visited_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
          ]);
          setIsSaved(!!savedRes.data);
          setIsVisited(!!visitedRes.data);
        }

        // Use fetched data for parent/nested loading (more reliable than prop data)
        const destinationId = data?.id || destination.id;
        const parentId = data?.parent_destination_id || destination.parent_destination_id;

        // Load parent destination (where this destination is nested inside)
        if (parentId) {
          const { data: parent } = await supabase
            .from('destinations')
            .select('id, slug, name, category, image, image_thumbnail')
            .eq('id', parentId)
            .single();
          if (parent) setParentDestination(parent as Destination);
        }

        // Load nested destinations (venues inside this destination)
        if (destinationId) {
          const { data: nested } = await supabase
            .from('destinations')
            .select('id, slug, name, category, image, image_thumbnail')
            .eq('parent_destination_id', destinationId)
            .limit(10);
          if (nested) setNestedDestinations(nested as Destination[]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [destination?.slug, user]);

  // Fetch similar places
  useEffect(() => {
    if (destination.slug) {
      fetch(`/api/intelligence/similar?slug=${destination.slug}&limit=4&filter=all`)
        .then(res => res.ok ? res.json() : { similar: [] })
        .then(data => setSimilarPlaces(data.similar || []))
        .catch(() => setSimilarPlaces([]));
    }
  }, [destination.slug]);

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = (session.user.app_metadata as Record<string, unknown> | null)?.role;
        setIsAdmin(role === 'admin');
      }
    }
    checkAdmin();
  }, [user]);

  // Reset edit mode when destination changes
  useEffect(() => {
    setIsEditMode(false);
  }, [destination.slug]);

  // Auto-detect and set parent based on address (no confirmation needed)
  useEffect(() => {
    async function autoSetParentFromAddress() {
      // Only if no parent is already set
      if (parentDestination) {
        setSuggestedParent(null);
        return;
      }

      // Need address info to detect
      const addressText = enrichedData?.formatted_address || '';
      if (!addressText || !destination.city || !destination.slug) {
        setSuggestedParent(null);
        return;
      }

      try {
        const supabase = createClient();

        // Find potential parent destinations in the same city
        // Look for hotels, buildings, and large venues that might contain other places
        const { data: potentialParents } = await supabase
          .from('destinations')
          .select('id, slug, name, category, image, image_thumbnail')
          .eq('city', destination.city)
          .neq('slug', destination.slug)
          .in('category', ['hotel', 'building', 'landmark', 'shopping mall', 'department store', 'station'])
          .limit(100);

        if (!potentialParents || potentialParents.length === 0) {
          setSuggestedParent(null);
          return;
        }

        // Check if any potential parent's name appears in the address
        const addressLower = addressText.toLowerCase();
        let detectedParent: Destination | null = null;

        for (const parent of potentialParents) {
          const parentNameLower = parent.name.toLowerCase();
          // Match if address contains the parent name (at least 4 chars to avoid false positives)
          if (parentNameLower.length >= 4 && addressLower.includes(parentNameLower)) {
            detectedParent = parent as Destination;
            break;
          }
          // Also try without common suffixes
          const nameWithoutSuffix = parentNameLower
            .replace(/\s*(hotel|tokyo|kyoto|osaka|london|paris|new york)$/i, '')
            .trim();
          if (nameWithoutSuffix.length >= 4 && addressLower.includes(nameWithoutSuffix)) {
            detectedParent = parent as Destination;
            break;
          }
        }

        if (detectedParent) {
          // Auto-set the parent - no confirmation needed when name is in address
          console.log(`[AutoParent] Setting ${destination.name} parent to ${detectedParent.name} (detected from address)`);

          const { error } = await supabase
            .from('destinations')
            .update({ parent_destination_id: detectedParent.id })
            .eq('slug', destination.slug);

          if (!error) {
            setParentDestination(detectedParent);
          } else {
            console.error('Error auto-setting parent:', error);
          }
        }

        setSuggestedParent(null);
      } catch (error) {
        console.error('Error detecting parent from address:', error);
        setSuggestedParent(null);
      }
    }

    autoSetParentFromAddress();
  }, [enrichedData?.formatted_address, destination.city, destination.slug, destination.name, parentDestination]);

  // Progressive reveal effect - stagger sections for smooth appearance
  useEffect(() => {
    // Reset on destination change
    setVisibleSections(new Set());
    setShowFullDescription(false);

    // Start progressive reveal after initial load
    const revealSections = ['description', 'quickfacts', 'booking', 'insidertips', 'reviews', 'architecture', 'parent', 'nested', 'trip', 'map', 'similar', 'related', 'share'];
    const timers: NodeJS.Timeout[] = [];

    revealSections.forEach((section, index) => {
      const timer = setTimeout(() => {
        setVisibleSections((prev) => new Set([...prev, section]));
      }, 100 + index * 80); // Stagger by 80ms
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [destination.slug]);

  // Load user-related context (e.g., "Same architect designed 3 places you've visited")
  useEffect(() => {
    async function loadUserContext() {
      if (!user || !destination?.slug) return;

      const supabase = createClient();

      // Check if user has visited places by the same architect
      if (enrichedData?.architect_obj?.id) {
        const { data: visitedByArchitect } = await supabase
          .from('visited_places')
          .select('destination_slug, destinations!inner(name, architect_id)')
          .eq('user_id', user.id)
          .eq('destinations.architect_id', enrichedData.architect_obj.id)
          .limit(5);

        if (visitedByArchitect && visitedByArchitect.length > 0) {
          const count = visitedByArchitect.length;
          const architectName = enrichedData.architect_obj.name;
          if (count >= 3) {
            setUserRelatedContext(`You've visited ${count} other ${architectName} designs`);
          } else if (count >= 1) {
            setUserRelatedContext(`${architectName} also designed places you've been`);
          }
          return;
        }
      }

      // Check if user has visited places in the same city
      if (destination.city) {
        const { data: visitedInCity, count } = await supabase
          .from('visited_places')
          .select('destination_slug', { count: 'exact' })
          .eq('user_id', user.id)
          .not('destination_slug', 'eq', destination.slug)
          .limit(1);

        // This is a simplified check - would need a join for city filter
        // For now, just show generic context
      }
    }

    loadUserContext();
  }, [user, destination?.slug, enrichedData?.architect_obj]);

  // Parse opening hours with smart analysis - use destination's local time
  const openingHours = enrichedData?.opening_hours?.weekday_text || [];
  const todayHours = getTodayHours(openingHours, enrichedData?.utc_offset, destination.city);
  const hoursAnalysis = analyzeHours(openingHours, enrichedData?.utc_offset, destination.city);
  const isOpenNow = hoursAnalysis.isOpen;
  const bestTimeHint = getBestTimeHint(categoryType, openingHours, enrichedData?.utc_offset, destination.city);

  // Has architecture info
  const hasArchInfo = enrichedData?.architect_obj || enrichedData?.interior_designer_obj ||
                      enrichedData?.architectural_style || destination.architect;

  // Admin edit handler
  const handleSaveEdit = useCallback(async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, unknown> = {
        name: editForm.name,
        city: editForm.city,
        country: editForm.country || null,
        category: editForm.category,
        micro_description: editForm.micro_description,
        description: editForm.description,
        image: editForm.image || null,
        formatted_address: editForm.formatted_address || null,
        international_phone_number: editForm.international_phone_number || null,
        website: editForm.website || null,
        brand: editForm.brand || null,
      };

      // Parse numeric fields
      if (editForm.latitude) updateData.latitude = parseFloat(editForm.latitude);
      if (editForm.longitude) updateData.longitude = parseFloat(editForm.longitude);
      if (editForm.price_level) updateData.price_level = parseInt(editForm.price_level);
      if (editForm.rating) updateData.rating = parseFloat(editForm.rating);
      if (editForm.michelin_stars) updateData.michelin_stars = parseInt(editForm.michelin_stars);

      const { error } = await supabase
        .from('destinations')
        .update(updateData)
        .eq('slug', destination.slug);

      if (error) throw error;
      setIsEditMode(false);
      // Reload to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin, editForm, destination.slug]);

  // Handlers
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: destination.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [destination]);

  const handleDirections = useCallback(() => {
    // Use Apple Maps for directions
    const query = encodeURIComponent(`${destination.name} ${destination.city || ''}`);
    window.open(`https://maps.apple.com/?q=${query}`, '_blank');
  }, [destination]);

  const handleSave = useCallback(async () => {
    if (!user || !destination.slug) return;
    const supabase = createClient();

    if (isSaved) {
      await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
      setIsSaved(false);
    } else {
      await supabase.from('saved_places').insert({ user_id: user.id, destination_slug: destination.slug });
      setIsSaved(true);
    }
  }, [user, destination.slug, isSaved]);

  const handleVisit = useCallback(async () => {
    if (!user || !destination.slug) return;
    const supabase = createClient();

    if (isVisited) {
      await supabase.from('visited_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
      setIsVisited(false);
    } else {
      await supabase.from('visited_places').insert({ user_id: user.id, destination_slug: destination.slug });
      setIsVisited(true);
    }
  }, [user, destination.slug, isVisited]);

  const handleAddToTrip = useCallback((day?: number) => {
    setIsAddingToTrip(true);
    addToTrip(destination, day);
    setTimeout(() => setIsAddingToTrip(false), 1500);
  }, [addToTrip, destination]);

  // Use enriched rating if available
  const rating = enrichedData?.rating || destination.rating;
  const reviewCount = enrichedData?.user_ratings_total;

  // ============================================
  // SUBTLE INTELLIGENCE (automatic, no interaction)
  // ============================================

  const subtleContext = useMemo(() => getSubtleContext(
    categoryType,
    enrichedData?.price_level,
    rating ?? undefined,
    reviewCount ?? undefined,
    isOpenNow,
    enrichedData?.utc_offset,
    destination.city
  ), [categoryType, enrichedData?.price_level, rating, reviewCount, isOpenNow, enrichedData?.utc_offset, destination.city]);

  const subtleRecommendation = useMemo(() => getSubtleRecommendation(
    categoryType,
    destination,
    undefined, // Would come from user's visit history
    !!hasArchInfo
  ), [categoryType, destination, hasArchInfo]);

  // ============================================
  // SMART SECTION AVAILABILITY
  // ============================================

  // Generate key highlights, insider tips, and best for audiences
  const keyHighlights = useMemo(() => getKeyHighlights(
    destination,
    categoryType,
    enrichedData?.price_level,
    !!hasArchInfo,
    destination.michelin_stars
  ), [destination, categoryType, enrichedData?.price_level, hasArchInfo]);

  const insiderTips = useMemo(() => getInsiderTips(
    categoryType,
    destination,
    enrichedData?.price_level,
    rating ?? undefined,
    reviewCount ?? undefined
  ), [categoryType, destination, enrichedData?.price_level, rating, reviewCount]);

  const estimatedDuration = useMemo(() => getEstimatedDuration(categoryType), [categoryType]);

  const bestForAudience = useMemo(() => getBestForAudience(
    categoryType,
    destination,
    enrichedData?.price_level
  ), [categoryType, destination, enrichedData?.price_level]);

  // Determine which sections have data
  const hasDescription = !!(destination.micro_description || destination.description);
  const hasQuickFacts = !!(todayHours || enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website);
  const hasMap = !!(destination.latitude && destination.longitude);
  const hasNested = nestedDestinations.length > 0;
  const hasParent = !!parentDestination;
  const hasSimilar = similarPlaces.length > 0;
  const hasRelated = related.length > 0;
  const hasTrip = true; // Always show trip section
  const hasInsiderTips = insiderTips.length > 0;
  const hasReviews = !!(enrichedData?.reviews && enrichedData.reviews.length > 0);
  const hasBooking = !!(destination.opentable_url || destination.resy_url || destination.booking_url || enrichedData?.website);
  const hasShare = true; // Always show share section

  // Build available sections with their priorities
  type SectionKey = 'description' | 'quickfacts' | 'architecture' | 'nested' | 'parent' | 'map' | 'trip' | 'similar' | 'related' | 'insidertips' | 'reviews' | 'booking' | 'share';

  const availableSections: { key: SectionKey; priority: number }[] = [];

  if (hasDescription) availableSections.push({ key: 'description', priority: sectionPriorities.description });
  if (hasQuickFacts) availableSections.push({ key: 'quickfacts', priority: sectionPriorities.quickfacts });
  if (hasArchInfo) availableSections.push({ key: 'architecture', priority: sectionPriorities.architecture });
  if (hasNested) availableSections.push({ key: 'nested', priority: sectionPriorities.nested });
  if (hasParent) availableSections.push({ key: 'parent', priority: sectionPriorities.parent });
  if (hasMap) availableSections.push({ key: 'map', priority: sectionPriorities.map });
  if (hasTrip) availableSections.push({ key: 'trip', priority: isFromTrip ? 0 : sectionPriorities.trip }); // Boost if from trip
  if (hasSimilar) availableSections.push({ key: 'similar', priority: sectionPriorities.similar });
  if (hasRelated) availableSections.push({ key: 'related', priority: sectionPriorities.related });
  if (hasInsiderTips) availableSections.push({ key: 'insidertips', priority: sectionPriorities.insidertips });
  if (hasReviews) availableSections.push({ key: 'reviews', priority: sectionPriorities.reviews });
  if (hasBooking) availableSections.push({ key: 'booking', priority: sectionPriorities.booking });
  if (hasShare) availableSections.push({ key: 'share', priority: sectionPriorities.share });

  // Sort by priority (lower = higher priority)
  const sortedSections = availableSections.sort((a, b) => a.priority - b.priority);

  // ============================================
  // SECTION RENDER FUNCTIONS
  // ============================================

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case 'description':
        const description = destination.micro_description || destination.description || '';
        const isLong = description.length > 300;
        const displayText = isLong && !showFullDescription
          ? description.slice(0, 280) + '...'
          : description;

        return (
          <div key="description" className="mt-5">
            {/* User-related context badge */}
            {userRelatedContext && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <p className="text-[12px] text-blue-700 dark:text-blue-300 font-medium">
                  {userRelatedContext}
                </p>
              </div>
            )}

            <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
              {displayText}
            </p>
            {isLong && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-[13px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showFullDescription ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        );

      case 'parent':
        // Parent is auto-set from address, just show if exists
        if (!parentDestination) return null;
        return (
          <button
            key="parent"
            onClick={() => onOpenRelated(parentDestination)}
            className="w-full flex items-center gap-3 mt-5 py-3 border-t border-b border-gray-100 dark:border-white/10 text-left"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              {parentDestination.image ? (
                <Image src={parentDestination.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-gray-400" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Located inside</p>
              <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{parentDestination.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        );

      case 'nested':
        return (
          <div key="nested" className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Venues Inside</p>
            <div className="space-y-1">
              {nestedDestinations.map((nested) => (
                <button
                  key={nested.slug}
                  onClick={() => onOpenRelated(nested)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {nested.image ? (
                      <Image src={nested.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{nested.name}</p>
                    <p className="text-[12px] text-gray-500">{nested.category && capitalizeCategory(nested.category)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        );

      case 'quickfacts':
        const localTimeStr = getLocalTimeAtDestination(enrichedData?.utc_offset, destination.city);
        const priceLevelDisplay = enrichedData?.price_level
          ? { text: '$'.repeat(enrichedData.price_level), label: ['Budget', 'Moderate', 'Upscale', 'Luxury'][enrichedData.price_level - 1] || '' }
          : null;

        return (
          <div key="quickfacts" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-400">Quick Facts</p>
                {localTimeStr && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    · {localTimeStr} local
                  </span>
                )}
              </div>
            </div>

            {/* Quick facts grid */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-3">
              {/* Hours with status */}
              {todayHours && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-medium ${
                      hoursAnalysis.category === 'open' ? 'text-green-600' :
                      hoursAnalysis.category === 'closing-soon' ? 'text-amber-600' :
                      hoursAnalysis.category === 'opening-soon' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}>
                      {hoursAnalysis.status || 'Check hours'}
                    </span>
                  </div>
                </div>
              )}

              {/* Price level */}
              {priceLevelDisplay && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gray-400" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white">{priceLevelDisplay.text}</span>
                    <span className="text-[12px] text-gray-500">({priceLevelDisplay.label})</span>
                  </div>
                </div>
              )}

              {/* Duration estimate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <span className="text-[13px] text-gray-600 dark:text-gray-400">Duration</span>
                </div>
                <span className="text-[13px] font-medium text-gray-900 dark:text-white">{estimatedDuration}</span>
              </div>

              {/* Best for */}
              {bestForAudience.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Best for</span>
                  </div>
                  <span className="text-[13px] font-medium text-gray-900 dark:text-white">{bestForAudience.join(', ')}</span>
                </div>
              )}

              {/* Address */}
              {enrichedData?.formatted_address && (
                <div className="flex items-start justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400 flex-1">{enrichedData.formatted_address}</span>
                  </div>
                  <button
                    onClick={handleDirections}
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap ml-2"
                  >
                    Get directions
                  </button>
                </div>
              )}
            </div>

            {/* Contact buttons */}
            <div className="flex gap-2 mt-3">
              {enrichedData?.international_phone_number && (
                <a
                  href={`tel:${enrichedData.international_phone_number}`}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 dark:border-white/20 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
              {enrichedData?.website && (
                <a
                  href={enrichedData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 dark:border-white/20 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
              <button
                onClick={handleDirections}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 dark:border-white/20 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Navigation className="h-4 w-4" />
                Directions
              </button>
            </div>
          </div>
        );

      case 'architecture':
        return (
          <div key="architecture" className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Design & Architecture</p>
            <div className="space-y-1">
              {enrichedData?.architect_obj && (
                <>
                  <Link href={`/architect/${enrichedData.architect_obj.slug}`} className="flex items-center gap-3 py-2 group">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      {enrichedData.architect_obj.image_url ? (
                        <Image src={enrichedData.architect_obj.image_url} alt="" width={40} height={40} className="object-cover" />
                      ) : (
                        <span className="text-[14px] font-medium text-gray-500">{enrichedData.architect_obj.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-400">Architect</p>
                      <p className="text-[14px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 truncate">
                        {enrichedData.architect_obj.name}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                  {/* More by this architect link */}
                  {enrichedData.architect_destination_count && enrichedData.architect_destination_count > 0 && (
                    <Link
                      href={`/architect/${enrichedData.architect_obj.slug}`}
                      className="flex items-center gap-2 ml-[52px] py-1 text-[12px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Building2 className="h-3 w-3" />
                      See {enrichedData.architect_destination_count} other project{enrichedData.architect_destination_count !== 1 ? 's' : ''} by this architect
                    </Link>
                  )}
                </>
              )}
              {!enrichedData?.architect_obj && destination.architect && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Architect</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{destination.architect}</p>
                  </div>
                </div>
              )}
              {enrichedData?.interior_designer_obj && (
                <Link href={`/architect/${enrichedData.interior_designer_obj.slug}`} className="flex items-center gap-3 py-2 group">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-[14px] font-medium text-gray-500">{enrichedData.interior_designer_obj.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Interior Designer</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 truncate">
                      {enrichedData.interior_designer_obj.name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>
              )}
              {enrichedData?.architectural_style && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Palette className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Style</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{enrichedData.architectural_style}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'map':
        return (
          <div key="map" className="mt-6">
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + (destination.city || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative aspect-[2/1] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              <GoogleStaticMap
                center={{ lat: destination.latitude!, lng: destination.longitude! }}
                zoom={15}
                height="100%"
                className="w-full h-full"
              />
              <div className="absolute inset-0 flex items-center justify-center hover:bg-black/10 transition-colors">
                <span className="px-3 py-1.5 rounded-full bg-white/95 text-[12px] font-medium text-gray-800 shadow-sm">
                  Open in Maps
                </span>
              </div>
            </a>
          </div>
        );

      case 'trip':
        // Show "Start Trip" button if no active trip
        if (!activeTrip) {
          return (
            <div key="trip" className="mt-6">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">
                Add to Trip
              </p>
              <button
                onClick={() => {
                  startTrip(destination.city || 'New Trip', 3);
                  handleAddToTrip(1);
                }}
                disabled={isAddingToTrip}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[14px] font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Start {destination.city ? `${destination.city} Trip` : 'New Trip'}
              </button>
            </div>
          );
        }

        return (
          <div key="trip" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                {isFromTrip ? 'Add to Trip' : `Add to ${activeTrip.title}`}
              </p>
              {tripContext?.fit && (
                <span className="text-[11px] text-green-600 font-medium">{tripContext.fit}</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeTrip.days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => handleAddToTrip(day.dayNumber)}
                  disabled={isAddingToTrip}
                  className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50 ${
                    tripContext?.day === day.dayNumber
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  {isAddingToTrip ? <Loader2 className="h-4 w-4 animate-spin" /> : `Day ${day.dayNumber}`}
                </button>
              ))}
              <button
                onClick={() => handleAddToTrip()}
                disabled={isAddingToTrip}
                className="px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-[13px] font-medium text-gray-500 hover:border-gray-400 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                New Day
              </button>
            </div>
          </div>
        );

      case 'similar':
        return (
          <div key="similar" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Similar Places</p>
              <button onClick={onShowSimilar} className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white">
                See all
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {similarPlaces.map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="flex-shrink-0 w-28 text-left group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
                    {(dest.image || dest.image_thumbnail) && (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">{dest.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{capitalizeCategory(dest.category || '')}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'related':
        return (
          <div key="related" className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">
              More in {capitalizeCity(destination.city || '')}
            </p>
            <div className="space-y-1">
              {related.slice(0, 4).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {dest.image ? (
                      <Image src={dest.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{dest.name}</p>
                    <p className="text-[12px] text-gray-500">{capitalizeCategory(dest.category || '')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        );

      case 'insidertips':
        return (
          <div key="insidertips" className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-500" />
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Insider Tips</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
              {insiderTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-[13px] text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <p className="text-[13px] text-blue-800 dark:text-blue-200">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'reviews':
        const reviews = enrichedData?.reviews || [];
        if (reviews.length === 0) return null;

        // Calculate rating distribution
        const ratingCounts = [0, 0, 0, 0, 0];
        reviews.forEach(r => {
          if (r.rating) ratingCounts[Math.floor(r.rating) - 1]++;
        });

        return (
          <div key="reviews" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <p className="text-[11px] uppercase tracking-wider text-gray-400">Reviews</p>
              </div>
              {rating && reviewCount && (
                <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                  {rating.toFixed(1)} ({reviewCount.toLocaleString()})
                </span>
              )}
            </div>

            {/* Reviews list */}
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review, index) => (
                <div key={index} className="border-b border-gray-100 dark:border-white/10 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Star rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${star <= (review.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    {review.relative_time_description && (
                      <span className="text-[11px] text-gray-400">{review.relative_time_description}</span>
                    )}
                  </div>
                  {review.text && (
                    <p className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-3">
                      "{review.text}"
                    </p>
                  )}
                  {review.author_name && (
                    <p className="text-[12px] text-gray-500 mt-1">— {review.author_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'booking':
        const hasOpenTable = !!destination.opentable_url;
        const hasResy = !!destination.resy_url;
        const hasDirectBooking = !!destination.booking_url;
        const hasAnyBooking = hasOpenTable || hasResy || hasDirectBooking;

        if (!hasAnyBooking && !enrichedData?.website) return null;

        return (
          <div key="booking" className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-green-600" />
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Reserve a Table</p>
            </div>

            <div className="space-y-2">
              {hasOpenTable && (
                <a
                  href={destination.opentable_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <span className="text-[14px] font-medium">Book on OpenTable</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {hasResy && (
                <a
                  href={destination.resy_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <span className="text-[14px] font-medium">Book on Resy</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {hasDirectBooking && (
                <a
                  href={destination.booking_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
                >
                  <span className="text-[14px] font-medium">Book Direct</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {!hasAnyBooking && enrichedData?.website && (
                <a
                  href={enrichedData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-[14px] font-medium">Visit Website to Book</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {enrichedData?.international_phone_number && (
              <p className="text-[12px] text-gray-500 mt-2 text-center">
                Or call {enrichedData.international_phone_number} for reservations
              </p>
            )}
          </div>
        );

      case 'share':
        const shareUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/destination/${destination.slug}`
          : `/destination/${destination.slug}`;

        const handleCopyLink = async () => {
          try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard');
          } catch {
            toast.error('Failed to copy link');
          }
        };

        const handleEmailShare = () => {
          const subject = encodeURIComponent(`Check out ${destination.name}`);
          const body = encodeURIComponent(`I found this amazing place on Urban Manual: ${destination.name}\n\n${shareUrl}`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
        };

        const handleTwitterShare = () => {
          const text = encodeURIComponent(`Check out ${destination.name} on Urban Manual!`);
          window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`);
        };

        const handleWhatsAppShare = () => {
          const text = encodeURIComponent(`Check out ${destination.name} on Urban Manual: ${shareUrl}`);
          window.open(`https://wa.me/?text=${text}`);
        };

        return (
          <div key="share" className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Share This Place</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span className="text-[13px] font-medium">Copy Link</span>
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={handleTwitterShare}
                className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Share on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </button>
              <button
                onClick={handleEmailShare}
                className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                title="Share via Email"
              >
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render edit form when in edit mode
  if (isEditMode && isAdmin) {
    const inputClass = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white";
    const labelClass = "block text-[12px] font-medium text-gray-500 mb-1.5";

    return (
      <div className="pb-8 px-5 pt-5 max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Edit Destination</h2>
          <span className="text-[11px] text-gray-400">{destination.slug}</span>
        </div>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Basic Info</p>
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City *</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input type="text" value={editForm.country} onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category *</label>
                <input type="text" value={editForm.category} onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input type="text" value={editForm.brand} onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))} className={inputClass} placeholder="e.g., Aman, Four Seasons" />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Descriptions</p>
            <div>
              <label className={labelClass}>Micro Description</label>
              <textarea value={editForm.micro_description} onChange={(e) => setEditForm(prev => ({ ...prev, micro_description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="One-liner description" />
            </div>
            <div>
              <label className={labelClass}>Full Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={4} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Contact & Location</p>
            <div>
              <label className={labelClass}>Address</label>
              <input type="text" value={editForm.formatted_address} onChange={(e) => setEditForm(prev => ({ ...prev, formatted_address: e.target.value }))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" value={editForm.international_phone_number} onChange={(e) => setEditForm(prev => ({ ...prev, international_phone_number: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input type="text" value={editForm.website} onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Latitude</label>
                <input type="text" value={editForm.latitude} onChange={(e) => setEditForm(prev => ({ ...prev, latitude: e.target.value }))} className={inputClass} placeholder="e.g., 35.6762" />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input type="text" value={editForm.longitude} onChange={(e) => setEditForm(prev => ({ ...prev, longitude: e.target.value }))} className={inputClass} placeholder="e.g., 139.6503" />
              </div>
            </div>
          </div>

          {/* Ratings & Status */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Ratings & Status</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Rating</label>
                <input type="text" value={editForm.rating} onChange={(e) => setEditForm(prev => ({ ...prev, rating: e.target.value }))} className={inputClass} placeholder="e.g., 4.5" />
              </div>
              <div>
                <label className={labelClass}>Price Level</label>
                <input type="text" value={editForm.price_level} onChange={(e) => setEditForm(prev => ({ ...prev, price_level: e.target.value }))} className={inputClass} placeholder="1-4" />
              </div>
              <div>
                <label className={labelClass}>Michelin Stars</label>
                <input type="text" value={editForm.michelin_stars} onChange={(e) => setEditForm(prev => ({ ...prev, michelin_stars: e.target.value }))} className={inputClass} placeholder="0-3" />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Media</p>
            <div>
              <label className={labelClass}>Image URL</label>
              <input type="text" value={editForm.image} onChange={(e) => setEditForm(prev => ({ ...prev, image: e.target.value }))} className={inputClass} />
            </div>
            {editForm.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image src={editForm.image} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          {/* Parent/Nested Info */}
          {(parentDestination || nestedDestinations.length > 0) && (
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Location Nesting</p>
              {parentDestination && (
                <div className="text-[13px] text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400">Located inside:</span> {parentDestination.name}
                </div>
              )}
              {nestedDestinations.length > 0 && (
                <div className="text-[13px] text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400">Contains:</span> {nestedDestinations.map(n => n.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 sticky bottom-0 bg-white dark:bg-gray-950 pb-2">
            <button
              onClick={() => setIsEditMode(false)}
              className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-[14px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Hero Image */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <Image src={imageUrl} alt={destination.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/95 text-[11px] font-medium flex items-center gap-1">
              <img src="/michelin-star.svg" alt="Michelin" className="w-3 h-3" />
              {destination.michelin_stars}
            </span>
          )}
          {destination.crown && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-medium flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-current" />
            </span>
          )}
          {hoursAnalysis.status && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              hoursAnalysis.category === 'open' ? 'bg-green-500 text-white' :
              hoursAnalysis.category === 'opening-soon' ? 'bg-blue-500 text-white' :
              hoursAnalysis.category === 'closing-soon' ? 'bg-amber-500 text-white' :
              'bg-gray-800 text-white'
            }`}>
              {hoursAnalysis.status}
            </span>
          )}
        </div>
      </div>

      <div className="px-5">
        {/* Title & Meta */}
        <div className="pt-5 pb-4">
          <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight">
            {destination.name}
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            {destination.category && capitalizeCategory(destination.category)}
            {destination.city && ` · ${capitalizeCity(destination.city)}`}
          </p>
          {/* Brand link */}
          {destination.brand && (
            <Link
              href={`/brand/${encodeURIComponent(destination.brand)}`}
              className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Building2 className="h-3 w-3" />
              {destination.brand}
            </Link>
          )}
          {/* Rating with review count */}
          {rating && (
            <div className="flex items-center gap-1.5 mt-2">
              <img src="/google-logo.svg" alt="Google" className="h-3.5 w-3.5" />
              <span className="text-[13px] font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
              {reviewCount && (
                <span className="text-[13px] text-gray-500">({reviewCount.toLocaleString()} reviews)</span>
              )}
              {enrichedData?.price_level && (
                <span className="text-[13px] text-gray-500 ml-2">{'$'.repeat(enrichedData.price_level)}</span>
              )}
              {/* Subtle context signals - appear naturally, no interaction */}
              {subtleContext.priceSignal && (
                <span className="text-[11px] text-gray-400 ml-1">· {subtleContext.priceSignal}</span>
              )}
            </div>
          )}

          {/* Subtle signals row - only show if there's something genuinely useful */}
          {(subtleContext.timeSignal || subtleContext.availabilityHint || subtleRecommendation) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {subtleContext.timeSignal && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                  {subtleContext.timeSignal}
                </span>
              )}
              {subtleContext.availabilityHint && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                  {subtleContext.availabilityHint}
                </span>
              )}
              {subtleRecommendation && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                  {subtleRecommendation}
                </span>
              )}
            </div>
          )}

          {/* Key Highlights - Visual feature badges */}
          {keyHighlights.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {keyHighlights.map((highlight, index) => {
                const colorClasses = {
                  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                  green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
                  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
                  rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300',
                };
                return (
                  <span
                    key={index}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colorClasses[highlight.color]}`}
                  >
                    {highlight.icon}
                    {highlight.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Verified Curated Badge */}
          {destination.crown && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200/50 dark:border-amber-700/30">
              <BadgeCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-[12px] font-medium text-amber-800 dark:text-amber-300">
                Verified by Urban Manual
              </span>
              <span className="text-[11px] text-amber-600/70 dark:text-amber-400/70">
                · Hand-picked by our travel experts
              </span>
            </div>
          )}
        </div>

        {/* Smart Action Buttons - Context-aware primary action */}
        {(() => {
          // Determine primary action based on context
          const isPrimaryTrip = isFromTrip && activeTrip;
          const isPrimaryGo = hoursAnalysis.category === 'open' && !isFromTrip;
          const suggestedDay = tripContext?.day || (activeTrip?.days[0]?.dayNumber ?? 1);

          return (
            <div className="flex gap-2">
              {/* Primary Action - changes based on context */}
              {isPrimaryTrip ? (
                <button
                  onClick={() => handleAddToTrip(suggestedDay)}
                  disabled={isAddingToTrip}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[14px] font-medium transition-all disabled:opacity-50"
                >
                  {isAddingToTrip ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Day {suggestedDay}
                    </>
                  )}
                </button>
              ) : isPrimaryGo ? (
                <button
                  onClick={handleDirections}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-[14px] font-medium transition-all hover:bg-green-700"
                >
                  <Navigation className="h-4 w-4" />
                  Go Now
                </button>
              ) : (
                <button
                  onClick={user ? handleSave : undefined}
                  className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border text-[14px] font-medium transition-all ${
                    isSaved
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              )}

              {/* Secondary Actions */}
              {!isPrimaryTrip && (
                <button
                  onClick={user ? handleSave : undefined}
                  className={`h-11 w-11 flex items-center justify-center rounded-xl border text-[14px] font-medium transition-all ${
                    isSaved
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                  } ${isPrimaryGo ? '' : 'hidden'}`}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}
              <button
                onClick={handleShare}
                className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {/* Admin Edit Button */}
              {isAdmin && (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all ${
                    isEditMode
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                  title={isEditMode ? 'Exit edit mode' : 'Edit destination (Admin)'}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {!isPrimaryGo && (
                <button
                  onClick={handleDirections}
                  className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                >
                  <Navigation className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })()}

        {/* Been Here Button */}
        {user && (
          <button
            onClick={handleVisit}
            className={`w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-xl border text-[14px] font-medium transition-all ${
              isVisited
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <Check className="h-4 w-4" />
            {isVisited ? 'Visited' : 'Been Here'}
          </button>
        )}

        {/* Smart Sections - rendered in category-adaptive order with progressive reveal */}
        {sortedSections.map(({ key }, index) => {
          const isVisible = visibleSections.has(key);
          const isDataLoaded = !loading || key === 'description' || key === 'trip';

          // Show skeleton while loading or not yet visible
          if (!isVisible && index < 3) {
            return <SectionSkeleton key={`skeleton-${key}`} type={key} />;
          }

          if (!isVisible) return null;

          return (
            <div
              key={key}
              className="transition-all duration-300 ease-out"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              {isDataLoaded ? renderSection(key) : <SectionSkeleton type={key} />}
            </div>
          );
        })}

        {/* View Full Page */}
        <Link
          href={`/destination/${destination.slug}`}
          className="flex items-center justify-between w-full mt-6 py-4 border-t border-gray-100 dark:border-white/10 group"
        >
          <span className="text-[15px] font-medium text-gray-900 dark:text-white">View full page</span>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        </Link>
      </div>
    </div>
  );
});

/**
 * Get today's hours string - uses destination's local time
 */
function getTodayHours(hours: string[], utcOffsetMinutes?: number | null, city?: string | null): string | null {
  if (!hours || hours.length === 0) return null;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Use destination's local day, not user's
  const { dayOfWeek } = getDestinationLocalTime(utcOffsetMinutes, city);
  const today = dayNames[dayOfWeek];
  return hours.find(h => h.startsWith(today)) || null;
}

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  // Parse formats like "9:00 AM", "10:30 PM", "21:00"
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Parse opening hours to get open/close times
 * Handles formats like:
 * - "Monday: 9:00 AM – 10:00 PM" (both have AM/PM)
 * - "Monday: 6:00 – 8:00 PM" (only closing has PM - opening should inherit PM)
 * - "Monday: 9:00 – 22:00" (24-hour format)
 */
function parseHoursRange(hoursStr: string): { open: number; close: number } | null {
  const timeMatch = hoursStr.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)\s*[–\-]\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)/i);
  if (!timeMatch) return null;

  let openStr = timeMatch[1].trim();
  const closeStr = timeMatch[2].trim();

  // Check if open time is missing AM/PM but close time has it
  const openHasPeriod = /AM|PM/i.test(openStr);
  const closeHasPeriod = /AM|PM/i.test(closeStr);

  if (!openHasPeriod && closeHasPeriod) {
    // Extract the period from close time
    const closePeriod = closeStr.match(/AM|PM/i)?.[0] || '';
    const openHour = parseInt(openStr.match(/\d{1,2}/)?.[0] || '0', 10);
    const closeHour = parseInt(closeStr.match(/\d{1,2}/)?.[0] || '0', 10);

    // If open hour > close hour (e.g., 10:00 – 2:00 AM), open is PM
    // If open hour <= close hour in same period, they share the same period
    // E.g., "6:00 – 8:00 PM" means 6 PM to 8 PM
    // But "10:00 AM – 6:00 PM" would have both periods explicit
    if (closePeriod.toUpperCase() === 'PM' && openHour <= closeHour) {
      // Same PM period: 6:00 – 8:00 PM means 6 PM – 8 PM
      openStr = openStr + ' ' + closePeriod;
    } else if (closePeriod.toUpperCase() === 'AM' && openHour > closeHour) {
      // Overnight: 10:00 – 2:00 AM means 10 PM – 2 AM
      openStr = openStr + ' PM';
    } else {
      // Default: assume same period
      openStr = openStr + ' ' + closePeriod;
    }
  }

  const open = parseTimeToMinutes(openStr);
  const close = parseTimeToMinutes(closeStr);

  if (open === null || close === null) return null;
  return { open, close: close < open ? close + 24 * 60 : close }; // Handle overnight hours
}

interface SmartHoursResult {
  isOpen: boolean | null;
  status: string;
  timeUntilChange: string | null;
  category: 'open' | 'closing-soon' | 'closed' | 'opening-soon' | 'unknown';
}

/**
 * Smart hours analysis - returns human-friendly status
 * Uses destination's local time based on city timezone or utcOffsetMinutes
 */
function analyzeHours(hours: string[], utcOffsetMinutes?: number | null, city?: string | null): SmartHoursResult {
  const defaultResult: SmartHoursResult = {
    isOpen: null,
    status: '',
    timeUntilChange: null,
    category: 'unknown',
  };

  if (!hours || hours.length === 0) return defaultResult;

  const todayHours = getTodayHours(hours, utcOffsetMinutes, city);
  if (!todayHours) return defaultResult;

  // Check if closed today
  if (todayHours.toLowerCase().includes('closed')) {
    // Find next open day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const { dayOfWeek: todayIndex } = getDestinationLocalTime(utcOffsetMinutes, city);

    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDayHours = hours.find(h => h.startsWith(dayNames[nextDayIndex]));
      if (nextDayHours && !nextDayHours.toLowerCase().includes('closed')) {
        const dayName = i === 1 ? 'tomorrow' : dayNames[nextDayIndex];
        return {
          isOpen: false,
          status: `Closed · Opens ${dayName}`,
          timeUntilChange: null,
          category: 'closed',
        };
      }
    }
    return { isOpen: false, status: 'Closed today', timeUntilChange: null, category: 'closed' };
  }

  // Parse today's hours
  const range = parseHoursRange(todayHours);
  if (!range) return { ...defaultResult, isOpen: true, status: 'Open', category: 'open' };

  // Use destination's local time, not user's
  const { hour, dayOfWeek } = getDestinationLocalTime(utcOffsetMinutes, city);
  const now = new Date();
  // Get minutes from getDestinationLocalTime result
  let currentMinutes: number;

  // Try city timezone first
  if (city) {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-');
    const cityTimezone = CITY_TIMEZONES[cityKey];
    if (cityTimezone) {
      try {
        const localString = now.toLocaleString('en-US', { timeZone: cityTimezone });
        const localTime = new Date(localString);
        currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
      } catch {
        currentMinutes = hour * 60 + now.getMinutes();
      }
    } else if (utcOffsetMinutes != null) {
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
      currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
    } else {
      // Fallback to UTC
      const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
      const utcTime = new Date(utcString);
      currentMinutes = utcTime.getHours() * 60 + utcTime.getMinutes();
    }
  } else if (utcOffsetMinutes != null) {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
    currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
  } else {
    // Fallback to UTC
    const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const utcTime = new Date(utcString);
    currentMinutes = utcTime.getHours() * 60 + utcTime.getMinutes();
  }

  // Check if currently open
  if (currentMinutes >= range.open && currentMinutes < range.close) {
    const minutesUntilClose = range.close - currentMinutes;

    // Closing soon (within 60 minutes)
    if (minutesUntilClose <= 60) {
      const timeStr = minutesUntilClose <= 30
        ? `${minutesUntilClose} min`
        : `${Math.round(minutesUntilClose / 60)} hr`;
      return {
        isOpen: true,
        status: `Closes in ${timeStr}`,
        timeUntilChange: timeStr,
        category: 'closing-soon',
      };
    }

    return { isOpen: true, status: 'Open now', timeUntilChange: null, category: 'open' };
  }

  // Currently closed - check when it opens
  if (currentMinutes < range.open) {
    const minutesUntilOpen = range.open - currentMinutes;

    // Opening soon (within 2 hours)
    if (minutesUntilOpen <= 120) {
      const hours = Math.floor(minutesUntilOpen / 60);
      const mins = minutesUntilOpen % 60;
      const timeStr = hours > 0
        ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`
        : `${mins} min`;
      return {
        isOpen: false,
        status: `Opens in ${timeStr.trim()}`,
        timeUntilChange: timeStr.trim(),
        category: 'opening-soon',
      };
    }

    // Opening later today
    const openTime = `${Math.floor(range.open / 60)}:${String(range.open % 60).padStart(2, '0')}`;
    const openHour = Math.floor(range.open / 60);
    const period = openHour >= 12 ? 'PM' : 'AM';
    const displayHour = openHour > 12 ? openHour - 12 : openHour === 0 ? 12 : openHour;
    return {
      isOpen: false,
      status: `Opens at ${displayHour}${range.open % 60 > 0 ? ':' + String(range.open % 60).padStart(2, '0') : ''} ${period}`,
      timeUntilChange: null,
      category: 'closed',
    };
  }

  // After closing - opens tomorrow
  return {
    isOpen: false,
    status: 'Closed · Opens tomorrow',
    timeUntilChange: null,
    category: 'closed',
  };
}

/**
 * Get best time hint based on category
 * Uses destination's local time based on city timezone or utcOffsetMinutes
 */
function getBestTimeHint(categoryType: CategoryType, hours: string[], utcOffsetMinutes?: number | null, city?: string | null): string | null {
  const hints: Record<CategoryType, string[]> = {
    dining: ['Best for dinner: 7-9 PM', 'Lunch crowds: 12-1:30 PM', 'Quietest: 3-5 PM'],
    nightlife: ['Peak hours: 10 PM - 1 AM', 'Happy hour vibes: 5-7 PM'],
    culture: ['Avoid crowds: weekday mornings', 'Best light: late afternoon'],
    hotel: [],
    shopping: ['Quietest: weekday mornings', 'Avoid: lunch hour rush'],
    outdoor: ['Best light: golden hour', 'Cooler temps: early morning'],
    architecture: ['Best for photos: golden hour', 'Less crowded: early morning'],
    general: [],
  };

  const categoryHints = hints[categoryType];
  if (!categoryHints.length) return null;

  // Return a contextual hint based on destination's local time
  const { hour } = getDestinationLocalTime(utcOffsetMinutes, city);

  if (categoryType === 'dining') {
    if (hour >= 10 && hour < 14) return 'Currently: lunch rush';
    if (hour >= 17 && hour < 21) return 'Currently: dinner peak';
    if (hour >= 14 && hour < 17) return 'Good time: quieter now';
  }

  if (categoryType === 'nightlife') {
    if (hour >= 17 && hour < 20) return 'Happy hour time';
    if (hour >= 22 || hour < 2) return 'Peak hours now';
  }

  if (categoryType === 'culture' || categoryType === 'architecture') {
    if (hour >= 9 && hour < 11) return 'Good time: morning quiet';
    if (hour >= 16 && hour < 18) return 'Beautiful afternoon light';
  }

  return categoryHints[0] || null;
}

/**
 * Check if currently open (simplified)
 */
function checkIfOpen(hours: string[], utcOffsetMinutes?: number | null, city?: string | null): boolean | null {
  if (!hours || hours.length === 0) return null;
  const todayHours = getTodayHours(hours, utcOffsetMinutes, city);
  if (!todayHours) return null;
  if (todayHours.includes('Closed')) return false;
  return true;
}

export default DestinationContent;
