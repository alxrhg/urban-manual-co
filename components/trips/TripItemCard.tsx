'use client';

import { memo } from 'react';
import Image from 'next/image';
import {
  GripVertical,
  Clock,
  MapPin,
  Plane,
  Trash2,
  ChevronRight,
  Star,
  Utensils,
  Coffee,
  Wine,
  Hotel,
  ShoppingBag,
  Camera,
  Landmark,
  TreePine,
  Sparkles,
  Train,
  Car
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import { getEstimatedDuration, formatDuration } from '@/lib/trip-intelligence';
import AvailabilityAlert from '@/components/trips/AvailabilityAlert';
import FlightStatusCard from '@/components/trips/FlightStatusCard';
import NearbyDiscoveries from '@/components/trips/NearbyDiscoveries';

// Category configurations with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: typeof MapPin; color: string; bgColor: string }> = {
  restaurant: { icon: Utensils, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
  cafe: { icon: Coffee, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  bar: { icon: Wine, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  hotel: { icon: Hotel, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  shop: { icon: ShoppingBag, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-900/20' },
  attraction: { icon: Camera, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20' },
  museum: { icon: Landmark, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
  park: { icon: TreePine, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  experience: { icon: Sparkles, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/20' },
};

// Get category config with fallback
function getCategoryConfig(category: string | undefined) {
  if (!category) return { icon: MapPin, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800' };
  const lowerCategory = category.toLowerCase();
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (lowerCategory.includes(key)) return config;
  }
  return { icon: MapPin, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800' };
}

interface TripItemCardProps {
  item: ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes };
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onUpdateTime?: (time: string) => void;
  onRemove?: () => void;
  onView?: () => void;
  onAddPlace?: (destination: Destination) => void;
  currentDayDate?: string | null;
  dragHandleProps?: any;
}

export const TripItemCard = memo(function TripItemCard({
  item,
  isDragging,
  isExpanded,
  onToggleExpand,
  onUpdateTime,
  onRemove,
  onView,
  onAddPlace,
  currentDayDate,
  dragHandleProps
}: TripItemCardProps) {
  const isFlight = item.parsedNotes?.type === 'flight';
  const isTrain = item.parsedNotes?.type === 'train';
  const isDrive = item.parsedNotes?.type === 'drive';
  const isTransport = isFlight || isTrain || isDrive;
  const isHotel = item.parsedNotes?.type === 'hotel' || item.parsedNotes?.isHotel;

  const category = item.destination?.category || item.parsedNotes?.category;
  const categoryConfig = getCategoryConfig(category);
  const CategoryIcon = categoryConfig.icon;
  const estimatedDuration = getEstimatedDuration(category);
  const rating = item.destination?.rating;
  const michelinStars = item.destination?.michelin_stars;

  // Transport-specific styling
  const getTransportConfig = () => {
    if (isFlight) return { icon: Plane, color: 'text-blue-500 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-100 dark:border-blue-800/50' };
    if (isTrain) return { icon: Train, color: 'text-emerald-500 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-100 dark:border-emerald-800/50' };
    if (isDrive) return { icon: Car, color: 'text-slate-500 dark:text-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-900/20', borderColor: 'border-slate-100 dark:border-slate-800/50' };
    return null;
  };
  const transportConfig = getTransportConfig();
  const TransportIcon = transportConfig?.icon || Plane;

  return (
    <div
      className={`
        group relative rounded-2xl border transition-all duration-300 ease-out
        ${isDragging
          ? 'shadow-xl shadow-black/10 dark:shadow-black/30 border-black/10 dark:border-white/20 bg-white dark:bg-gray-800 scale-[1.02] z-10'
          : 'border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/80 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20'
        }
        ${isTransport ? `${transportConfig?.bgColor} ${transportConfig?.borderColor}` : ''}
        ${isHotel ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50' : ''}
      `}
    >
      {/* Premium accent line for rated places */}
      {(rating && rating >= 4.5 || michelinStars) && !isTransport && (
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-full" />
      )}

      <div className="flex items-start gap-2.5 p-3.5">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="mt-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 touch-none transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Time Input - Premium styling */}
        <div className="mt-1 flex-shrink-0">
          <div className="relative group/time">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 opacity-0 group-hover/time:opacity-100 transition-opacity" />
            <input
              type="time"
              value={item.time || ''}
              onChange={(e) => onUpdateTime?.(e.target.value)}
              className="relative w-[80px] px-2.5 py-2 text-sm font-semibold text-center bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-gray-500 transition-all text-gray-900 dark:text-gray-100 tabular-nums"
              placeholder="--:--"
            />
          </div>
        </div>

        {/* Content Container */}
        <div
          className={`flex-1 min-w-0 flex gap-3.5 ${!isTransport && onView ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('input, button')) return;
            if (!isTransport) onView?.();
          }}
        >
          {/* Premium Thumbnail */}
          <div className={`
            relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden
            ${isTransport
              ? `${transportConfig?.bgColor} border-0`
              : 'border border-gray-100 dark:border-gray-800 shadow-sm'
            }
          `}>
            {isTransport ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`p-2 rounded-lg ${transportConfig?.bgColor}`}>
                  <TransportIcon className={`w-6 h-6 ${transportConfig?.color}`} />
                </div>
              </div>
            ) : item.destination?.image || item.destination?.image_thumbnail ? (
              <>
                <Image
                  src={item.destination.image_thumbnail || item.destination.image || ''}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="56px"
                />
                {/* Category badge overlay */}
                <div className={`absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent`} />
                <div className={`absolute bottom-1 left-1 p-1 rounded-md ${categoryConfig.bgColor}`}>
                  <CategoryIcon className={`w-2.5 h-2.5 ${categoryConfig.color}`} />
                </div>
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${categoryConfig.bgColor}`}>
                <CategoryIcon className={`w-6 h-6 ${categoryConfig.color}`} />
              </div>
            )}

            {/* Michelin stars badge */}
            {michelinStars && michelinStars > 0 && (
              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-600 shadow-lg">
                {Array.from({ length: michelinStars }).map((_, i) => (
                  <Star key={i} className="w-2 h-2 text-white fill-white" />
                ))}
              </div>
            )}
          </div>

          {/* Info Section - Enhanced */}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                {item.title}
              </h4>

              {/* Rating badge */}
              {rating && rating > 0 && !isTransport && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 flex-shrink-0">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Meta info row */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Category tag */}
              {category && !isTransport && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${categoryConfig.bgColor} ${categoryConfig.color}`}>
                  <CategoryIcon className="w-2.5 h-2.5" />
                  <span className="capitalize">{category}</span>
                </span>
              )}

              {/* Description */}
              {item.description && (
                <>
                  {category && !isTransport && <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />}
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                    {item.description}
                  </span>
                </>
              )}

              {/* Duration estimate */}
              {!isTransport && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                    <Clock className="w-2.5 h-2.5" />
                    ~{formatDuration(estimatedDuration)}
                  </span>
                </>
              )}

              {/* Flight route info */}
              {isFlight && item.parsedNotes?.from && item.parsedNotes?.to && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {item.parsedNotes.from} → {item.parsedNotes.to}
                </span>
              )}
            </div>

            {/* Availability Alert */}
            {!isTransport && item.time && (
              <div className="mt-2">
                <AvailabilityAlert
                  placeName={item.title}
                  category={category}
                  scheduledTime={item.time}
                  scheduledDate={currentDayDate}
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions - Enhanced */}
        <div className="flex items-center gap-0.5 mt-1.5">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isExpanded
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-inner'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:text-gray-600 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content - Enhanced */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-0 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="ml-[94px] pt-3 border-t border-gray-100 dark:border-gray-800/50">
            {isFlight && item.parsedNotes && (
              <FlightStatusCard
                flight={item.parsedNotes}
                departureDate={item.parsedNotes.departureDate}
              />
            )}
            {!isTransport && item.parsedNotes && onAddPlace && (
              <NearbyDiscoveries
                currentPlace={{
                  name: item.title,
                  latitude: (item.parsedNotes?.latitude ?? item.destination?.latitude) || undefined,
                  longitude: (item.parsedNotes?.longitude ?? item.destination?.longitude) || undefined,
                  city: item.destination?.city,
                }}
                excludeSlugs={[]}
                onAddPlace={onAddPlace}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

