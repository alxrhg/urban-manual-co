'use client';

import { Car, Train, Footprints, DollarSign, Clock, Navigation } from 'lucide-react';
import { calculateTravelTime } from '@/lib/trip-intelligence';

interface TransitOptionsProps {
  fromLat?: number | null;
  fromLon?: number | null;
  toLat?: number | null;
  toLon?: number | null;
  fromName?: string;
  toName?: string;
  className?: string;
  compact?: boolean;
}

interface TransitMode {
  id: 'walking' | 'transit' | 'rideshare';
  name: string;
  icon: React.ReactNode;
  speed: number; // km/h
  baseCost: number; // base fare
  perKmCost: number; // cost per km
  minCost?: number;
  maxCost?: number;
  color: string;
}

const TRANSIT_MODES: TransitMode[] = [
  {
    id: 'walking',
    name: 'Walk',
    icon: <Footprints className="w-3.5 h-3.5" />,
    speed: 5,
    baseCost: 0,
    perKmCost: 0,
    color: 'text-green-500',
  },
  {
    id: 'transit',
    name: 'Transit',
    icon: <Train className="w-3.5 h-3.5" />,
    speed: 25,
    baseCost: 2.5,
    perKmCost: 0,
    minCost: 2,
    maxCost: 5,
    color: 'text-blue-500',
  },
  {
    id: 'rideshare',
    name: 'Uber',
    icon: <Car className="w-3.5 h-3.5" />,
    speed: 30,
    baseCost: 5,
    perKmCost: 1.5,
    minCost: 8,
    color: 'text-gray-900 dark:text-white',
  },
];

function formatTime(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function formatCost(cost: number, min?: number, max?: number): string {
  if (cost === 0) return 'Free';
  if (min !== undefined && max !== undefined) {
    return `$${min}-${max}`;
  }
  return `~$${Math.round(cost)}`;
}

export default function TransitOptions({
  fromLat,
  fromLon,
  toLat,
  toLon,
  fromName,
  toName,
  className = '',
  compact = false,
}: TransitOptionsProps) {
  // Calculate base distance
  const baseTravel = calculateTravelTime(fromLat, fromLon, toLat, toLon, 'walking');

  if (!baseTravel || baseTravel.distance < 0.3) {
    // Too close, don't show transit options
    return null;
  }

  const distance = baseTravel.distance;

  // Calculate options for each mode
  const options = TRANSIT_MODES.map((mode) => {
    const minutes = (distance / mode.speed) * 60;
    let cost = mode.baseCost + distance * mode.perKmCost;

    // Apply min cost
    if (mode.minCost && cost < mode.minCost) {
      cost = mode.minCost;
    }

    return {
      ...mode,
      minutes,
      cost,
      distance,
    };
  });

  // Don't show walking if > 3km (would take too long)
  const filteredOptions = options.filter(
    (opt) => !(opt.id === 'walking' && distance > 3)
  );

  // Compact view: just show the fastest option inline
  if (compact) {
    const fastest = filteredOptions.reduce((a, b) => (a.minutes < b.minutes ? a : b));
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <Navigation className="w-3 h-3" />
        <span>{formatTime(fastest.minutes)}</span>
        <span className="opacity-60">({formatDistance(distance)})</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Navigation className="w-3 h-3" />
          <span className="truncate">
            {fromName && toName ? `${fromName} → ${toName}` : 'Travel options'}
          </span>
          <span className="ml-auto text-gray-400">{formatDistance(distance)}</span>
        </div>
      </div>

      {/* Options */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {filteredOptions.map((option) => (
          <div
            key={option.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
          >
            {/* Icon */}
            <div className={`${option.color}`}>{option.icon}</div>

            {/* Name */}
            <span className="text-sm font-medium text-gray-900 dark:text-white w-16">
              {option.name}
            </span>

            {/* Time */}
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatTime(option.minutes)}</span>
            </div>

            {/* Cost */}
            <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
              {option.cost > 0 && <DollarSign className="w-3 h-3" />}
              <span className={option.cost === 0 ? 'text-green-500' : ''}>
                {formatCost(option.cost, option.minCost, option.maxCost)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick tip */}
      {distance > 2 && filteredOptions.some((o) => o.id === 'walking') && (
        <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-[10px] text-green-700 dark:text-green-400">
          💡 Walking is a great way to explore the neighborhood!
        </div>
      )}
    </div>
  );
}
