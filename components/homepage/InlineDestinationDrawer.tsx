'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, MapPin, ExternalLink, Star, Bookmark, Share2, Navigation, ChevronRight, ChevronLeft } from 'lucide-react';
import { useHomepageData } from './HomepageDataProvider';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * Inline Destination Drawer - Apple Design System
 *
 * A detail pane for viewing destination details inline within a split pane layout.
 * Unlike the overlay DestinationDrawer, this renders inline without a backdrop.
 *
 * Design inspiration:
 * - Apple Mail detail pane
 * - Apple Notes sidebar
 * - Finder column view
 */

export function InlineDestinationDrawer() {
  const {
    selectedDestination,
    isDrawerOpen,
    closeDrawer,
    openDestination,
    filteredDestinations,
  } = useHomepageData();

  const [isSaved, setIsSaved] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDrawerOpen, closeDrawer]);

  // Handle share
  const handleShare = async () => {
    if (!selectedDestination) return;
    const url = `${window.location.origin}/destination/${selectedDestination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedDestination.name,
          text: selectedDestination.micro_description || `Check out ${selectedDestination.name}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // Handle directions
  const handleDirections = () => {
    if (!selectedDestination?.latitude || !selectedDestination?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`;
    window.open(url, '_blank');
  };

  // Get current index and navigate between destinations
  const currentIndex = selectedDestination
    ? filteredDestinations.findIndex(d => d.slug === selectedDestination.slug)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < filteredDestinations.length - 1;

  const goToPrev = () => {
    if (hasPrev) {
      openDestination(filteredDestinations[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      openDestination(filteredDestinations[currentIndex + 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawerOpen) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, currentIndex, filteredDestinations]);

  // Get related destinations (same city, different destination)
  const relatedDestinations = filteredDestinations
    .filter(d => d.city === selectedDestination?.city && d.slug !== selectedDestination?.slug)
    .slice(0, 4);

  if (!selectedDestination) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-[15px] text-gray-500 dark:text-gray-400">
          Select a destination to view details
        </p>
      </div>
    );
  }

  const imageUrl = selectedDestination.image || selectedDestination.image_thumbnail;

  return (
    <div className="h-full flex flex-col">
      {/* Header with navigation */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl">
        {/* Navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrev}
            disabled={!hasPrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-gray-500 dark:text-gray-400
                       hover:bg-gray-200 dark:hover:bg-white/10
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
            aria-label="Previous destination"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            disabled={!hasNext}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-gray-500 dark:text-gray-400
                       hover:bg-gray-200 dark:hover:bg-white/10
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors"
            aria-label="Next destination"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="ml-2 text-[12px] text-gray-400 dark:text-gray-500 tabular-nums">
            {currentIndex + 1} / {filteredDestinations.length}
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={closeDrawer}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-gray-500 dark:text-gray-400
                     hover:bg-gray-200 dark:hover:bg-white/10
                     transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scroll container */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Header Image */}
        <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={selectedDestination.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            {selectedDestination.michelin_stars && selectedDestination.michelin_stars > 0 && (
              <div className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md
                              text-[11px] font-medium text-gray-800 dark:text-white
                              flex items-center gap-1">
                <img src="/michelin-star.svg" alt="Michelin" className="w-3 h-3" />
                {selectedDestination.michelin_stars} Star{selectedDestination.michelin_stars > 1 ? 's' : ''}
              </div>
            )}
            {selectedDestination.crown && (
              <div className="px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md
                              text-[11px] font-medium text-white
                              flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Crown
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title & Category */}
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white tracking-tight mb-0.5">
              {selectedDestination.name}
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {selectedDestination.category && capitalizeCategory(selectedDestination.category)}
              {selectedDestination.category && selectedDestination.city && ' · '}
              {selectedDestination.city && capitalizeCity(selectedDestination.city)}
              {selectedDestination.neighborhood && `, ${selectedDestination.neighborhood}`}
            </p>
          </div>

          {/* Action Buttons - Compact Apple style */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`flex-1 h-9 rounded-[10px] text-[13px] font-medium
                          flex items-center justify-center gap-1.5 transition-all
                          ${isSaved
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                          }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 h-9 rounded-[10px] bg-gray-100 dark:bg-white/10
                         text-[13px] font-medium text-gray-700 dark:text-white
                         flex items-center justify-center gap-1.5
                         hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            {(selectedDestination.latitude && selectedDestination.longitude) && (
              <button
                onClick={handleDirections}
                className="flex-1 h-9 rounded-[10px] bg-gray-100 dark:bg-white/10
                           text-[13px] font-medium text-gray-700 dark:text-white
                           flex items-center justify-center gap-1.5
                           hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Go
              </button>
            )}
          </div>

          {/* Description */}
          {(selectedDestination.micro_description || selectedDestination.description) && (
            <div className="mb-5">
              <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">
                {selectedDestination.micro_description || selectedDestination.description}
              </p>
            </div>
          )}

          {/* Details List - Compact */}
          <div className="border-t border-gray-200 dark:border-white/10 pt-4 mb-5 space-y-0">
            {/* Rating */}
            {selectedDestination.rating && (
              <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/5">
                <span className="text-[13px] text-gray-500 dark:text-gray-400">Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                    {selectedDestination.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            {/* Price Level */}
            {selectedDestination.price_level && (
              <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/5">
                <span className="text-[13px] text-gray-500 dark:text-gray-400">Price</span>
                <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                  {'$'.repeat(selectedDestination.price_level)}
                </span>
              </div>
            )}

            {/* Tags */}
            {selectedDestination.tags && selectedDestination.tags.length > 0 && (
              <div className="py-3">
                <div className="flex flex-wrap gap-1.5">
                  {selectedDestination.tags.slice(0, 5).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10
                                 text-[12px] text-gray-600 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* View Full Page Link */}
          <Link
            href={`/destination/${selectedDestination.slug}`}
            className="flex items-center justify-between w-full py-3 px-3.5
                       bg-gray-50 dark:bg-white/5 rounded-[10px]
                       hover:bg-gray-100 dark:hover:bg-white/10 transition-colors mb-5"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                View full page
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          {/* Related Destinations */}
          {relatedDestinations.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                More in {capitalizeCity(selectedDestination.city)}
              </h3>
              <div className="space-y-2">
                {relatedDestinations.map((dest) => (
                  <button
                    key={dest.slug}
                    onClick={() => openDestination(dest)}
                    className="flex items-center gap-2.5 w-full p-2 rounded-[10px]
                               hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-[8px] bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      {(dest.image || dest.image_thumbnail) && (
                        <Image
                          src={dest.image_thumbnail || dest.image || ''}
                          alt={dest.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                        {dest.name}
                      </p>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                        {dest.category && capitalizeCategory(dest.category)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InlineDestinationDrawer;
