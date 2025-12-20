'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, Calendar, Users, Globe, Clock, Loader2, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { parseDestinations, formatDestinations, parseItineraryNotes } from '@/types/trip';

interface SharedTripData {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  description: string | null;
  items: any[];
  owner: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();

  if (startDate === endDate || !endDate) {
    return `${startStr}, ${year}`;
  }

  if (start.getMonth() === end.getMonth()) {
    return `${startStr}-${end.getDate()}, ${year}`;
  }

  return `${startStr} - ${endStr}, ${year}`;
}

/**
 * Group items by day
 */
function groupItemsByDay(items: any[]): Map<number, any[]> {
  const grouped = new Map<number, any[]>();
  items.forEach(item => {
    const day = item.day || 1;
    if (!grouped.has(day)) {
      grouped.set(day, []);
    }
    grouped.get(day)!.push(item);
  });

  // Sort items within each day by order_index
  grouped.forEach((items, day) => {
    items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  });

  return grouped;
}

/**
 * SharedTripPage - View a publicly shared trip
 */
export default function SharedTripPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [trip, setTrip] = useState<SharedTripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    async function fetchTrip() {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/trips/shared/${slug}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Trip not found');
          return;
        }

        setTrip(data);
      } catch (err) {
        console.error('Error fetching shared trip:', err);
        setError('Failed to load trip');
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Trip Not Found
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {error || 'This trip may have been removed or is no longer publicly shared.'}
          </p>
          <Button onClick={() => router.push('/')} className="rounded-full">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const destinations = parseDestinations(trip.destination);
  const destinationDisplay = formatDestinations(destinations);
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const itemsByDay = groupItemsByDay(trip.items || []);
  const dayNumbers = Array.from(itemsByDay.keys()).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Urban Manual</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
              <Globe className="w-3 h-3" />
              Public
            </span>
            {user && (
              <Link href="/trips">
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  My Trips
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative">
        {trip.cover_image ? (
          <div className="relative h-48 sm:h-64">
            <Image
              src={trip.cover_image}
              alt={trip.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
        )}

        {/* Trip Info Overlay */}
        <div className={`max-w-3xl mx-auto px-4 ${trip.cover_image ? '-mt-16 relative z-10' : 'pt-6'}`}>
          <div className={trip.cover_image ? 'text-white' : ''}>
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${!trip.cover_image ? 'text-gray-900 dark:text-white' : ''}`}>
              {trip.title}
            </h1>

            <div className={`flex flex-wrap items-center gap-3 text-sm ${trip.cover_image ? 'text-white/80' : 'text-gray-500'}`}>
              {destinationDisplay && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {destinationDisplay}
                </span>
              )}
              {dateRange && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {dateRange}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owner attribution */}
      {trip.owner && (
        <div className="max-w-3xl mx-auto px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {trip.owner.avatar_url ? (
              <Image
                src={trip.owner.avatar_url}
                alt={trip.owner.display_name || trip.owner.username || 'User'}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                {(trip.owner.display_name || trip.owner.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {trip.owner.display_name || trip.owner.username || 'Anonymous'}
              </p>
              <p className="text-xs text-gray-500">Trip creator</p>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {trip.description && (
        <div className="max-w-3xl mx-auto px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">{trip.description}</p>
        </div>
      )}

      {/* Day tabs */}
      {dayNumbers.length > 0 && (
        <div className="sticky top-[53px] z-40 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 py-3">
              {dayNumbers.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedDay === day
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Itinerary items */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {dayNumbers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No items in this itinerary yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(itemsByDay.get(selectedDay) || []).map((item, index) => {
              const notes = parseItineraryNotes(item.notes);
              const destination = item.destination;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                >
                  {/* Time */}
                  <div className="w-12 flex-shrink-0">
                    {item.time ? (
                      <span className="text-xs font-medium text-gray-400">
                        {item.time}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">--:--</span>
                    )}
                  </div>

                  {/* Image */}
                  {(destination?.image || notes?.image) && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={destination?.image || notes?.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.title}
                    </h3>

                    {destination?.city && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {destination.neighborhood || destination.city}
                      </p>
                    )}

                    {notes?.duration && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {notes.duration} min
                      </p>
                    )}

                    {item.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Link to destination page if available */}
                    {item.destination_slug && (
                      <Link
                        href={`/${item.destination_slug}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        View details
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign up CTA */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create your own trip itinerary
            </p>
            <Link href="/signin">
              <Button className="rounded-full">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
