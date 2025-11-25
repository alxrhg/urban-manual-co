'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Search, MapPin, Loader2, Globe, BookmarkCheck } from 'lucide-react';
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
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setTab('curated')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            tab === 'curated'
              ? 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          Curated
        </button>
        <button
          onClick={() => setTab('google')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
            tab === 'google'
              ? 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          Google
        </button>
      </div>

      {tab === 'curated' ? (
        <>
          {/* Curated Search */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search curated places..."
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

          {/* Curated Results */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-500">No places found</p>
                <p className="text-xs text-neutral-400 mt-1">Try searching on Google tab</p>
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
        </>
      ) : (
        <>
          {/* Google Search */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <GooglePlacesAutocomplete
              value={googleQuery}
              onChange={setGoogleQuery}
              onPlaceSelect={handleGooglePlaceSelect}
              placeholder="Search any place on Google..."
              types="establishment"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border-none text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
            <p className="text-xs text-neutral-400 mt-2">
              Search for restaurants, cafes, museums, hotels, and more
            </p>
          </div>

          {/* Google Place Preview */}
          <div className="flex-1 overflow-y-auto p-4">
            {googleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : googlePlace ? (
              <div className="space-y-4">
                {/* Place Card */}
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
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
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {googlePlace.name}
                    </h3>
                    {googlePlace.address && (
                      <p className="text-sm text-neutral-500">{googlePlace.address}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                      {googlePlace.category && (
                        <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                          {googlePlace.category}
                        </span>
                      )}
                      {googlePlace.rating && (
                        <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                          ★ {googlePlace.rating}
                        </span>
                      )}
                      {googlePlace.price_level && (
                        <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                          {'$'.repeat(googlePlace.price_level)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddGooglePlace}
                  className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition"
                >
                  Add to Day {dayNumber || (index !== undefined ? index + 1 : '')}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Globe className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-500">Search for a place above</p>
                <p className="text-xs text-neutral-400 mt-1">
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
