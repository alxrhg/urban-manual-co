"use client";

import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import { formatTripDateRange, calculateTripDays } from "@/lib/utils";

interface Trip {
  id: string | number;
  name: string;
  coverImage?: string | null;
  city?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  daysCount?: number;
  [key: string]: any;
}

interface TripCardProps {
  trip: Trip;
  onView?: () => void;
  onEdit?: () => void;
}

// Status badge styling
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return {
        label: 'Planning',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    case 'ongoing':
      return {
        label: 'Ongoing',
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        dot: 'bg-green-500 animate-pulse',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-neutral-100 dark:bg-neutral-800',
        text: 'text-neutral-600 dark:text-neutral-400',
        dot: 'bg-neutral-400',
      };
    default:
      return null;
  }
}

export default function TripCard({ trip, onView, onEdit }: TripCardProps) {
  const statusConfig = getStatusConfig(trip.status);
  const daysCount = trip.daysCount || calculateTripDays(trip.startDate, trip.endDate);
  const dateDisplay = formatTripDateRange(trip.startDate, trip.endDate);

  return (
    <UMCard
      className="overflow-hidden group hover:shadow-lg transition-shadow duration-200"
      onClick={onView}
    >
      {/* Cover Image with Gradient Overlay */}
      <div className="relative h-44 sm:h-48 bg-neutral-100 dark:bg-neutral-800">
        {trip.coverImage ? (
          <>
            <Image
              src={trip.coverImage}
              alt={trip.name}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
          </div>
        )}

        {/* Status Badge - Top Right */}
        {statusConfig && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} backdrop-blur-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
        )}

        {/* Trip Info Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2 drop-shadow-sm">
            {trip.name}
          </h3>

          {/* Meta Row */}
          <div className="flex items-center gap-3 mt-2 text-white/90 text-sm">
            {trip.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.city}
              </span>
            )}
            {daysCount && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {daysCount} {daysCount === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section with Dates & Actions */}
      <div className="p-4 space-y-3">
        {/* Date Range */}
        {dateDisplay && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {dateDisplay}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <UMActionPill
            onClick={(e) => {
              e?.stopPropagation();
              onView?.();
            }}
            className="flex-1 justify-center"
          >
            View Trip
          </UMActionPill>
          {onEdit && (
            <UMActionPill
              onClick={(e) => {
                e?.stopPropagation();
                onEdit?.();
              }}
            >
              Edit
            </UMActionPill>
          )}
        </div>
      </div>
    </UMCard>
  );
}
