'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TripCanvas } from '@/components/trip/canvas';
import type { Destination } from '@/types/destination';

interface TripStudioViewProps {
  city: string;
  onClose: () => void;
}

/**
 * TripStudioView - Full-screen Urban Studio canvas view
 *
 * "Drag, Drop, Done."
 * A professional-grade, split-screen workspace where inspiration meets action.
 */
export default function TripStudioView({ city, onClose }: TripStudioViewProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch destinations for the city
  const fetchDestinations = useCallback(async () => {
    if (!city) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, neighborhood, category, description, micro_description, image, image_thumbnail, latitude, longitude, rating, michelin_stars, price_level, website, phone_number')
        .ilike('city', city)
        .limit(100);

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950">
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Exit Studio (Esc)"
      >
        <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exit Studio</span>
      </button>

      {/* Canvas */}
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading studio...</p>
          </div>
        </div>
      ) : (
        <TripCanvas
          destinations={destinations}
          city={city}
        />
      )}
    </div>
  );
}
