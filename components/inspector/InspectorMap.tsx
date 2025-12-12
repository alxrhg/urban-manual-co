'use client';

import dynamic from 'next/dynamic';
import { Destination } from '@/types/destination';

/**
 * InspectorMap - Unified map section for destination detail views
 *
 * Displays a static map with a pin at the destination location.
 * Used in both:
 * - Homepage floating drawer (DestinationDrawer)
 * - Trip Studio pinned right panel
 *
 * Dynamically loads GoogleStaticMap to optimize initial bundle size.
 */

// Dynamically import GoogleStaticMap for performance
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2" />
        <span className="text-xs text-gray-600 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  ),
});

export interface InspectorMapProps {
  destination: Destination;
  /** Enriched data from Google Places API (may contain latitude/longitude) */
  enrichedData?: {
    latitude?: number;
    longitude?: number;
    [key: string]: unknown;
  } | null;
  /** Map height (default: "192px" for h-48) */
  height?: string;
  /** Zoom level (default: 15) */
  zoom?: number;
  /** Whether to show the section header */
  showHeader?: boolean;
  /** Additional className for the container */
  className?: string;
}

export function InspectorMap({
  destination,
  enrichedData,
  height = '192px',
  zoom = 15,
  showHeader = true,
  className = '',
}: InspectorMapProps) {
  const latitude = destination.latitude || enrichedData?.latitude;
  const longitude = destination.longitude || enrichedData?.longitude;

  // Don't render if no coordinates
  if (!latitude || !longitude) {
    return null;
  }

  return (
    <div className={className}>
      {showHeader && (
        <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">
          Location
        </h3>
      )}
      <div
        className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800"
        style={{ height }}
      >
        <GoogleStaticMap
          center={{
            lat: latitude,
            lng: longitude,
          }}
          zoom={zoom}
          height={height}
          className="rounded-2xl"
          showPin={true}
        />
      </div>
    </div>
  );
}

export default InspectorMap;
