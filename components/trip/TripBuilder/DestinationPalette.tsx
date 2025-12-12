'use client';

import { useState, useEffect, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, Sparkles, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';

interface DestinationPaletteProps {
  city: string;
}

/**
 * DestinationPalette - Collapsible drag source for destinations
 *
 * Shows a compact list of suggested destinations that can be dragged
 * onto trip days. Expands/collapses to save space.
 */
const DestinationPalette = memo(function DestinationPalette({ city }: DestinationPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch destinations for the city
  useEffect(() => {
    if (!city) return;

    const fetchDestinations = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, image_thumbnail, image, rating')
        .eq('city', city)
        .order('rating', { ascending: false })
        .limit(12);

      setDestinations((data as Destination[]) || []);
      setIsLoading(false);
    };

    fetchDestinations();
  }, [city]);

  if (destinations.length === 0 && !isLoading) return null;

  return (
    <div className="border-t border-gray-100 dark:border-gray-800">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
            Add Places
          </span>
          <span className="text-[11px] text-gray-400">
            Drag to add
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expandable destination list */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="py-4 text-center text-[12px] text-gray-400">
              Loading suggestions...
            </div>
          ) : (
            destinations.map((destination) => (
              <DraggableDestinationCard
                key={destination.id}
                destination={destination}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

/**
 * A single draggable destination card in the palette
 */
function DraggableDestinationCard({ destination }: { destination: Destination }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${destination.id}`,
    data: {
      destination,
      source: 'palette',
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2.5 p-2 rounded-lg
        bg-gray-50 dark:bg-white/5
        hover:bg-gray-100 dark:hover:bg-white/10
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isDragging ? 'shadow-lg ring-2 ring-gray-900/10 dark:ring-white/20 z-50' : ''}
      `}
    >
      <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />

      {/* Thumbnail */}
      <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {hasImage ? (
          <Image
            src={destination.image_thumbnail || destination.image || ''}
            alt={destination.name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">
          {destination.name}
        </p>
        <p className="text-[10px] text-gray-500 truncate capitalize">
          {destination.category}
        </p>
      </div>
    </div>
  );
}

export default DestinationPalette;
