'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDraggable } from '@dnd-kit/core';
import {
  Bookmark,
  GripVertical,
  Loader2,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Destination } from '@/types/destination';

interface SavedPlaceWithDestination {
  destination_slug: string;
  destination: Destination;
}

interface TripBucketListProps {
  destinations: string[]; // Array of city names for this trip
  onAddToTrip: (destination: Destination, dayNumber: number) => void;
  selectedDayNumber: number;
  className?: string;
}

interface DraggablePlaceCardProps {
  place: SavedPlaceWithDestination;
  onAddToTrip: (destination: Destination) => void;
}

function DraggablePlaceCard({ place, onAddToTrip }: DraggablePlaceCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bucket-${place.destination_slug}`,
    data: {
      type: 'bucket-item',
      destination: place.destination,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  const dest = place.destination;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-3 p-2 rounded-xl border border-gray-200 dark:border-gray-800
        bg-white dark:bg-gray-900 cursor-grab active:cursor-grabbing
        hover:border-gray-300 dark:hover:border-gray-700 transition-all
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
      {...listeners}
      {...attributes}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Image */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {dest.image || dest.image_thumbnail ? (
          <Image
            src={dest.image_thumbnail || dest.image || ''}
            alt={dest.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-300 dark:text-gray-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
          {dest.name}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="capitalize truncate">{dest.category?.replace(/_/g, ' ')}</span>
          {dest.rating && (
            <span className="flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              {dest.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToTrip(dest);
        }}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        title="Add to current day"
      >
        <span className="text-xs font-medium">+</span>
      </button>
    </div>
  );
}

export default function TripBucketList({
  destinations,
  onAddToTrip,
  selectedDayNumber,
  className = '',
}: TripBucketListProps) {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceWithDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch saved places that match the trip's destinations
  const fetchSavedPlaces = useCallback(async () => {
    if (!user || destinations.length === 0) {
      setSavedPlaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      // First get all saved places for the user
      const { data: savedResult, error: savedError } = await supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (savedError) throw savedError;

      if (!savedResult || savedResult.length === 0) {
        setSavedPlaces([]);
        setLoading(false);
        return;
      }

      // Get destination details
      const slugs = savedResult.map((s) => s.destination_slug);
      const { data: destData, error: destError } = await supabase
        .from('destinations')
        .select('slug, name, city, neighborhood, category, description, image, image_thumbnail, latitude, longitude, rating, michelin_stars')
        .in('slug', slugs);

      if (destError) throw destError;

      // Filter destinations that match the trip's cities (case-insensitive)
      const lowerCaseDestinations = destinations.map((d) => d.toLowerCase());
      const matchingPlaces: SavedPlaceWithDestination[] = [];

      destData?.forEach((dest) => {
        const destCity = dest.city?.toLowerCase() || '';
        if (lowerCaseDestinations.includes(destCity)) {
          matchingPlaces.push({
            destination_slug: dest.slug,
            destination: dest as Destination,
          });
        }
      });

      setSavedPlaces(matchingPlaces);
    } catch (error) {
      console.error('Error fetching saved places:', error);
    } finally {
      setLoading(false);
    }
  }, [user, destinations]);

  useEffect(() => {
    fetchSavedPlaces();
  }, [fetchSavedPlaces]);

  const handleQuickAdd = (destination: Destination) => {
    onAddToTrip(destination, selectedDayNumber);
  };

  // Don't render if no destinations
  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Bucket List
          </h3>
          {!loading && savedPlaces.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({savedPlaces.length})
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : savedPlaces.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                No saved places in
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {destinations.join(', ')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                Drag to add to itinerary
              </p>
              {savedPlaces.map((place) => (
                <DraggablePlaceCard
                  key={place.destination_slug}
                  place={place}
                  onAddToTrip={handleQuickAdd}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
