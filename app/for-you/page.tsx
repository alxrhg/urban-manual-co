'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, ChevronRight, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationCard } from '@/components/DestinationCard';
import { PageLoader } from '@/components/LoadingStates';

// Force dynamic rendering for personalized content
export const dynamic = 'force-dynamic';

interface UserPreferences {
  favoriteCities: string[];
  favoriteCategories: string[];
  travelStyle: string | null;
  interests: string[];
}

interface CuratedDestination extends Destination {
  matchScore?: number;
  matchReason?: string;
}

export default function ForYouPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { openDrawer, setDrawerData } = useDrawer();

  // State
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [curatedDestinations, setCuratedDestinations] = useState<CuratedDestination[]>([]);
  const [trendingDestinations, setTrendingDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trendingPage, setTrendingPage] = useState(1);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);

  // Fetch user preferences
  useEffect(() => {
    if (!user?.id) return;

    fetch('/api/account/preferences')
      .then((res) => res.json())
      .then((data) => {
        setPreferences(data.preferences || null);
      })
      .catch(console.error);
  }, [user?.id]);

  // Fetch curated destinations
  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      fetch('/api/recommendations/personalized?limit=10&include_similar=true').then((res) =>
        res.json()
      ),
      fetch('/api/trending?limit=8').then((res) => res.json()),
    ])
      .then(([recData, trendingData]) => {
        setCuratedDestinations(recData.recommendations || []);
        setTrendingDestinations(trendingData.trending || []);
        setHasMoreTrending((trendingData.trending?.length || 0) >= 8);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, [user?.id]);

  // Load more trending
  const loadMoreTrending = useCallback(async () => {
    if (loadingMore || !hasMoreTrending) return;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/trending?limit=8&offset=${trendingPage * 8}`);
      const data = await res.json();

      if (data.trending?.length > 0) {
        setTrendingDestinations((prev) => [...prev, ...data.trending]);
        setTrendingPage((p) => p + 1);
        setHasMoreTrending(data.trending.length >= 8);
      } else {
        setHasMoreTrending(false);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreTrending, trendingPage]);

  // Handle destination click
  const handleDestinationClick = useCallback(
    (destination: Destination) => {
      setDrawerData('selectedDestination', destination);
      openDrawer('destination');
    },
    [openDrawer, setDrawerData]
  );

  // Format interests for display
  const formatInterests = () => {
    const interests: string[] = [];
    if (preferences?.favoriteCategories?.length) {
      interests.push(...preferences.favoriteCategories.slice(0, 2));
    }
    if (preferences?.interests?.length) {
      interests.push(...preferences.interests.slice(0, 2));
    }
    return interests.slice(0, 2);
  };

  // Loading state
  if (authLoading) {
    return <PageLoader />;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Personalized For You
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to discover curated destinations based on your preferences and travel style.
          </p>
          <button
            onClick={() => openDrawer('login')}
            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Loading content
  if (loading) {
    return <PageLoader />;
  }

  const featuredDestination = curatedDestinations[0];
  const sideDestinations = curatedDestinations.slice(1, 3);
  const displayInterests = formatInterests();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section - Curated For You */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-1">
                Curated For You
              </h2>
              {displayInterests.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Based on your interest in{' '}
                  {displayInterests.map((interest, i) => (
                    <span key={interest}>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {interest}
                      </span>
                      {i < displayInterests.length - 1 && ' and '}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <Link
              href="/account?tab=preferences"
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              View all insights
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredDestination ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Featured Large Card */}
              <button
                onClick={() => handleDestinationClick(featuredDestination)}
                className="lg:col-span-2 relative group text-left"
              >
                <div className="relative aspect-[16/10] rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {featuredDestination.image && (
                    <Image
                      src={featuredDestination.image}
                      alt={featuredDestination.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                    />
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* GEM MATCH Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      GEM MATCH
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
                      {featuredDestination.name}
                    </h3>
                    <p className="text-white/80 text-sm sm:text-base mb-3 line-clamp-2 max-w-xl">
                      {featuredDestination.description ||
                        featuredDestination.micro_description ||
                        `A hidden gem in ${capitalizeCity(featuredDestination.city)} offering a serene blend of traditional and modern experiences.`}
                    </p>
                    <div className="flex items-center gap-4 text-white/70 text-sm">
                      {featuredDestination.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current" />
                          {featuredDestination.rating.toFixed(1)}
                        </span>
                      )}
                      {featuredDestination.review_count && (
                        <span>{featuredDestination.review_count} reviews</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Side Cards */}
              <div className="flex flex-col gap-4">
                {sideDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => handleDestinationClick(dest)}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                  >
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      {dest.image ? (
                        <Image
                          src={dest.image_thumbnail || dest.image}
                          alt={dest.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        {dest.category} · {capitalizeCity(dest.city)}
                      </p>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
                        {dest.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {dest.micro_description || dest.description || 'Discover this curated destination.'}
                      </p>
                      {dest.rating && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          {dest.rating.toFixed(1)} Rating
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Visit and rate some destinations to get personalized recommendations.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-sm text-gray-900 dark:text-white font-medium hover:underline"
              >
                Explore destinations
              </Link>
            </div>
          )}
        </section>

        {/* Trending This Week Section */}
        {trendingDestinations.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Trending This Week
                </h2>
              </div>
              <Link
                href="/?sort=trending"
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                Live vote activity
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {trendingDestinations.map((dest, index) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  onClick={() => handleDestinationClick(dest)}
                  index={index}
                  showBadges
                  showQuickActions
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreTrending && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMoreTrending}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Destinations'
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* More Curated Destinations */}
        {curatedDestinations.length > 3 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                More For You
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {curatedDestinations.slice(3).map((dest, index) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  onClick={() => handleDestinationClick(dest)}
                  index={index + 3}
                  showBadges
                  showQuickActions
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
