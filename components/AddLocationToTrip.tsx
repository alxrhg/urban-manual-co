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

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  duration?: number;
  slug?: string;
  blockType?: 'destination' | 'flight' | 'train' | 'custom';
  customLocation?: {
    place_id?: string;
    formatted_address?: string;
    geometry?: any;
  };
  airline?: string;
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
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  
  // Custom location fields
  const [customLocationName, setCustomLocationName] = useState('');
  const [customLocationQuery, setCustomLocationQuery] = useState('');
  const [customLocationData, setCustomLocationData] = useState<any>(null);
  
  // Flight fields
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [lounge, setLounge] = useState('');
  const [flightFrom, setFlightFrom] = useState<Airport | null>(null);
  const [flightTo, setFlightTo] = useState<Airport | null>(null);
  const [flightFromQuery, setFlightFromQuery] = useState('');
  const [flightToQuery, setFlightToQuery] = useState('');
  const [flightDepartureTime, setFlightDepartureTime] = useState('');
  const [flightArrivalTime, setFlightArrivalTime] = useState('');
  const [airportSearchResults, setAirportSearchResults] = useState<Airport[]>([]);
  const [searchingAirports, setSearchingAirports] = useState(false);
  const [activeAirportField, setActiveAirportField] = useState<'from' | 'to' | null>(null);
  
  // Train fields
  const [trainNumber, setTrainNumber] = useState('');
  const [trainFrom, setTrainFrom] = useState('');
  const [trainTo, setTrainTo] = useState('');
  const [trainFromQuery, setTrainFromQuery] = useState('');
  const [trainToQuery, setTrainToQuery] = useState('');
  const [trainDepartureTime, setTrainDepartureTime] = useState('');
  const [trainArrivalTime, setTrainArrivalTime] = useState('');

  useEffect(() => {
    if (searchQuery.trim().length >= 2 && blockType === 'destination') {
      searchDestinations();
    } else {
      setDestinations([]);
    }
  }, [searchQuery, blockType]);

  // Airport search effect
  useEffect(() => {
    if (activeAirportField === 'from' && flightFromQuery.trim().length >= 2) {
      searchAirports(flightFromQuery);
    } else if (activeAirportField === 'to' && flightToQuery.trim().length >= 2) {
      searchAirports(flightToQuery);
    } else {
      setAirportSearchResults([]);
    }
  }, [flightFromQuery, flightToQuery, activeAirportField]);

  const searchAirports = async (query: string) => {
    setSearchingAirports(true);
    try {
      // Use Airport Data API (free tier available)
      const response = await fetch(
        `https://aviation-edge.com/v2/public/autocomplete?key=${process.env.NEXT_PUBLIC_AVIATION_EDGE_API_KEY}&city=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        // Fallback to a static list of major airports if API fails
        const staticAirports = getMajorAirports().filter(
          (airport) =>
            airport.name.toLowerCase().includes(query.toLowerCase()) ||
            airport.city.toLowerCase().includes(query.toLowerCase()) ||
            airport.iata.toLowerCase().includes(query.toLowerCase())
        );
        setAirportSearchResults(staticAirports.slice(0, 10));
        return;
      }

      const data = await response.json();
      const airports: Airport[] = data.map((item: any) => ({
        iata: item.codeIataAirport || item.iata || '',
        name: item.nameAirport || item.name || '',
        city: item.cityName || item.city || '',
        country: item.countryName || item.country || '',
      }));
      
      setAirportSearchResults(airports.slice(0, 10));
    } catch (error) {
      console.error('Error searching airports:', error);
      // Fallback to static list
      const staticAirports = getMajorAirports().filter(
        (airport) =>
          airport.name.toLowerCase().includes(query.toLowerCase()) ||
          airport.city.toLowerCase().includes(query.toLowerCase()) ||
          airport.iata.toLowerCase().includes(query.toLowerCase())
      );
      setAirportSearchResults(staticAirports.slice(0, 10));
    } finally {
      setSearchingAirports(false);
    }
  };

  // Static list of major world airports as fallback
  const getMajorAirports = (): Airport[] => {
    return [
      { iata: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
      { iata: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
      { iata: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
      { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
      { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
      { iata: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan' },
      { iata: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
      { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
      { iata: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
      { iata: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
      { iata: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
      { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
      { iata: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States' },
      { iata: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States' },
      { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States' },
      { iata: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States' },
      { iata: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States' },
      { iata: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States' },
      { iata: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States' },
      { iata: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas', country: 'United States' },
      { iata: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'United States' },
      { iata: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'United States' },
      { iata: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'United States' },
      { iata: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada' },
      { iata: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
      { iata: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico' },
      { iata: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil' },
      { iata: 'MAD', name: 'Adolfo Suárez Madrid-Barajas Airport', city: 'Madrid', country: 'Spain' },
      { iata: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain' },
      { iata: 'FCO', name: 'Leonardo da Vinci-Fiumicino Airport', city: 'Rome', country: 'Italy' },
      { iata: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy' },
      { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany' },
      { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
      { iata: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria' },
      { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark' },
      { iata: 'OSL', name: 'Oslo Airport', city: 'Oslo', country: 'Norway' },
      { iata: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden' },
      { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
      { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
      { iata: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
      { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia' },
      { iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand' },
      { iata: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China' },
      { iata: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China' },
      { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
      { iata: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia' },
      { iata: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India' },
      { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
    ];
  };

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
    setDestinations([]); // Collapse the list after selection
    setSearchQuery(''); // Clear search to prevent re-population
  };

  const handleGooglePlaceSelect = async (placeDetails: any, field?: 'from' | 'to') => {
    if (blockType === 'custom') {
      setCustomLocationName(placeDetails.name || placeDetails.formatted_address || '');
      setCustomLocationData(placeDetails);
      setCustomLocationQuery('');
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

    const computeDurationMinutes = (departure: string, arrival: string) => {
      if (!departure || !arrival) return undefined;

      const [depHours, depMinutes] = departure.split(':').map(Number);
      const [arrHours, arrMinutes] = arrival.split(':').map(Number);

      if (
        [depHours, depMinutes, arrHours, arrMinutes].some(
          (value) => Number.isNaN(value) || value < 0
        )
      ) {
        return undefined;
      }

      const departureTotal = depHours * 60 + depMinutes;
      const arrivalTotal = arrHours * 60 + arrMinutes;
      const diff = arrivalTotal - departureTotal;

      // Handle overnight trips by adding 24h when arrival is earlier than departure
      return diff >= 0 ? diff : diff + 24 * 60;
    };

    if (blockType === 'destination') {
      if (!selectedDestination) return;
      location = {
        id: selectedDestination.id || 0,
        name: selectedDestination.name,
        city: selectedDestination.city || '',
        category: selectedDestination.category || '',
        image: selectedDestination.image || '/placeholder-image.jpg',
        time: selectedTime,
        duration,
        notes,
        slug: selectedDestination.slug,
        blockType: 'destination',
      };
    } else if (blockType === 'flight') {
      if (!flightFrom || !flightTo) return;
      const flightName = flightNumber 
        ? `${airline ? `${airline} ` : ''}${flightNumber}`
        : `${airline || 'Flight'}`;
      location = {
        id: Date.now(),
        name: flightName,
        city: `${flightFrom.iata} → ${flightTo.iata}`,
        category: 'Flight',
        image: '/placeholder-image.jpg',
        time: flightDepartureTime, // Store departure time in time field
        duration: computeDurationMinutes(flightDepartureTime, flightArrivalTime),
        notes: JSON.stringify({
          from: flightFrom,
          to: flightTo,
          airline,
          flightNumber,
          lounge,
          departureTime: flightDepartureTime,
          arrivalTime: flightArrivalTime,
          raw: notes,
        }),
        blockType: 'flight',
        airline,
      };
    } else if (blockType === 'train') {
      if (!trainFrom || !trainTo) return;
      location = {
        id: Date.now(),
        name: trainNumber || 'Train',
        city: `${trainFrom} → ${trainTo}`,
        category: 'Train',
        image: '/placeholder-image.jpg',
        time: trainDepartureTime, // Store departure time in time field
        duration: computeDurationMinutes(trainDepartureTime, trainArrivalTime),
        notes: JSON.stringify({
          from: trainFrom,
          to: trainTo,
          trainNumber,
          departureTime: trainDepartureTime,
          arrivalTime: trainArrivalTime,
          raw: notes,
        }),
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
                  Airline (Optional)
                </label>
                <input
                  type="text"
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                  placeholder="e.g., American Airlines, Delta"
                  className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Flight Number (Optional)
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
                  Lounge (Optional)
                </label>
                <input
                  type="text"
                  value={lounge}
                  onChange={(e) => setLounge(e.target.value)}
                  placeholder="e.g., American Express Centurion, Delta Sky Club"
                  className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  From (Airport)
                </label>
                {!flightFrom ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={flightFromQuery}
                      onChange={(e) => {
                        setFlightFromQuery(e.target.value);
                        setActiveAirportField('from');
                      }}
                      onFocus={() => setActiveAirportField('from')}
                      placeholder="Search airport (city, name, or code)..."
                      className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                    />
                    {searchingAirports && activeAirportField === 'from' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      </div>
                    )}
                    {airportSearchResults.length > 0 && activeAirportField === 'from' && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-950 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {airportSearchResults.map((airport) => (
                          <button
                            key={airport.iata}
                            onClick={() => {
                              setFlightFrom(airport);
                              setFlightFromQuery('');
                              setAirportSearchResults([]);
                              setActiveAirportField(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                  {airport.name}
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {airport.city}, {airport.country}
                                </div>
                              </div>
                              <div className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                                {airport.iata}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-neutral-900 dark:text-neutral-100">
                            {flightFrom.name}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {flightFrom.city}, {flightFrom.country}
                          </div>
                        </div>
                        <div className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                          {flightFrom.iata}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFlightFrom(null);
                        setFlightFromQuery('');
                      }}
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
                  <div className="relative">
                    <input
                      type="text"
                      value={flightToQuery}
                      onChange={(e) => {
                        setFlightToQuery(e.target.value);
                        setActiveAirportField('to');
                      }}
                      onFocus={() => setActiveAirportField('to')}
                      placeholder="Search airport (city, name, or code)..."
                      className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                    />
                    {searchingAirports && activeAirportField === 'to' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      </div>
                    )}
                    {airportSearchResults.length > 0 && activeAirportField === 'to' && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-950 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {airportSearchResults.map((airport) => (
                          <button
                            key={airport.iata}
                            onClick={() => {
                              setFlightTo(airport);
                              setFlightToQuery('');
                              setAirportSearchResults([]);
                              setActiveAirportField(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                  {airport.name}
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {airport.city}, {airport.country}
                                </div>
                              </div>
                              <div className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                                {airport.iata}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-neutral-900 dark:text-neutral-100">
                            {flightTo.name}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {flightTo.city}, {flightTo.country}
                          </div>
                        </div>
                        <div className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                          {flightTo.iata}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFlightTo(null);
                        setFlightToQuery('');
                      }}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Departure Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={flightDepartureTime}
                    onChange={(e) => setFlightDepartureTime(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Arrival Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={flightArrivalTime}
                    onChange={(e) => setFlightArrivalTime(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          ) : blockType === 'train' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Train Number / Line (Optional)
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Departure Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={trainDepartureTime}
                    onChange={(e) => setTrainDepartureTime(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Arrival Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={trainArrivalTime}
                    onChange={(e) => setTrainArrivalTime(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
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
            {/* Only show Time and Duration for destination and custom location types */}
            {(blockType === 'destination' || blockType === 'custom') && (
              <>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Time (Optional)
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
                    Duration (minutes, Optional)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                Notes (Optional)
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
                (blockType === 'flight' && (!flightFrom || !flightTo)) ||
                (blockType === 'train' && (!trainFrom || !trainTo)) ||
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
