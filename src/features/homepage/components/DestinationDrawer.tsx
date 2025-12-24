'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, MapPin, Navigation } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * Destination Drawer - "Of Study" Editorial Design
 *
 * A printed card aesthetic with:
 * - Single square image at top (1:1 ratio)
 * - Minimal text - only essential information
 * - Serif typography - editorial, not UI
 * - Extreme whitespace - let content breathe
 * - Almost no UI - no buttons, badges, tabs
 * - URL anchored at bottom - like a printed card
 */

export function DestinationDrawer() {
  const { selectedDestination, isDrawerOpen, closeDrawer } = useHomepageData();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  // Reset more info state when destination changes
  useEffect(() => {
    setShowMoreInfo(false);
  }, [selectedDestination?.slug]);

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

  // Handle directions
  const handleDirections = useCallback(() => {
    if (!selectedDestination?.latitude || !selectedDestination?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`;
    window.open(url, '_blank');
  }, [selectedDestination?.latitude, selectedDestination?.longitude]);

  // Extract clean domain from website URL
  const getCleanUrl = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace('www.', '');
    }
  };

  if (!selectedDestination) return null;

  const imageUrl = selectedDestination.image || selectedDestination.image_thumbnail;
  const cityName = selectedDestination.city ? capitalizeCity(selectedDestination.city) : '';
  const categoryName = selectedDestination.category ? capitalizeCategory(selectedDestination.category) : '';

  const websiteUrl = selectedDestination.website
    ? selectedDestination.website.startsWith('http')
      ? selectedDestination.website
      : `https://${selectedDestination.website}`
    : null;

  const hasMoreInfo = selectedDestination.formatted_address ||
    selectedDestination.phone_number ||
    selectedDestination.opening_hours_json ||
    (selectedDestination.latitude && selectedDestination.longitude);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[520px]
                    bg-[var(--editorial-bg)]
                    shadow-2xl transform transition-transform duration-300 ease-out
                    ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Close Button - Subtle ✕ in corner */}
        <button
          onClick={closeDrawer}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20 p-2
                     text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]
                     transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scroll container */}
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="flex flex-col min-h-full">
            {/* Square Hero Image - The focal point */}
            <div className="relative aspect-square w-full bg-[var(--editorial-border)]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={selectedDestination.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 520px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-[var(--editorial-text-tertiary)]" />
                </div>
              )}
            </div>

            {/* Content - Editorial Layout with extreme whitespace */}
            <div className="flex flex-col flex-1 px-8 sm:px-10 pt-8 sm:pt-10 pb-8 sm:pb-10">
              {/* Category · Location Label - Small caps, spaced */}
              <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] font-medium text-[var(--editorial-text-tertiary)]">
                {categoryName}
                {categoryName && cityName && ' · '}
                {cityName}
              </p>

              {/* Venue Name - Large serif, can break to 2 lines */}
              <h1 className="font-editorial-serif text-[28px] sm:text-[32px] font-normal tracking-tight text-[var(--editorial-text-primary)] leading-[1.15] mt-5 sm:mt-6">
                {selectedDestination.name}
              </h1>

              {/* Description - Serif, comfortable reading size, warm gray */}
              {(selectedDestination.micro_description || selectedDestination.description) && (
                <p className="font-editorial-serif text-[16px] sm:text-[17px] text-[var(--editorial-text-secondary)] leading-[1.7] mt-6 sm:mt-8">
                  {selectedDestination.micro_description || selectedDestination.description}
                </p>
              )}

              {/* Expandable More Info Section - Revealed on scroll/tap */}
              {showMoreInfo && (
                <div className="mt-10 pt-8 border-t border-[var(--editorial-border)]">
                  {/* Hours */}
                  {selectedDestination.opening_hours_json && (
                    <div className="mb-8">
                      <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-[var(--editorial-text-tertiary)] mb-3">
                        Hours
                      </p>
                      <div className="font-editorial-serif text-[15px] text-[var(--editorial-text-secondary)] leading-relaxed">
                        {Object.entries(selectedDestination.opening_hours_json).map(([day, hours]) => (
                          <p key={day} className="capitalize">{day}: {String(hours)}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {selectedDestination.formatted_address && (
                    <div className="mb-8">
                      <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-[var(--editorial-text-tertiary)] mb-3">
                        Address
                      </p>
                      <p className="font-editorial-serif text-[15px] text-[var(--editorial-text-secondary)] leading-relaxed">
                        {selectedDestination.formatted_address}
                      </p>
                    </div>
                  )}

                  {/* Phone */}
                  {selectedDestination.phone_number && (
                    <div className="mb-8">
                      <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-[var(--editorial-text-tertiary)] mb-3">
                        Phone
                      </p>
                      <a
                        href={`tel:${selectedDestination.phone_number}`}
                        className="font-editorial-serif text-[15px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                      >
                        {selectedDestination.phone_number}
                      </a>
                    </div>
                  )}

                  {/* Directions */}
                  {selectedDestination.latitude && selectedDestination.longitude && (
                    <button
                      onClick={handleDirections}
                      className="flex items-center gap-2 text-[14px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Get directions
                    </button>
                  )}
                </div>
              )}

              {/* Spacer to push URL to bottom */}
              <div className="flex-1 min-h-16 sm:min-h-20" />

              {/* Bottom: URL and More Info Toggle - Like a printed card */}
              <div className="flex items-center justify-between">
                {/* Website URL - Sans-serif, small, anchored at bottom */}
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] sm:text-[14px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                  >
                    {getCleanUrl(selectedDestination.website || '')}
                  </a>
                ) : (
                  <Link
                    href={`/destination/${selectedDestination.slug}`}
                    className="text-[13px] sm:text-[14px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                  >
                    View details
                  </Link>
                )}

                {/* More Info Toggle - Subtle text link */}
                {hasMoreInfo && (
                  <button
                    onClick={() => setShowMoreInfo(!showMoreInfo)}
                    className="text-[13px] sm:text-[14px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                  >
                    {showMoreInfo ? 'Less' : 'More info'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DestinationDrawer;
