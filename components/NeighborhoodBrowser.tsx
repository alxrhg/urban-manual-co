'use client';

import { useEffect, useState } from 'react';
import { MapPin, ChevronRight, Loader2 } from 'lucide-react';

interface Neighborhood {
  name: string;
  slug?: string;
  count?: number;
  description?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface NeighborhoodBrowserProps {
  city: string;
  onNeighborhoodSelect?: (neighborhood: Neighborhood) => void;
  selectedNeighborhood?: string | null;
  className?: string;
}

export function NeighborhoodBrowser({ 
  city, 
  onNeighborhoodSelect,
  selectedNeighborhood,
  className = ''
}: NeighborhoodBrowserProps) {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }

    const fetchNeighborhoods = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/intelligence/neighborhoods/${encodeURIComponent(city)}`
        );

        if (!response.ok) {
          throw new Error('Failed to load neighborhoods');
        }

        const data = await response.json();
        setNeighborhoods(data.neighborhoods || []);
      } catch (err) {
        console.error('Error fetching neighborhoods:', err);
        setError(err instanceof Error ? err.message : 'Failed to load neighborhoods');
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborhoods();
  }, [city]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 py-4 ${className}`}>
        {error}
      </div>
    );
  }

  if (!neighborhoods || neighborhoods.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Browse by Neighborhood
        </h3>
      </div>
      
      <div className="space-y-1">
        {neighborhoods.map((neighborhood, index) => (
          <button
            key={index}
            onClick={() => onNeighborhoodSelect?.(neighborhood)}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg
              text-left transition-all duration-200
              ${selectedNeighborhood === neighborhood.name
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {neighborhood.name}
                </div>
                {neighborhood.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {neighborhood.description}
                  </div>
                )}
              </div>
            </div>
            
            {neighborhood.count !== undefined && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {neighborhood.count}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Hook for using neighborhood data
export function useNeighborhoods(city: string) {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) {
      setNeighborhoods([]);
      return;
    }

    const fetchNeighborhoods = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/intelligence/neighborhoods/${encodeURIComponent(city)}`
        );

        if (!response.ok) {
          throw new Error('Failed to load neighborhoods');
        }

        const data = await response.json();
        setNeighborhoods(data.neighborhoods || []);
      } catch (err) {
        console.error('Error fetching neighborhoods:', err);
        setError(err instanceof Error ? err.message : 'Failed to load neighborhoods');
        setNeighborhoods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborhoods();
  }, [city]);

  return { neighborhoods, loading, error };
}
