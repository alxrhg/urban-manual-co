'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Star, Bookmark, Check, Share2, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTrip } from '@/contexts/TripContext';

interface StickyHeaderProps {
  destinationName: string;
  city: string;
  rating?: number;
  reviewCount?: number;
  category: string;
  isSaved: boolean;
  isVisited: boolean;
  bookingUrl?: string | null;
  onSave: () => void;
  onVisit: () => void;
  onShare: () => void;
  destinationId?: number;
  destinationSlug?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function StickyHeader({
  destinationName,
  city,
  rating,
  reviewCount,
  category,
  isSaved,
  isVisited,
  bookingUrl,
  onSave,
  onVisit,
  onShare,
  destinationId,
  destinationSlug,
}: StickyHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { addToTrip, isInCurrentTrip } = useTrip();

  const isInTrip = destinationSlug ? isInCurrentTrip(destinationSlug) : false;

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling past 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToTrip = () => {
    if (destinationId && destinationSlug) {
      addToTrip({
        destination_id: destinationId,
        destination_slug: destinationSlug,
        destination_name: destinationName,
        destination_city: city,
        destination_category: category,
      });
    }
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 transition-transform duration-300',
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/city/${city}`}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {destinationName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{capitalizeCity(city)}</span>
                {rating && (
                  <>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>{rating.toFixed(1)}</span>
                      {reviewCount && (
                        <span className="text-gray-400">({reviewCount})</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Add to Trip */}
            <button
              onClick={handleAddToTrip}
              className={cn(
                'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                isInTrip
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              {isInTrip ? 'In Trip' : 'Add to Trip'}
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Save */}
            <button
              onClick={onSave}
              className={cn(
                'p-2 rounded-full transition-colors',
                isSaved
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label={isSaved ? 'Saved' : 'Save'}
            >
              <Bookmark
                className={cn(
                  'w-4 h-4',
                  isSaved
                    ? 'fill-current'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              />
            </button>

            {/* Book Now */}
            {bookingUrl && (
              <a
                href={bookingUrl.startsWith('http') ? bookingUrl : `https://${bookingUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Book Now
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
