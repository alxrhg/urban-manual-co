'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Plane,
  Train,
  Coffee,
  Search,
  Loader2,
  Star,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';
import type { FlightData, TrainData, ActivityData, ActivityType } from '@/types/trip';

type Tab = 'places' | 'flight' | 'train' | 'activity';

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'breakfast-at-hotel', label: 'Breakfast' },
  { value: 'free-time', label: 'Free Time' },
  { value: 'nap', label: 'Rest' },
  { value: 'pool', label: 'Pool' },
  { value: 'spa', label: 'Spa' },
  { value: 'shopping-time', label: 'Shopping' },
  { value: 'photo-walk', label: 'Photo Walk' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'work', label: 'Work' },
  { value: 'packing', label: 'Packing' },
  { value: 'other', label: 'Other' },
];

interface AddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: string;
  onAddPlace: (destination: Destination) => void;
  onAddFlight: (data: FlightData) => void;
  onAddTrain: (data: TrainData) => void;
  onAddActivity: (data: ActivityData) => void;
}

export function AddSheet({
  open,
  onOpenChange,
  city,
  onAddPlace,
  onAddFlight,
  onAddTrain,
  onAddActivity,
}: AddSheetProps) {
  const [tab, setTab] = useState<Tab>('places');
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);

  // Flight form
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightAirline, setFlightAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDepDate, setFlightDepDate] = useState('');
  const [flightDepTime, setFlightDepTime] = useState('');
  const [flightArrTime, setFlightArrTime] = useState('');

  // Train form
  const [trainFrom, setTrainFrom] = useState('');
  const [trainTo, setTrainTo] = useState('');
  const [trainDepDate, setTrainDepDate] = useState('');
  const [trainDepTime, setTrainDepTime] = useState('');
  const [trainDuration, setTrainDuration] = useState('');

  // Activity form
  const [activityType, setActivityType] = useState<ActivityType>('free-time');
  const [activityDuration, setActivityDuration] = useState('60');

  // Search places
  const searchPlaces = useCallback(async (query: string) => {
    if (!city && !query) return;
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      let q = supabase
        .from('destinations')
        .select('id, slug, name, city, category, image, image_thumbnail, rating, micro_description')
        .limit(15);

      if (city) q = q.ilike('city', `%${city}%`);
      if (query) q = q.ilike('name', `%${query}%`);

      const { data } = await q;
      if (data) setPlaces(data as Destination[]);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    if (open && tab === 'places') {
      const timer = setTimeout(() => searchPlaces(search), 300);
      return () => clearTimeout(timer);
    }
  }, [open, tab, search, searchPlaces]);

  const resetForms = () => {
    setSearch('');
    setFlightFrom('');
    setFlightTo('');
    setFlightAirline('');
    setFlightNumber('');
    setFlightDepDate('');
    setFlightDepTime('');
    setFlightArrTime('');
    setTrainFrom('');
    setTrainTo('');
    setTrainDepDate('');
    setTrainDepTime('');
    setTrainDuration('');
    setActivityType('free-time');
    setActivityDuration('60');
  };

  const handleClose = () => {
    resetForms();
    onOpenChange(false);
  };

  const handleAddFlight = () => {
    if (!flightFrom || !flightTo) return;
    onAddFlight({
      type: 'flight',
      from: flightFrom,
      to: flightTo,
      airline: flightAirline,
      flightNumber: flightNumber,
      departureDate: flightDepDate,
      departureTime: flightDepTime,
      arrivalDate: flightDepDate,
      arrivalTime: flightArrTime,
    });
    handleClose();
  };

  const handleAddTrain = () => {
    if (!trainFrom || !trainTo) return;
    onAddTrain({
      type: 'train',
      from: trainFrom,
      to: trainTo,
      departureDate: trainDepDate,
      departureTime: trainDepTime,
      duration: trainDuration ? parseInt(trainDuration) : undefined,
    });
    handleClose();
  };

  const handleAddActivity = () => {
    const label = ACTIVITY_TYPES.find(a => a.value === activityType)?.label || 'Activity';
    onAddActivity({
      type: 'activity',
      activityType,
      title: label,
      duration: parseInt(activityDuration) || 60,
    });
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0">
        <SheetHeader className="px-6 pb-4">
          <SheetTitle>Add to trip</SheetTitle>
        </SheetHeader>

        {/* Tab Pills */}
        <div className="flex gap-2 px-6 pb-4 overflow-x-auto">
          {[
            { id: 'places', label: 'Places', icon: MapPin },
            { id: 'flight', label: 'Flight', icon: Plane },
            { id: 'train', label: 'Train', icon: Train },
            { id: 'activity', label: 'Activity', icon: Coffee },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors
                ${tab === id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Places Tab */}
        {tab === 'places' && (
          <>
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder={`Search in ${city || 'all cities'}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 rounded-xl"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(90vh-200px)]">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : places.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-12">
                  No places found
                </p>
              ) : (
                <div className="px-6 space-y-2 pb-6">
                  {places.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => {
                        onAddPlace(place);
                        handleClose();
                      }}
                      className="w-full flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        {place.image || place.image_thumbnail ? (
                          <Image
                            src={place.image_thumbnail || place.image || ''}
                            alt={place.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {place.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {place.category && (
                            <span className="text-xs text-gray-500 capitalize">
                              {place.category.replace(/_/g, ' ')}
                            </span>
                          )}
                          {place.rating && (
                            <span className="flex items-center gap-0.5 text-xs text-gray-500">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {place.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {/* Flight Tab */}
        {tab === 'flight' && (
          <div className="px-6 space-y-4 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  placeholder="JFK"
                  value={flightFrom}
                  onChange={(e) => setFlightFrom(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  placeholder="LHR"
                  value={flightTo}
                  onChange={(e) => setFlightTo(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Airline</Label>
                <Input
                  placeholder="British Airways"
                  value={flightAirline}
                  onChange={(e) => setFlightAirline(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Flight #</Label>
                <Input
                  placeholder="BA178"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={flightDepDate}
                onChange={(e) => setFlightDepDate(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departure</Label>
                <Input
                  type="time"
                  value={flightDepTime}
                  onChange={(e) => setFlightDepTime(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Arrival</Label>
                <Input
                  type="time"
                  value={flightArrTime}
                  onChange={(e) => setFlightArrTime(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <Button
              onClick={handleAddFlight}
              disabled={!flightFrom || !flightTo}
              className="w-full h-12 mt-4"
            >
              Add Flight
            </Button>
          </div>
        )}

        {/* Train Tab */}
        {tab === 'train' && (
          <div className="px-6 space-y-4 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  placeholder="London"
                  value={trainFrom}
                  onChange={(e) => setTrainFrom(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  placeholder="Paris"
                  value={trainTo}
                  onChange={(e) => setTrainTo(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={trainDepDate}
                onChange={(e) => setTrainDepDate(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={trainDepTime}
                  onChange={(e) => setTrainDepTime(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  placeholder="135"
                  value={trainDuration}
                  onChange={(e) => setTrainDuration(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            <Button
              onClick={handleAddTrain}
              disabled={!trainFrom || !trainTo}
              className="w-full h-12 mt-4"
            >
              Add Train
            </Button>
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="px-6 space-y-4 pb-6">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={activityDuration}
                onChange={(e) => setActivityDuration(e.target.value)}
                className="h-12"
              />
            </div>

            <Button onClick={handleAddActivity} className="w-full h-12 mt-4">
              Add Activity
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
