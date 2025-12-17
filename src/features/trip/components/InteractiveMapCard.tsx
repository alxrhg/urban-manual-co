'use client';

import { Search, Maximize2 } from 'lucide-react';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: 'blue' | 'orange' | 'green';
  label?: string;
}

interface InteractiveMapCardProps {
  locationName?: string;
  markers?: MapMarker[];
  onExpand?: () => void;
  onSearch?: () => void;
  className?: string;
}

/**
 * InteractiveMapCard - Map preview card
 * Features: Location name, search button, map visualization placeholder
 */
export default function InteractiveMapCard({
  locationName = 'South Beach',
  markers = [],
  onExpand,
  onSearch,
  className = '',
}: InteractiveMapCardProps) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Map Preview Area */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
        {/* Placeholder map visualization */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 dark:from-gray-800 to-gray-200 dark:to-gray-900">
          {/* Stylized map pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-30"
            viewBox="0 0 200 150"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Roads */}
            <path
              d="M0 75 L200 75"
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-400 dark:text-gray-600"
            />
            <path
              d="M100 0 L100 150"
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-400 dark:text-gray-600"
            />
            <path
              d="M50 0 L150 150"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-300 dark:text-gray-700"
            />
            <path
              d="M0 50 L200 100"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-300 dark:text-gray-700"
            />
          </svg>

          {/* Sample markers */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-gray-900 shadow-lg" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 dark:bg-white rounded text-[10px] text-white dark:text-gray-900 whitespace-nowrap">
                {locationName}
              </div>
            </div>
          </div>

          <div className="absolute top-1/4 right-1/4">
            <div className="w-3 h-3 rounded-full bg-gray-600 dark:bg-gray-400 border-2 border-white dark:border-gray-900 shadow-lg" />
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={onSearch}
          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-900/80 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Expand Button */}
        {onExpand && (
          <button
            onClick={onExpand}
            className="absolute bottom-3 right-3 p-2 bg-white/90 dark:bg-gray-900/80 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
          Interactive Map
        </div>
        <div className="font-medium text-gray-900 dark:text-white">
          {locationName}
        </div>
      </div>
    </div>
  );
}
