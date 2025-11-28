'use client';

import { Car, Train, Footprints, Navigation } from 'lucide-react';
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
  speed: number;
  baseCost: number;
  perKmCost: number;
  minCost?: number;
}

const TRANSIT_MODES: TransitMode[] = [
  {
    id: 'walking',
    name: 'Walk',
    icon: <Footprints className="w-3 h-3" />,
    speed: 5,
    baseCost: 0,
    perKmCost: 0,
  },
  {
    id: 'transit',
    name: 'Metro',
    icon: <Train className="w-3 h-3" />,
    speed: 25,
    baseCost: 2.5,
    perKmCost: 0,
    minCost: 2,
  },
  {
    id: 'rideshare',
    name: 'Uber',
    icon: <Car className="w-3 h-3" />,
    speed: 30,
    baseCost: 5,
    perKmCost: 1.5,
    minCost: 8,
  },
];

function formatTime(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function formatCost(cost: number): string {
  if (cost === 0) return '';
  return `$${Math.round(cost)}`;
}

export default function TransitOptions({
  fromLat,
  fromLon,
  toLat,
  toLon,
  className = '',
  compact = false,
}: TransitOptionsProps) {
  const baseTravel = calculateTravelTime(fromLat, fromLon, toLat, toLon, 'walking');

  if (!baseTravel || baseTravel.distance < 0.3) {
    return null;
  }

  const distance = baseTravel.distance;

  const options = TRANSIT_MODES.map((mode) => {
    const minutes = (distance / mode.speed) * 60;
    let cost = mode.baseCost + distance * mode.perKmCost;
    if (mode.minCost && cost < mode.minCost) {
      cost = mode.minCost;
    }
    return { ...mode, minutes, cost, distance };
  });

  // Don't show walking if > 2.5km
  const filteredOptions = options.filter(
    (opt) => !(opt.id === 'walking' && distance > 2.5)
  );

  // Compact: single line with options
  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-1.5 text-[10px] text-stone-400 ${className}`}>
        <Navigation className="w-3 h-3" />
        {filteredOptions.map((opt, i) => (
          <span key={opt.id} className="flex items-center gap-1">
            {opt.icon}
            <span>{formatTime(opt.minutes)}</span>
            {opt.cost > 0 && <span className="opacity-60">{formatCost(opt.cost)}</span>}
            {i < filteredOptions.length - 1 && <span className="mx-1 text-stone-300">·</span>}
          </span>
        ))}
      </div>
    );
  }

  // Expanded: simple list
  return (
    <div className={`py-2 border-t border-stone-100 dark:border-gray-800 ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-2">
        <Navigation className="w-3 h-3" />
        <span>{formatDistance(distance)}</span>
      </div>
      <div className="flex gap-4">
        {filteredOptions.map((opt) => (
          <div key={opt.id} className="flex items-center gap-1.5 text-xs text-stone-500">
            <span className="text-stone-400">{opt.icon}</span>
            <span className="font-medium text-stone-700 dark:text-gray-300">{formatTime(opt.minutes)}</span>
            {opt.cost > 0 && <span className="text-stone-400">{formatCost(opt.cost)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
