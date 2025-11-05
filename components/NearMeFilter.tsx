'use client';

import { useState, useEffect } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface Props {
  onLocationChange: (lat: number | null, lng: number | null, radius: number) => void;
  onToggle?: (enabled: boolean) => void;
}

export function NearMeFilter({ onLocationChange, onToggle }: Props) {
  const { latitude, longitude, error, loading, requestLocation, hasLocation, permissionGranted } = useGeolocation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [radius, setRadius] = useState(5); // km
  const [showRadiusSlider, setShowRadiusSlider] = useState(false);

  useEffect(() => {
    if (isEnabled && hasLocation && latitude && longitude) {
      onLocationChange(latitude, longitude, radius);
      onToggle?.(true);
    } else if (!isEnabled) {
      onLocationChange(null, null, radius);
      onToggle?.(false);
    }
  }, [isEnabled, hasLocation, latitude, longitude, radius]);

  const handleToggle = () => {
    if (!isEnabled) {
      // Turning ON - request location
      if (!hasLocation) {
        requestLocation();
      }
      setIsEnabled(true);
      setShowRadiusSlider(true);
    } else {
      // Turning OFF
      setIsEnabled(false);
      setShowRadiusSlider(false);
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km}km`;
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
          isEnabled && hasLocation
            ? 'bg-black dark:bg-white text-white dark:text-black'
            : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Getting location...</span>
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            <span>Near Me</span>
            {isEnabled && hasLocation && (
              <>
                <span className="text-xs opacity-75">({formatDistance(radius)})</span>
                <X className="h-3 w-3 ml-1" />
              </>
            )}
          </>
        )}
      </button>

      {/* Radius Slider */}
      {showRadiusSlider && isEnabled && hasLocation && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-lg z-10 min-w-[280px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Search radius</span>
              <span className="font-medium">{formatDistance(radius)}</span>
            </div>

            <input
              type="range"
              min="0.5"
              max="25"
              step="0.5"
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-full accent-black dark:accent-white"
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>500m</span>
              <span>25km</span>
            </div>

            {latitude && longitude && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-800">
                📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && isEnabled && (
        <div className="absolute top-full mt-2 left-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 shadow-lg z-10 min-w-[280px]">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {permissionGranted === false && (
            <p className="text-xs text-red-500 dark:text-red-500 mt-2">
              Please enable location access in your browser settings
            </p>
          )}
        </div>
      )}
    </div>
  );
}
