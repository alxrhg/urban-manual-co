'use client';

import { useMemo } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { ProfileEditor } from '@/components/ProfileEditor';
import { WorldMapVisualization } from '@/components/WorldMapVisualization';
import { AchievementsDisplay } from '@/components/AchievementsDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
        <h1 className="text-2xl font-semibold text-foreground">Sign in required</h1>
        <p className="text-muted-foreground">
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
    <div className="space-y-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Account overview</h1>
            <p className="text-sm text-muted-foreground">
              See how your journeys and preferences shape recommendations.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
            {totalDestinations} destinations tracked
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statistics.map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card/80 p-4 text-sm shadow-sm"
            >
              <p className="text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      <section aria-labelledby="profile-details" className="space-y-6">
        <div className="space-y-2">
          <h2 id="profile-details" className="text-lg font-medium text-foreground">
            Profile details
          </h2>
          <p className="text-sm text-muted-foreground">
            Update your public profile and travel preferences.
          </p>
        </div>
        <ProfileEditor userId={user.id} onSaveComplete={refreshProfile} />
      </section>

      <section aria-labelledby="map-intelligence" className="space-y-6">
        <div className="space-y-2">
          <h2 id="map-intelligence" className="text-lg font-medium text-foreground">
            Global footprint
          </h2>
          <p className="text-sm text-muted-foreground">
            Countries highlighted are based on your visited destinations and travel history.
          </p>
        </div>
        <WorldMapVisualization
          visitedCountries={new Set(visitedCountries.map(item => item.country_name).filter(Boolean) as string[])}
          visitedDestinations={visitedPlaces.map(place => ({
            city: place.destination.city,
            latitude: place.destination.latitude,
            longitude: place.destination.longitude,
          }))}
        />
      </section>

      <section aria-labelledby="achievement-progress" className="space-y-6">
        <div className="space-y-2">
          <h2 id="achievement-progress" className="text-lg font-medium text-foreground">
            Achievement progress
          </h2>
          <p className="text-sm text-muted-foreground">
            Unlock badges as you explore cities, save places, and visit top recommendations.
          </p>
        </div>
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
