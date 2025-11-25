'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Search, MapPin, Loader2, Globe, Bookmark } from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';

const CATEGORIES = ['All', 'Dining', 'Cafe', 'Bar', 'Culture', 'Shopping', 'Hotel'];

type Tab = 'curated' | 'saved' | 'google';

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
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('curated');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Google search state
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePlace, setGooglePlace] = useState<any>(null);
  const [savedPlaces, setSavedPlaces] = useState<Destination[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedFetched, setSavedFetched] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);

  const searchCity = city || trip?.destination || null;

  useEffect(() => {
    if (tab === 'curated') {
      fetchPlaces();
    }
  }, [query, category, searchCity, tab]);

  useEffect(() => {
    if (!user) {
      setSavedPlaces([]);
      setSavedFetched(false);
      setSavedError(null);
      setSavedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab !== 'saved') return;
    if (!user) return;
    if (savedFetched) return;

    let cancelled = false;

    const loadSaved = async () => {
      setSavedLoading(true);
      setSavedError(null);

      try {
        const supabase = createClient();
        if (!supabase) return;

        const { data: savedRows, error } = await supabase
          .from('saved_places')
          .select('destination_slug')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(40);

        if (error) throw error;

        const slugs = (savedRows || [])
          .map((row: { destination_slug: string | null }) => row.destination_slug)
          .filter((slug): slug is string => Boolean(slug));

        if (!slugs.length) {
          if (!cancelled) {
            setSavedPlaces([]);
            setSavedFetched(true);
          }
          return;
        }

        const { data: destinations, error: destError } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, image_thumbnail, micro_description')
          .in('slug', slugs);

        if (destError) throw destError;

        const typedDestinations = (destinations ?? []) as Destination[];
        const ordered = slugs
          .map((slug) => typedDestinations.find((d) => d.slug === slug))
          .filter((d): d is Destination => Boolean(d));

        if (!cancelled) {
          setSavedPlaces(ordered);
          setSavedFetched(true);
        }
      } catch (err) {
        console.error('Error loading saved places:', err);
        if (!cancelled) {
          setSavedError('Failed to load saved places');
        }
      } finally {
        if (!cancelled) {
          setSavedLoading(false);
        }
      }
    };

    loadSaved();

    return () => {
      cancelled = true;
    };
  }, [tab, user, savedFetched]);

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

  const handleSavedRefresh = () => {
    if (!user) return;
    setSavedFetched(false);
    if (tab !== 'saved') {
      setTab('saved');
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
      {/* Tab Switcher - Minimal style */}
      <div className="px-4 pt-4 pb-3 flex gap-4 text-xs">
        <button
          onClick={() => setTab('saved')}
          className={`transition-all ${
            tab === 'saved'
              ? 'font-medium text-black dark:text-white'
              : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
          }`}
        >
          My Places
        </button>
        <button
          onClick={() => setTab('curated')}
          className={`transition-all ${
            tab === 'curated'
              ? 'font-medium text-black dark:text-white'
              : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
          }`}
        >
          Curated
        </button>
        <button
          onClick={() => setTab('google')}
          className={`transition-all ${
            tab === 'google'
              ? 'font-medium text-black dark:text-white'
              : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
          }`}
        >
          Google
        </button>
      </div>

      {tab === 'curated' && (
        <>
          {/* Curated Search */}
          <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search curated places..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No places found</p>
                <p className="text-xs text-gray-400 mt-1">Try searching on Google tab</p>
              </div>
            ) : (
              <div className="space-y-1">
                {places.map((place) => (
                  <button
                    key={place.slug}
                    onClick={() => handleSelect(place)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
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
                          <MapPin className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {place.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {place.category} · {place.city}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'saved' && (
        <>
          <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">My Places</p>
              <p className="text-xs text-gray-500">Saved spots ready to add to your trip</p>
            </div>
            {user && (
              <button
                onClick={handleSavedRefresh}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Refresh
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {!user ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">Sign in to access My Places</p>
                <p className="text-xs text-gray-400">
                  Save destinations from the homepage to build trips faster.
                </p>
              </div>
            ) : savedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : savedError ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-gray-500 mb-2">{savedError}</p>
                <button
                  onClick={handleSavedRefresh}
                  className="text-xs text-black dark:text-white border border-gray-200 dark:border-gray-700 rounded-full px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : savedPlaces.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">No saved places yet</p>
                <p className="text-xs text-gray-400">
                  Tap the bookmark icon on any destination to store it here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {savedPlaces.map((place) => (
                  <button
                    key={place.slug}
                    onClick={() => handleSelect(place)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
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
                          <MapPin className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{place.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {place.category} · {place.city}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'google' && (
        <>
          {/* Google Search */}
          <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <GooglePlacesAutocomplete
              value={googleQuery}
              onChange={setGoogleQuery}
              onPlaceSelect={handleGooglePlaceSelect}
              placeholder="Search any place on Google..."
              types="establishment"
              className="w-full px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <p className="text-xs text-gray-400 mt-2">
              Search for restaurants, cafes, museums, hotels, and more
            </p>
          </div>

          {/* Google Place Preview */}
          <div className="flex-1 overflow-y-auto p-4">
            {googleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : googlePlace ? (
              <div className="space-y-4">
                {/* Place Card */}
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
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
                    <h3 className="text-sm font-medium">
                      {googlePlace.name}
                    </h3>
                    {googlePlace.address && (
                      <p className="text-xs text-gray-500">{googlePlace.address}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {googlePlace.category && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                          {googlePlace.category}
                        </span>
                      )}
                      {googlePlace.rating && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                          ★ {googlePlace.rating}
                        </span>
                      )}
                      {googlePlace.price_level && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                          {'$'.repeat(googlePlace.price_level)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddGooglePlace}
                  className="w-full py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition"
                >
                  Add to Day {dayNumber || (index !== undefined ? index + 1 : '')}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Search for a place above</p>
                <p className="text-xs text-gray-400 mt-1">
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
