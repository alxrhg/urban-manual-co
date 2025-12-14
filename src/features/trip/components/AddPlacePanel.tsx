'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X, Search, MapPin, Loader2, Plane, Hotel, Train, Clock,
  ChevronLeft, Navigation, BedDouble
} from 'lucide-react';
import type { Destination } from '@/types/destination';

interface AddPlacePanelProps {
  city: string;
  dayNumber: number;
  onClose: () => void;
  onAddPlace: (destination: Destination) => void;
  onAddFlight: (data: FlightData) => void;
  onAddTrain: (data: TrainData) => void;
  onAddHotel: (data: HotelData) => void;
  onAddActivity: (data: ActivityData) => void;
}

interface FlightData {
  airline?: string;
  flightNumber?: string;
  from: string;
  to: string;
  departureTime?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
}

interface TrainData {
  trainLine?: string;
  trainNumber?: string;
  from: string;
  to: string;
  departureTime?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
}

interface HotelData {
  name: string;
  address?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  nights?: number;
  breakfastIncluded?: boolean;
  destination_slug?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
}

interface ActivityData {
  type: string;
  title?: string;
  duration?: number;
  time?: string;
}

type AddMode = 'menu' | 'search' | 'transport' | 'flight' | 'train' | 'hotel' | 'downtime';

export default function AddPlacePanel({
  city,
  dayNumber,
  onClose,
  onAddPlace,
  onAddFlight,
  onAddTrain,
  onAddHotel,
  onAddActivity,
}: AddPlacePanelProps) {
  const [mode, setMode] = useState<AddMode>('menu');
  const [searchSource, setSearchSource] = useState<'curated' | 'google'>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [googleResults, setGoogleResults] = useState<Array<{
    id: string;
    name: string;
    formatted_address: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    image?: string;
    rating?: number;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form states
  const [flightData, setFlightData] = useState<FlightData>({ from: '', to: '' });
  const [trainData, setTrainData] = useState<TrainData>({ from: '', to: '' });
  const [hotelData, setHotelData] = useState<HotelData>({ name: '' });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Focus search input when shown
  useEffect(() => {
    if (mode === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mode]);

  // Search destinations
  useEffect(() => {
    if (mode !== 'search' || !searchQuery.trim()) {
      setSearchResults([]);
      setGoogleResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchSource === 'curated') {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchQuery} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || data.destinations || []);
            setGoogleResults([]);
          }
        } else {
          const response = await fetch('/api/google-places-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchQuery} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setGoogleResults(data.places || []);
            setSearchResults([]);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, city, searchSource, mode]);

  const handleAddPlace = (destination: Destination) => {
    onAddPlace(destination);
    onClose();
  };

  const handleAddGooglePlace = async (place: typeof googleResults[0]) => {
    // Create a destination-like object from Google place
    const destination: Destination = {
      id: parseInt(place.id) || Date.now(),
      slug: place.id,
      name: place.name,
      city: city,
      formatted_address: place.formatted_address,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category || 'place',
      image: place.image,
      rating: place.rating,
    };
    onAddPlace(destination);
    onClose();
  };

  const handleAddFlight = () => {
    if (!flightData.from || !flightData.to) return;
    onAddFlight(flightData);
    onClose();
  };

  const handleAddTrain = () => {
    if (!trainData.from || !trainData.to) return;
    onAddTrain(trainData);
    onClose();
  };

  const handleAddHotel = () => {
    if (!hotelData.name) return;
    onAddHotel(hotelData);
    onClose();
  };

  const handleAddActivity = (activity: { type: string; label: string; duration: number }) => {
    onAddActivity({
      type: activity.type,
      title: activity.label,
      duration: activity.duration,
    });
    onClose();
  };

  const goBack = () => {
    if (mode === 'menu') {
      onClose();
    } else if (mode === 'flight' || mode === 'train') {
      // Go back to transport sub-menu
      setMode('transport');
    } else {
      setMode('menu');
      setSearchQuery('');
      setSearchResults([]);
      setGoogleResults([]);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode !== 'menu' && (
            <button onClick={goBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {mode === 'menu' && `Add to Day ${dayNumber}`}
            {mode === 'search' && 'Search Places'}
            {mode === 'transport' && 'Add Transport'}
            {mode === 'flight' && 'Add Flight'}
            {mode === 'train' && 'Add Train'}
            {mode === 'hotel' && 'Add Hotel'}
            {mode === 'downtime' && 'Add Downtime'}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Menu - 4 main categories */}
        {mode === 'menu' && (
          <div className="space-y-1">
            <button
              onClick={() => setMode('search')}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              <Search className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">Places</div>
                <div className="text-xs text-gray-400">Restaurants, cafes, attractions</div>
              </div>
            </button>
            <button
              onClick={() => setMode('transport')}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              <Navigation className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">Transport</div>
                <div className="text-xs text-gray-400">Flights, trains</div>
              </div>
            </button>
            <button
              onClick={() => setMode('hotel')}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              <BedDouble className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">Stay</div>
                <div className="text-xs text-gray-400">Hotels, accommodations</div>
              </div>
            </button>
            <button
              onClick={() => setMode('downtime')}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium">Downtime</div>
                <div className="text-xs text-gray-400">Rest, pool, free time</div>
              </div>
            </button>
          </div>
        )}

        {/* Transport sub-menu */}
        {mode === 'transport' && (
          <div className="space-y-1">
            <button
              onClick={() => setMode('flight')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              <Plane className="w-4 h-4 text-gray-400" />
              Flight
            </button>
            <button
              onClick={() => setMode('train')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              <Train className="w-4 h-4 text-gray-400" />
              Train
            </button>
          </div>
        )}

        {/* Search */}
        {mode === 'search' && (
          <div className="space-y-3">
            {/* Source toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSearchSource('curated'); setSearchQuery(''); }}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                  searchSource === 'curated'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Curated
              </button>
              <button
                onClick={() => { setSearchSource('google'); setSearchQuery(''); }}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                  searchSource === 'google'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Google
              </button>
            </div>

            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-gray-400" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${searchSource === 'google' ? 'Google' : 'curated'}...`}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              />
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchResults.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => handleAddPlace(destination)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {destination.image_thumbnail || destination.image ? (
                      <Image
                        src={destination.image_thumbnail || destination.image || ''}
                        alt=""
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{destination.name}</p>
                    <p className="text-xs text-gray-400 truncate">{destination.category}</p>
                  </div>
                </button>
              ))}
              {googleResults.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleAddGooglePlace(place)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {place.image ? (
                      <Image src={place.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{place.name}</p>
                    <p className="text-xs text-gray-400 truncate">{place.formatted_address}</p>
                  </div>
                </button>
              ))}
              {searchQuery && !isSearching && searchResults.length === 0 && googleResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No results found</p>
              )}
            </div>
          </div>
        )}

        {/* Flight form - detailed */}
        {mode === 'flight' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Route */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Route</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">From</label>
                  <input
                    type="text"
                    value={flightData.from}
                    onChange={(e) => setFlightData({ ...flightData, from: e.target.value.toUpperCase() })}
                    placeholder="JFK"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg uppercase font-medium"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">To</label>
                  <input
                    type="text"
                    value={flightData.to}
                    onChange={(e) => setFlightData({ ...flightData, to: e.target.value.toUpperCase() })}
                    placeholder="CDG"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg uppercase font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Flight details */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Flight Details</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Airline</label>
                  <input
                    type="text"
                    value={flightData.airline || ''}
                    onChange={(e) => setFlightData({ ...flightData, airline: e.target.value })}
                    placeholder="United"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-gray-400 mb-1 block">Flight #</label>
                  <input
                    type="text"
                    value={flightData.flightNumber || ''}
                    onChange={(e) => setFlightData({ ...flightData, flightNumber: e.target.value })}
                    placeholder="123"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Times */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Schedule</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Departure</label>
                  <input
                    type="time"
                    value={flightData.departureTime || ''}
                    onChange={(e) => setFlightData({ ...flightData, departureTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Arrival</label>
                  <input
                    type="time"
                    value={flightData.arrivalTime || ''}
                    onChange={(e) => setFlightData({ ...flightData, arrivalTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Booking */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Booking</div>
              <input
                type="text"
                value={flightData.confirmationNumber || ''}
                onChange={(e) => setFlightData({ ...flightData, confirmationNumber: e.target.value })}
                placeholder="Confirmation number"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
              />
            </div>

            <button
              onClick={handleAddFlight}
              disabled={!flightData.from || !flightData.to}
              className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg disabled:opacity-50"
            >
              Add Flight
            </button>
          </div>
        )}

        {/* Train form - detailed */}
        {mode === 'train' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Route */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Route</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">From</label>
                  <input
                    type="text"
                    value={trainData.from}
                    onChange={(e) => setTrainData({ ...trainData, from: e.target.value })}
                    placeholder="London St Pancras"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">To</label>
                  <input
                    type="text"
                    value={trainData.to}
                    onChange={(e) => setTrainData({ ...trainData, to: e.target.value })}
                    placeholder="Paris Gare du Nord"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Train details */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Train Details</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Train Line</label>
                  <input
                    type="text"
                    value={trainData.trainLine || ''}
                    onChange={(e) => setTrainData({ ...trainData, trainLine: e.target.value })}
                    placeholder="Eurostar"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-gray-400 mb-1 block">Train #</label>
                  <input
                    type="text"
                    value={trainData.trainNumber || ''}
                    onChange={(e) => setTrainData({ ...trainData, trainNumber: e.target.value })}
                    placeholder="9001"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Schedule</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Departure</label>
                  <input
                    type="time"
                    value={trainData.departureTime || ''}
                    onChange={(e) => setTrainData({ ...trainData, departureTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Arrival</label>
                  <input
                    type="time"
                    value={trainData.arrivalTime || ''}
                    onChange={(e) => setTrainData({ ...trainData, arrivalTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Booking */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Booking</div>
              <input
                type="text"
                value={trainData.confirmationNumber || ''}
                onChange={(e) => setTrainData({ ...trainData, confirmationNumber: e.target.value })}
                placeholder="Confirmation number"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
              />
            </div>

            <button
              onClick={handleAddTrain}
              disabled={!trainData.from || !trainData.to}
              className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg disabled:opacity-50"
            >
              Add Train
            </button>
          </div>
        )}

        {/* Hotel form - detailed */}
        {mode === 'hotel' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Property */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Property</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={hotelData.name}
                  onChange={(e) => setHotelData({ ...hotelData, name: e.target.value })}
                  placeholder="Hotel name"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-medium"
                />
                <input
                  type="text"
                  value={hotelData.address || ''}
                  onChange={(e) => setHotelData({ ...hotelData, address: e.target.value })}
                  placeholder="Address"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
            </div>

            {/* Dates */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Dates</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Check-in</label>
                  <input
                    type="date"
                    value={hotelData.checkInDate || ''}
                    onChange={(e) => setHotelData({ ...hotelData, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Check-out</label>
                  <input
                    type="date"
                    value={hotelData.checkOutDate || ''}
                    onChange={(e) => setHotelData({ ...hotelData, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Times */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Times</div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Check-in time</label>
                  <input
                    type="time"
                    value={hotelData.checkInTime || ''}
                    onChange={(e) => setHotelData({ ...hotelData, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 mb-1 block">Check-out time</label>
                  <input
                    type="time"
                    value={hotelData.checkOutTime || ''}
                    onChange={(e) => setHotelData({ ...hotelData, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Room */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Room</div>
              <input
                type="text"
                value={hotelData.roomType || ''}
                onChange={(e) => setHotelData({ ...hotelData, roomType: e.target.value })}
                placeholder="Room type (e.g. Deluxe King)"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
              />
            </div>

            {/* Amenities */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Amenities</div>
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={hotelData.breakfastIncluded || false}
                  onChange={(e) => setHotelData({ ...hotelData, breakfastIncluded: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Breakfast included</span>
              </label>
            </div>

            {/* Booking */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Booking</div>
              <input
                type="text"
                value={hotelData.confirmationNumber || ''}
                onChange={(e) => setHotelData({ ...hotelData, confirmationNumber: e.target.value })}
                placeholder="Confirmation number"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
              />
            </div>

            <button
              onClick={handleAddHotel}
              disabled={!hotelData.name}
              className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg disabled:opacity-50"
            >
              Add Hotel
            </button>
          </div>
        )}

        {/* Downtime selection - organized by category */}
        {mode === 'downtime' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Rest & Relaxation */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Rest & Relaxation</div>
              <div className="space-y-1">
                {[
                  { type: 'free-time', label: 'Free Time', duration: 60 },
                  { type: 'nap', label: 'Nap / Rest', duration: 60 },
                  { type: 'getting-ready', label: 'Getting Ready', duration: 45 },
                ].map((activity) => (
                  <button
                    key={activity.type}
                    onClick={() => handleAddActivity(activity)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    <span>{activity.label}</span>
                    <span className="text-xs text-gray-400">{activity.duration} min</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hotel Amenities */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Hotel Amenities</div>
              <div className="space-y-1">
                {[
                  { type: 'pool', label: 'Pool Time', duration: 90 },
                  { type: 'spa', label: 'Spa', duration: 120 },
                  { type: 'gym', label: 'Workout', duration: 60 },
                  { type: 'breakfast-at-hotel', label: 'Hotel Breakfast', duration: 45 },
                ].map((activity) => (
                  <button
                    key={activity.type}
                    onClick={() => handleAddActivity(activity)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    <span>{activity.label}</span>
                    <span className="text-xs text-gray-400">{activity.duration} min</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Productivity */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Productivity</div>
              <div className="space-y-1">
                {[
                  { type: 'work', label: 'Work Time', duration: 120 },
                  { type: 'packing', label: 'Packing', duration: 30 },
                ].map((activity) => (
                  <button
                    key={activity.type}
                    onClick={() => handleAddActivity(activity)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    <span>{activity.label}</span>
                    <span className="text-xs text-gray-400">{activity.duration} min</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Exploration */}
            <div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Exploration</div>
              <div className="space-y-1">
                {[
                  { type: 'shopping-time', label: 'Shopping', duration: 90 },
                  { type: 'photo-walk', label: 'Photo Walk', duration: 60 },
                ].map((activity) => (
                  <button
                    key={activity.type}
                    onClick={() => handleAddActivity(activity)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    <span>{activity.label}</span>
                    <span className="text-xs text-gray-400">{activity.duration} min</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
