'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search, MapPin, Loader2, Globe, Plus, X, Plane, Train, Clock, Building2,
  BedDouble, Waves, Sparkles, Dumbbell, Coffee, Shirt, Package, Sun, Briefcase, Phone, Camera, ShoppingBag,
  ChevronRight, ChevronDown
} from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';
import type { FlightData, TrainData, ActivityData, ActivityType, HotelData, ItineraryItemNotes } from '@/types/trip';
import { CuratedResultCard, GoogleResultRow } from './panels/add';
import {
  TripCard,
  TripCardHeader,
  TripCardTitle,
  TripCardContent,
  TripTabs,
  TripTabsList,
  TripTabsTrigger,
  TripTabsContent,
  TripInput,
  TripLabel,
  TripButton,
} from './ui';

const CATEGORIES = ['All', 'Dining', 'Cafe', 'Bar', 'Culture', 'Shopping', 'Hotel'];

type Tab = 'curated' | 'google' | 'flight' | 'train' | 'hotel' | 'activity';

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

/**
 * Enriched itinerary item for time slot suggestions and trip tracking
 */
interface EnrichedItem {
  id: string;
  title: string;
  time: string | null;
  day?: number;
  parsedNotes?: ItineraryItemNotes | null;
  destination_slug?: string | null;
}

/**
 * Time slot suggestion for the dropdown
 */
interface TimeSlot {
  label: string;
  time: string;
  description?: string;
}

/** Google Place data from search results */
interface GooglePlaceData {
  place_id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  rating?: number;
  price_level?: number;
  latitude?: number;
  longitude?: number;
  image?: string;
}

interface AddPlaceBoxProps {
  city?: string | null;
  dayNumber?: number;
  /** Items for the current day - used for smart time slot suggestions */
  dayItems?: EnrichedItem[];
  /** All trip items - used to check if a place is already in the trip */
  tripItems?: EnrichedItem[];
  /** Pre-filled time when opened from a specific gap/position */
  suggestedTime?: string;
  /** Insert after this item ID */
  afterItemId?: string;
  /** Called when adding a curated place from Urban Manual */
  onSelect?: (destination: Destination, time?: string, source?: 'curated') => void;
  /** Called when adding a place from Google */
  onSelectGooglePlace?: (place: GooglePlaceData, time?: string) => void;
  onAddFlight?: (flightData: FlightData) => void;
  onAddTrain?: (trainData: TrainData) => void;
  onAddHotel?: (hotelData: HotelData) => void;
  onAddActivity?: (activityData: ActivityData, time?: string) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * AddPlaceBox - Inline place, flight, and train search/add component
 * Unified interface for adding any type of item to the itinerary
 */
/**
 * Generate smart time slot suggestions based on existing day items
 */
function generateTimeSlots(dayItems: EnrichedItem[], afterItemId?: string): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Sort items by time
  const sortedItems = [...dayItems].filter(item => item.time).sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });

  // Helper to format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Find the item we're inserting after (if specified)
  const afterIndex = afterItemId ? sortedItems.findIndex(item => item.id === afterItemId) : -1;
  const afterItem = afterIndex >= 0 ? sortedItems[afterIndex] : null;
  const beforeItem = afterIndex >= 0 && afterIndex < sortedItems.length - 1 ? sortedItems[afterIndex + 1] : null;

  // If we have a preceding item, suggest time after it
  if (afterItem && afterItem.time) {
    const afterMinutes = timeToMinutes(afterItem.time);
    const duration = afterItem.parsedNotes?.duration || 60;
    const suggestedMinutes = afterMinutes + duration + 30; // Add 30 min buffer
    const suggestedTime = minutesToTime(suggestedMinutes);

    // Determine label based on item type
    const itemType = afterItem.parsedNotes?.type;
    let label = `After ${afterItem.title}`;
    if (itemType === 'flight') {
      label = `After Flight`;
    } else if (itemType === 'hotel') {
      label = `After check-in`;
    }

    slots.push({
      label,
      time: suggestedTime,
      description: formatTimeDisplay(suggestedTime),
    });
  }

  // If we have a following item, suggest time before it
  if (beforeItem && beforeItem.time) {
    const beforeMinutes = timeToMinutes(beforeItem.time);
    const suggestedMinutes = beforeMinutes - 90; // 90 min before
    if (suggestedMinutes > 0) {
      const suggestedTime = minutesToTime(suggestedMinutes);
      slots.push({
        label: `Before ${beforeItem.title}`,
        time: suggestedTime,
        description: formatTimeDisplay(suggestedTime),
      });
    }
  }

  // Add standard meal time slots
  const mealSlots: TimeSlot[] = [
    { label: 'Breakfast', time: '08:30', description: '8:30 AM' },
    { label: 'Lunch', time: '12:30', description: '12:30 PM' },
    { label: 'Afternoon', time: '15:00', description: '3:00 PM' },
    { label: 'Dinner', time: '19:00', description: '7:00 PM' },
  ];

  // Only add meal slots that don't conflict with existing items
  for (const mealSlot of mealSlots) {
    const mealMinutes = timeToMinutes(mealSlot.time);
    const hasConflict = sortedItems.some(item => {
      if (!item.time) return false;
      const itemMinutes = timeToMinutes(item.time);
      const duration = item.parsedNotes?.duration || 60;
      return mealMinutes >= itemMinutes && mealMinutes <= itemMinutes + duration;
    });

    if (!hasConflict && !slots.some(s => s.time === mealSlot.time)) {
      slots.push(mealSlot);
    }
  }

  // Sort slots by time
  slots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return slots;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const clampedMinutes = Math.max(0, Math.min(1439, minutes)); // Clamp to valid day range
  const hours = Math.floor(clampedMinutes / 60);
  const mins = clampedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export default function AddPlaceBox({
  city,
  dayNumber = 1,
  dayItems = [],
  tripItems = [],
  suggestedTime,
  afterItemId,
  onSelect,
  onSelectGooglePlace,
  onAddFlight,
  onAddTrain,
  onAddHotel,
  onAddActivity,
  onClose,
  className = '',
}: AddPlaceBoxProps) {
  // Helper to check if a destination is already in the trip
  const getPlaceInTrip = (slug: string) => {
    const item = tripItems.find(item =>
      item.parsedNotes?.slug === slug || item.destination_slug === slug
    );
    if (!item) return null;
    return {
      day: item.day || 1,
      time: item.time || '',
    };
  };

  // Helper to check if a Google place is already in the trip
  const getGooglePlaceInTrip = (placeId: string) => {
    const item = tripItems.find(item => item.parsedNotes?.googlePlaceId === placeId);
    if (!item) return null;
    return {
      day: item.day || 1,
      time: item.time || '',
    };
  };
  const [tab, setTab] = useState<Tab>('curated');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Time selection state
  const [selectedTime, setSelectedTime] = useState<string | null>(suggestedTime || null);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Generate smart time slots
  const timeSlots = generateTimeSlots(dayItems, afterItemId);

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

  // Hotel form state
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    checkInDate: '',
    checkInTime: '15:00',
    checkOutDate: '',
    checkOutTime: '11:00',
    confirmationNumber: '',
    roomType: '',
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

    onAddActivity(activityData, selectedTime || undefined);
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
      onSelect(place, selectedTime || undefined, 'curated');
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
    if (!googlePlace) return;

    // If onSelectGooglePlace is available, use it for proper source tracking
    if (onSelectGooglePlace) {
      const placeData: GooglePlaceData = {
        place_id: googlePlace.place_id || `google-${Date.now()}`,
        name: googlePlace.name,
        city: googlePlace.city || city || '',
        category: googlePlace.category || 'Other',
        address: googlePlace.address,
        neighborhood: googlePlace.neighborhood,
        rating: googlePlace.rating,
        price_level: googlePlace.price_level,
        latitude: googlePlace.latitude,
        longitude: googlePlace.longitude,
        // Note: We don't store Google images due to licensing
      };
      onSelectGooglePlace(placeData, selectedTime || undefined);
    } else if (onSelect) {
      // Fallback to onSelect if onSelectGooglePlace not provided
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
      onSelect(destination, selectedTime || undefined);
    }

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

  const handleAddHotel = () => {
    if (!onAddHotel || !hotelForm.name || !hotelForm.checkInDate) return;

    const hotelData: HotelData = {
      type: 'hotel',
      name: hotelForm.name,
      address: hotelForm.address || undefined,
      checkInDate: hotelForm.checkInDate,
      checkInTime: hotelForm.checkInTime || undefined,
      checkOutDate: hotelForm.checkOutDate || undefined,
      checkOutTime: hotelForm.checkOutTime || undefined,
      roomType: hotelForm.roomType || undefined,
    };

    if (hotelForm.confirmationNumber) {
      hotelData.confirmationNumber = hotelForm.confirmationNumber;
    }

    onAddHotel(hotelData);

    // Reset form
    setHotelForm({
      name: '',
      address: '',
      checkInDate: '',
      checkInTime: '15:00',
      checkOutDate: '',
      checkOutTime: '11:00',
      confirmationNumber: '',
      roomType: '',
    });
  };

  return (
    <TripCard className={className}>
      {/* Header */}
      <TripCardHeader>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <TripCardTitle>Add to Trip</TripCardTitle>
          <span className="text-xs text-gray-400 flex-shrink-0">
            · Day {dayNumber}
          </span>
          {/* Time Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span>·</span>
              <span className="truncate max-w-[120px]">
                {selectedTime ? (
                  (() => {
                    const [hours, minutes] = selectedTime.split(':').map(Number);
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                  })()
                ) : (
                  'auto'
                )}
              </span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {/* Time Dropdown */}
            {showTimeDropdown && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-50 overflow-hidden">
                {/* Auto option */}
                <button
                  onClick={() => {
                    setSelectedTime(null);
                    setShowTimeDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                    !selectedTime ? 'bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                >
                  <span className="text-gray-900 dark:text-white">Auto</span>
                  <span className="text-gray-400">System finds best slot</span>
                </button>

                {/* Smart time slots */}
                {timeSlots.length > 0 && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-800" />
                    {timeSlots.map((slot, index) => (
                      <button
                        key={`${slot.time}-${index}`}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setShowTimeDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                          selectedTime === slot.time ? 'bg-gray-50 dark:bg-gray-800' : ''
                        }`}
                      >
                        <span className="text-gray-900 dark:text-white">{slot.label}</span>
                        <span className="text-gray-400">{slot.description}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Custom time option */}
                <div className="border-t border-gray-100 dark:border-gray-800" />
                <div className="px-3 py-2">
                  <label className="text-xs text-gray-400 mb-1 block">Custom time</label>
                  <input
                    type="time"
                    value={selectedTime || ''}
                    onChange={(e) => {
                      setSelectedTime(e.target.value || null);
                    }}
                    onBlur={() => setShowTimeDropdown(false)}
                    className="w-full px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {onClose && (
          <TripButton variant="icon" onClick={onClose} className="-mr-1">
            <X className="w-4 h-4 text-gray-400" />
          </TripButton>
        )}
      </TripCardHeader>

      {/* Tabs */}
      <TripTabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TripTabsList>
          <TripTabsTrigger value="curated">Curated</TripTabsTrigger>
          <TripTabsTrigger value="google">Google</TripTabsTrigger>
          {onAddFlight && (
            <TripTabsTrigger value="flight" icon={<Plane className="w-3 h-3" />}>
              Flight
            </TripTabsTrigger>
          )}
          {onAddTrain && (
            <TripTabsTrigger value="train" icon={<Train className="w-3 h-3" />}>
              Train
            </TripTabsTrigger>
          )}
          {onAddHotel && (
            <TripTabsTrigger value="hotel" icon={<Building2 className="w-3 h-3" />}>
              Hotel
            </TripTabsTrigger>
          )}
          {onAddActivity && (
            <TripTabsTrigger value="activity" icon={<Clock className="w-3 h-3" />}>
              Activity
            </TripTabsTrigger>
          )}
        </TripTabsList>

        {/* Curated Tab */}
        <TripTabsContent value="curated">
          <TripCardContent>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <TripInput
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search places..."
                variant="search"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1">
              {CATEGORIES.map((cat) => (
                <TripButton
                  key={cat}
                  variant={category === cat ? 'pillActive' : 'pill'}
                  size="sm"
                  onClick={() => setCategory(cat)}
                  className="py-1"
                >
                  {cat}
                </TripButton>
              ))}
            </div>

            {/* Results - Urban Manual Curated */}
            <div className="max-h-80 overflow-y-auto -mx-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : places.length === 0 ? (
                <div className="text-center py-6">
                  <MapPin className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">No places found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Try Google tab for more options</p>
                </div>
              ) : (
                <div className="space-y-2 px-1">
                  {/* Section header */}
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                    From Urban Manual
                  </h3>

                  {/* Curated results with premium cards */}
                  <div className="space-y-2">
                    {places.map((place) => {
                      const tripOccurrence = getPlaceInTrip(place.slug);
                      return (
                        <CuratedResultCard
                          key={place.slug}
                          destination={place}
                          isInTrip={!!tripOccurrence}
                          tripOccurrence={tripOccurrence || undefined}
                          onQuickAdd={() => handleSelect(place)}
                          onSelect={() => handleSelect(place)}
                        />
                      );
                    })}
                  </div>

                  {/* Prompt to try Google */}
                  {places.length > 0 && places.length < 5 && (
                    <button
                      onClick={() => setTab('google')}
                      className="w-full py-3 mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      Search more on Google
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </TripCardContent>
        </TripTabsContent>

        {/* Google Tab */}
        <TripTabsContent value="google">
          <TripCardContent>
            {/* Section header */}
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              More from Google
            </h3>

            {/* Google Search */}
            <GooglePlacesAutocomplete
              value={googleQuery}
              onChange={setGoogleQuery}
              onPlaceSelect={handleGooglePlaceSelect}
              placeholder="Search any place..."
              types="establishment"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 mb-3">
              Search restaurants, cafes, museums, hotels...
            </p>

            {/* Google Place Preview - Minimal Style */}
            <div className="max-h-64 overflow-y-auto">
              {googleLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : googlePlace ? (
                <div className="space-y-3">
                  {/* Minimal row preview - no image */}
                  <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <GoogleResultRow
                      place={{
                        place_id: googlePlace.place_id,
                        name: googlePlace.name,
                        category: googlePlace.category,
                        address: googlePlace.address,
                        city: googlePlace.city || city || '',
                        neighborhood: googlePlace.neighborhood,
                        rating: googlePlace.rating,
                        price_level: googlePlace.price_level,
                        latitude: googlePlace.latitude,
                        longitude: googlePlace.longitude,
                      }}
                      isInTrip={!!getGooglePlaceInTrip(googlePlace.place_id)}
                      tripOccurrence={getGooglePlaceInTrip(googlePlace.place_id) || undefined}
                      onQuickAdd={handleAddGooglePlace}
                      onSelect={handleAddGooglePlace}
                    />
                  </div>

                  {/* Address details below */}
                  {googlePlace.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-3 line-clamp-2">
                      {googlePlace.address}
                    </p>
                  )}

                  <TripButton onClick={handleAddGooglePlace} className="w-full">
                    <Plus className="w-4 h-4" />
                    Add to Day {dayNumber}
                  </TripButton>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Globe className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">Search for a place above</p>
                </div>
              )}
            </div>
          </TripCardContent>
        </TripTabsContent>

        {/* Flight Tab */}
        <TripTabsContent value="flight">
          <TripCardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Airline</TripLabel>
                <TripInput
                  type="text"
                  value={flightForm.airline}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, airline: e.target.value }))}
                  placeholder="e.g., United"
                />
              </div>
              <div>
                <TripLabel>Flight #</TripLabel>
                <TripInput
                  type="text"
                  value={flightForm.flightNumber}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, flightNumber: e.target.value }))}
                  placeholder="e.g., UA123"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>From *</TripLabel>
                <TripInput
                  type="text"
                  value={flightForm.from}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, from: e.target.value }))}
                  placeholder="e.g., JFK"
                />
              </div>
              <div>
                <TripLabel>To *</TripLabel>
                <TripInput
                  type="text"
                  value={flightForm.to}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="e.g., CDG"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Departure Date</TripLabel>
                <TripInput
                  type="date"
                  value={flightForm.departureDate}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, departureDate: e.target.value }))}
                />
              </div>
              <div>
                <TripLabel>Departure Time</TripLabel>
                <TripInput
                  type="time"
                  value={flightForm.departureTime}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, departureTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Arrival Date</TripLabel>
                <TripInput
                  type="date"
                  value={flightForm.arrivalDate}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, arrivalDate: e.target.value }))}
                />
              </div>
              <div>
                <TripLabel>Arrival Time</TripLabel>
                <TripInput
                  type="time"
                  value={flightForm.arrivalTime}
                  onChange={(e) => setFlightForm(prev => ({ ...prev, arrivalTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <TripLabel>Confirmation #</TripLabel>
              <TripInput
                type="text"
                value={flightForm.confirmationNumber}
                onChange={(e) => setFlightForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <TripButton
              onClick={handleAddFlight}
              disabled={!flightForm.from || !flightForm.to}
              className="w-full"
            >
              <Plane className="w-4 h-4" />
              Add Flight to Day {dayNumber}
            </TripButton>
          </TripCardContent>
        </TripTabsContent>

        {/* Train Tab */}
        <TripTabsContent value="train">
          <TripCardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Train Line</TripLabel>
                <TripInput
                  type="text"
                  value={trainForm.trainLine}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, trainLine: e.target.value }))}
                  placeholder="e.g., Eurostar"
                />
              </div>
              <div>
                <TripLabel>Train #</TripLabel>
                <TripInput
                  type="text"
                  value={trainForm.trainNumber}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, trainNumber: e.target.value }))}
                  placeholder="e.g., 9001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>From *</TripLabel>
                <TripInput
                  type="text"
                  value={trainForm.from}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, from: e.target.value }))}
                  placeholder="e.g., London St Pancras"
                />
              </div>
              <div>
                <TripLabel>To *</TripLabel>
                <TripInput
                  type="text"
                  value={trainForm.to}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="e.g., Paris Gare du Nord"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Departure Date</TripLabel>
                <TripInput
                  type="date"
                  value={trainForm.departureDate}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, departureDate: e.target.value }))}
                />
              </div>
              <div>
                <TripLabel>Departure Time</TripLabel>
                <TripInput
                  type="time"
                  value={trainForm.departureTime}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, departureTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Arrival Time</TripLabel>
                <TripInput
                  type="time"
                  value={trainForm.arrivalTime}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, arrivalTime: e.target.value }))}
                />
              </div>
              <div>
                <TripLabel>Confirmation #</TripLabel>
                <TripInput
                  type="text"
                  value={trainForm.confirmationNumber}
                  onChange={(e) => setTrainForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <TripButton
              onClick={handleAddTrain}
              disabled={!trainForm.from || !trainForm.to}
              className="w-full"
            >
              <Train className="w-4 h-4" />
              Add Train to Day {dayNumber}
            </TripButton>
          </TripCardContent>
        </TripTabsContent>

        {/* Hotel Tab */}
        <TripTabsContent value="hotel">
          <TripCardContent className="space-y-3">
            <div>
              <TripLabel>Hotel Name *</TripLabel>
              <TripInput
                type="text"
                value={hotelForm.name}
                onChange={(e) => setHotelForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Four Seasons Miami"
              />
            </div>

            <div>
              <TripLabel>Address</TripLabel>
              <TripInput
                type="text"
                value={hotelForm.address}
                onChange={(e) => setHotelForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., 1435 Brickell Ave, Miami"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Check-in Date *</TripLabel>
                <TripInput
                  type="date"
                  value={hotelForm.checkInDate}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, checkInDate: e.target.value }))}
                />
              </div>
              <div>
                <TripLabel>Check-in Time</TripLabel>
                <TripInput
                  type="time"
                  value={hotelForm.checkInTime}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Check-out Date</TripLabel>
                <TripInput
                  type="date"
                  value={hotelForm.checkOutDate}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, checkOutDate: e.target.value }))}
                />
              </div>
              <div>
                <TripLabel>Check-out Time</TripLabel>
                <TripInput
                  type="time"
                  value={hotelForm.checkOutTime}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <TripLabel>Room Type</TripLabel>
                <TripInput
                  type="text"
                  value={hotelForm.roomType}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, roomType: e.target.value }))}
                  placeholder="e.g., Ocean View Suite"
                />
              </div>
              <div>
                <TripLabel>Confirmation #</TripLabel>
                <TripInput
                  type="text"
                  value={hotelForm.confirmationNumber}
                  onChange={(e) => setHotelForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <TripButton
              onClick={handleAddHotel}
              disabled={!hotelForm.name || !hotelForm.checkInDate}
              className="w-full"
            >
              <Building2 className="w-4 h-4" />
              Add Hotel
            </TripButton>
          </TripCardContent>
        </TripTabsContent>

        {/* Activity Tab */}
        <TripTabsContent value="activity">
          <TripCardContent>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
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
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 ring-2 ring-gray-900 dark:ring-white'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Duration & Notes (when activity selected) */}
            {selectedActivity && (
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <TripLabel>Duration</TripLabel>
                  <select
                    value={activityDuration}
                    onChange={(e) => setActivityDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm"
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
                  <TripLabel>Notes (optional)</TripLabel>
                  <TripInput
                    type="text"
                    value={activityNotes}
                    onChange={(e) => setActivityNotes(e.target.value)}
                    placeholder="e.g., hotel pool, spa appointment..."
                  />
                </div>

                <TripButton
                  onClick={() => handleAddActivity(selectedActivity)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                  Add to Day {dayNumber}
                </TripButton>
              </div>
            )}
          </TripCardContent>
        </TripTabsContent>
      </TripTabs>
    </TripCard>
  );
}
