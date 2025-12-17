'use client';

import { useHomepageData } from './HomepageDataProvider';
import { ClientDestinationGrid } from './ClientDestinationGrid';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Lazy load map to reduce initial bundle
const AppleMapView = dynamic(
  () => import('./AppleMapView').then(mod => ({ default: mod.AppleMapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[70vh] rounded-2xl bg-gray-100 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="text-[14px] text-gray-500 dark:text-gray-400">Loading map...</span>
        </div>
      </div>
    ),
  }
);

/**
 * Homepage Content - Switches between Grid and Map views
 *
 * Uses viewMode from context to determine which view to show.
 * Map is lazy loaded to improve initial page load.
 */
export function HomepageContent() {
  const { viewMode } = useHomepageData();

  if (viewMode === 'map') {
    return <AppleMapView />;
  }

  return <ClientDestinationGrid />;
}

export default HomepageContent;
