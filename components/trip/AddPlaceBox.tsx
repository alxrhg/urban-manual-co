'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Search, MapPin, Loader2, Globe, Plus } from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';

const CATEGORIES = ['All', 'Dining', 'Cafe', 'Bar', 'Culture', 'Shopping', 'Hotel'];

type Tab = 'curated' | 'google';

interface AddPlaceBoxProps {
  city?: string | null;
  dayNumber?: number;
  onSelect?: (destination: Destination) => void;
  className?: string;
}

/**
 * AddPlaceBox - Inline place search and selection component
 * Replaces the Add Place drawer with an inline box for the sidebar
 */
export default function AddPlaceBox({
  city,
  dayNumber = 1,
  onSelect,
  className = '',
}: AddPlaceBoxProps) {
  const [tab, setTab] = useState<Tab>('curated');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Google search state
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePlace, setGooglePlace] = useState<any>(null);

  useEffect(() => {
    if (tab === 'curated') {
      fetchPlaces();
    }
  }, [query, category, city, tab]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      if (!supabase) return;

      let q = supabase
        .from('destinations')
        .select('slug, name, city, category, image, image_thumbnail, micro_description')
        .order('name', { ascending: true })
        .limit(8);

      if (city) {
        q = q.ilike('city', `%${city}%`);
      }

      if (category !== 'All') {
        q = q.ilike('category', `%${category}%`);
      }

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
  };

  const handleGooglePlaceSelect = async (placeDetails: any) => {
    if (!placeDetails?.placeId) return;

    try {
      setGoogleLoading(true);
      setGooglePlace(null);

      const response = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: placeDetails.placeId }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Error fetching place:', data.error);
        return;
      }

      setGooglePlace(data);
    } catch (err) {
      console.error('Error fetching Google place:', err);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAddGooglePlace = () => {
    if (!googlePlace || !onSelect) return;

    const destination: Destination = {
      slug: googlePlace.slug || `google-${googlePlace.place_id || Date.now()}`,
      name: googlePlace.name,
      city: googlePlace.city || city || '',
      category: googlePlace.category || 'Other',
      image: googlePlace.image || googlePlace.photo_url,
      image_thumbnail: googlePlace.image || googlePlace.photo_url,
      formatted_address: googlePlace.address,
      latitude: googlePlace.latitude,
      longitude: googlePlace.longitude,
      rating: googlePlace.rating,
      website: googlePlace.website,
      phone_number: googlePlace.phone,
    };

    onSelect(destination);
    setGooglePlace(null);
    setGoogleQuery('');
  };

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Add Place
          </h3>
        </div>
        <span className="text-xs text-stone-400">
          Day {dayNumber}
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 pt-3 pb-2 flex gap-4 text-xs border-b border-stone-100 dark:border-gray-800">
        <button
          onClick={() => setTab('curated')}
          className={`transition-all pb-2 ${
            tab === 'curated'
              ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
              : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
          }`}
        >
          Curated
        </button>
        <button
          onClick={() => setTab('google')}
          className={`transition-all pb-2 ${
            tab === 'google'
              ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
              : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
          }`}
        >
          Google
        </button>
      </div>

      {tab === 'curated' ? (
        <div className="p-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  category === cat
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto -mx-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="w-5 h-5 mx-auto text-stone-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-stone-400 dark:text-gray-500">No places found</p>
                <p className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">Try Google tab</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {places.map((place) => (
                  <button
                    key={place.slug}
                    onClick={() => handleSelect(place)}
                    className="w-full flex items-center gap-3 p-2 text-left hover:bg-stone-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      {place.image_thumbnail || place.image ? (
                        <Image
                          src={place.image_thumbnail || place.image || ''}
                          alt={place.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-stone-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                        {place.name}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-gray-500 truncate">
                        {place.category}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-stone-300 dark:text-gray-600 group-hover:text-stone-500 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4">
          {/* Google Search */}
          <GooglePlacesAutocomplete
            value={googleQuery}
            onChange={setGoogleQuery}
            onPlaceSelect={handleGooglePlaceSelect}
            placeholder="Search any place..."
            types="establishment"
            className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
          />
          <p className="text-xs text-stone-400 dark:text-gray-500 mt-2 mb-3">
            Search restaurants, cafes, museums, hotels...
          </p>

          {/* Google Place Preview */}
          <div className="max-h-64 overflow-y-auto">
            {googleLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              </div>
            ) : googlePlace ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-gray-800">
                  {googlePlace.image && (
                    <div className="aspect-[16/9] relative">
                      <Image
                        src={googlePlace.image}
                        alt={googlePlace.name}
                        fill
                        className="object-cover"
                        unoptimized={googlePlace.image.startsWith('/api/')}
                      />
                    </div>
                  )}
                  <div className="p-3 space-y-1.5">
                    <h4 className="text-sm font-medium text-stone-900 dark:text-white">
                      {googlePlace.name}
                    </h4>
                    {googlePlace.address && (
                      <p className="text-xs text-stone-500 dark:text-gray-400 line-clamp-2">
                        {googlePlace.address}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {googlePlace.category && (
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 rounded-full">
                          {googlePlace.category}
                        </span>
                      )}
                      {googlePlace.rating && (
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 rounded-full">
                          ★ {googlePlace.rating}
                        </span>
                      )}
                      {googlePlace.price_level && (
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 rounded-full">
                          {'$'.repeat(googlePlace.price_level)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleAddGooglePlace}
                  className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Day {dayNumber}
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Globe className="w-5 h-5 mx-auto text-stone-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-stone-400 dark:text-gray-500">Search for a place above</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
