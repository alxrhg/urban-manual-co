'use client';

import { ReactNode } from 'react';
import { Calendar, MapPin, Clock, Plane, Hotel, Utensils, ChevronRight } from 'lucide-react';

interface TripWidget {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  value?: string | number;
  onClick?: () => void;
}

interface TripWidgetsProps {
  widgets?: TripWidget[];
  tripData?: {
    startDate?: string;
    endDate?: string;
    destination?: string;
    placesCount?: number;
    flightsCount?: number;
    hotelsCount?: number;
    restaurantsCount?: number;
  };
}

/**
 * TripWidgets - Vertical stack of info widgets
 * Lovably style: minimal with border separators
 */
export default function TripWidgets({ widgets, tripData }: TripWidgetsProps) {
  // Build default widgets from trip data
  const defaultWidgets: TripWidget[] = [];

  if (tripData?.startDate || tripData?.endDate) {
    const dateRange = [tripData.startDate, tripData.endDate]
      .filter(Boolean)
      .map((d) => new Date(d!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      .join(' - ');

    defaultWidgets.push({
      id: 'dates',
      title: 'Trip Dates',
      subtitle: dateRange || 'Not set',
      icon: <Calendar className="w-5 h-5" />,
    });
  }

  if (tripData?.destination) {
    defaultWidgets.push({
      id: 'destination',
      title: 'Destination',
      subtitle: tripData.destination,
      icon: <MapPin className="w-5 h-5" />,
    });
  }

  if (tripData?.placesCount) {
    defaultWidgets.push({
      id: 'places',
      title: 'Saved Places',
      value: tripData.placesCount,
      icon: <MapPin className="w-5 h-5" />,
    });
  }

  if (tripData?.flightsCount) {
    defaultWidgets.push({
      id: 'flights',
      title: 'Flights',
      value: tripData.flightsCount,
      icon: <Plane className="w-5 h-5" />,
    });
  }

  if (tripData?.hotelsCount) {
    defaultWidgets.push({
      id: 'hotels',
      title: 'Accommodations',
      value: tripData.hotelsCount,
      icon: <Hotel className="w-5 h-5" />,
    });
  }

  if (tripData?.restaurantsCount) {
    defaultWidgets.push({
      id: 'restaurants',
      title: 'Restaurants',
      value: tripData.restaurantsCount,
      icon: <Utensils className="w-5 h-5" />,
    });
  }

  const displayWidgets = widgets || defaultWidgets;

  if (displayWidgets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0 max-w-2xl mx-auto w-full">
      {displayWidgets.map((widget, idx) => (
        <div
          key={widget.id}
          onClick={widget.onClick}
          className={`
            flex items-center gap-4 py-5 px-6
            ${idx !== displayWidgets.length - 1 ? 'border-b border-gray-100 dark:border-gray-900' : ''}
            ${widget.onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors' : ''}
          `}
        >
          {/* Icon */}
          {widget.icon && (
            <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">
              {widget.icon}
            </span>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {widget.title}
            </h3>
            {widget.subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {widget.subtitle}
              </p>
            )}
          </div>

          {/* Value or Arrow */}
          {widget.value !== undefined ? (
            <span className="text-lg font-serif text-gray-900 dark:text-white">
              {widget.value}
            </span>
          ) : widget.onClick ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
