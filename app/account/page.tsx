'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AccountHeader } from "@/components/account/AccountHeader";
import { AccountTabs } from "@/components/account/AccountTabs";
import { PageLoader } from "@/components/LoadingStates";
import type { Collection, Itinerary, SavedPlace, VisitedPlace } from "@/types/common";
import { cityCountryMap } from "@/data/cityCountryMap";

// Lazy load tab components for better performance
const ProfileTab = React.lazy(() => import('@/components/account/ProfileTab'));
const VisitedTab = React.lazy(() => import('@/components/account/VisitedTab'));
const SavedTab = React.lazy(() => import('@/components/account/SavedTab'));
const CollectionsTab = React.lazy(() => import('@/components/account/CollectionsTab'));
const ItinerariesTab = React.lazy(() => import('@/components/account/ItinerariesTab'));
const AchievementsTab = React.lazy(() => import('@/components/account/AchievementsTab'));
const SettingsTab = React.lazy(() => import('@/components/account/SettingsTab'));

export const dynamic = 'force-dynamic';

type AccountTab = 'profile' | 'visited' | 'saved' | 'collections' | 'itineraries' | 'achievements' | 'settings';

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [totalDestinations, setTotalDestinations] = useState(0);

  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      const [savedResult, visitedResult, collectionsResult, itinerariesResult] = await Promise.all([
        supabase.from('saved_places').select('destination_slug').eq('user_id', user.id),
        supabase.from('visited_places').select('destination_slug, visited_at, rating, notes').eq('user_id', user.id).order('visited_at', { ascending: false }),
        supabase.from('collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('itineraries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      const allSlugs = new Set<string>();
      if (savedResult.data) savedResult.data.forEach(item => allSlugs.add(item.destination_slug));
      if (visitedResult.data) visitedResult.data.forEach(item => allSlugs.add(item.destination_slug));

      if (allSlugs.size > 0) {
        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));

        if (destData) {
          if (savedResult.data) {
            setSavedPlaces(savedResult.data.map(item => {
              const dest = destData.find(d => d.slug === item.destination_slug);
              return dest ? { ...item, destination: dest } as SavedPlace : null;
            }).filter((item): item is SavedPlace => item !== null));
          }
          if (visitedResult.data) {
            setVisitedPlaces(visitedResult.data.map(item => {
              const dest = destData.find(d => d.slug === item.destination_slug);
              return dest ? { ...item, destination: dest } as VisitedPlace : null;
            }).filter((item): item is VisitedPlace => item !== null));
          }
        }
      }

      if (collectionsResult.data) setCollections(collectionsResult.data);
      if (itinerariesResult.data) setItineraries(itinerariesResult.data as Itinerary[]);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, loadUserData]);

  useEffect(() => {
    async function fetchTotalDestinations() {
      try {
        const { count } = await supabase.from('destinations').select('*', { count: 'exact', head: true });
        setTotalDestinations(count || 0);
      } catch (error) {
        console.error('Error fetching total destinations:', error);
      }
    }
    fetchTotalDestinations();
  }, []);

  const stats = useMemo(() => {
    const uniqueCities = new Set(visitedPlaces.map(p => p.destination.city));
    const countriesFromDestinations = new Set(visitedPlaces.map(p => p.destination.country).filter(Boolean) as string[]);
    const countriesFromCities = Array.from(uniqueCities)
      .map(city => cityCountryMap[city.toLowerCase().replace(/ /g, '-')])
      .filter(Boolean) as string[];
    const uniqueCountries = new Set([...countriesFromDestinations, ...countriesFromCities]);

    return {
      visitedCount: visitedPlaces.length,
      savedCount: savedPlaces.length,
      citiesCount: uniqueCities.size,
      countriesCount: uniqueCountries.size,
      collectionsCount: collections.length,
      curationCompletionPercentage: totalDestinations > 0 ? Math.round((visitedPlaces.length / totalDestinations) * 100) : 0,
      uniqueCities,
      uniqueCountries,
      totalDestinations,
    };
  }, [visitedPlaces, savedPlaces, collections, totalDestinations]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!authChecked) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm text-center">
            <h1 className="text-2xl font-light mb-4">Account</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Sign in to build your travel profile.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-sm hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <AccountHeader user={user} stats={stats} onSignOut={handleSignOut} />
      <AccountTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <React.Suspense fallback={<PageLoader />}>
        {isLoadingData ? (
          <PageLoader />
        ) : (
          <>
            {activeTab === 'profile' && <ProfileTab stats={stats} visitedPlaces={visitedPlaces} />}
            {activeTab === 'visited' && <VisitedTab visitedPlaces={visitedPlaces} onPlaceAdded={loadUserData} />}
            {activeTab === 'saved' && <SavedTab savedPlaces={savedPlaces} />}
            {activeTab === 'collections' && <CollectionsTab collections={collections} />}
            {activeTab === 'itineraries' && <ItinerariesTab itineraries={itineraries} />}
            {activeTab === 'achievements' && <AchievementsTab visitedPlaces={visitedPlaces} savedPlaces={savedPlaces} uniqueCities={stats.uniqueCities} uniqueCountries={stats.uniqueCountries} />}
            {activeTab === 'settings' && <SettingsTab userId={user.id} />}
          </>
        )}
      </React.Suspense>
    </main>
  );
}
