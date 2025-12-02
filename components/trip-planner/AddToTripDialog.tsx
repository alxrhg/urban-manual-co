'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';
import type { FlightData, TrainData, ActivityData, ActivityType } from '@/types/trip';

interface AddToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: string;
  dayNumber: number;
  onAddPlace: (destination: Destination, dayNumber?: number) => void;
  onAddFlight: (flightData: FlightData) => void;
  onAddTrain: (trainData: TrainData) => void;
  onAddActivity: (activityData: ActivityData) => void;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'breakfast-at-hotel', label: 'Breakfast at Hotel' },
  { value: 'getting-ready', label: 'Getting Ready' },
  { value: 'free-time', label: 'Free Time' },
  { value: 'nap', label: 'Nap / Rest' },
  { value: 'pool', label: 'Pool Time' },
  { value: 'spa', label: 'Spa' },
  { value: 'gym', label: 'Gym' },
  { value: 'work', label: 'Work' },
  { value: 'shopping-time', label: 'Shopping' },
  { value: 'photo-walk', label: 'Photo Walk' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'packing', label: 'Packing' },
  { value: 'checkout-prep', label: 'Checkout Prep' },
  { value: 'other', label: 'Other' },
];

export function AddToTripDialog({
  open,
  onOpenChange,
  city,
  dayNumber,
  onAddPlace,
  onAddFlight,
  onAddTrain,
  onAddActivity,
}: AddToTripDialogProps) {
  const [activeTab, setActiveTab] = useState('places');
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Flight form state
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightAirline, setFlightAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDepDate, setFlightDepDate] = useState('');
  const [flightDepTime, setFlightDepTime] = useState('');
  const [flightArrDate, setFlightArrDate] = useState('');
  const [flightArrTime, setFlightArrTime] = useState('');
  const [flightConfirmation, setFlightConfirmation] = useState('');

  // Train form state
  const [trainFrom, setTrainFrom] = useState('');
  const [trainTo, setTrainTo] = useState('');
  const [trainLine, setTrainLine] = useState('');
  const [trainDepDate, setTrainDepDate] = useState('');
  const [trainDepTime, setTrainDepTime] = useState('');
  const [trainDuration, setTrainDuration] = useState('');

  // Activity form state
  const [activityType, setActivityType] = useState<ActivityType>('free-time');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDuration, setActivityDuration] = useState('60');

  // Search for places
  const searchPlaces = useCallback(async (query: string) => {
    if (!city && !query) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      let queryBuilder = supabase
        .from('destinations')
        .select('id, slug, name, city, category, image, image_thumbnail, rating, micro_description')
        .limit(20);

      if (city) {
        queryBuilder = queryBuilder.ilike('city', `%${city}%`);
      }

      if (query) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (!error && data) {
        setPlaces(data as Destination[]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [city]);

  // Load places on open
  useEffect(() => {
    if (open && activeTab === 'places') {
      searchPlaces(searchQuery);
    }
  }, [open, activeTab, searchQuery, searchPlaces]);

  // Handle search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'places') {
        searchPlaces(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, searchPlaces]);

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
      arrivalDate: flightArrDate || flightDepDate,
      arrivalTime: flightArrTime,
      confirmationNumber: flightConfirmation,
    });

    // Reset form
    setFlightFrom('');
    setFlightTo('');
    setFlightAirline('');
    setFlightNumber('');
    setFlightDepDate('');
    setFlightDepTime('');
    setFlightArrDate('');
    setFlightArrTime('');
    setFlightConfirmation('');
  };

  const handleAddTrain = () => {
    if (!trainFrom || !trainTo) return;

    onAddTrain({
      type: 'train',
      from: trainFrom,
      to: trainTo,
      trainLine: trainLine,
      departureDate: trainDepDate,
      departureTime: trainDepTime,
      duration: trainDuration ? parseInt(trainDuration) : undefined,
    });

    // Reset form
    setTrainFrom('');
    setTrainTo('');
    setTrainLine('');
    setTrainDepDate('');
    setTrainDepTime('');
    setTrainDuration('');
  };

  const handleAddActivity = () => {
    const title = activityTitle || ACTIVITY_TYPES.find(a => a.value === activityType)?.label || 'Activity';

    onAddActivity({
      type: 'activity',
      activityType,
      title,
      duration: parseInt(activityDuration) || 60,
    });

    // Reset form
    setActivityType('free-time');
    setActivityTitle('');
    setActivityDuration('60');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add to Day {dayNumber}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="places" className="flex-1 gap-1.5">
              <MapPin className="w-4 h-4" />
              Places
            </TabsTrigger>
            <TabsTrigger value="flight" className="flex-1 gap-1.5">
              <Plane className="w-4 h-4" />
              Flight
            </TabsTrigger>
            <TabsTrigger value="train" className="flex-1 gap-1.5">
              <Train className="w-4 h-4" />
              Train
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 gap-1.5">
              <Coffee className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Places Tab */}
          <TabsContent value="places" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={`Search places in ${city || 'any city'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : places.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No places found. Try a different search.
                </p>
              ) : (
                <div className="space-y-2 pb-4">
                  {places.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => onAddPlace(place, dayNumber)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
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
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {place.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {place.category && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {place.category.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {place.rating && (
                            <span className="flex items-center gap-0.5 text-xs text-gray-500">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {place.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {place.micro_description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {place.micro_description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Flight Tab */}
          <TabsContent value="flight" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    placeholder="JFK"
                    value={flightFrom}
                    onChange={(e) => setFlightFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    placeholder="LHR"
                    value={flightTo}
                    onChange={(e) => setFlightTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Airline</Label>
                  <Input
                    placeholder="British Airways"
                    value={flightAirline}
                    onChange={(e) => setFlightAirline(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Flight Number</Label>
                  <Input
                    placeholder="BA178"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Input
                    type="date"
                    value={flightDepDate}
                    onChange={(e) => setFlightDepDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Time</Label>
                  <Input
                    type="time"
                    value={flightDepTime}
                    onChange={(e) => setFlightDepTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Arrival Date</Label>
                  <Input
                    type="date"
                    value={flightArrDate}
                    onChange={(e) => setFlightArrDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival Time</Label>
                  <Input
                    type="time"
                    value={flightArrTime}
                    onChange={(e) => setFlightArrTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmation Number</Label>
                <Input
                  placeholder="ABC123"
                  value={flightConfirmation}
                  onChange={(e) => setFlightConfirmation(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAddFlight}
                disabled={!flightFrom || !flightTo}
                className="w-full"
              >
                Add Flight
              </Button>
            </div>
          </TabsContent>

          {/* Train Tab */}
          <TabsContent value="train" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    placeholder="London St Pancras"
                    value={trainFrom}
                    onChange={(e) => setTrainFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    placeholder="Paris Gare du Nord"
                    value={trainTo}
                    onChange={(e) => setTrainTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Train Line</Label>
                <Input
                  placeholder="Eurostar"
                  value={trainLine}
                  onChange={(e) => setTrainLine(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Input
                    type="date"
                    value={trainDepDate}
                    onChange={(e) => setTrainDepDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Time</Label>
                  <Input
                    type="time"
                    value={trainDepTime}
                    onChange={(e) => setTrainDepTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="135"
                  value={trainDuration}
                  onChange={(e) => setTrainDuration(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAddTrain}
                disabled={!trainFrom || !trainTo}
                className="w-full"
              >
                Add Train
              </Button>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                  <SelectTrigger>
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
                <Label>Custom Title (optional)</Label>
                <Input
                  placeholder={ACTIVITY_TYPES.find(a => a.value === activityType)?.label}
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={activityDuration}
                  onChange={(e) => setActivityDuration(e.target.value)}
                />
              </div>

              <Button onClick={handleAddActivity} className="w-full">
                Add Activity
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
