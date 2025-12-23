'use client';

import { useMemo } from 'react';
import { Calendar, MapPin, Hotel, DollarSign } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripOverviewCardsProps {
  startDate?: string | null;
  endDate?: string | null;
  days: Array<{ dayNumber: number; items: EnrichedItineraryItem[] }>;
  className?: string;
}

/**
 * TripOverviewCards - Summary cards showing trip stats at a glance
 * Displays: Duration, Places count, Hotels count, and estimated date range
 */
export default function TripOverviewCards({
  startDate,
  endDate,
  days,
  className = '',
}: TripOverviewCardsProps) {
  // Calculate trip duration
  const duration = useMemo(() => {
    if (!startDate || !endDate) return null;
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const daysDiff = differenceInDays(end, start) + 1;
      return {
        days: daysDiff,
        label: `${daysDiff} ${daysDiff === 1 ? 'Day' : 'Days'}`,
        dateRange: `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`,
      };
    } catch {
      return null;
    }
  }, [startDate, endDate]);

  // Count places and hotels
  const stats = useMemo(() => {
    let places = 0;
    let hotels = 0;
    let flights = 0;
    let restaurants = 0;

    days.forEach(day => {
      day.items.forEach(item => {
        const itemType = item.parsedNotes?.type;
        const category = item.destination?.category || item.parsedNotes?.category;

        if (itemType === 'hotel') {
          hotels++;
        } else if (itemType === 'flight') {
          flights++;
        } else if (category === 'restaurant' || category === 'cafe' || category === 'bar') {
          restaurants++;
          places++;
        } else if (item.destination || itemType === 'place') {
          places++;
        }
      });
    });

    return { places, hotels, flights, restaurants };
  }, [days]);

  const cards = [
    {
      icon: Calendar,
      value: duration?.label || '--',
      label: duration?.dateRange || 'Set dates',
      color: 'text-[var(--editorial-accent)]',
      bgColor: 'bg-[var(--editorial-accent)]/10',
    },
    {
      icon: MapPin,
      value: stats.places.toString(),
      label: stats.places === 1 ? 'Place' : 'Places',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Hotel,
      value: stats.hotels.toString(),
      label: stats.hotels === 1 ? 'Hotel' : 'Hotels',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: DollarSign,
      value: stats.flights > 0 ? `${stats.flights} Flights` : '--',
      label: stats.flights > 0 ? 'Booked' : 'No flights yet',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      {cards.map((card, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center p-4 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl transition-colors hover:border-[var(--editorial-border-subtle)]"
        >
          <div className={`p-2 rounded-full ${card.bgColor} mb-2`}>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <span
            className="text-[18px] font-medium text-[var(--editorial-text-primary)]"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            {card.value}
          </span>
          <span className="text-[11px] text-[var(--editorial-text-tertiary)] uppercase tracking-wider mt-0.5">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}
