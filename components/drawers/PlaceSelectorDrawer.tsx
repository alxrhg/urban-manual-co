'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Search, MapPin, Loader2, Globe } from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';

const CATEGORIES = ['All', 'Dining', 'Cafe', 'Bar', 'Culture', 'Shopping', 'Hotel'];

type Tab = 'curated' | 'google';

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
  day,
  trip,
  index,
  mealType,
  replaceIndex,
}: PlaceSelectorDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const [tab, setTab] = useState<Tab>('curated');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Google search state
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePlace, setGooglePlace] = useState<any>(null);

  const searchCity = city || trip?.destination || null;

  useEffect(() => {
    if (tab === 'curated') {
      fetchPlaces();
    }
  }, [query, category, searchCity, tab]);

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

      if (searchCity) {
        q = q.ilike('city', `%${searchCity}%`);
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
    closeDrawer();
  };

  const handleGooglePlaceSelect = async (placeDetails: any) => {
    if (!placeDetails?.placeId) return;

    try {
      setGoogleLoading(true);
      setGooglePlace(null);

      // Fetch full place details
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
    if (!googlePlace) return;

    // Convert Google place to Destination format
    const destination: Destination = {
      slug: googlePlace.slug || `google-${googlePlace.place_id || Date.now()}`,
      name: googlePlace.name,
      city: googlePlace.city || searchCity || '',
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

    if (onSelect) {
      onSelect(destination);
    }
    closeDrawer();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Switcher */}
      <div className="px-4 pt-4 pb-3 flex gap-4 text-xs">
        <button
          onClick={() => setTab('curated')}
          className={`transition-all ${
            tab === 'curated'
              ? 'font-medium text-stone-900 dark:text-white'
              : 'font-medium text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          Curated
        </button>
        <button
          onClick={() => setTab('google')}
          className={`transition-all ${
            tab === 'google'
              ? 'font-medium text-stone-900 dark:text-white'
              : 'font-medium text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          Google
        </button>
      </div>

      {tab === 'curated' ? (
        <>
          {/* Curated Search */}
          <div className="px-4 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search curated places..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none text-sm text-stone-900 dark:text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white"
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
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Curated Results */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-stone-400" />
                </div>
                <p className="text-sm text-stone-500">No places found</p>
                <p className="text-xs text-stone-400 mt-1">Try searching on Google tab</p>
              </div>
            ) : (
              <div className="space-y-1">
                {places.map((place) => (
                  <button
                    key={place.slug}
                    onClick={() => handleSelect(place)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0">
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
                          <MapPin className="w-5 h-5 text-stone-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                        {place.name}
                      </p>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {place.category} · {place.city}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Google Search */}
          <div className="px-4 pb-4 border-b border-stone-200 dark:border-stone-800">
            <GooglePlacesAutocomplete
              value={googleQuery}
              onChange={setGoogleQuery}
              onPlaceSelect={handleGooglePlaceSelect}
              placeholder="Search any place on Google..."
              types="establishment"
              className="w-full px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none text-sm text-stone-900 dark:text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white"
            />
            <p className="text-xs text-stone-400 mt-2">
              Search for restaurants, cafes, museums, hotels, and more
            </p>
          </div>

          {/* Google Place Preview */}
          <div className="flex-1 overflow-y-auto p-4">
            {googleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
              </div>
            ) : googlePlace ? (
              <div className="space-y-4">
                {/* Place Card */}
                <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
                  {googlePlace.image && (
                    <div className="aspect-video relative">
                      <Image
                        src={googlePlace.image}
                        alt={googlePlace.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                      {googlePlace.name}
                    </h3>
                    {googlePlace.address && (
                      <p className="text-xs text-stone-500">{googlePlace.address}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                      {googlePlace.category && (
                        <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-full">
                          {googlePlace.category}
                        </span>
                      )}
                      {googlePlace.rating && (
                        <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-full">
                          ★ {googlePlace.rating}
                        </span>
                      )}
                      {googlePlace.price_level && (
                        <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-full">
                          {'$'.repeat(googlePlace.price_level)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddGooglePlace}
                  className="w-full py-3 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium hover:opacity-90 transition"
                >
                  Add to Day {dayNumber || (index !== undefined ? index + 1 : '')}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-stone-400" />
                </div>
                <p className="text-sm text-stone-500">Search for a place above</p>
                <p className="text-xs text-stone-400 mt-1">
                  Results powered by Google Places
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
