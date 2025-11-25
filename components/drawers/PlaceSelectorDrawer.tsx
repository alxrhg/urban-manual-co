'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Search, MapPin, Loader2 } from 'lucide-react';
import type { Destination } from '@/types/destination';

const CATEGORIES = ['All', 'Dining', 'Cafe', 'Bar', 'Culture', 'Shopping', 'Hotel'];

interface PlaceSelectorDrawerProps {
  tripId?: string;
  dayNumber?: number;
  city?: string | null;
  onSelect?: (destination: Destination) => void;
  // Legacy props
  day?: any;
  trip?: any;
  index?: number;
  mealType?: string | null;
  replaceIndex?: number | null;
}

export default function PlaceSelectorDrawer({
  tripId,
  dayNumber,
  city,
  onSelect,
  // Legacy
  day,
  trip,
  index,
  mealType,
  replaceIndex,
}: PlaceSelectorDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine city from props
  const searchCity = city || trip?.destination || null;

  useEffect(() => {
    fetchPlaces();
  }, [query, category, searchCity]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      if (!supabase) return;

      let q = supabase
        .from('destinations')
        .select('slug, name, city, category, image, image_thumbnail, micro_description')
        .order('name', { ascending: true })
        .limit(20);

      // Filter by city if set
      if (searchCity) {
        q = q.ilike('city', `%${searchCity}%`);
      }

      // Filter by category
      if (category !== 'All') {
        q = q.ilike('category', `%${category}%`);
      }

      // Filter by search query
      if (query.trim()) {
        q = q.ilike('name', `%${query}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      setPlaces(data || []);
    } catch (err) {
      console.error('Error fetching places:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (place: Destination) => {
    if (onSelect) {
      onSelect(place);
    }
    closeDrawer();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border-none text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                category === cat
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-500">No places found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {places.map((place) => (
              <button
                key={place.slug}
                onClick={() => handleSelect(place)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0">
                  {place.image_thumbnail || place.image ? (
                    <Image
                      src={place.image_thumbnail || place.image || ''}
                      alt={place.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {place.name}
                  </p>
                  <p className="text-sm text-neutral-500 truncate">
                    {place.category} · {place.city}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
