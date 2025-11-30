'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Search, MapPin, Loader2, Globe, Plus, X, Plane, Train, Clock,
  BedDouble, Waves, Sparkles, Dumbbell, Coffee, Shirt, Package, Sun, Briefcase, Phone, Camera, ShoppingBag
} from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';
import type { FlightData, TrainData, ActivityData, ActivityType } from '@/types/trip';

const CATEGORIES = ['All', 'Dining', 'Cafe', 'Bar', 'Culture', 'Shopping', 'Hotel'];

type Tab = 'curated' | 'google' | 'flight' | 'train' | 'activity';

// Activity quick-add options
const ACTIVITY_OPTIONS: { type: ActivityType; icon: typeof BedDouble; label: string; defaultDuration: number }[] = [
  { type: 'nap', icon: BedDouble, label: 'Nap / Rest', defaultDuration: 60 },
  { type: 'pool', icon: Waves, label: 'Pool Time', defaultDuration: 90 },
  { type: 'spa', icon: Sparkles, label: 'Spa', defaultDuration: 120 },
  { type: 'gym', icon: Dumbbell, label: 'Workout', defaultDuration: 60 },
  { type: 'breakfast-at-hotel', icon: Coffee, label: 'Hotel Breakfast', defaultDuration: 45 },
  { type: 'getting-ready', icon: Shirt, label: 'Getting Ready', defaultDuration: 45 },
  { type: 'packing', icon: Package, label: 'Packing', defaultDuration: 30 },
  { type: 'checkout-prep', icon: Package, label: 'Check-out Prep', defaultDuration: 30 },
  { type: 'free-time', icon: Clock, label: 'Free Time', defaultDuration: 60 },
  { type: 'sunset', icon: Sun, label: 'Sunset', defaultDuration: 45 },
  { type: 'work', icon: Briefcase, label: 'Work Time', defaultDuration: 120 },
  { type: 'call', icon: Phone, label: 'Call / Meeting', defaultDuration: 30 },
  { type: 'shopping-time', icon: ShoppingBag, label: 'Shopping', defaultDuration: 90 },
  { type: 'photo-walk', icon: Camera, label: 'Photo Walk', defaultDuration: 60 },
];

interface AddPlaceBoxProps {
  city?: string | null;
  dayNumber?: number;
  onSelect?: (destination: Destination) => void;
  onAddFlight?: (flightData: FlightData) => void;
  onAddTrain?: (trainData: TrainData) => void;
  onAddActivity?: (activityData: ActivityData) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * AddPlaceBox - Inline place, flight, and train search/add component
 * Unified interface for adding any type of item to the itinerary
 */
export default function AddPlaceBox({
  city,
  dayNumber = 1,
  onSelect,
  onAddFlight,
  onAddTrain,
  onAddActivity,
  onClose,
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

  // Flight form state
  const [flightForm, setFlightForm] = useState({
    airline: '',
    flightNumber: '',
    from: '',
    to: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    confirmationNumber: '',
  });

  // Train form state
  const [trainForm, setTrainForm] = useState({
    trainLine: '',
    trainNumber: '',
    from: '',
    to: '',
    departureDate: '',
    departureTime: '',
    arrivalTime: '',
    confirmationNumber: '',
  });

  // Activity state
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [activityDuration, setActivityDuration] = useState(60);
  const [activityNotes, setActivityNotes] = useState('');

  const handleAddActivity = (activityType: ActivityType) => {
    if (!onAddActivity) return;

    const option = ACTIVITY_OPTIONS.find(o => o.type === activityType);
    const activityData: ActivityData = {
      type: 'activity',
      activityType,
      title: option?.label || 'Activity',
      duration: activityDuration || option?.defaultDuration || 60,
      notes: activityNotes || undefined,
    };

    onAddActivity(activityData);
    setSelectedActivity(null);
    setActivityDuration(60);
    setActivityNotes('');
  };

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

  const handleAddFlight = () => {
    if (!onAddFlight || !flightForm.from || !flightForm.to) return;

    const flightData: FlightData = {
      type: 'flight',
      airline: flightForm.airline,
      flightNumber: flightForm.flightNumber,
      from: flightForm.from,
      to: flightForm.to,
      departureDate: flightForm.departureDate,
      departureTime: flightForm.departureTime,
      arrivalDate: flightForm.arrivalDate || flightForm.departureDate,
      arrivalTime: flightForm.arrivalTime,
    };

    if (flightForm.confirmationNumber) {
      flightData.confirmationNumber = flightForm.confirmationNumber;
    }

    onAddFlight(flightData);

    // Reset form
    setFlightForm({
      airline: '',
      flightNumber: '',
      from: '',
      to: '',
      departureDate: '',
      departureTime: '',
      arrivalDate: '',
      arrivalTime: '',
      confirmationNumber: '',
    });
  };

  const handleAddTrain = () => {
    if (!onAddTrain || !trainForm.from || !trainForm.to) return;

    const trainData: TrainData = {
      type: 'train',
      trainLine: trainForm.trainLine || undefined,
      trainNumber: trainForm.trainNumber || undefined,
      from: trainForm.from,
      to: trainForm.to,
      departureDate: trainForm.departureDate,
      departureTime: trainForm.departureTime,
      arrivalTime: trainForm.arrivalTime || undefined,
    };

    if (trainForm.confirmationNumber) {
      trainData.confirmationNumber = trainForm.confirmationNumber;
    }

    onAddTrain(trainData);

    // Reset form
    setTrainForm({
      trainLine: '',
      trainNumber: '',
      from: '',
      to: '',
      departureDate: '',
      departureTime: '',
      arrivalTime: '',
      confirmationNumber: '',
    });
  };

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Add to Trip
          </h3>
          <span className="text-xs text-stone-400">
            · Day {dayNumber}
          </span>
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
      <div className="px-4 pt-3 pb-2 flex gap-4 text-xs border-b border-stone-100 dark:border-gray-800 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setTab('curated')}
          className={`transition-all pb-2 whitespace-nowrap ${
            tab === 'curated'
              ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
              : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
          }`}
        >
          Curated
        </button>
        <button
          onClick={() => setTab('google')}
          className={`transition-all pb-2 whitespace-nowrap ${
            tab === 'google'
              ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
              : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
          }`}
        >
          Google
        </button>
        {onAddFlight && (
          <button
            onClick={() => setTab('flight')}
            className={`transition-all pb-2 flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'flight'
                ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
                : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            <Plane className="w-3 h-3" />
            Flight
          </button>
        )}
        {onAddTrain && (
          <button
            onClick={() => setTab('train')}
            className={`transition-all pb-2 flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'train'
                ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
                : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            <Train className="w-3 h-3" />
            Train
          </button>
        )}
        {onAddActivity && (
          <button
            onClick={() => setTab('activity')}
            className={`transition-all pb-2 flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'activity'
                ? 'font-medium text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-[9px]'
                : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            Activity
          </button>
        )}
      </div>

      {/* Curated Tab */}
      {tab === 'curated' && (
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
      )}

      {/* Google Tab */}
      {tab === 'google' && (
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

      {/* Flight Tab */}
      {tab === 'flight' && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Airline</label>
              <input
                type="text"
                value={flightForm.airline}
                onChange={(e) => setFlightForm(prev => ({ ...prev, airline: e.target.value }))}
                placeholder="e.g., United"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Flight #</label>
              <input
                type="text"
                value={flightForm.flightNumber}
                onChange={(e) => setFlightForm(prev => ({ ...prev, flightNumber: e.target.value }))}
                placeholder="e.g., UA123"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">From *</label>
              <input
                type="text"
                value={flightForm.from}
                onChange={(e) => setFlightForm(prev => ({ ...prev, from: e.target.value }))}
                placeholder="e.g., JFK"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">To *</label>
              <input
                type="text"
                value={flightForm.to}
                onChange={(e) => setFlightForm(prev => ({ ...prev, to: e.target.value }))}
                placeholder="e.g., CDG"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure Date</label>
              <input
                type="date"
                value={flightForm.departureDate}
                onChange={(e) => setFlightForm(prev => ({ ...prev, departureDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure Time</label>
              <input
                type="time"
                value={flightForm.departureTime}
                onChange={(e) => setFlightForm(prev => ({ ...prev, departureTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Arrival Date</label>
              <input
                type="date"
                value={flightForm.arrivalDate}
                onChange={(e) => setFlightForm(prev => ({ ...prev, arrivalDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Arrival Time</label>
              <input
                type="time"
                value={flightForm.arrivalTime}
                onChange={(e) => setFlightForm(prev => ({ ...prev, arrivalTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Confirmation #</label>
            <input
              type="text"
              value={flightForm.confirmationNumber}
              onChange={(e) => setFlightForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>

          <button
            onClick={handleAddFlight}
            disabled={!flightForm.from || !flightForm.to}
            className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <Plane className="w-4 h-4" />
            Add Flight to Day {dayNumber}
          </button>
        </div>
      )}

      {/* Train Tab */}
      {tab === 'train' && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Train Line</label>
              <input
                type="text"
                value={trainForm.trainLine}
                onChange={(e) => setTrainForm(prev => ({ ...prev, trainLine: e.target.value }))}
                placeholder="e.g., Eurostar"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Train #</label>
              <input
                type="text"
                value={trainForm.trainNumber}
                onChange={(e) => setTrainForm(prev => ({ ...prev, trainNumber: e.target.value }))}
                placeholder="e.g., 9001"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">From *</label>
              <input
                type="text"
                value={trainForm.from}
                onChange={(e) => setTrainForm(prev => ({ ...prev, from: e.target.value }))}
                placeholder="e.g., London St Pancras"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">To *</label>
              <input
                type="text"
                value={trainForm.to}
                onChange={(e) => setTrainForm(prev => ({ ...prev, to: e.target.value }))}
                placeholder="e.g., Paris Gare du Nord"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure Date</label>
              <input
                type="date"
                value={trainForm.departureDate}
                onChange={(e) => setTrainForm(prev => ({ ...prev, departureDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure Time</label>
              <input
                type="time"
                value={trainForm.departureTime}
                onChange={(e) => setTrainForm(prev => ({ ...prev, departureTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Arrival Time</label>
              <input
                type="time"
                value={trainForm.arrivalTime}
                onChange={(e) => setTrainForm(prev => ({ ...prev, arrivalTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Confirmation #</label>
              <input
                type="text"
                value={trainForm.confirmationNumber}
                onChange={(e) => setTrainForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>

          <button
            onClick={handleAddTrain}
            disabled={!trainForm.from || !trainForm.to}
            className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <Train className="w-4 h-4" />
            Add Train to Day {dayNumber}
          </button>
        </div>
      )}

      {/* Activity Tab */}
      {tab === 'activity' && (
        <div className="p-4">
          <p className="text-xs text-stone-500 dark:text-gray-400 mb-3">
            Add downtime, hotel activities, or personal time blocks
          </p>

          {/* Activity Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
            {ACTIVITY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedActivity === option.type;
              return (
                <button
                  key={option.type}
                  onClick={() => {
                    if (isSelected) {
                      // If already selected, add it immediately
                      handleAddActivity(option.type);
                    } else {
                      setSelectedActivity(option.type);
                      setActivityDuration(option.defaultDuration);
                    }
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900 ring-2 ring-stone-900 dark:ring-white'
                      : 'bg-stone-50 dark:bg-gray-800 hover:bg-stone-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-stone-400'}`} />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* Duration & Notes (when activity selected) */}
          {selectedActivity && (
            <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-gray-800">
              <div>
                <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Duration</label>
                <select
                  value={activityDuration}
                  onChange={(e) => setActivityDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="e.g., hotel pool, spa appointment..."
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-sm placeholder:text-stone-400"
                />
              </div>

              <button
                onClick={() => handleAddActivity(selectedActivity)}
                className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add to Day {dayNumber}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
