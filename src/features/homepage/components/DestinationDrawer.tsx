'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, MapPin, ExternalLink, Star, Bookmark, Share2, Navigation, Clock, Phone, Globe, ChevronRight } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * Destination Drawer - Apple Design System
 *
 * A slide-over drawer for viewing destination details.
 * Follows Apple's sheet/drawer patterns:
 * - Slides in from right
 * - Subtle backdrop blur
 * - Smooth spring animations
 * - Touch-friendly close gestures
 */

export function DestinationDrawer() {
  const { selectedDestination, isDrawerOpen, closeDrawer, openDestination, filteredDestinations } = useHomepageData();
  const drawerRef = useRef<HTMLDivElement>(null);
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

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

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
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
    }
  };

  // Handle directions
  const handleDirections = () => {
    if (!selectedDestination?.latitude || !selectedDestination?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`;
    window.open(url, '_blank');
  };

  // Get related destinations (same city, different destination)
  const relatedDestinations = filteredDestinations
    .filter(d => d.city === selectedDestination?.city && d.slug !== selectedDestination?.slug)
    .slice(0, 4);

  if (!selectedDestination) return null;

  const imageUrl = selectedDestination.image || selectedDestination.image_thumbnail;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white dark:bg-[#1c1c1e]
                    shadow-2xl transform transition-transform duration-300 ease-out
                    ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Scroll container */}
        <div className="h-full overflow-y-auto overscroll-contain">
          {/* Header Image */}
          <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
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
                <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={closeDrawer}
              className="absolute top-4 right-4 w-10 h-10 rounded-full
                         bg-black/40 backdrop-blur-md
                         flex items-center justify-center
                         hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Badges */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              {selectedDestination.michelin_stars && selectedDestination.michelin_stars > 0 && (
                <div className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md
                                text-[12px] font-medium text-gray-800 dark:text-white
                                flex items-center gap-1.5">
                  <img src="/michelin-star.svg" alt="Michelin" className="w-3.5 h-3.5" />
                  {selectedDestination.michelin_stars} Star{selectedDestination.michelin_stars > 1 ? 's' : ''}
                </div>
              )}
              {selectedDestination.crown && (
                <div className="px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-md
                                text-[12px] font-medium text-white
                                flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  Crown
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title & Category */}
            <div className="mb-4">
              <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight mb-1">
                {selectedDestination.name}
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">
                {selectedDestination.category && capitalizeCategory(selectedDestination.category)}
                {selectedDestination.category && selectedDestination.city && ' · '}
                {selectedDestination.city && capitalizeCity(selectedDestination.city)}
                {selectedDestination.neighborhood && `, ${selectedDestination.neighborhood}`}
              </p>
            </div>

            {/* Action Buttons - Apple style */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex-1 h-11 rounded-[12px] text-[14px] font-medium
                            flex items-center justify-center gap-2 transition-all
                            ${isSaved
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                            }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 h-11 rounded-[12px] bg-gray-100 dark:bg-white/10
                           text-[14px] font-medium text-gray-900 dark:text-white
                           flex items-center justify-center gap-2
                           hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              {(selectedDestination.latitude && selectedDestination.longitude) && (
                <button
                  onClick={handleDirections}
                  className="flex-1 h-11 rounded-[12px] bg-gray-100 dark:bg-white/10
                             text-[14px] font-medium text-gray-900 dark:text-white
                             flex items-center justify-center gap-2
                             hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </button>
              )}
            </div>

            {/* Description */}
            {(selectedDestination.micro_description || selectedDestination.description) && (
              <div className="mb-6">
                <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                  {selectedDestination.micro_description || selectedDestination.description}
                </p>
              </div>
            )}

            {/* Details List - Apple style */}
            <div className="border-t border-gray-200 dark:border-white/10 pt-4 mb-6">
              {/* Rating */}
              {selectedDestination.rating && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                  <span className="text-[15px] text-gray-500 dark:text-gray-400">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {selectedDestination.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}

              {/* Price Level */}
              {selectedDestination.price_level && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                  <span className="text-[15px] text-gray-500 dark:text-gray-400">Price</span>
                  <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                    {'$'.repeat(selectedDestination.price_level)}
                  </span>
                </div>
              )}

              {/* Tags */}
              {selectedDestination.tags && selectedDestination.tags.length > 0 && (
                <div className="py-3">
                  <span className="text-[15px] text-gray-500 dark:text-gray-400 block mb-2">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDestination.tags.slice(0, 5).map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10
                                   text-[13px] text-gray-700 dark:text-gray-300"
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
              className="flex items-center justify-between w-full py-4 px-4 -mx-4
                         bg-gray-50 dark:bg-white/5 rounded-[12px]
                         hover:bg-gray-100 dark:hover:bg-white/10 transition-colors mb-6"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-gray-400" />
                <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                  View full page
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            {/* Related Destinations */}
            {relatedDestinations.length > 0 && (
              <div>
                <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  More in {capitalizeCity(selectedDestination.city)}
                </h3>
                <div className="space-y-3">
                  {relatedDestinations.map((dest) => (
                    <button
                      key={dest.slug}
                      onClick={() => openDestination(dest)}
                      className="flex items-center gap-3 w-full p-2 -mx-2 rounded-[12px]
                                 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-14 h-14 rounded-[10px] bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                        {(dest.image || dest.image_thumbnail) && (
                          <Image
                            src={dest.image_thumbnail || dest.image || ''}
                            alt={dest.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                          {dest.name}
                        </p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
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
    </>
  );
}

export default DestinationDrawer;
