'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Plane,
  BedDouble,
  Bookmark,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import type { Destination } from '@/types/destination';
import {
  PlannerDayInput,
  FlightDraft,
  HotelDraft,
  saveTripDraft,
  createTripPlannerRepository,
} from '@/lib/trip-planner/saveTripDraft';

const INITIAL_DAY: PlannerDayInput = { dayNumber: 1, date: null, items: [] };

function formatHumanDate(date: string | null) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function normalizeDateRange(startDate: string, endDate?: string | null) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  if (end < start) return { start, end: start };
  return { start, end };
}

export default function HomeTripPlanner() {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer } = useDrawerStore();
  const [tripName, setTripName] = useState('');
  const [tripCity, setTripCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDay, setSelectedDay] = useState(1);
  const [days, setDays] = useState<PlannerDayInput[]>([INITIAL_DAY]);
  const [hotel, setHotel] = useState<HotelDraft>({ name: '', checkIn: '', checkOut: '' });
  const [flight, setFlight] = useState<FlightDraft>({
    airline: '',
    flightNumber: '',
    from: '',
    to: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
  });
  const [myPlaces, setMyPlaces] = useState<Destination[]>([]);
  const [myPlacesLoading, setMyPlacesLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!startDate) {
      setDays((prev) => prev.map((day, index) => ({ ...day, dayNumber: index + 1, date: null })));
      return;
    }

    const { start, end } = normalizeDateRange(startDate, endDate || startDate);
    const diffDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const totalDays = diffDays + 1;

    setDays((prev) => {
      const map = new Map(prev.map((day) => [day.dayNumber, day]));
      const next: PlannerDay[] = [];
      for (let i = 0; i < totalDays; i += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const iso = date.toISOString().slice(0, 10);
        next.push({
          dayNumber: i + 1,
          date: iso,
          items: map.get(i + 1)?.items || [],
        });
      }
      return next;
    });

    setSelectedDay((prev) => Math.min(prev, totalDays));
  }, [startDate, endDate]);

  useEffect(() => {
    if (!user) {
      setMyPlaces([]);
      return;
    }

    let cancelled = false;
    setMyPlacesLoading(true);

    const loadSavedPlaces = async () => {
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
          if (!cancelled) setMyPlaces([]);
          return;
        }

        const { data: destinations, error: destError } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, image_thumbnail')
          .in('slug', slugs);

        if (destError) throw destError;

        const ordered = slugs
          .map((slug) => destinations?.find((d) => d.slug === slug))
          .filter((d): d is Destination => Boolean(d));

        if (!cancelled) setMyPlaces(ordered);
      } catch (err) {
        console.error('Error loading saved places', err);
        if (!cancelled) setMyPlaces([]);
      } finally {
        if (!cancelled) setMyPlacesLoading(false);
      }
    };

    loadSavedPlaces();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const totalStops = useMemo(() => days.reduce((acc, day) => acc + day.items.length, 0), [days]);
  const selectedDayData = days.find((day) => day.dayNumber === selectedDay) || days[0];

  const addStopToDay = (dayNumber: number, destination: Destination, source: 'saved' | 'search') => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              items: [
                ...day.items,
                {
                  id: `${destination.slug || 'place'}-${Date.now()}-${Math.random()}`,
                  title: destination.name,
                  slug: destination.slug || undefined,
                  city: destination.city || tripCity || undefined,
                  category: destination.category || undefined,
                  image: destination.image_thumbnail || destination.image || undefined,
                  source,
                },
              ],
            }
          : day
      )
    );
  };

  const removeStopFromDay = (dayNumber: number, stopId: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, items: day.items.filter((item) => item.id !== stopId) }
          : day
      )
    );
  };

  const handleOpenPlaceSelector = (dayNumber: number) => {
    openDrawer('place-selector', {
      dayNumber,
      city: tripCity || null,
      onSelect: (destination: Destination) => addStopToDay(dayNumber, destination, 'search'),
    });
  };

  const handleSaveTrip = async () => {
    if (!user) {
      router.push('/account');
      return;
    }

    if (!startDate) {
      setSaveError('Please select a start date');
      return;
    }

    setSaveError(null);
    setSaving(true);

    try {
      const supabase = createClient();
      const repo = createTripPlannerRepository(supabase);

      const result = await saveTripDraft({
        repo,
        userId: user.id,
        tripName,
        tripCity,
        startDate,
        endDate,
        days,
        hotel,
        flight,
      });

      router.push(`/trips/${result.tripId}`);
    } catch (error) {
      console.error('Error saving trip plan', error);
      setSaveError('Something went wrong while saving your trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0b0b0b]/80 backdrop-blur px-6 py-6 md:px-10 md:py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">Trip planner</p>
          <h2 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-white flex items-center gap-2">
            Build a multi-day getaway
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h2>
        </div>
        {totalStops > 0 && (
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-4 h-4" />
            {totalStops} stops queued
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Trip name</label>
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g. Spring in Tokyo"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Primary city</label>
          <input
            value={tripCity}
            onChange={(e) => setTripCity(e.target.value)}
            placeholder="Destination city"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Start date</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              inputMode="none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">End date</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              inputMode="none"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2">
          <Calendar className="w-3.5 h-3.5" />
          {days.length} day{days.length !== 1 && 's'}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2">
          <Bookmark className="w-3.5 h-3.5" />
          {totalStops} stops queued
        </div>
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-3 scrollbar-hide text-sm font-medium">
        {days.map((day) => (
          <button
            key={day.dayNumber}
            onClick={() => setSelectedDay(day.dayNumber)}
            className={`rounded-full px-4 py-2 transition ${
              selectedDay === day.dayNumber
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            Day {day.dayNumber}
            {day.date && <span className="ml-2 text-xs opacity-70">{formatHumanDate(day.date)}</span>}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-5 mt-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-500">Day {selectedDay}</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {formatHumanDate(selectedDayData?.date) || tripCity || 'Flexible schedule'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenPlaceSelector(selectedDay)}
              className="inline-flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-medium hover:opacity-80 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Browse places
            </button>
          </div>
        </div>

        {selectedDayData?.items.length ? (
          <div className="mt-4 space-y-2">
            {selectedDayData.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 px-3 py-2"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.city || tripCity || 'Unassigned'}
                  </p>
                </div>
                <button
                  onClick={() => removeStopFromDay(selectedDay, item.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-10">
            <MapPin className="w-6 h-6 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              No stops yet for this day.
            </p>
            <button
              onClick={() => handleOpenPlaceSelector(selectedDay)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition"
            >
              <Plus className="w-3 h-3" />
              Add from curated search
            </button>
          </div>
        )}
      </div>

      {user && (
        <div className="mt-6 rounded-3xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">My places</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Tap to add to Day {selectedDay}
              </p>
            </div>
          </div>

          {myPlacesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : myPlaces.length === 0 ? (
            <p className="text-xs text-gray-500 mt-4">
              Save destinations from the homepage to re-use them here instantly.
            </p>
          ) : (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {myPlaces.slice(0, 12).map((place) => (
                <button
                  key={place.slug}
                  onClick={() => addStopToDay(selectedDay, place, 'saved')}
                  className="min-w-[160px] rounded-2xl border border-gray-200 dark:border-gray-800 text-left hover:border-gray-900 dark:hover:border-white transition bg-white dark:bg-[#050505]"
                >
                  <div className="h-24 w-full overflow-hidden rounded-2xl">
                    {place.image_thumbnail || place.image ? (
                      <Image
                        src={place.image_thumbnail || place.image || ''}
                        alt={place.name}
                        width={160}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{place.name}</p>
                    <p className="text-xs text-gray-500 truncate">{place.city}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <BedDouble className="w-4 h-4" />
            Hotel
          </div>
          <div className="mt-4 space-y-3">
            <input
              value={hotel.name}
              onChange={(e) => setHotel((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Hotel name"
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                inputMode="none"
                value={hotel.checkIn}
                onChange={(e) => setHotel((prev) => ({ ...prev, checkIn: e.target.value }))}
                placeholder="Check-in"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                type="date"
                inputMode="none"
                value={hotel.checkOut}
                onChange={(e) => setHotel((prev) => ({ ...prev, checkOut: e.target.value }))}
                placeholder="Check-out"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <Plane className="w-4 h-4" />
            Flight
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={flight.airline}
                onChange={(e) => setFlight((prev) => ({ ...prev, airline: e.target.value }))}
                placeholder="Airline"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                value={flight.flightNumber}
                onChange={(e) => setFlight((prev) => ({ ...prev, flightNumber: e.target.value }))}
                placeholder="Flight #"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={flight.from}
                onChange={(e) => setFlight((prev) => ({ ...prev, from: e.target.value }))}
                placeholder="From"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                value={flight.to}
                onChange={(e) => setFlight((prev) => ({ ...prev, to: e.target.value }))}
                placeholder="To"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                inputMode="none"
                value={flight.departureDate}
                onChange={(e) => setFlight((prev) => ({ ...prev, departureDate: e.target.value }))}
                placeholder="Departure date"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                type="time"
                value={flight.departureTime}
                onChange={(e) => setFlight((prev) => ({ ...prev, departureTime: e.target.value }))}
                placeholder="Departure time"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                inputMode="none"
                value={flight.arrivalDate}
                onChange={(e) => setFlight((prev) => ({ ...prev, arrivalDate: e.target.value }))}
                placeholder="Arrival date"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <input
                type="time"
                value={flight.arrivalTime}
                onChange={(e) => setFlight((prev) => ({ ...prev, arrivalTime: e.target.value }))}
                placeholder="Arrival time"
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <p className="mt-4 text-sm text-red-500">{saveError}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          onClick={handleSaveTrip}
          disabled={saving || !startDate}
          className="inline-flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-6 py-3 text-sm font-medium hover:opacity-80 transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save trip plan
              <Sparkles className="w-4 h-4 text-amber-300" />
            </>
          )}
        </button>
        {!user && (
          <p className="text-xs text-gray-500">
            Sign in to store this itinerary in your account.
          </p>
        )}
      </div>
    </div>
  );
}
