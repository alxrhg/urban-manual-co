'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Search, MapPin, Loader2, Globe, Plus, X, Hotel, Star, Calendar } from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';

type Tab = 'curated' | 'google';

interface AddHotelBoxProps {
  city?: string | null;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onSelect?: (hotel: Destination, options: HotelOptions) => void;
  onClose?: () => void;
  className?: string;
}

interface HotelOptions {
  checkInDate?: string;
  checkOutDate?: string;
  nightStart?: number;
  nightEnd?: number;
  // Amenities from Google Places
  breakfastIncluded?: boolean;
  hasPool?: boolean;
  hasGym?: boolean;
  hasSpa?: boolean;
  hasFreeWifi?: boolean;
}

/**
 * AddHotelBox - Inline hotel search and selection component
 * Shows when "Add Hotel" button is tapped
 */
export default function AddHotelBox({
  city,
  tripStartDate,
  tripEndDate,
  onSelect,
  onClose,
  className = '',
}: AddHotelBoxProps) {
  const [tab, setTab] = useState<Tab>('curated');
  const [query, setQuery] = useState('');
  const [hotels, setHotels] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected hotel state
  const [selectedHotel, setSelectedHotel] = useState<Destination | null>(null);
  const [checkInDate, setCheckInDate] = useState(tripStartDate || '');
  const [checkOutDate, setCheckOutDate] = useState(tripEndDate || '');

  // Google search state
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePlace, setGooglePlace] = useState<any>(null);

  // Amenities from Google Places (stored when selecting a Google hotel)
  const [hotelAmenities, setHotelAmenities] = useState<{
    breakfastIncluded?: boolean;
    hasPool?: boolean;
    hasGym?: boolean;
    hasSpa?: boolean;
    hasFreeWifi?: boolean;
  }>({});

  useEffect(() => {
    if (tab === 'curated') {
      fetchHotels();
    }
  }, [query, city, tab]);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      if (!supabase) return;

      let q = supabase
        .from('destinations')
        .select('slug, name, city, category, image, image_thumbnail, micro_description, rating, price_level, formatted_address, website, phone_number, booking_url, neighborhood')
        .or('category.ilike.%hotel%,category.ilike.%lodging%,category.ilike.%accommodation%')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12);

      if (city) {
        q = q.ilike('city', `%${city}%`);
      }

      if (query.trim()) {
        q = q.ilike('name', `%${query}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      setHotels(data || []);
    } catch (err) {
      console.error('Error fetching hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHotel = (hotel: Destination) => {
    setSelectedHotel(hotel);
  };

  const handleConfirmHotel = () => {
    if (!selectedHotel || !onSelect) return;

    // Calculate night numbers based on dates
    let nightStart: number | undefined;
    let nightEnd: number | undefined;

    if (tripStartDate && checkInDate) {
      const tripStart = new Date(tripStartDate);
      const checkIn = new Date(checkInDate);
      nightStart = Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    if (tripStartDate && checkOutDate) {
      const tripStart = new Date(tripStartDate);
      const checkOut = new Date(checkOutDate);
      nightEnd = Math.floor((checkOut.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
    }

    onSelect(selectedHotel, {
      checkInDate,
      checkOutDate,
      nightStart,
      nightEnd,
      // Pass amenities from Google Places (if available)
      ...hotelAmenities,
    });
    setSelectedHotel(null);
    setHotelAmenities({});
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

  const handleSelectGoogleHotel = () => {
    if (!googlePlace) return;

    const hotel: Destination = {
      slug: googlePlace.slug || `google-${googlePlace.place_id || Date.now()}`,
      name: googlePlace.name,
      city: googlePlace.city || city || '',
      category: 'Hotel',
      image: googlePlace.image || googlePlace.photo_url,
      image_thumbnail: googlePlace.image || googlePlace.photo_url,
      formatted_address: googlePlace.address,
      latitude: googlePlace.latitude,
      longitude: googlePlace.longitude,
      rating: googlePlace.rating,
      price_level: googlePlace.price_level,
      website: googlePlace.website,
      phone_number: googlePlace.phone,
    };

    // Store amenities from Google Places
    setHotelAmenities({
      breakfastIncluded: googlePlace.serves_breakfast ?? undefined,
      hasPool: googlePlace.swimming_pool ?? undefined,
      hasGym: googlePlace.fitness_center ?? undefined,
      hasSpa: googlePlace.spa ?? undefined,
      hasFreeWifi: googlePlace.free_wifi ?? undefined,
    });

    setSelectedHotel(hotel);
    setGooglePlace(null);
    setGoogleQuery('');
  };

  // Calculate nights for display
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return null;
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  const nights = calculateNights();

  // If a hotel is selected, show the confirmation view
  if (selectedHotel) {
    return (
      <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hotel className="w-4 h-4 text-stone-400" />
            <h3 className="text-sm font-medium text-stone-900 dark:text-white">
              Confirm Hotel
            </h3>
          </div>
          <button
            onClick={() => setSelectedHotel(null)}
            className="p-1.5 -mr-1 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Hotel Preview */}
          <div className="flex items-start gap-3">
            {selectedHotel.image_thumbnail || selectedHotel.image ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={selectedHotel.image_thumbnail || selectedHotel.image || ''}
                  alt={selectedHotel.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Hotel className="w-6 h-6 text-stone-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-stone-900 dark:text-white">
                {selectedHotel.name}
              </h4>
              {selectedHotel.formatted_address && (
                <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {selectedHotel.formatted_address}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {selectedHotel.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-stone-500">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {selectedHotel.rating}
                  </span>
                )}
                {selectedHotel.price_level && (
                  <span className="text-xs text-stone-500">
                    {'$'.repeat(selectedHotel.price_level)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
                Check-in
              </label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                min={tripStartDate || undefined}
                max={tripEndDate || undefined}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
                Check-out
              </label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                min={checkInDate || tripStartDate || undefined}
                max={tripEndDate || undefined}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
              />
            </div>
          </div>

          {nights && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirmHotel}
            className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Hotel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hotel className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Add Hotel
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        )}
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
              placeholder="Search hotels..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto -mx-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              </div>
            ) : hotels.length === 0 ? (
              <div className="text-center py-6">
                <Hotel className="w-5 h-5 mx-auto text-stone-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-stone-400 dark:text-gray-500">No hotels found</p>
                <p className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">Try Google tab</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {hotels.map((hotel) => (
                  <button
                    key={hotel.slug}
                    onClick={() => handleSelectHotel(hotel)}
                    className="w-full flex items-center gap-3 p-2 text-left hover:bg-stone-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      {hotel.image_thumbnail || hotel.image ? (
                        <Image
                          src={hotel.image_thumbnail || hotel.image || ''}
                          alt={hotel.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Hotel className="w-5 h-5 text-stone-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                        {hotel.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-gray-500">
                        {hotel.neighborhood && (
                          <span className="truncate">{hotel.neighborhood}</span>
                        )}
                        {hotel.rating && (
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {hotel.rating}
                          </span>
                        )}
                        {hotel.price_level && (
                          <span className="flex-shrink-0">{'$'.repeat(hotel.price_level)}</span>
                        )}
                      </div>
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
            placeholder="Search hotels..."
            types="lodging"
            className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
          />
          <p className="text-xs text-stone-400 dark:text-gray-500 mt-2 mb-3">
            Search hotels, hostels, resorts...
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
                      {googlePlace.rating && (
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 rounded-full flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {googlePlace.rating}
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
                  onClick={handleSelectGoogleHotel}
                  className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Select Hotel
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Globe className="w-5 h-5 mx-auto text-stone-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-stone-400 dark:text-gray-500">Search for a hotel above</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
