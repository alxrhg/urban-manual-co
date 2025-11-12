'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useUserContext } from '@/contexts/UserContext';
import { ProfileEditor } from '@/components/ProfileEditor';
import { WorldMapVisualization } from '@/components/WorldMapVisualization';
import { AchievementsDisplay } from '@/components/AchievementsDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Heart, Check, Globe, Award } from 'lucide-react';

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

  // Get user display name or email
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Traveler';
  const userBio = profile?.bio || '';
  const userAvatar = profile?.avatar_url || null;
  const userLocation = profile?.location || '';

  // Calculate curation completion
  const curationCompletion = totalDestinations > 0
    ? Math.round((visitedPlaces.length / totalDestinations) * 100)
    : 0;

  // Get recent highlights (most recent visited places)
  const recentHighlights = useMemo(() => {
    return visitedPlaces
      .slice(0, 3)
      .map(place => ({
        name: place.destination?.name || 'Unknown',
        city: place.destination?.city || '',
        category: place.destination?.category || '',
        image: place.destination?.image || null,
      }));
  }, [visitedPlaces]);

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12">
            {/* Portrait/Avatar */}
            {userAvatar ? (
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 dark:border-gray-800">
                <Image
                  src={userAvatar}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border-2 border-gray-100 dark:border-gray-800">
                <span className="text-3xl md:text-4xl font-medium text-gray-400 dark:text-gray-500">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Headline and Narrative */}
            <div className="flex-1 space-y-4">
              <h1 className="text-4xl md:text-5xl font-medium leading-tight text-black dark:text-white">
                {displayName}
              </h1>
              {userLocation && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{userLocation}</span>
                </div>
              )}
              {userBio ? (
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                  {userBio}
                </p>
              ) : (
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                  {visitedPlaces.length > 0
                    ? `Exploring ${uniqueCities.size} ${uniqueCities.size === 1 ? 'city' : 'cities'} across ${uniqueCountries.size} ${uniqueCountries.size === 1 ? 'country' : 'countries'}.`
                    : 'Building your travel story, one destination at a time.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Lighter Inline Callouts */}
      <section className="px-6 md:px-10 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-6 md:gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">{statistics[0].label}:</span>
              <span className="font-medium text-black dark:text-white">{statistics[0].value}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">{statistics[1].label}:</span>
              <span className="font-medium text-black dark:text-white">{statistics[1].value}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">{statistics[2].label}:</span>
              <span className="font-medium text-black dark:text-white">{statistics[2].value}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">{statistics[3].label}:</span>
              <span className="font-medium text-black dark:text-white">{statistics[3].value}</span>
            </div>
            {curationCompletion > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Curation explored:</span>
                <span className="font-medium text-black dark:text-white">{curationCompletion}%</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Profile Editor */}
      <section aria-labelledby="profile-details" className="px-6 md:px-10 lg:px-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <h2 id="profile-details" className="text-2xl md:text-3xl font-medium text-black dark:text-white">
            Profile details
          </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Update your public profile and travel preferences.
          </p>
        </div>
        <ProfileEditor userId={user.id} onSaveComplete={refreshProfile} />
        </div>
      </section>

      {/* Recent Highlights / Testimonial Band */}
      {recentHighlights.length > 0 && (
        <section className="px-6 md:px-10 lg:px-12 py-12 md:py-16 border-t border-gray-100 dark:border-gray-700">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                Recent highlights
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Places you've recently visited and explored.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentHighlights.map((highlight, index) => (
                <div key={index} className="space-y-3">
                  {highlight.image ? (
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={highlight.image}
                        alt={highlight.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square w-full rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                      {highlight.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {highlight.city} {highlight.category && `• ${highlight.category}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* World Map - Long-form Story Section */}
      <section aria-labelledby="map-intelligence" className="px-6 md:px-10 lg:px-12 py-12 md:py-16 border-t border-gray-100 dark:border-gray-700">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h2 id="map-intelligence" className="text-2xl md:text-3xl font-medium text-black dark:text-white">
            Global footprint
          </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              Countries highlighted are based on your visited destinations and travel history. Each pin represents a place you've explored, creating a visual narrative of your journeys.
          </p>
        </div>
          <div className="mt-8">
        <WorldMapVisualization
          visitedCountries={new Set(visitedCountries.map(item => item.country_name).filter(Boolean) as string[])}
          visitedDestinations={visitedPlaces.map(place => ({
                city: place.destination?.city || '',
                latitude: place.destination?.latitude || null,
                longitude: place.destination?.longitude || null,
              })).filter(dest => dest.latitude && dest.longitude)}
        />
          </div>
        </div>
      </section>

      {/* Achievements - Long-form Story Section */}
      <section aria-labelledby="achievement-progress" className="px-6 md:px-10 lg:px-12 py-12 md:py-16 border-t border-gray-100 dark:border-gray-700">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h2 id="achievement-progress" className="text-2xl md:text-3xl font-medium text-black dark:text-white">
            Achievement progress
          </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              Unlock badges as you explore cities, save places, and visit top recommendations. Each achievement tells a part of your travel story.
          </p>
        </div>
          <div className="mt-8">
        <AchievementsDisplay
          visitedPlaces={visitedPlaces}
          savedPlaces={savedPlaces}
          uniqueCities={uniqueCities}
          uniqueCountries={uniqueCountries}
        />
          </div>
        </div>
      </section>
    </div>
  );
}
