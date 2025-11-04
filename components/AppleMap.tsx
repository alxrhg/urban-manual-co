'use client';

import { useEffect, useRef, useState } from 'react';
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build Apple Maps URL for fallback
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

  useEffect(() => {
    // Try to load Leaflet for real map
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import('leaflet');
        
        // Load Leaflet CSS dynamically
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
        }
        
        if (!mapRef.current || mapInstanceRef.current) return;

        // Fix default marker icon issue
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map
        const map = L.default.map(mapRef.current, {
          center: latitude && longitude ? [latitude, longitude] : [0, 0],
          zoom: latitude && longitude ? 15 : 2,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        // Use OpenStreetMap tiles
        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add marker if we have coordinates
        if (latitude && longitude) {
          const marker = L.default.marker([latitude, longitude]).addTo(map);
          marker.bindPopup(query || 'Location').openPopup();
        } else if (query) {
          // Geocode the query using Nominatim (OpenStreetMap geocoding)
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            .then(res => res.json())
            .then(data => {
              if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                map.setView([lat, lon], 15);
                
                const marker = L.default.marker([lat, lon]).addTo(map);
                marker.bindPopup(data[0].display_name || query).openPopup();
              } else {
                setError('Location not found');
              }
            })
            .catch(err => {
              console.error('Geocoding error:', err);
              setError('Failed to find location');
            });
        }

        mapInstanceRef.current = map;
        setLoaded(true);
      } catch (err: any) {
        console.error('Failed to load Leaflet:', err);
        setError('Map unavailable');
        setLoaded(true); // Set loaded to show fallback
      }
    };

    loadLeaflet();
  }, [latitude, longitude, query]);

  // Fallback: Clickable Apple Maps link
  if (error || !loaded) {
    return (
      <a
        href={appleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full ${height} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 relative group ${className}`}
        style={{ minHeight: height }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
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
      </a>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`w-full ${height} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 ${className}`}
      style={{ minHeight: height }}
    />
  );
}
