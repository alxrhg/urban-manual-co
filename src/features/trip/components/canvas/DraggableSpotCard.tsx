'use client';

import { useDraggable } from '@dnd-kit/core';
import Image from 'next/image';
import { GripVertical, MapPin, Star, Sparkles } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface DraggableSpotCardProps {
  destination: Destination;
}

export default function DraggableSpotCard({ destination }: DraggableSpotCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `spot-${destination.slug}`,
    data: {
      type: 'spot',
      destination,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative overflow-hidden rounded-xl border cursor-grab active:cursor-grabbing
        transition-all duration-200
        ${isDragging
          ? 'opacity-40 scale-[0.98] border-gray-300 dark:border-gray-600 shadow-none'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
      `}
      {...listeners}
      {...attributes}
    >
      {/* Image Section */}
      <div className="relative h-32 overflow-hidden bg-gray-100 dark:bg-gray-700">
        {destination.image || destination.image_thumbnail ? (
          <Image
            src={destination.image_thumbnail || destination.image || ''}
            alt={destination.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 400px) 100vw, 350px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Drag Handle */}
        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>

        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide rounded-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-700 dark:text-gray-300">
            {destination.category?.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Michelin Star */}
        {destination.michelin_stars && destination.michelin_stars > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <img src="/michelin-star.svg" alt="Michelin" className="w-3 h-3" />
            <span className="text-xs font-medium text-gray-900 dark:text-white">{destination.michelin_stars}</span>
          </div>
        )}

        {/* Rating */}
        {destination.rating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-sm">
            <img src="/google-logo.svg" alt="Google" className="w-3 h-3" />
            <span className="text-xs font-medium text-white">
              {destination.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 mb-1">
          {destination.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
          {destination.neighborhood || destination.city}
        </p>

        {/* Micro description */}
        {destination.micro_description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
            {destination.micro_description}
          </p>
        )}
      </div>

      {/* Drag hint on hover */}
      <div className={`
        absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-blue-500 to-transparent text-center
        transition-all duration-300
        ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0'}
      `}>
        <span className="text-xs font-medium text-white drop-shadow-sm">
          Drag to timeline →
        </span>
      </div>
    </div>
  );
}
