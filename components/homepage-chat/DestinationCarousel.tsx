'use client';

import { useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Star, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessageDestination } from './ChatMessage';

interface DestinationCarouselProps {
  destinations: ChatMessageDestination[];
  onDestinationClick?: (destination: ChatMessageDestination) => void;
  title?: string;
  className?: string;
}

export const DestinationCarousel = memo(function DestinationCarousel({
  destinations,
  onDestinationClick,
  title,
  className,
}: DestinationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = 260; // Card width + gap
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!destinations.length) return null;

  return (
    <div className={cn('relative', className)}>
      {/* Title */}
      {title && (
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {destinations.length} places
          </span>
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </motion.button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </motion.button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2 -mx-1 px-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {destinations.map((destination, idx) => (
            <CarouselCard
              key={destination.slug}
              destination={destination}
              onClick={() => onDestinationClick?.(destination)}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// Individual carousel card
interface CarouselCardProps {
  destination: ChatMessageDestination;
  onClick?: () => void;
  index: number;
}

function CarouselCard({ destination, onClick, index }: CarouselCardProps) {
  const { name, city, category, image, michelin_stars, crown, rating, neighborhood } = destination;

  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex-shrink-0 w-[200px] text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-200"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Image */}
      <div className="relative aspect-[3/2] bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {crown && (
            <span className="text-base drop-shadow-md" title="Crown Selection">
              👑
            </span>
          )}
          {michelin_stars && michelin_stars > 0 && (
            <span className="bg-white/95 dark:bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
              ⭐ {michelin_stars}
            </span>
          )}
        </div>

        {/* Rating Badge */}
        {rating && rating > 0 && (
          <div className="absolute bottom-2 right-2 bg-white/95 dark:bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 shadow-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </div>
        )}

        {/* View Button (hover) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-3 py-1.5 bg-white dark:bg-gray-900 rounded-full text-xs font-medium text-gray-900 dark:text-white shadow-lg flex items-center gap-1.5">
            View <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-medium text-sm leading-tight line-clamp-2 text-gray-900 dark:text-white mb-1">
          {name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize line-clamp-1">
          {neighborhood || city.replace(/-/g, ' ')} · {category}
        </p>
      </div>
    </motion.button>
  );
}

// Compact horizontal scroll for limited space
interface CompactCarouselProps {
  destinations: ChatMessageDestination[];
  onDestinationClick?: (destination: ChatMessageDestination) => void;
  className?: string;
}

export function CompactCarousel({
  destinations,
  onDestinationClick,
  className,
}: CompactCarouselProps) {
  if (!destinations.length) return null;

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto scrollbar-hide pb-1',
        className
      )}
    >
      {destinations.slice(0, 8).map((destination) => (
        <motion.button
          key={destination.slug}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDestinationClick?.(destination)}
          className="flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {destination.image && (
            <img
              src={destination.image}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
            {destination.name}
          </span>
        </motion.button>
      ))}
      {destinations.length > 8 && (
        <span className="flex-shrink-0 flex items-center px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400">
          +{destinations.length - 8} more
        </span>
      )}
    </div>
  );
}
