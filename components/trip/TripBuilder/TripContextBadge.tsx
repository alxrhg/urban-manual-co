'use client';

import { memo, useMemo } from 'react';
import { Lightbulb, Clock, MapPin, Route } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { Destination } from '@/types/destination';

interface TripContextBadgeProps {
  destination: Destination;
  className?: string;
}

/**
 * TripContextBadge - Intelligent contextual suggestion for destinations
 *
 * Shows contextual information about how a destination fits into
 * the current trip being planned:
 *
 * - "Perfect for Day 2" - Based on location proximity
 * - "Great for morning" - Based on category timing
 * - "Near your lunch spot" - Based on existing items
 * - "Fills your dinner gap" - Based on missing meal slots
 *
 * This makes the homepage feel intelligent and trip-aware.
 */
const TripContextBadge = memo(function TripContextBadge({
  destination,
  className = '',
}: TripContextBadgeProps) {
  const { activeTrip, totalItems } = useTripBuilder();

  // Compute contextual suggestion
  const suggestion = useMemo(() => {
    if (!activeTrip || totalItems === 0) return null;

    const category = (destination.category || '').toLowerCase();
    const city = destination.city;

    // Check if same city as trip
    if (city && activeTrip.city && city.toLowerCase() !== activeTrip.city.toLowerCase()) {
      return null;
    }

    // Find best day based on various factors
    let bestDay = 1;
    let suggestionType: 'time' | 'location' | 'meal' | 'variety' = 'time';
    let message = '';

    // Check meal gaps
    const hasDinnerGap = activeTrip.days.some((day, idx) => {
      if (day.items.length < 3) return false;
      const hasDinner = day.items.some(item => {
        const itemCat = (item.destination.category || '').toLowerCase();
        const time = parseInt(item.timeSlot?.split(':')[0] || '0');
        return itemCat.includes('restaurant') && time >= 18;
      });
      if (!hasDinner) {
        bestDay = idx + 1;
        return true;
      }
      return false;
    });

    if (hasDinnerGap && category.includes('restaurant')) {
      suggestionType = 'meal';
      message = `Fills Day ${bestDay} dinner`;
    }

    // Check breakfast/coffee gaps
    const hasMorningGap = activeTrip.days.some((day, idx) => {
      if (day.items.length < 2) return false;
      const hasMorning = day.items.some(item => {
        const itemCat = (item.destination.category || '').toLowerCase();
        const time = parseInt(item.timeSlot?.split(':')[0] || '0');
        return (itemCat.includes('cafe') || itemCat.includes('coffee') || itemCat.includes('breakfast')) && time < 11;
      });
      if (!hasMorning) {
        bestDay = idx + 1;
        return true;
      }
      return false;
    });

    if (hasMorningGap && (category.includes('cafe') || category.includes('coffee') || category.includes('bakery'))) {
      suggestionType = 'meal';
      message = `Perfect Day ${bestDay} morning`;
    }

    // Check location proximity
    if (destination.latitude && destination.longitude) {
      for (const day of activeTrip.days) {
        for (const item of day.items) {
          if (item.destination.latitude && item.destination.longitude) {
            const distance = getDistance(
              destination.latitude,
              destination.longitude,
              item.destination.latitude,
              item.destination.longitude
            );
            if (distance < 1) { // Less than 1km
              bestDay = day.dayNumber;
              suggestionType = 'location';
              message = `Near ${item.destination.name.split(' ')[0]}`;
              break;
            }
          }
        }
        if (suggestionType === 'location') break;
      }
    }

    // Check category variety
    if (!message) {
      const categoryCount: Record<string, number> = {};
      activeTrip.days.forEach(day => {
        day.items.forEach(item => {
          const cat = item.destination.category || 'other';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      });

      if (!categoryCount[destination.category || '']) {
        suggestionType = 'variety';
        message = 'Adds variety';
      }
    }

    // Default time-based suggestion
    if (!message) {
      if (category.includes('cafe') || category.includes('coffee') || category.includes('breakfast')) {
        message = 'Great for morning';
      } else if (category.includes('museum') || category.includes('gallery')) {
        message = 'Perfect afternoon visit';
      } else if (category.includes('bar') || category.includes('cocktail')) {
        message = 'Great evening spot';
      } else if (category.includes('restaurant')) {
        message = 'Dinner option';
      } else {
        return null; // No specific suggestion
      }
      suggestionType = 'time';
    }

    return { message, type: suggestionType, day: bestDay };
  }, [activeTrip, totalItems, destination]);

  if (!suggestion) return null;

  const getIcon = () => {
    switch (suggestion.type) {
      case 'location':
        return <MapPin className="w-2.5 h-2.5" />;
      case 'meal':
        return <Clock className="w-2.5 h-2.5" />;
      case 'variety':
        return <Lightbulb className="w-2.5 h-2.5" />;
      case 'time':
      default:
        return <Route className="w-2.5 h-2.5" />;
    }
  };

  const getColor = () => {
    switch (suggestion.type) {
      case 'location':
        return 'bg-green-500/90 text-white';
      case 'meal':
        return 'bg-amber-500/90 text-white';
      case 'variety':
        return 'bg-purple-500/90 text-white';
      case 'time':
      default:
        return 'bg-blue-500/90 text-white';
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        text-[9px] font-medium uppercase tracking-wider
        ${getColor()}
        ${className}
      `}
    >
      {getIcon()}
      <span>{suggestion.message}</span>
    </div>
  );
});

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default TripContextBadge;
