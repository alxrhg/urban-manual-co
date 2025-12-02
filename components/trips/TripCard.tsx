"use client";

import Image from "next/image";
import { Calendar, MapPin, ArrowUpRight, Plane, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  itemsCount?: number;
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
        bg: 'bg-blue-500/10 backdrop-blur-md',
        text: 'text-blue-500',
        dot: 'bg-blue-500',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: 'bg-amber-500/10 backdrop-blur-md',
        text: 'text-amber-500',
        dot: 'bg-amber-500',
      };
    case 'ongoing':
      return {
        label: 'Ongoing',
        bg: 'bg-green-500/10 backdrop-blur-md',
        text: 'text-green-500',
        dot: 'bg-green-500 animate-pulse',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-emerald-500/20 backdrop-blur-md',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400',
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
    <Card
      className="group relative cursor-pointer border-0 ring-1 ring-black/5 dark:ring-white/10"
      onClick={onView}
    >
      {/* Cover Image & Overlay */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {trip.coverImage ? (
          <Image
            src={trip.coverImage}
            alt={trip.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <div className="flex flex-col items-center gap-2">
              {trip.city ? (
                <>
                  <MapPin className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{trip.city}</span>
                </>
              ) : (
                <>
                  <Plane className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  <span className="text-xs font-medium text-gray-300 dark:text-gray-600">Add cover photo</span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Full gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
        
        {/* Hover overlay for interaction hint */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

        {/* Status Badge */}
        {statusConfig && (
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text} ring-1 ring-white/10`}>
            <span className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
        )}

        {/* View Action - Top Right (Visible on Hover) */}
        <div className="absolute top-3 right-3 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Content - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-xl font-medium text-white mb-2 leading-tight">
            {trip.name}
          </h3>

          <div className="flex flex-col gap-1.5">
            {/* Location & Duration Line */}
            <div className="flex items-center gap-3 text-sm text-white/90 font-medium">
              {trip.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 opacity-70" />
                  {trip.city}
                </span>
              )}
              {trip.city && daysCount && <span className="w-0.5 h-0.5 rounded-full bg-white/40" />}
              {daysCount && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 opacity-70" />
                  {daysCount} {daysCount === 1 ? 'day' : 'days'}
                </span>
              )}
              {trip.itemsCount !== undefined && trip.itemsCount > 0 && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-white/40" />
                  <span className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 opacity-70" />
                    {trip.itemsCount} {trip.itemsCount === 1 ? 'place' : 'places'}
                  </span>
                </>
              )}
            </div>

            {/* Date Range */}
            {dateDisplay && (
              <p className="text-xs text-white/60 font-medium tracking-wide uppercase">
                {dateDisplay}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
