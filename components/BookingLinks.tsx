'use client';

import { ExternalLink, Phone, Calendar } from 'lucide-react';

interface Props {
  googleMapsUrl?: string | null;
  website?: string | null;
  phoneNumber?: string | null;
  opentableUrl?: string | null;
  resyUrl?: string | null;
  compact?: boolean;
}

export function BookingLinks({
  googleMapsUrl,
  website,
  phoneNumber,
  opentableUrl,
  resyUrl,
  compact = false
}: Props) {
  const hasAnyLink = googleMapsUrl || website || phoneNumber || opentableUrl || resyUrl;

  if (!hasAnyLink) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {(opentableUrl || resyUrl) && (
          <a
            href={opentableUrl || resyUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <Calendar className="h-3 w-3" />
            <span>Reserve</span>
          </a>
        )}

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>View on Maps</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-medium">Book & Visit</h3>

      <div className="space-y-2">
        {/* Reservation Links */}
        {opentableUrl && (
          <a
            href={opentableUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm">Reserve on OpenTable</span>
            </div>
            <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </a>
        )}

        {resyUrl && (
          <a
            href={resyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm">Reserve on Resy</span>
            </div>
            <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </a>
        )}

        {/* Phone Number */}
        {phoneNumber && (
          <a
            href={`tel:${phoneNumber}`}
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm">{phoneNumber}</span>
            </div>
          </a>
        )}

        {/* Website */}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm">Visit Website</span>
            </div>
            <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </a>
        )}

        {/* Google Maps */}
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm">View on Google Maps</span>
            </div>
            <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          </a>
        )}
      </div>
    </div>
  );
}
