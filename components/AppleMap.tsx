'use client';

import { MapPin } from 'lucide-react';

interface AppleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: string;
  className?: string;
}

export default function AppleMap({ 
  query, 
  latitude, 
  longitude, 
  height = '256px',
  className = ''
}: AppleMapProps) {
  // Build Apple Maps URL
  const buildAppleMapsUrl = () => {
    if (latitude && longitude) {
      return `https://maps.apple.com/?ll=${latitude},${longitude}&z=15`;
    }
    if (query) {
      return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
    }
    return 'https://maps.apple.com/';
  };

  const appleMapsUrl = buildAppleMapsUrl();

  return (
    <a
      href={appleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full ${height} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 relative group ${className}`}
      style={{ minHeight: height }}
    >
      {/* Map Preview - Static image or styled placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        {/* Map-like grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
        
        {/* Location marker */}
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 mx-auto shadow-lg group-hover:scale-110 transition-transform">
            <MapPin className="h-6 w-6 text-gray-900 dark:text-gray-100" />
          </div>
          {query && (
            <div className="px-4">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                {query.split(',')[0]}
              </p>
              {query.includes(',') && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {query.split(',').slice(1).join(',').trim()}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
            Tap to open in Apple Maps
          </p>
        </div>
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity rounded-lg" />
    </a>
  );
}

