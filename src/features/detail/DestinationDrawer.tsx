'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  MapPin,
  ExternalLink,
  Star,
  Bookmark,
  Share2,
  Navigation,
  ChevronRight,
  Check,
  Plus,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * DestinationDrawer - Apple Design System
 *
 * A slide-over drawer for viewing destination details.
 * Follows Apple's sheet/drawer patterns:
 * - Slides in from right
 * - Subtle backdrop blur
 * - Smooth spring animations
 * - Touch-friendly interactions
 */

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called when clicking a related destination. Receives the full Destination object. */
  onDestinationClick?: (destination: Destination) => void;
  relatedDestinations?: Destination[];
  // Legacy callbacks for backward compatibility with other pages
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
  onDestinationUpdate?: () => void;
  onEdit?: (destination: Destination) => void;
}

export function DestinationDrawer({
  destination,
  isOpen,
  onClose,
  onDestinationClick,
  relatedDestinations = [],
  onSaveToggle,
  onVisitToggle,
}: DestinationDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving'>('idle');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load saved/visited status
  useEffect(() => {
    async function loadStatus() {
      if (!user || !destination?.slug) {
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

      try {
        const supabase = createClient();
        const [savedResult, visitedResult] = await Promise.all([
          supabase
            .from('saved_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .maybeSingle(),
          supabase
            .from('visited_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .maybeSingle(),
        ]);

        setIsSaved(!!savedResult.data);
        setIsVisited(!!visitedResult.data);
      } catch (error) {
        console.error('Error loading status:', error);
      }
    }

    loadStatus();
  }, [user, destination?.slug]);

  // Handle save toggle
  const handleSaveToggle = useCallback(async () => {
    if (!destination?.slug) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    setSavingState('saving');
    try {
      const supabase = createClient();

      if (isSaved) {
        await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);
        setIsSaved(false);
        onSaveToggle?.(destination.slug, false);
        toast.success('Removed from saved');
      } else {
        await supabase
          .from('saved_places')
          .upsert({ user_id: user.id, destination_slug: destination.slug });
        setIsSaved(true);
        onSaveToggle?.(destination.slug, true);
        toast.success('Saved!');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Something went wrong');
    } finally {
      setSavingState('idle');
    }
  }, [user, destination?.slug, isSaved, router, toast, onSaveToggle]);

  // Handle visited toggle
  const handleVisitedToggle = useCallback(async () => {
    if (!destination?.slug) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const supabase = createClient();

      if (isVisited) {
        await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);
        setIsVisited(false);
        onVisitToggle?.(destination.slug, false);
        toast.success('Removed from visited');
      } else {
        await supabase.from('visited_places').upsert({
          user_id: user.id,
          destination_slug: destination.slug,
          visited_at: new Date().toISOString(),
        });
        setIsVisited(true);
        onVisitToggle?.(destination.slug, true);
        toast.success('Marked as visited!');
      }
    } catch (error) {
      console.error('Error toggling visited:', error);
      toast.error('Something went wrong');
    }
  }, [user, destination?.slug, isVisited, router, toast, onVisitToggle]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!destination) return;
    const url = `${window.location.origin}/destination/${destination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: destination.name,
          text: destination.micro_description || `Check out ${destination.name}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  }, [destination, toast]);

  // Handle directions
  const handleDirections = useCallback(() => {
    if (!destination?.latitude || !destination?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    window.open(url, '_blank');
  }, [destination]);

  if (!destination) return null;

  const imageUrl = destination.image || destination.image_thumbnail;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white dark:bg-[#1c1c1e]
                    shadow-2xl transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Scroll container */}
        <div className="h-full overflow-y-auto overscroll-contain">
          {/* Header Image */}
          <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={destination.name}
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
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full
                         bg-black/40 backdrop-blur-md
                         flex items-center justify-center
                         hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Badges */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <div
                  className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md
                                text-[12px] font-medium text-gray-800 dark:text-white
                                flex items-center gap-1.5"
                >
                  <img src="/michelin-star.svg" alt="Michelin" className="w-3.5 h-3.5" />
                  {destination.michelin_stars} Star{destination.michelin_stars > 1 ? 's' : ''}
                </div>
              )}
              {destination.crown && (
                <div
                  className="px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-md
                                text-[12px] font-medium text-white
                                flex items-center gap-1.5"
                >
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
                {destination.name}
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400">
                {destination.category && capitalizeCategory(destination.category)}
                {destination.category && destination.city && ' · '}
                {destination.city && capitalizeCity(destination.city)}
                {destination.neighborhood && `, ${destination.neighborhood}`}
              </p>
            </div>

            {/* Action Buttons - Apple style row */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={handleSaveToggle}
                disabled={savingState === 'saving'}
                className={`flex-1 h-11 rounded-[12px] text-[14px] font-medium
                            flex items-center justify-center gap-2 transition-all
                            ${
                              isSaved
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
              {destination.latitude && destination.longitude && (
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

            {/* Visited Button */}
            {user && (
              <button
                onClick={handleVisitedToggle}
                className={`w-full h-11 rounded-[12px] text-[14px] font-medium mb-6
                            flex items-center justify-center gap-2 transition-all
                            ${
                              isVisited
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
              >
                {isVisited ? (
                  <>
                    <Check className="w-4 h-4" />
                    Visited
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Mark as Visited
                  </>
                )}
              </button>
            )}

            {/* Description */}
            {(destination.micro_description || destination.description) && (
              <div className="mb-6">
                <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                  {destination.micro_description || destination.description}
                </p>
              </div>
            )}

            {/* Details List - Apple style */}
            <div className="border-t border-gray-200 dark:border-white/10 pt-4 mb-6">
              {/* Rating */}
              {destination.rating && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                  <span className="text-[15px] text-gray-500 dark:text-gray-400">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {destination.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}

              {/* Price Level */}
              {destination.price_level && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                  <span className="text-[15px] text-gray-500 dark:text-gray-400">Price</span>
                  <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                    {'$'.repeat(destination.price_level)}
                  </span>
                </div>
              )}

              {/* Tags */}
              {destination.tags && destination.tags.length > 0 && (
                <div className="py-3">
                  <span className="text-[15px] text-gray-500 dark:text-gray-400 block mb-2">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {destination.tags.slice(0, 5).map((tag, i) => (
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
              href={`/destination/${destination.slug}`}
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
                  More in {destination.city && capitalizeCity(destination.city)}
                </h3>
                <div className="space-y-3">
                  {relatedDestinations.slice(0, 4).map((dest) => (
                    <button
                      key={dest.slug}
                      onClick={() => onDestinationClick?.(dest)}
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
