'use client';

import { ExternalLink } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface DestinationBookingProps {
  destination: Destination;
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

export function DestinationBooking({ destination }: DestinationBookingProps) {
  const bookingLinks = [
    { url: destination.opentable_url, label: 'OpenTable', type: 'reservation' },
    { url: destination.resy_url, label: 'Resy', type: 'reservation' },
    { url: destination.booking_url, label: extractDomain(destination.booking_url || ''), type: 'booking' },
  ].filter(link => link.url);

  if (bookingLinks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Reservations
      </h4>
      <div className="flex flex-wrap gap-2">
        {bookingLinks.map((link, index) => (
          <a
            key={index}
            href={link.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            {link.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  );
}
