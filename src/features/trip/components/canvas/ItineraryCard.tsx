'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useUrbanStudio } from './useUrbanStudio';
import type { TripItem } from '@/contexts/TripBuilderContext';
import {
  MapPin,
  Clock,
  Plane,
  Hotel,
  Star,
  Sparkles,
  GripVertical,
  Trash2,
  ChevronRight,
  Moon,
  Utensils,
  Coffee,
  Wine,
  Building2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type CardVariant = 'place' | 'flight' | 'hotel' | 'night-pass';

interface ItineraryCardProps {
  item: TripItem;
  variant?: CardVariant;
  onRemove?: () => void;
  isCompact?: boolean;
  layoutId?: string;
}

// Flight-specific data (would come from item.notes in real usage)
interface FlightData {
  departure: string;
  arrival: string;
  flightNumber: string;
  airline: string;
  terminal?: string;
  gate?: string;
}

// Hotel-specific data
interface HotelData {
  checkIn?: string;
  checkOut?: string;
  roomType?: string;
  confirmationNumber?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCategoryIcon(category?: string | null) {
  if (!category) return MapPin;
  const cat = category.toLowerCase();
  if (cat.includes('restaurant') || cat.includes('dining')) return Utensils;
  if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('bakery')) return Coffee;
  if (cat.includes('bar') || cat.includes('cocktail') || cat.includes('wine')) return Wine;
  if (cat.includes('hotel') || cat.includes('resort')) return Hotel;
  if (cat.includes('museum') || cat.includes('gallery')) return Building2;
  return MapPin;
}

function detectCardVariant(item: TripItem): CardVariant {
  const category = (item.destination.category || '').toLowerCase();

  // Check notes for flight/hotel data
  if (item.notes) {
    try {
      const parsed = JSON.parse(item.notes);
      if (parsed.type === 'flight') return 'flight';
      if (parsed.type === 'hotel' || parsed.isHotel) return 'hotel';
    } catch {
      // Continue with category-based detection
    }
  }

  if (category.includes('hotel') || category.includes('resort') || category.includes('ryokan')) {
    return 'hotel';
  }

  return 'place';
}

// ============================================
// PLACE TICKET (Standard)
// ============================================

function PlaceTicket({
  item,
  onRemove,
  isCompact,
  layoutId,
}: {
  item: TripItem;
  onRemove?: () => void;
  isCompact?: boolean;
  layoutId?: string;
}) {
  const { openInspector } = useUrbanStudio();
  const dest = item.destination;
  const CategoryIcon = getCategoryIcon(dest.category);

  return (
    <motion.div
      layoutId={layoutId}
      onClick={() => openInspector(item)}
      className={`
        group relative flex items-stretch overflow-hidden cursor-pointer
        bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
        hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg
        transition-shadow duration-200
        ${isCompact ? 'h-14' : 'h-20'}
      `}
    >
      {/* Time Column */}
      <div className={`
        flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700
        bg-gray-50 dark:bg-gray-900/50
        ${isCompact ? 'w-16 px-2' : 'w-20 px-3'}
      `}>
        <span className={`font-bold text-gray-900 dark:text-white ${isCompact ? 'text-sm' : 'text-base'}`}>
          {item.timeSlot || '--:--'}
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {item.duration}m
        </span>
      </div>

      {/* Drag Handle */}
      <div className="flex-shrink-0 flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </div>

      {/* Image */}
      {!isCompact && (
        <div className="relative w-14 h-14 my-auto rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
          {dest.image || dest.image_thumbnail ? (
            <Image
              src={dest.image_thumbnail || dest.image || ''}
              alt={dest.name}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CategoryIcon className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 min-w-0 flex flex-col justify-center ${isCompact ? 'px-3' : 'px-3'}`}>
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold text-gray-900 dark:text-white truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {dest.name}
          </h4>
          {dest.michelin_stars && dest.michelin_stars > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                <Sparkles key={i} className="w-3 h-3 text-amber-500" />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="capitalize truncate">{dest.category?.replace(/_/g, ' ')}</span>
          {dest.neighborhood && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="truncate">{dest.neighborhood}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 pr-3">
        {dest.rating && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {dest.rating.toFixed(1)}
            </span>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// FLIGHT CARD (Boarding Pass Style)
// ============================================

function FlightCard({
  item,
  onRemove,
  layoutId,
}: {
  item: TripItem;
  onRemove?: () => void;
  layoutId?: string;
}) {
  // Parse flight data from notes
  let flightData: FlightData = {
    departure: 'LHR',
    arrival: 'JFK',
    flightNumber: 'BA178',
    airline: 'British Airways',
  };

  if (item.notes) {
    try {
      const parsed = JSON.parse(item.notes);
      if (parsed.departure) flightData = { ...flightData, ...parsed };
    } catch {
      // Use defaults
    }
  }

  return (
    <motion.div
      layoutId={layoutId}
      className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
    >
      {/* Boarding Pass Top */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4" />
            <span className="text-xs font-medium">{flightData.airline}</span>
          </div>
          <span className="text-xs font-mono">{flightData.flightNumber}</span>
        </div>
      </div>

      {/* Dotted Divider with Notches */}
      <div className="relative">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-950" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-950" />
        <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 mx-4" />
      </div>

      {/* Flight Details */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {flightData.departure}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {item.timeSlot || 'TBD'}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full h-px bg-gray-200 dark:bg-gray-700 relative">
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90" />
            </div>
          </div>

          {/* Arrival */}
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {flightData.arrival}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {item.duration}m flight
            </p>
          </div>
        </div>

        {/* Terminal/Gate */}
        {(flightData.terminal || flightData.gate) && (
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            {flightData.terminal && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Terminal</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{flightData.terminal}</p>
              </div>
            )}
            {flightData.gate && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Gate</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{flightData.gate}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================
// HOTEL CARD
// ============================================

function HotelCard({
  item,
  onRemove,
  layoutId,
}: {
  item: TripItem;
  onRemove?: () => void;
  layoutId?: string;
}) {
  const { openInspector } = useUrbanStudio();
  const dest = item.destination;

  // Parse hotel data from notes
  let hotelData: HotelData = {};
  if (item.notes) {
    try {
      const parsed = JSON.parse(item.notes);
      hotelData = parsed;
    } catch {
      // Use defaults
    }
  }

  return (
    <motion.div
      layoutId={layoutId}
      onClick={() => openInspector(item)}
      className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Header with image */}
      <div className="relative h-24 bg-gray-100 dark:bg-gray-700">
        {dest.image || dest.image_thumbnail ? (
          <Image
            src={dest.image_thumbnail || dest.image || ''}
            alt={dest.name}
            fill
            className="object-cover"
            sizes="350px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Hotel className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Hotel name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2">
            <Hotel className="w-4 h-4 text-white" />
            <h4 className="font-semibold text-white text-sm truncate">{dest.name}</h4>
          </div>
        </div>

        {/* Stars */}
        {dest.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-white">{dest.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Check-in/out times */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-in</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {hotelData.checkIn || item.timeSlot || '15:00'}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

          <div className="flex items-center gap-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-out</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {hotelData.checkOut || '11:00'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Confirmation number */}
        {hotelData.confirmationNumber && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Confirmation</p>
            <p className="text-sm font-mono text-gray-900 dark:text-white">{hotelData.confirmationNumber}</p>
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 left-2 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================
// NIGHT PASS (Where You Sleep)
// ============================================

function NightPass({
  item,
  layoutId,
}: {
  item: TripItem;
  layoutId?: string;
}) {
  const { openInspector } = useUrbanStudio();
  const dest = item.destination;

  return (
    <motion.div
      layoutId={layoutId}
      onClick={() => openInspector(item)}
      className="group relative overflow-hidden cursor-pointer bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl"
    >
      {/* Stars pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-2 left-4 w-1 h-1 rounded-full bg-white" />
        <div className="absolute top-4 left-12 w-0.5 h-0.5 rounded-full bg-white" />
        <div className="absolute top-3 right-8 w-1 h-1 rounded-full bg-white" />
        <div className="absolute bottom-4 left-8 w-0.5 h-0.5 rounded-full bg-white" />
        <div className="absolute bottom-3 right-4 w-1 h-1 rounded-full bg-white" />
      </div>

      <div className="relative px-4 py-3 flex items-center gap-3">
        {/* Moon icon */}
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Moon className="w-5 h-5 text-yellow-300" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/60 uppercase tracking-wide">Tonight</p>
          <h4 className="font-semibold text-white truncate">{dest.name}</h4>
        </div>

        {/* Image */}
        {(dest.image || dest.image_thumbnail) && (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={dest.image_thumbnail || dest.image || ''}
              alt={dest.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ItineraryCard({
  item,
  variant,
  onRemove,
  isCompact = false,
  layoutId,
}: ItineraryCardProps) {
  // Auto-detect variant if not specified
  const cardVariant = variant || detectCardVariant(item);

  switch (cardVariant) {
    case 'flight':
      return <FlightCard item={item} onRemove={onRemove} layoutId={layoutId} />;
    case 'hotel':
      return <HotelCard item={item} onRemove={onRemove} layoutId={layoutId} />;
    case 'night-pass':
      return <NightPass item={item} layoutId={layoutId} />;
    case 'place':
    default:
      return <PlaceTicket item={item} onRemove={onRemove} isCompact={isCompact} layoutId={layoutId} />;
  }
}
