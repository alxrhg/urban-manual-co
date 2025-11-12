'use client';

import { useMemo } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { ProfileEditor } from '@/components/ProfileEditor';
import { WorldMapVisualization } from '@/components/WorldMapVisualization';
import { AchievementsDisplay } from '@/components/AchievementsDisplay';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountProfilePage() {
  const {
    user,
    profile,
    savedPlaces,
    visitedPlaces,
    collections,
    visitedCountries,
    totalDestinations,
    loading,
    refreshProfile,
  } = useUserContext();

  const statistics = useMemo(
    () => [
      {
        label: 'Visited places',
        value: visitedPlaces.length,
      },
      {
        label: 'Saved places',
        value: savedPlaces.length,
      },
      {
        label: 'Collections',
        value: collections.length,
      },
      {
        label: 'Countries tracked',
        value: visitedCountries.length,
      },
    ],
    [visitedPlaces.length, savedPlaces.length, collections.length, visitedCountries.length]
  );

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    visitedPlaces.forEach(place => {
      if (place.destination?.city) {
        cities.add(place.destination.city);
      }
    });
    return cities;
  }, [visitedPlaces]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    visitedPlaces.forEach(place => {
      if (place.destination?.country) {
        countries.add(place.destination.country);
      }
    });
    visitedCountries.forEach(country => {
      if (country.country_name) {
        countries.add(country.country_name);
      }
    });
    return countries;
  }, [visitedPlaces, visitedCountries]);

  if (!user) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in required</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Create an account or sign in to personalize your Urban Manual experience.
        </p>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(index => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10 text-sm">
      <header className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account overview</h1>
        <p className="text-gray-600 dark:text-gray-400">
          A quick summary of your saved places and travel history.
        </p>
        <dl className="space-y-1">
          {statistics.map(stat => (
            <div key={stat.label} className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">{stat.label}</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{stat.value}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Destinations tracked</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{totalDestinations}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="profile-details" className="space-y-3">
        <h2 id="profile-details" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Profile details
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Update your public profile and travel preferences.
        </p>
        <ProfileEditor userId={user.id} onSaveComplete={refreshProfile} />
      </section>

      <section aria-labelledby="map-intelligence" className="space-y-3">
        <h2 id="map-intelligence" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Global footprint
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Countries highlighted are based on your visited destinations and travel history.
        </p>
        <WorldMapVisualization
          visitedCountries={new Set(visitedCountries.map(item => item.country_name).filter(Boolean) as string[])}
          visitedDestinations={visitedPlaces.map(place => ({
            city: place.destination.city,
            latitude: place.destination.latitude,
            longitude: place.destination.longitude,
          }))}
        />
      </section>

      <section aria-labelledby="achievement-progress" className="space-y-3">
        <h2 id="achievement-progress" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Achievement progress
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Unlock badges as you explore cities, save places, and visit top recommendations.
        </p>
        <AchievementsDisplay
          visitedPlaces={visitedPlaces}
          savedPlaces={savedPlaces}
          uniqueCities={uniqueCities}
          uniqueCountries={uniqueCountries}
        />
      </section>
    </div>
  );
}
