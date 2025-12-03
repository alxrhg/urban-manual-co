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
 * InteractiveMapCard - Figma-inspired map preview card
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
    <div className={`rounded-2xl bg-gray-900/80 border border-gray-800 overflow-hidden ${className}`}>
      {/* Map Preview Area */}
      <div className="relative h-48 bg-gray-800">
        {/* Placeholder map visualization */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
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
              className="text-gray-600"
            />
            <path
              d="M100 0 L100 150"
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-600"
            />
            <path
              d="M50 0 L150 150"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-700"
            />
            <path
              d="M0 50 L200 100"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-700"
            />
          </svg>

          {/* Sample markers */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900/90 rounded text-[10px] text-white whitespace-nowrap">
                {locationName}
              </div>
            </div>
          </div>

          <div className="absolute top-1/4 right-1/4">
            <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-lg" />
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={onSearch}
          className="absolute top-3 right-3 p-2 bg-gray-900/80 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Expand Button */}
        {onExpand && (
          <button
            onClick={onExpand}
            className="absolute bottom-3 right-3 p-2 bg-gray-900/80 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
          Interactive Map
        </div>
        <div className="font-medium text-white">
          {locationName}
        </div>
      </div>
    </div>
  );
}
