'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { VisitedPlace, SavedPlace } from '@/types/common';
import type { Trip } from '@/types/trip';
import { WorldMapVisualization } from '@/components/WorldMapVisualization';

interface UserProfile {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
}

interface TravelJournalProps {
  userId: string;
  userEmail?: string;
  visitedPlaces: VisitedPlace[];
  savedPlaces: SavedPlace[];
  trips: Trip[];
  stats: {
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
    visitedCount: number;
    savedCount: number;
    visitedDestinationsWithCoords: Array<{
      city: string;
      latitude?: number | null;
      longitude?: number | null;
    }>;
  };
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (!endDate) {
    return start.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' });
  }

  const end = new Date(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', formatOptions)}–${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString('en-US', formatOptions)} – ${end.toLocaleDateString('en-US', formatOptions)}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' })} – ${end.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' })}`;
}

function getTripStatus(startDate?: string | null, endDate?: string | null): 'upcoming' | 'ongoing' | 'past' {
  if (!startDate) return 'upcoming';

  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'ongoing';
}

export function TravelJournal({
  userId,
  userEmail,
  visitedPlaces,
  savedPlaces,
  trips,
  stats,
}: TravelJournalProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllCities, setShowAllCities] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const response = await fetch('/api/account/profile');
      if (!response.ok) throw new Error('Failed to load profile');
      const data = await response.json();
      setProfile(data.profile || {});
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  // Group visited places by city
  const placesByCity = useMemo(() => {
    const cityMap: Record<string, VisitedPlace[]> = {};

    visitedPlaces.forEach(place => {
      const city = place.destination?.city;
      if (city) {
        if (!cityMap[city]) {
          cityMap[city] = [];
        }
        cityMap[city].push(place);
      }
    });

    // Sort cities by place count (descending)
    return Object.entries(cityMap)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([city, places]) => ({
        city,
        displayName: capitalizeCity(city),
        places,
        count: places.length,
      }));
  }, [visitedPlaces]);

  // Get upcoming/ongoing trips
  const upcomingTrips = useMemo(() => {
    return trips
      .filter(trip => {
        const status = getTripStatus(trip.start_date, trip.end_date);
        return status === 'upcoming' || status === 'ongoing';
      })
      .sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      })
      .slice(0, 2);
  }, [trips]);

  // Milestones (simple text acknowledgments)
  const milestones = useMemo(() => {
    const items: string[] = [];
    if (stats.visitedCount >= 50) items.push(`Visited ${stats.visitedCount} places`);
    else if (stats.visitedCount >= 25) items.push(`Visited ${stats.visitedCount} places`);
    else if (stats.visitedCount >= 10) items.push(`Visited ${stats.visitedCount} places`);

    if (stats.uniqueCountries.size >= 10) items.push(`Explored ${stats.uniqueCountries.size} countries`);
    else if (stats.uniqueCountries.size >= 5) items.push(`Explored ${stats.uniqueCountries.size} countries`);

    if (stats.uniqueCities.size >= 20) items.push(`Discovered ${stats.uniqueCities.size} cities`);
    else if (stats.uniqueCities.size >= 10) items.push(`Discovered ${stats.uniqueCities.size} cities`);

    return items;
  }, [stats]);

  const displayedCities = showAllCities ? placesByCity : placesByCity.slice(0, 5);
  const hasMoreCities = placesByCity.length > 5;

  if (loading) {
    return (
      <div className="animate-pulse space-y-12">
        <div className="h-40 bg-gray-100 dark:bg-gray-900" />
        <div className="h-60 bg-gray-100 dark:bg-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Hero Header */}
      <header className="text-center py-8 md:py-12">
        <p className="text-xs tracking-[0.3em] text-gray-400 dark:text-gray-500 uppercase mb-4">
          Traveler
        </p>
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-light mb-6">
          {profile?.display_name || 'Traveler'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
          {stats.visitedCount} {stats.visitedCount === 1 ? 'place' : 'places'} · {stats.uniqueCities.size} {stats.uniqueCities.size === 1 ? 'city' : 'cities'} · {stats.uniqueCountries.size} {stats.uniqueCountries.size === 1 ? 'country' : 'countries'}
        </p>
      </header>

      {/* Places Visited by City */}
      {visitedPlaces.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-8 md:mb-12">
            Places Visited
          </h2>

          <div className="space-y-10 md:space-y-12">
            {displayedCities.map(({ city, displayName, places, count }) => (
              <div key={city}>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-serif text-xl md:text-2xl font-light">
                    {displayName}
                  </h3>
                  <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
                    {count}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                    {places.map((place, idx) => (
                      <span key={place.destination_slug}>
                        <button
                          onClick={() => router.push(`/destination/${place.destination_slug}`)}
                          className="hover:text-black dark:hover:text-white transition-colors"
                        >
                          {place.destination?.name}
                        </button>
                        {idx < places.length - 1 && <span className="text-gray-300 dark:text-gray-600"> · </span>}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {hasMoreCities && (
            <button
              onClick={() => setShowAllCities(!showAllCities)}
              className="mt-8 text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              {showAllCities ? 'Show less' : `See all ${placesByCity.length} cities`} →
            </button>
          )}
        </section>
      )}

      {/* Travel Map */}
      {stats.uniqueCountries.size > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-8 md:mb-12">
            Travel Map
          </h2>

          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
            <WorldMapVisualization
              visitedCountries={stats.uniqueCountries}
              visitedDestinations={stats.visitedDestinationsWithCoords}
            />
          </div>

          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 font-light">
            {Array.from(stats.uniqueCountries).sort().join(' · ')}
          </p>
        </section>
      )}

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-8 md:mb-12">
            Upcoming
          </h2>

          <div className="space-y-6">
            {upcomingTrips.map(trip => {
              const isOngoing = getTripStatus(trip.start_date, trip.end_date) === 'ongoing';
              return (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                  className="block text-left w-full hover:opacity-70 transition-opacity"
                >
                  <h3 className="font-serif text-xl md:text-2xl font-light mb-1">
                    {trip.title}
                    {isOngoing && (
                      <span className="ml-3 text-xs font-sans text-green-600 dark:text-green-400">
                        Now
                      </span>
                    )}
                  </h3>
                  {trip.start_date && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {trips.length > upcomingTrips.length && (
            <button
              onClick={() => router.push('/account/settings?tab=trips')}
              className="mt-6 text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              See all trips →
            </button>
          )}
        </section>
      )}

      {/* Saved for Later */}
      {savedPlaces.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-8 md:mb-12">
            <h2 className="text-xs tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">
              Saved for Later
            </h2>
            <button
              onClick={() => router.push('/account/settings?tab=saved')}
              className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {savedPlaces.slice(0, 4).map((place) => (
              <button
                key={place.destination_slug}
                onClick={() => router.push(`/destination/${place.destination_slug}`)}
                className="group text-left"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 mb-2">
                  {place.destination?.image && (
                    <Image
                      src={place.destination.image}
                      alt={place.destination.name || ''}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                </div>
                <h3 className="text-sm font-light leading-tight line-clamp-1">
                  {place.destination?.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {place.destination?.city && capitalizeCity(place.destination.city)}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Milestones (subtle, no badges) */}
      {milestones.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-6">
            Milestones
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
            {milestones.join(' · ')}
          </p>
        </section>
      )}

      {/* Settings Link */}
      <footer className="pt-8 border-t border-gray-100 dark:border-gray-900">
        <button
          onClick={() => router.push('/account/settings')}
          className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
        >
          Settings →
        </button>
      </footer>
    </div>
  );
}
