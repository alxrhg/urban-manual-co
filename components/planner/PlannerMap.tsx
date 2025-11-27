'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { Place } from '@/lib/intelligence/types';

interface MapPlace extends Place {
  order?: number;
  blockId?: string;
}

interface PlannerMapProps {
  /** Places from the current day's timeline (ordered) */
  places: MapPlace[];
  /** Unassigned bucket list places */
  bucketListPlaces?: Place[];
  /** Trip destination for initial centering */
  destination?: string;
  className?: string;
}

/**
 * PlannerMap - Interactive map for the split-screen planner
 * Shows numbered markers for timeline places and bucket list items
 */
export default function PlannerMap({
  places,
  bucketListPlaces = [],
  destination,
  className = '',
}: PlannerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);

  // Calculate map bounds from places
  const allPlaces = [...places, ...bucketListPlaces].filter(
    (p) => p.latitude && p.longitude
  );

  const bounds = allPlaces.length > 0
    ? {
        minLat: Math.min(...allPlaces.map((p) => p.latitude!)),
        maxLat: Math.max(...allPlaces.map((p) => p.latitude!)),
        minLng: Math.min(...allPlaces.map((p) => p.longitude!)),
        maxLng: Math.max(...allPlaces.map((p) => p.longitude!)),
      }
    : null;

  const center = bounds
    ? {
        lat: (bounds.minLat + bounds.maxLat) / 2,
        lng: (bounds.minLng + bounds.maxLng) / 2,
      }
    : { lat: 40.7128, lng: -74.006 }; // Default to NYC

  // Simulate map loading
  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative bg-gray-100 dark:bg-gray-900 ${className}`}>
      {/* Map Container */}
      <div
        ref={mapRef}
        className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800"
      >
        {/* Placeholder map background with grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #cbd5e1 1px, transparent 1px),
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Route Polyline (simplified visual representation) */}
        {places.length > 1 && mapLoaded && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                  className="text-blue-500"
                />
              </marker>
            </defs>
            {/* Draw route lines between consecutive places */}
            {places.slice(0, -1).map((place, idx) => {
              const next = places[idx + 1];
              if (!place.latitude || !place.longitude || !next.latitude || !next.longitude) {
                return null;
              }

              // Convert geo coords to viewport percentages (simplified)
              const x1 = bounds
                ? ((place.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 80 + 10
                : 50;
              const y1 = bounds
                ? (1 - (place.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 80 + 10
                : 50;
              const x2 = bounds
                ? ((next.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 80 + 10
                : 50;
              const y2 = bounds
                ? (1 - (next.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 80 + 10
                : 50;

              return (
                <line
                  key={`route-${idx}`}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="currentColor"
                  className="text-blue-500"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>
        )}

        {/* Timeline Place Markers (Numbered) */}
        {mapLoaded &&
          places.map((place, idx) => {
            if (!place.latitude || !place.longitude || !bounds) return null;

            const x = ((place.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 80 + 10;
            const y = (1 - (place.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 80 + 10;

            return (
              <button
                key={place.blockId || `place-${idx}`}
                className="absolute transform -translate-x-1/2 -translate-y-full group"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => setSelectedPlace(place)}
              >
                {/* Marker */}
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white dark:ring-gray-800 group-hover:scale-110 transition-transform">
                    {place.order || idx + 1}
                  </div>
                  {/* Pin tail */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-blue-500" />
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {place.name}
                </div>
              </button>
            );
          })}

        {/* Bucket List Markers (Different color, no numbers) */}
        {mapLoaded &&
          bucketListPlaces.map((place, idx) => {
            if (!place.latitude || !place.longitude || !bounds) return null;

            const x = ((place.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 80 + 10;
            const y = (1 - (place.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 80 + 10;

            return (
              <button
                key={`bucket-${place.id || idx}`}
                className="absolute transform -translate-x-1/2 -translate-y-full group"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => setSelectedPlace(place as MapPlace)}
              >
                <div className="relative">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-md ring-2 ring-white dark:ring-gray-800 group-hover:scale-110 transition-transform">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-6 border-l-transparent border-r-transparent border-t-amber-500" />
                </div>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {place.name}
                  <span className="ml-1 text-amber-400">(Bucket List)</span>
                </div>
              </button>
            );
          })}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg text-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            1
          </div>
          <span className="text-gray-700 dark:text-gray-300">Planned stops</span>
        </div>
        {bucketListPlaces.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white">
              <MapPin className="w-3 h-3" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Bucket list</span>
          </div>
        )}
      </div>

      {/* Selected Place Card */}
      {selectedPlace && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 max-w-xs animate-in slide-in-from-right-4">
          <button
            onClick={() => setSelectedPlace(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ×
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-white pr-6">
            {selectedPlace.name}
          </h3>
          {selectedPlace.category && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
              {selectedPlace.category}
            </p>
          )}
          {selectedPlace.address && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 flex items-start gap-1">
              <Navigation className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {selectedPlace.address}
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {allPlaces.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Add places to your timeline to see them on the map
            </p>
            {destination && (
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                Destination: {destination}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {!mapLoaded && allPlaces.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
