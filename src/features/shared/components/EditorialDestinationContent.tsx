'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, Phone, Navigation } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

interface EditorialDestinationContentProps {
  destination: Destination;
  onClose?: () => void;
}

/**
 * EditorialDestinationContent - "Of Study" inspired destination card
 *
 * A printed card aesthetic with:
 * - Single square image at top (1:1)
 * - Minimal text - only essential information
 * - Serif typography - editorial, not UI
 * - Extreme whitespace
 * - URL anchored at bottom
 */
export function EditorialDestinationContent({
  destination,
  onClose,
}: EditorialDestinationContentProps) {
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const imageUrl = destination.image || destination.image_thumbnail;
  const cityName = destination.city ? capitalizeCity(destination.city) : '';
  const categoryName = destination.category ? capitalizeCategory(destination.category) : '';

  // Extract clean domain from website URL
  const getCleanUrl = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace('www.', '');
    }
  };

  const websiteUrl = destination.website
    ? destination.website.startsWith('http')
      ? destination.website
      : `https://${destination.website}`
    : null;

  const handleDirections = useCallback(() => {
    if (!destination.latitude || !destination.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    window.open(url, '_blank');
  }, [destination.latitude, destination.longitude]);

  return (
    <div className="flex flex-col min-h-full bg-[var(--editorial-bg)]">
      {/* Square Hero Image */}
      <div className="relative aspect-square w-full bg-[var(--editorial-border)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
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

      {/* Content - Editorial Layout */}
      <div className="flex flex-col flex-1 px-8 sm:px-10 pt-8 sm:pt-10 pb-8 sm:pb-10">
        {/* Category · Location Label */}
        <p className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] font-medium text-[var(--editorial-text-tertiary)]">
          {categoryName}
          {categoryName && cityName && ' · '}
          {cityName}
        </p>

        {/* Venue Name - Large Serif */}
        <h1 className="font-editorial-serif text-[28px] sm:text-[32px] font-normal tracking-tight text-[var(--editorial-text-primary)] leading-[1.15] mt-5 sm:mt-6">
          {destination.name}
        </h1>

        {/* Description - Serif, Comfortable Reading */}
        {(destination.micro_description || destination.description) && (
          <p className="font-editorial-serif text-[16px] sm:text-[17px] text-[var(--editorial-text-secondary)] leading-[1.7] mt-6 sm:mt-8">
            {destination.micro_description || destination.description}
          </p>
        )}

        {/* Expandable "More Info" Section */}
        {showMoreInfo && (
          <div className="mt-8 pt-8 border-t border-[var(--editorial-border)]">
            {/* Hours */}
            {destination.opening_hours_json && (
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-[var(--editorial-text-tertiary)] mb-3">
                  Hours
                </p>
                <div className="font-editorial-serif text-[15px] text-[var(--editorial-text-secondary)] leading-relaxed">
                  {Object.entries(destination.opening_hours_json).map(([day, hours]) => (
                    <p key={day} className="capitalize">{day}: {String(hours)}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            {destination.formatted_address && (
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-[var(--editorial-text-tertiary)] mb-3">
                  Address
                </p>
                <p className="font-editorial-serif text-[15px] text-[var(--editorial-text-secondary)] leading-relaxed">
                  {destination.formatted_address}
                </p>
              </div>
            )}

            {/* Phone */}
            {destination.phone_number && (
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-[var(--editorial-text-tertiary)] mb-3">
                  Phone
                </p>
                <a
                  href={`tel:${destination.phone_number}`}
                  className="font-editorial-serif text-[15px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                >
                  {destination.phone_number}
                </a>
              </div>
            )}

            {/* Map / Directions */}
            {destination.latitude && destination.longitude && (
              <button
                onClick={handleDirections}
                className="flex items-center gap-2 text-[14px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors mt-4"
              >
                <Navigation className="w-4 h-4" />
                Get directions
              </button>
            )}
          </div>
        )}

        {/* Spacer to push URL to bottom */}
        <div className="flex-1 min-h-12 sm:min-h-16" />

        {/* Bottom: URL and More Info Toggle */}
        <div className="flex items-center justify-between pt-4">
          {/* Website URL - Anchored at bottom */}
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] sm:text-[14px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
            >
              {getCleanUrl(destination.website || '')}
            </a>
          ) : (
            <span />
          )}

          {/* More Info Toggle */}
          {(destination.formatted_address || destination.phone_number || destination.opening_hours_json) && (
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
  );
}

export default EditorialDestinationContent;
