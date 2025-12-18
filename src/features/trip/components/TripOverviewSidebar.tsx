'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Plane, Hotel, UtensilsCrossed, Compass, ChevronRight, X, CheckCircle2, Clock } from 'lucide-react';
import { parseDestinations } from '@/types/trip';
import type { Trip } from '@/types/trip';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  TripCard,
  TripCardHeader,
  TripCardTitle,
  TripCardContent,
  TripButton,
} from '.';

interface TripOverviewSidebarProps {
  trip: Trip;
  days: Array<{
    dayNumber: number;
    date?: string;
    items: EnrichedItineraryItem[];
  }>;
  onClose?: () => void;
  onDayClick?: (dayNumber: number) => void;
  className?: string;
}

// Extract emoji from beginning of title if present
function extractEmoji(title: string): { emoji: string | null; text: string } {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u;
  const match = title.match(emojiRegex);
  if (match) {
    return { emoji: match[0], text: title.slice(match[0].length).trim() };
  }
  return { emoji: null, text: title };
}

// Format date for display
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * TripOverviewSidebar - Shows trip summary with stats, flights, hotels, and day breakdown
 */
export default function TripOverviewSidebar({
  trip,
  days,
  onClose,
  onDayClick,
  className = '',
}: TripOverviewSidebarProps) {
  // Parse trip data
  const { emoji, text: tripTitle } = extractEmoji(trip.title);
  const destinations = parseDestinations(trip.destination);
  const primaryCity = destinations[0] || '';

  // Calculate trip stats
  const stats = useMemo(() => {
    let flights = 0;
    let hotels = 0;
    let restaurants = 0;
    let attractions = 0;

    const flightItems: Array<{
      from: string;
      to: string;
      departureTime?: string;
      arrivalTime?: string;
      airline?: string;
      flightNumber?: string;
      confirmed: boolean;
    }> = [];

    const hotelItems: Array<{
      name: string;
      city?: string;
      checkIn?: string;
      checkOut?: string;
      image?: string;
    }> = [];

    const hotelNames = new Set<string>();

    days.forEach(day => {
      day.items.forEach(item => {
        const notes = item.parsedNotes;
        const type = notes?.type;
        const category = item.destination?.category || notes?.category || '';

        if (type === 'flight') {
          flights++;
          flightItems.push({
            from: notes?.from || '',
            to: notes?.to || '',
            departureTime: notes?.departureTime,
            arrivalTime: notes?.arrivalTime,
            airline: notes?.airline,
            flightNumber: notes?.flightNumber,
            confirmed: !!notes?.confirmationNumber,
          });
        } else if (type === 'hotel' || notes?.isHotel) {
          const hotelName = item.title || notes?.name || 'Hotel';
          if (!hotelNames.has(hotelName)) {
            hotelNames.add(hotelName);
            hotels++;
            hotelItems.push({
              name: hotelName,
              city: notes?.city || item.destination?.city,
              checkIn: notes?.checkInDate,
              checkOut: notes?.checkOutDate,
              image: notes?.image || item.destination?.image,
            });
          }
        } else if (
          category.toLowerCase().includes('restaurant') ||
          category.toLowerCase().includes('dining') ||
          category.toLowerCase() === 'food' ||
          type === 'restaurant'
        ) {
          restaurants++;
        } else if (
          item.destination?.slug ||
          category.toLowerCase().includes('attraction') ||
          category.toLowerCase().includes('museum') ||
          category.toLowerCase().includes('landmark') ||
          category.toLowerCase().includes('bar') ||
          category.toLowerCase().includes('cafe') ||
          category.toLowerCase().includes('shop')
        ) {
          attractions++;
        }
      });
    });

    return {
      days: days.length,
      cities: destinations.length,
      flights,
      hotels,
      restaurants,
      attractions,
      flightItems,
      hotelItems,
    };
  }, [days, destinations.length]);

  // Format dates
  const startDateFormatted = formatDate(trip.start_date);
  const endDateFormatted = formatDate(trip.end_date);
  const dateRange = startDateFormatted && endDateFormatted
    ? `${startDateFormatted} → ${endDateFormatted}`
    : startDateFormatted || endDateFormatted || 'No dates set';

  return (
    <TripCard className={className}>
      {/* Header */}
      <TripCardHeader>
        <div className="flex items-center gap-2">
          {emoji && <span className="text-lg">{emoji}</span>}
          <TripCardTitle>Trip Overview</TripCardTitle>
        </div>
        {onClose && (
          <TripButton variant="icon" onClick={onClose} className="-mr-1">
            <X className="w-4 h-4 text-gray-400" />
          </TripButton>
        )}
      </TripCardHeader>

      <TripCardContent className="space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {/* Cover Image */}
        {trip.cover_image && (
          <div className="relative w-full h-40 rounded-xl overflow-hidden">
            <Image
              src={trip.cover_image}
              alt={tripTitle}
              fill
              className="object-cover"
              sizes="320px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-semibold text-lg leading-tight">{tripTitle}</h3>
              <p className="text-white/80 text-sm">{primaryCity}</p>
            </div>
          </div>
        )}

        {/* Stats Grid: Days & Cities */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Calendar className="w-4 h-4" />}
            value={stats.days}
            label="Days"
            color="orange"
          />
          <StatCard
            icon={<MapPin className="w-4 h-4" />}
            value={stats.cities}
            label="Cities"
            color="blue"
          />
        </div>

        {/* Trip Breakdown */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Trip Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <BreakdownCard
              icon={<Plane className="w-4 h-4" />}
              value={stats.flights}
              label="Flights"
            />
            <BreakdownCard
              icon={<Hotel className="w-4 h-4" />}
              value={stats.hotels}
              label="Hotels"
            />
            <BreakdownCard
              icon={<UtensilsCrossed className="w-4 h-4" />}
              value={stats.restaurants}
              label="Restaurants"
            />
            <BreakdownCard
              icon={<Compass className="w-4 h-4" />}
              value={stats.attractions}
              label="Attractions"
            />
          </div>
        </div>

        {/* Dates */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Dates
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{dateRange}</span>
          </div>
        </div>

        {/* Flights */}
        {stats.flightItems.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Flights
            </h4>
            <div className="space-y-2">
              {stats.flightItems.map((flight, idx) => (
                <FlightCard key={idx} flight={flight} />
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        {stats.hotelItems.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Hotels
            </h4>
            <div className="space-y-2">
              {stats.hotelItems.map((hotel, idx) => (
                <HotelCard key={idx} hotel={hotel} />
              ))}
            </div>
          </div>
        )}

        {/* Destinations Tags */}
        {destinations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Destinations
            </h4>
            <div className="flex flex-wrap gap-2">
              {destinations.map((dest, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                >
                  {dest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Day by Day */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Day by Day
          </h4>
          <div className="space-y-2">
            {days.map((day) => {
              const dateLabel = day.date
                ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                : `Day ${day.dayNumber}`;
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => onDayClick?.(day.dayNumber)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
                      {day.dayNumber}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {dateLabel}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {day.items.length} {day.items.length === 1 ? 'activity' : 'activities'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </TripCardContent>
    </TripCard>
  );
}

// Stat card component
function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: 'orange' | 'blue';
}) {
  const colorClasses = {
    orange: 'border-orange-500/30 bg-orange-500/10',
    blue: 'border-blue-500/30 bg-blue-500/10',
  };
  const iconColors = {
    orange: 'text-orange-500',
    blue: 'text-blue-500',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={iconColors[color]}>{icon}</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// Breakdown card component
function BreakdownCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-800/50 dark:bg-gray-800/80 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-emerald-500">{icon}</span>
        <span className="text-xl font-bold text-white">{value}</span>
      </div>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// Flight card component
function FlightCard({
  flight,
}: {
  flight: {
    from: string;
    to: string;
    departureTime?: string;
    arrivalTime?: string;
    airline?: string;
    flightNumber?: string;
    confirmed: boolean;
  };
}) {
  return (
    <div className="p-3 rounded-xl bg-gray-800/50 dark:bg-gray-800/80 border border-gray-700/50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{flight.from}</span>
          <span className="text-gray-500">→</span>
          <span className="font-semibold text-white">{flight.to}</span>
          {flight.confirmed && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        {flight.flightNumber && (
          <span className="text-xs text-gray-400 font-mono">
            {flight.airline}{flight.flightNumber}
          </span>
        )}
      </div>
      {(flight.departureTime || flight.arrivalTime) && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>
            {flight.departureTime || '—'} - {flight.arrivalTime || '—'}
          </span>
          {flight.airline && <span className="text-gray-500">{flight.airline}</span>}
        </div>
      )}
    </div>
  );
}

// Hotel card component
function HotelCard({
  hotel,
}: {
  hotel: {
    name: string;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    image?: string;
  };
}) {
  const checkInFormatted = hotel.checkIn
    ? new Date(hotel.checkIn + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const checkOutFormatted = hotel.checkOut
    ? new Date(hotel.checkOut + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const dateRange = checkInFormatted && checkOutFormatted
    ? `${checkInFormatted} - ${checkOutFormatted}`
    : checkInFormatted || checkOutFormatted || '';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 dark:bg-gray-800/80 border border-gray-700/50">
      {hotel.image && (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={hotel.image}
            alt={hotel.name}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{hotel.name}</p>
        {hotel.city && (
          <p className="text-xs text-gray-400 truncate">{hotel.city}</p>
        )}
        {dateRange && (
          <p className="text-xs text-gray-500">{dateRange}</p>
        )}
      </div>
    </div>
  );
}
