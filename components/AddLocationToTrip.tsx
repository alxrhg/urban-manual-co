'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  XIcon,
  SearchIcon,
  ClockIcon,
  Loader2,
  Plane,
  Train,
  MapPin,
  Building,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import GooglePlacesAutocompleteNative from './GooglePlacesAutocompleteNative';

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

interface AviationEdgeAirport {
  codeIataAirport?: string;
  iata?: string;
  nameAirport?: string;
  name?: string;
  cityName?: string;
  city?: string;
  countryName?: string;
  country?: string;
}

interface GooglePlaceDetails {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  photos?: { name?: string }[];
  [key: string]: unknown;
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
  blockType?: 'destination' | 'flight' | 'train' | 'custom';
  customLocation?: GooglePlaceDetails | null;
  airline?: string;
}

interface AddLocationToTripProps {
  onAdd: (location: TripLocation) => void;
  onClose: () => void;
}

type BlockType = 'destination' | 'flight' | 'train' | 'custom';

interface BlockTypeOption {
  value: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
}

const blockTypeOptions: BlockTypeOption[] = [
  {
    value: 'destination',
    label: 'Destination',
    description: 'Places curated inside Urban Manual',
    icon: Building,
  },
  {
    value: 'flight',
    label: 'Flight',
    description: 'Flights, lounges, transfers',
    icon: Plane,
  },
  {
    value: 'train',
    label: 'Train',
    description: 'Rail, metro, regional hops',
    icon: Train,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Anything via Google Places',
    icon: MapPin,
  },
];

const durationPresets = [30, 60, 90, 120, 150];

const majorAirports: Airport[] = [
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

export function AddLocationToTrip({
  onAdd,
  onClose,
}: AddLocationToTripProps) {
  const [blockType, setBlockType] = useState<BlockType>('destination');
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
  const [customLocationData, setCustomLocationData] = useState<GooglePlaceDetails | null>(null);
  
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
  const handleBlockTypeChange = (type: BlockType) => {
    setBlockType(type);
    setSelectedDestination(null);
    setSearchQuery('');
    setDestinations([]);
    setSelectedTime('');
    setDuration(60);
    setNotes('');

    if (type !== 'flight') {
      setFlightNumber('');
      setAirline('');
      setLounge('');
      setFlightFrom(null);
      setFlightTo(null);
      setFlightFromQuery('');
      setFlightToQuery('');
      setFlightDepartureTime('');
      setFlightArrivalTime('');
    }

    if (type !== 'train') {
      setTrainNumber('');
      setTrainFrom('');
      setTrainTo('');
      setTrainFromQuery('');
      setTrainToQuery('');
      setTrainDepartureTime('');
      setTrainArrivalTime('');
    }

    if (type !== 'custom') {
      setCustomLocationName('');
      setCustomLocationData(null);
      setCustomLocationQuery('');
    }
  };

  const searchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('destinations')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setDestinations((data || []) as Destination[]);
    } catch (error) {
      console.error('Error searching destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2 && blockType === 'destination') {
      void searchDestinations();
    } else {
      setDestinations([]);
    }
  }, [searchQuery, blockType, searchDestinations]);

  // Airport search effect
  const searchAirports = useCallback(
    async (query: string) => {
      setSearchingAirports(true);
      try {
        const response = await fetch(
          `https://aviation-edge.com/v2/public/autocomplete?key=${process.env.NEXT_PUBLIC_AVIATION_EDGE_API_KEY}&city=${encodeURIComponent(
            query
          )}`
        );

        if (!response.ok) {
          const staticAirports = getMajorAirports().filter(
            (airport) =>
              airport.name.toLowerCase().includes(query.toLowerCase()) ||
              airport.city.toLowerCase().includes(query.toLowerCase()) ||
              airport.iata.toLowerCase().includes(query.toLowerCase())
          );
          setAirportSearchResults(staticAirports.slice(0, 10));
          return;
        }

        const data: AviationEdgeAirport[] = await response.json();
        const airports: Airport[] = data.map((item) => ({
          iata: item.codeIataAirport || item.iata || '',
          name: item.nameAirport || item.name || '',
          city: item.cityName || item.city || '',
          country: item.countryName || item.country || '',
        }));

        setAirportSearchResults(airports.slice(0, 10));
      } catch (error) {
        console.error('Error searching airports:', error);
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
    },
    []
  );

  useEffect(() => {
    if (activeAirportField === 'from' && flightFromQuery.trim().length >= 2) {
      void searchAirports(flightFromQuery);
    } else if (activeAirportField === 'to' && flightToQuery.trim().length >= 2) {
      void searchAirports(flightToQuery);
    } else {
      setAirportSearchResults([]);
    }
  }, [flightFromQuery, flightToQuery, activeAirportField, searchAirports]);

  const getMajorAirports = (): Airport[] => majorAirports;

  const handleSelectDestination = (destination: Destination) => {
    setSelectedDestination(destination);
    setDestinations([]); // Collapse the list after selection
    setSearchQuery(''); // Clear search to prevent re-population
  };

  const handleGooglePlaceSelect = (placeDetails: GooglePlaceDetails, field?: 'from' | 'to') => {
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

  const blockSpecificFields = (() => {
    if (blockType === 'destination') {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase">Curated destinations</p>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{destinations.length > 0 ? `${destinations.length} results` : 'Search to explore'}</span>
            </div>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a neighborhood, category, or name"
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-4 min-h-[260px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : destinations.length === 0 && searchQuery.trim().length >= 2 ? (
              <div className="text-center py-12 text-sm text-neutral-500 dark:text-neutral-400">No destinations found</div>
            ) : destinations.length === 0 ? (
              <div className="text-center py-12 text-sm text-neutral-500 dark:text-neutral-400">Start typing to surface the best picks.</div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {destinations.map((destination) => (
                  <button
                    key={destination.slug}
                    onClick={() => handleSelectDestination(destination)}
                    className={`w-full flex items-center gap-4 p-4 border rounded-2xl transition-colors ${
                      selectedDestination?.slug === destination.slug
                        ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/40'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    {destination.image && (
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                        <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">{destination.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-[0.2em]">
                        <span>{destination.category}</span>
                        {destination.city && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">•</span>
                            <span className="normal-case tracking-normal">{destination.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (blockType === 'flight') {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Airline</label>
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="e.g., Delta Air Lines"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Flight Number</label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="e.g., DL7"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Lounge / Notes</label>
              <input
                type="text"
                value={lounge}
                onChange={(e) => setLounge(e.target.value)}
                placeholder="Centurion Lounge before boarding"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 space-y-5">
            {[{ label: 'From (Airport)', value: flightFrom, query: flightFromQuery, setter: setFlightFromQuery, onSelect: setFlightFrom, field: 'from' as const }, { label: 'To (Airport)', value: flightTo, query: flightToQuery, setter: setFlightToQuery, onSelect: setFlightTo, field: 'to' as const }].map(({ label, value, query, setter, onSelect, field }) => (
              <div key={field}>
                <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">{label}</label>
                {!value ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setter(e.target.value);
                        setActiveAirportField(field);
                      }}
                      onFocus={() => setActiveAirportField(field)}
                      placeholder="Search airport (city, name, code)..."
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
                    />
                    {searchingAirports && activeAirportField === field && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      </div>
                    )}
                    {airportSearchResults.length > 0 && activeAirportField === field && (
                      <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                        {airportSearchResults.map((airport) => (
                          <button
                            key={`${field}-${airport.iata}`}
                            onClick={() => {
                              onSelect(airport);
                              setter('');
                              setAirportSearchResults([]);
                              setActiveAirportField(null);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{airport.name}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{airport.city}, {airport.country}</p>
                              </div>
                              <span className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">{airport.iata}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-neutral-900 dark:text-neutral-100">{value.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{value.city}, {value.country}</p>
                        </div>
                        <span className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">{value.iata}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onSelect(null);
                        setter('');
                      }}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Departure time</label>
              <input
                type="time"
                value={flightDepartureTime}
                onChange={(e) => setFlightDepartureTime(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Arrival time</label>
              <input
                type="time"
                value={flightArrivalTime}
                onChange={(e) => setFlightArrivalTime(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
          </div>
        </div>
      );
    }

    if (blockType === 'train') {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 space-y-4">
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Train number / line</label>
              <input
                type="text"
                value={trainNumber}
                onChange={(e) => setTrainNumber(e.target.value)}
                placeholder="Shinkansen, Eurostar..."
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
            {[{ label: 'From (Station)', value: trainFrom, query: trainFromQuery, setter: setTrainFromQuery, updater: setTrainFrom, field: 'from' as const }, { label: 'To (Station)', value: trainTo, query: trainToQuery, setter: setTrainToQuery, updater: setTrainTo, field: 'to' as const }].map(({ label, value, query, setter, updater, field }) => (
              <div key={field}>
                <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">{label}</label>
                {!value ? (
                  <GooglePlacesAutocompleteNative
                    value={query}
                    onChange={setter}
                    onPlaceSelect={(place) => handleGooglePlaceSelect(place, field)}
                    placeholder="Search station"
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 text-sm"
                    types={['transit_station']}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={value}
                      readOnly
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm"
                    />
                    <button
                      onClick={() => updater('')}
                      className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Departure time</label>
              <input
                type="time"
                value={trainDepartureTime}
                onChange={(e) => setTrainDepartureTime(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Arrival time</label>
              <input
                type="time"
                value={trainArrivalTime}
                onChange={(e) => setTrainArrivalTime(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5">
          <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-2">Search any place</label>
          {!customLocationName ? (
            <GooglePlacesAutocompleteNative
              value={customLocationQuery}
              onChange={setCustomLocationQuery}
              onPlaceSelect={handleGooglePlaceSelect}
              placeholder="Search Google Places"
              className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 text-sm"
              types={[]}
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customLocationName}
                readOnly
                className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm"
              />
              <button
                onClick={() => {
                  setCustomLocationName('');
                  setCustomLocationData(null);
                  setCustomLocationQuery('');
                }}
                className="px-3 py-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  })();

  const selectionSummary = (() => {
    if (blockType === 'destination') {
      return (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5">
          {selectedDestination ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {selectedDestination.image && (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <img src={selectedDestination.image} alt={selectedDestination.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{selectedDestination.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedDestination.city}</p>
                </div>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Add timing and notes then drop it into your day.</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Select a destination to preview details.</p>
          )}
        </div>
      );
    }

    if (blockType === 'flight') {
      return (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 space-y-3">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase">Flight overview</p>
          {flightFrom && flightTo ? (
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{flightFrom.city} → {flightTo.city}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{airline || 'Flight'} • {flightFrom.iata} to {flightTo.iata}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Add both airports to build this block.</p>
          )}
        </div>
      );
    }

    if (blockType === 'train') {
      return (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5">
          {trainFrom && trainTo ? (
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{trainFrom} → {trainTo}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{trainNumber || 'Train segment'}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Add origin and destination stations.</p>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5">
        {customLocationName ? (
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{customLocationName}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Custom block</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Search Google Places to pin any venue.</p>
        )}
      </div>
    );
  })();

  const showTimeInputs = blockType === 'destination' || blockType === 'custom';
  const addDisabled =
    (blockType === 'destination' && !selectedDestination) ||
    (blockType === 'flight' && (!flightFrom || !flightTo)) ||
    (blockType === 'train' && (!trainFrom || !trainTo)) ||
    (blockType === 'custom' && !customLocationName);
  const activeBlock = blockTypeOptions.find((option) => option.value === blockType);

  const schedulePanel = (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-gray-950 p-5 space-y-5">
      <div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-3">Schedule details</p>
        {showTimeInputs ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4" /> Time of visit
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                <span>Duration</span>
                <span>{duration} min</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDuration(value)}
                    className={`px-3 py-1.5 rounded-full border text-xs ${
                      duration === value
                        ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {value}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Departure and arrival times are captured above.</p>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-2 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 resize-none"
          placeholder={blockType === 'destination' ? 'Reservation details, reminders...' : 'Anything you need to remember'}
        />
      </div>
      <button
        onClick={handleAddLocation}
        disabled={addDisabled}
        className="w-full px-6 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-[0.3em] uppercase rounded-2xl disabled:opacity-40"
      >
        Add to trip
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-gray-950 border border-neutral-200 dark:border-neutral-800 rounded-[36px] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-neutral-400 dark:text-neutral-500">Itinerary Workshop</p>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Add a block</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 grid lg:grid-cols-[220px_1fr_320px] h-full">
          <aside className="hidden lg:flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-gray-900/40 p-5 gap-4">
            <div>
              <p className="text-[11px] tracking-[0.4em] uppercase text-neutral-500 dark:text-neutral-400">Block library</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Curated inputs for every type of stop.</p>
            </div>
            <div className="space-y-3">
              {blockTypeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = option.value === blockType;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleBlockTypeChange(option.value)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 flex items-center gap-3 transition-colors ${
                      isActive
                        ? 'border-neutral-900 dark:border-neutral-100 bg-white dark:bg-gray-950'
                        : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{option.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex flex-col overflow-hidden">
            <div className="lg:hidden border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-gray-900/30 px-4 py-3 overflow-x-auto">
              <div className="flex gap-2">
                {blockTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleBlockTypeChange(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      blockType === option.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 text-neutral-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] tracking-[0.4em] uppercase text-neutral-500 dark:text-neutral-400">Now building</p>
                <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{activeBlock?.label}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{activeBlock?.description}</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Stage 02</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-950">
              <div className="max-w-3xl mx-auto space-y-6">{blockSpecificFields}</div>
            </div>
          </div>

          <aside className="border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-gray-900/30 p-6 space-y-6 overflow-y-auto">
            {selectionSummary}
            {schedulePanel}
          </aside>
        </div>
      </div>
    </div>
  );

}
