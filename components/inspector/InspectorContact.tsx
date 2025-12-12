'use client';

import { ExternalLink } from 'lucide-react';
import { Destination } from '@/types/destination';

/**
 * InspectorContact - Unified contact & booking section for destination detail views
 *
 * Displays website, phone, Instagram, and booking links.
 * Used in both:
 * - Homepage floating drawer (DestinationDrawer)
 * - Trip Studio pinned right panel
 */

export interface InspectorContactProps {
  destination: Destination;
  /** Enriched data from Google Places API */
  enrichedData?: {
    website?: string;
    international_phone_number?: string;
    [key: string]: unknown;
  } | null;
  /** Whether to show section header */
  showHeader?: boolean;
  /** Additional className */
  className?: string;
}

function extractDomain(url: string): string {
  try {
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    cleanUrl = cleanUrl.split('/')[0].split('?')[0];
    return cleanUrl;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function InspectorContact({
  destination,
  enrichedData,
  showHeader = true,
  className = '',
}: InspectorContactProps) {
  const website = enrichedData?.website || destination.website;
  const phone =
    enrichedData?.international_phone_number ||
    destination.phone_number ||
    destination.reservation_phone;

  const hasContactInfo =
    website ||
    phone ||
    destination.instagram_url ||
    destination.opentable_url ||
    destination.resy_url ||
    destination.booking_url;

  if (!hasContactInfo) {
    return null;
  }

  return (
    <div className={className}>
      {showHeader && (
        <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">
          Contact & Booking
        </h3>
      )}
      <div className="flex flex-wrap gap-2">
        {/* Website */}
        {website &&
          (() => {
            const fullUrl = website.startsWith('http') ? website : `https://${website}`;
            const domain = extractDomain(website);
            return (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span>{domain}</span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            );
          })()}

        {/* Phone */}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {phone}
          </a>
        )}

        {/* Instagram */}
        {destination.instagram_url && (
          <a
            href={destination.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Instagram
          </a>
        )}

        {/* OpenTable */}
        {destination.opentable_url && (
          <a
            href={destination.opentable_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            OpenTable
          </a>
        )}

        {/* Resy */}
        {destination.resy_url && (
          <a
            href={destination.resy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Resy
          </a>
        )}

        {/* Booking */}
        {destination.booking_url && (
          <a
            href={destination.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Book Now
          </a>
        )}
      </div>
    </div>
  );
}

export default InspectorContact;
