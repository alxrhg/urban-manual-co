'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AccountHeader } from "@/components/account/AccountHeader";
import { AccountTabs } from "@/components/account/AccountTabs";
import { PageLoader } from "@/components/LoadingStates";
import type { Collection, Trip, SavedPlace, VisitedPlace } from "@/types/common";
import { useUserStats } from '@/hooks/useUserStats';

// Lazy load tab components for better performance
const ProfileTab = React.lazy(() => import('@/components/account/ProfileTab'));
const VisitedTab = React.lazy(() => import('@/components/account/VisitedTab'));
const SavedTab = React.lazy(() => import('@/components/account/SavedTab'));
const CollectionsTab = React.lazy(() => import('@/components/account/CollectionsTab'));
const TripsTab = React.lazy(() => import('@/components/account/TripsTab'));
const AchievementsTab = React.lazy(() => import('@/components/account/AchievementsTab'));
const SettingsTab = React.lazy(() => import('@/components/account/SettingsTab'));

export const dynamic = 'force-dynamic';

type AccountTab = 'profile' | 'visited' | 'saved' | 'collections' | 'trips' | 'achievements' | 'settings';

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const validTabs: AccountTab[] = ['profile', 'visited', 'saved', 'collections', 'trips', 'achievements', 'settings'];
      if (tab && validTabs.includes(tab as AccountTab)) {
        setActiveTab(tab as AccountTab);
      }
    }
  }, []);

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

  const loadUserData = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      const [savedResult, visitedResult, collectionsResult, tripsResult] = await Promise.all([
        supabase.from('saved_places').select('destination_slug').eq('user_id', user.id),
        supabase.from('visited_places').select('destination_slug, visited_at, rating, notes').eq('user_id', user.id).order('visited_at', { ascending: false }),
        supabase.from('collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      const allSlugs = new Set<string>();
      interface SavedPlaceRow {
        destination_slug: string;
      }
      interface VisitedPlaceRow {
        destination_slug: string;
        visited_at?: string;
        rating?: number;
        notes?: string;
      }
      
      if (savedResult.data) {
        (savedResult.data as SavedPlaceRow[]).forEach(item => allSlugs.add(item.destination_slug));
      }
      if (visitedResult.data) {
        (visitedResult.data as VisitedPlaceRow[]).forEach(item => allSlugs.add(item.destination_slug));
      }

      if (allSlugs.size > 0) {
        interface DestRow {
          slug: string;
          name: string;
          city: string;
          category: string;
          image?: string;
          latitude?: number | null;
          longitude?: number | null;
          country?: string;
        }
        
        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));

        if (destData) {
          const typedDestData = destData as DestRow[];
          
          if (savedResult.data) {
            const typedSavedData = savedResult.data as SavedPlaceRow[];
            setSavedPlaces(typedSavedData.map(item => {
              const dest = typedDestData.find(d => d.slug === item.destination_slug);
              return dest ? {
                id: 0,
                user_id: user.id,
                destination_id: 0,
                destination_slug: dest.slug,
                created_at: '',
                destination: {
                  slug: dest.slug,
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image
                }
              } as SavedPlace : null;
            }).filter((item): item is SavedPlace => item !== null));
          }

          if (visitedResult.data) {
            const typedVisitedData = visitedResult.data as VisitedPlaceRow[];
            setVisitedPlaces(typedVisitedData.map(item => {
              const dest = typedDestData.find(d => d.slug === item.destination_slug);
              return dest ? {
                id: 0,
                user_id: user.id,
                destination_id: 0,
                destination_slug: dest.slug,
                visited_at: item.visited_at,
                rating: item.rating,
                notes: item.notes,
                created_at: '',
                destination: {
                  slug: dest.slug,
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image,
                  latitude: dest.latitude,
                  longitude: dest.longitude,
                  country: dest.country
                }
              } as VisitedPlace : null;
            }).filter((item): item is VisitedPlace => item !== null));
          }
        }
      }

      if (collectionsResult.data) setCollections(collectionsResult.data);
      if (tripsResult.data) setTrips(tripsResult.data as Trip[]);

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

  const stats = useUserStats({
    savedPlaces,
    visitedPlaces,
    collectionsCount: collections.length,
    totalDestinations,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!authChecked || isLoadingData) {
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
      <AccountHeader 
        user={user} 
        stats={{
          visitedCount: stats.visitedCount,
          savedCount: stats.savedCount,
          citiesCount: stats.uniqueCities.size,
          countriesCount: stats.uniqueCountries.size,
        }}
        onSignOut={handleSignOut} 
      />
      <AccountTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <React.Suspense fallback={<PageLoader />}>
        {isLoadingData ? (
          <PageLoader />
        ) : (
          <>
            {activeTab === 'profile' && (
              <ProfileTab 
                stats={{
                  visitedCount: stats.visitedCount,
                  savedCount: stats.savedCount,
                  citiesCount: stats.uniqueCities.size,
                  countriesCount: stats.uniqueCountries.size,
                  curationCompletionPercentage: stats.curationCompletionPercentage,
                  totalDestinations: totalDestinations,
                  uniqueCities: stats.uniqueCities,
                  uniqueCountries: stats.uniqueCountries,
                  visitedDestinationsWithCoords: stats.visitedDestinationsWithCoords,
                }}
                visitedPlaces={visitedPlaces} 
              />
            )}
            {activeTab === 'visited' && (
              <VisitedTab 
                visitedPlaces={visitedPlaces} 
                onPlaceAdded={loadUserData} 
              />
            )}
            {activeTab === 'saved' && (
              <SavedTab savedPlaces={savedPlaces} />
            )}
            {activeTab === 'collections' && (
              <CollectionsTab 
                collections={collections}
                onCreateCollection={loadUserData}
              />
            )}
            {activeTab === 'trips' && (
              <TripsTab 
                trips={trips}
                onTripsUpdated={loadUserData}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementsTab 
                visitedPlaces={visitedPlaces} 
                savedPlaces={savedPlaces} 
                uniqueCities={stats.uniqueCities} 
                uniqueCountries={stats.uniqueCountries} 
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab userId={user.id} />
            )}
          </>
        )}
      </React.Suspense>
    </main>
  );
}
