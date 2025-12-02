'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Plane,
  Train,
  Hotel,
  Utensils,
  User,
  Lock,
  LogIn,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import type { Trip, ItineraryItem, TripAccess } from '@/types/trip';
import { parseItineraryNotes, parseDestinations, formatDestinationsFromField } from '@/types/trip';
import { calculateTripDays, addDaysToDate } from '@/lib/utils/time-calculations';

interface EnrichedItem extends ItineraryItem {
  destination?: {
    slug: string;
    name: string;
    city: string;
    category: string;
    image?: string;
    latitude?: number;
    longitude?: number;
  };
  parsedNotes?: ReturnType<typeof parseItineraryNotes>;
}

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: EnrichedItem[];
}

/**
 * SharedTripPage - Public view of a shared trip
 * Accessible via share link without authentication
 */
export default function SharedTripPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { user, loading: authLoading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [access, setAccess] = useState<TripAccess | null>(null);
  const [owner, setOwner] = useState<{ display_name?: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  // Fetch shared trip
  useEffect(() => {
    async function fetchTrip() {
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/trips/shared/${token}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError('This trip link is invalid or has expired.');
          } else {
            setError('Failed to load trip. Please try again.');
          }
          return;
        }

        const data = await res.json();
        setTrip(data.trip);
        setItems(data.items.map((item: any) => ({
          ...item,
          parsedNotes: parseItineraryNotes(item.notes),
        })));
        setAccess(data.access);
        setOwner(data.owner);

        // Expand first day by default
        setExpandedDays(new Set([1]));
      } catch (err) {
        console.error('Error fetching shared trip:', err);
        setError('Failed to load trip. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [token]);

  // Build days array
  const days = useMemo((): TripDay[] => {
    if (!trip) return [];

    const numDays = calculateTripDays(trip.start_date, trip.end_date);
    const daysArray: TripDay[] = [];

    for (let i = 1; i <= Math.max(numDays, 1); i++) {
      const dayItems = items
        .filter((item) => item.day === i)
        .sort((a, b) => a.order_index - b.order_index);

      daysArray.push({
        dayNumber: i,
        date: trip.start_date ? addDaysToDate(trip.start_date, i - 1) : null,
        items: dayItems,
      });
    }

    return daysArray;
  }, [trip, items]);

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const destinationsDisplay = useMemo(() => formatDestinationsFromField(trip?.destination ?? null), [trip?.destination]);

  // Toggle day expansion
  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  };

  // Get icon for item type
  const getItemIcon = (item: EnrichedItem) => {
    const type = item.parsedNotes?.type;
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4" />;
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'hotel':
        return <Hotel className="w-4 h-4" />;
      case 'breakfast':
        return <Utensils className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 bg-stone-50 dark:bg-gray-950 min-h-screen">
        <PageLoader />
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
            <Lock className="w-8 h-8 text-stone-400" />
          </div>
          <h1 className="text-xl font-medium text-stone-900 dark:text-white mb-2">
            Trip Not Found
          </h1>
          <p className="text-sm text-stone-500 dark:text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-stone-500 dark:text-gray-400 mb-4">Trip not found</p>
            <Link
              href="/"
              className="text-sm text-stone-900 dark:text-white hover:underline"
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Cover image from first destination
  const coverImage = items.find((item) => item.destination?.image)?.destination?.image;

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>

          {/* Cover Image */}
          {coverImage && (
            <div className="relative w-full h-40 sm:h-56 rounded-2xl overflow-hidden mb-6">
              <Image
                src={coverImage}
                alt={trip.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          {/* Title & Info */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-light text-stone-900 dark:text-white">
              {trip.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-gray-400">
              {destinationsDisplay && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {destinationsDisplay}
                </span>
              )}
              {trip.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {days.length} {days.length === 1 ? 'day' : 'days'}
              </span>
            </div>

            {/* Owner info */}
            {owner && (
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {owner.avatar_url ? (
                    <Image
                      src={owner.avatar_url}
                      alt={owner.display_name || 'Owner'}
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-stone-500" />
                  )}
                </div>
                <span className="text-xs text-stone-500 dark:text-gray-400">
                  Shared by {owner.display_name || 'a traveler'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Can Edit Banner */}
        {access?.canEdit && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-between">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              You have edit access to this trip
            </div>
            <Link
              href={`/trips/${trip.id}`}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Open Editor
            </Link>
          </div>
        )}

        {/* Login prompt for non-authenticated users */}
        {!user && (
          <div className="mb-6 p-4 bg-stone-100 dark:bg-gray-800 rounded-xl flex items-center justify-between">
            <div className="text-sm text-stone-600 dark:text-gray-300">
              Sign in to save or collaborate on trips
            </div>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:opacity-80 transition-opacity"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          </div>
        )}

        {/* Itinerary */}
        <div className="space-y-4">
          {days.map((day) => (
            <div
              key={day.dayNumber}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-stone-200 dark:border-gray-800 overflow-hidden"
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day.dayNumber)}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-900 dark:text-white">
                    Day {day.dayNumber}
                  </span>
                  {day.date && (
                    <span className="text-xs text-stone-500 dark:text-gray-400">
                      {formatDate(day.date)}
                    </span>
                  )}
                  <span className="text-xs text-stone-400 dark:text-gray-500">
                    {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
                  </span>
                </div>
                {expandedDays.has(day.dayNumber) ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </button>

              {/* Day Items */}
              {expandedDays.has(day.dayNumber) && (
                <div className="border-t border-stone-100 dark:border-gray-800">
                  {day.items.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-stone-400 dark:text-gray-500">
                        No activities planned
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100 dark:divide-gray-800">
                      {day.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 flex gap-4"
                        >
                          {/* Time */}
                          <div className="w-12 flex-shrink-0 text-right">
                            {item.time && (
                              <span className="text-xs font-medium text-stone-500 dark:text-gray-400">
                                {item.time}
                              </span>
                            )}
                          </div>

                          {/* Icon */}
                          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-stone-500 dark:text-gray-400">
                            {getItemIcon(item)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-stone-900 dark:text-white truncate">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 truncate">
                                {item.description}
                              </p>
                            )}
                            {/* Flight details */}
                            {item.parsedNotes?.type === 'flight' && (
                              <p className="text-xs text-stone-400 dark:text-gray-500 mt-1">
                                {item.parsedNotes.from} → {item.parsedNotes.to}
                                {item.parsedNotes.departureTime && ` · ${item.parsedNotes.departureTime}`}
                              </p>
                            )}
                            {/* Hotel details */}
                            {item.parsedNotes?.type === 'hotel' && item.parsedNotes.address && (
                              <p className="text-xs text-stone-400 dark:text-gray-500 mt-1">
                                {item.parsedNotes.address}
                              </p>
                            )}
                            {/* Duration */}
                            {item.parsedNotes?.duration && (
                              <span className="inline-block mt-1 text-[10px] text-stone-400 dark:text-gray-500 bg-stone-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {item.parsedNotes.duration} min
                              </span>
                            )}
                          </div>

                          {/* Image */}
                          {item.destination?.image && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 hidden sm:block">
                              <Image
                                src={item.destination.image}
                                alt={item.title}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {days.length === 0 && (
            <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
              <MapPin className="w-12 h-12 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
              <p className="text-sm text-stone-500 dark:text-gray-400">
                This trip has no itinerary yet
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-stone-200 dark:border-gray-800 text-center">
          <p className="text-xs text-stone-400 dark:text-gray-500 mb-4">
            Plan your own trips with Urban Manual
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
          >
            Explore Destinations
          </Link>
        </div>
      </div>
    </main>
  );
}
