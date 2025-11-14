'use client';

import React, { useState, useEffect } from 'react';
import {
  XIcon,
  SearchIcon,
  DollarSignIcon,
  ClockIcon,
  Loader2,
  Plane,
  Train,
  MapPin,
  Building,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import GooglePlacesAutocompleteNative from './GooglePlacesAutocompleteNative';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  blockType?: 'destination' | 'flight' | 'train' | 'custom';
  customLocation?: {
    place_id?: string;
    formatted_address?: string;
    geometry?: any;
  };
}

interface AddLocationToTripProps {
  onAdd: (location: TripLocation) => void;
  onClose: () => void;
}

export function AddLocationToTrip({
  onAdd,
  onClose,
}: AddLocationToTripProps) {
  const [blockType, setBlockType] = useState<'destination' | 'flight' | 'train' | 'custom'>('destination');
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<
    'breakfast' | 'lunch' | 'dinner' | 'snack' | ''
  >('');
  
  // Custom location fields
  const [customLocationName, setCustomLocationName] = useState('');
  const [customLocationQuery, setCustomLocationQuery] = useState('');
  const [customLocationData, setCustomLocationData] = useState<any>(null);
  
  // Flight fields
  const [flightNumber, setFlightNumber] = useState('');
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightFromQuery, setFlightFromQuery] = useState('');
  const [flightToQuery, setFlightToQuery] = useState('');
  
  // Train fields
  const [trainNumber, setTrainNumber] = useState('');
  const [trainFrom, setTrainFrom] = useState('');
  const [trainTo, setTrainTo] = useState('');
  const [trainFromQuery, setTrainFromQuery] = useState('');
  const [trainToQuery, setTrainToQuery] = useState('');

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchDestinations();
    } else {
      setDestinations([]);
    }
  }, [searchQuery]);

  const searchDestinations = async () => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('destinations')
        .select('*')
        .or(
          `name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
        )
        .limit(20);

      if (error) throw error;
      setDestinations((data || []) as Destination[]);
    } catch (error) {
      console.error('Error searching destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = (destination: Destination) => {
    setSelectedDestination(destination);
  };

  const handleGooglePlaceSelect = async (placeDetails: any, field?: 'from' | 'to') => {
    if (blockType === 'custom') {
      setCustomLocationName(placeDetails.name || placeDetails.formatted_address || '');
      setCustomLocationData(placeDetails);
      setCustomLocationQuery('');
    } else if (blockType === 'flight') {
      if (field === 'from' || (!flightFrom && flightFromQuery)) {
        setFlightFrom(placeDetails.name || placeDetails.formatted_address || '');
        setFlightFromQuery('');
      } else if (field === 'to' || (!flightTo && flightToQuery)) {
        setFlightTo(placeDetails.name || placeDetails.formatted_address || '');
        setFlightToQuery('');
      }
    } else if (blockType === 'train') {
      if (field === 'from' || (!trainFrom && trainFromQuery)) {
        setTrainFrom(placeDetails.name || placeDetails.formatted_address || '');
        setTrainFromQuery('');
      } else if (field === 'to' || (!trainTo && trainToQuery)) {
        setTrainTo(placeDetails.name || placeDetails.formatted_address || '');
        setTrainToQuery('');
      }
    }
  };

  const handleAddLocation = () => {
    let location: TripLocation;

    if (blockType === 'destination') {
      if (!selectedDestination) return;
      location = {
        id: selectedDestination.id || 0,
        name: selectedDestination.name,
        city: selectedDestination.city || '',
        category: selectedDestination.category || '',
        image: selectedDestination.image || '/placeholder-image.jpg',
        time: selectedTime,
        cost: estimatedCost,
        duration,
        notes,
        mealType: mealType || undefined,
        blockType: 'destination',
      };
    } else if (blockType === 'flight') {
      if (!flightNumber || !flightFrom || !flightTo) return;
      location = {
        id: Date.now(),
        name: `Flight ${flightNumber}`,
        city: `${flightFrom} → ${flightTo}`,
        category: 'Flight',
        image: '/placeholder-image.jpg',
        time: selectedTime,
        cost: estimatedCost,
        duration,
        notes: notes || `From ${flightFrom} to ${flightTo}`,
        blockType: 'flight',
      };
    } else if (blockType === 'train') {
      if (!trainNumber || !trainFrom || !trainTo) return;
      location = {
        id: Date.now(),
        name: `Train ${trainNumber}`,
        city: `${trainFrom} → ${trainTo}`,
        category: 'Train',
        image: '/placeholder-image.jpg',
        time: selectedTime,
        cost: estimatedCost,
        duration,
        notes: notes || `From ${trainFrom} to ${trainTo}`,
        blockType: 'train',
      };
    } else if (blockType === 'custom') {
      if (!customLocationName) return;
      location = {
        id: Date.now(),
        name: customLocationName,
        city: customLocationData?.formatted_address?.split(',')[1]?.trim() || '',
        category: 'Custom Location',
        image: customLocationData?.photos?.[0]?.name 
          ? `https://places.googleapis.com/v1/${customLocationData.photos[0].name}/media?maxWidthPx=1200&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`
          : '/placeholder-image.jpg',
        time: selectedTime,
        cost: estimatedCost,
        duration,
        notes,
        blockType: 'custom',
        customLocation: customLocationData,
      };
    } else {
      return;
    }

    onAdd(location);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-950 w-full max-w-4xl max-h-[85vh] overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
            Add to Trip
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-lg"
          >
            <XIcon className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
          </button>
        </div>

        {/* Block Type Selector */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBlockType('destination');
                setSelectedDestination(null);
                setCustomLocationName('');
                setFlightNumber('');
                setTrainNumber('');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs border transition-colors rounded-lg ${
                blockType === 'destination'
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <Building className="w-4 h-4" />
              Destination
            </button>
            <button
              onClick={() => {
                setBlockType('flight');
                setSelectedDestination(null);
                setCustomLocationName('');
                setTrainNumber('');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs border transition-colors rounded-lg ${
                blockType === 'flight'
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <Plane className="w-4 h-4" />
              Flight
            </button>
            <button
              onClick={() => {
                setBlockType('train');
                setSelectedDestination(null);
                setCustomLocationName('');
                setFlightNumber('');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs border transition-colors rounded-lg ${
                blockType === 'train'
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <Train className="w-4 h-4" />
              Train
            </button>
            <button
              onClick={() => {
                setBlockType('custom');
                setSelectedDestination(null);
                setFlightNumber('');
                setTrainNumber('');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs border transition-colors rounded-lg ${
                blockType === 'custom'
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Custom Location
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {blockType === 'destination' ? (
            <div className="space-y-6">
              {/* Search for destinations */}
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Search Destinations
                </label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search saved locations..."
                    className="w-full pl-10 pr-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
              </div>

              {/* Destination List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-400 dark:text-neutral-500" />
                </div>
              ) : destinations.length === 0 && searchQuery.trim().length >= 2 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No destinations found
                  </p>
                </div>
              ) : destinations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">
                    Start typing to search destinations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {destinations.map((destination) => (
                    <button
                      key={destination.slug}
                      onClick={() => handleSelectDestination(destination)}
                      className={`w-full flex items-center gap-4 p-3 border transition-colors text-left rounded-lg ${
                        selectedDestination?.slug === destination.slug
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/50'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      {destination.image && (
                        <div className="w-14 h-14 flex-shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                          <img
                            src={destination.image}
                            alt={destination.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 truncate mb-1">
                          {destination.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                            {destination.category}
                          </span>
                          {destination.city && (
                            <>
                              <span className="text-neutral-300 dark:text-neutral-600">•</span>
                              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                {destination.city}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : blockType === 'flight' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Flight Number
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="e.g., AA123"
                  className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  From (Airport)
                </label>
                {!flightFrom ? (
                  <GooglePlacesAutocompleteNative
                    value={flightFromQuery}
                    onChange={setFlightFromQuery}
                    onPlaceSelect={(place) => handleGooglePlaceSelect(place, 'from')}
                    placeholder="Search airport..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors text-sm"
                    types={['airport']}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={flightFrom}
                      readOnly
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      onClick={() => setFlightFrom('')}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  To (Airport)
                </label>
                {!flightTo ? (
                  <GooglePlacesAutocompleteNative
                    value={flightToQuery}
                    onChange={setFlightToQuery}
                    onPlaceSelect={(place) => handleGooglePlaceSelect(place, 'to')}
                    placeholder="Search airport..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors text-sm"
                    types={['airport']}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={flightTo}
                      readOnly
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      onClick={() => setFlightTo('')}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : blockType === 'train' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Train Number / Line
                </label>
                <input
                  type="text"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  placeholder="e.g., Shinkansen, Eurostar"
                  className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  From (Station)
                </label>
                {!trainFrom ? (
                  <GooglePlacesAutocompleteNative
                    value={trainFromQuery}
                    onChange={setTrainFromQuery}
                    onPlaceSelect={(place) => handleGooglePlaceSelect(place, 'from')}
                    placeholder="Search train station..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors text-sm"
                    types={['transit_station']}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={trainFrom}
                      readOnly
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      onClick={() => setTrainFrom('')}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  To (Station)
                </label>
                {!trainTo ? (
                  <GooglePlacesAutocompleteNative
                    value={trainToQuery}
                    onChange={setTrainToQuery}
                    onPlaceSelect={(place) => handleGooglePlaceSelect(place, 'to')}
                    placeholder="Search train station..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors text-sm"
                    types={['transit_station']}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={trainTo}
                      readOnly
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      onClick={() => setTrainTo('')}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : blockType === 'custom' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Search Location
                </label>
                {!customLocationName ? (
                  <GooglePlacesAutocompleteNative
                    value={customLocationQuery}
                    onChange={setCustomLocationQuery}
                    onPlaceSelect={handleGooglePlaceSelect}
                    placeholder="Search for any place on Google..."
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors text-sm"
                    types={[]}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customLocationName}
                      readOnly
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      onClick={() => {
                        setCustomLocationName('');
                        setCustomLocationData(null);
                        setCustomLocationQuery('');
                      }}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Details Section - Common for all block types */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 mt-6 space-y-6">
            <div>
              <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                Estimated Cost ($)
              </label>
              <input
                type="number"
                value={estimatedCost || ''}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
            </div>
            {blockType === 'destination' && (
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Meal Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setMealType(type as any)}
                      className={`px-3 py-2 text-xs border transition-colors rounded-lg ${
                        mealType === type
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={blockType === 'destination' ? 'Reservation needed, try the signature dish...' : 'Additional notes...'}
                rows={3}
                className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors resize-none"
              />
            </div>
            <button
              onClick={handleAddLocation}
              disabled={
                (blockType === 'destination' && !selectedDestination) ||
                (blockType === 'flight' && (!flightNumber || !flightFrom || !flightTo)) ||
                (blockType === 'train' && (!trainNumber || !trainFrom || !trainTo)) ||
                (blockType === 'custom' && !customLocationName)
              }
              className="w-full px-6 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              Add to Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
