/**
 * Feed Page
 * Algorithmic discovery feed - TikTok for travel
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/hooks/useFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { RefreshCw, Sparkles, Users, TrendingUp, Loader2 } from 'lucide-react';

export default function FeedPage() {
  const { user } = useAuth();
  const { feed, loading, hasMore, error, loadMore, refresh } = useFeed();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'explore'>('for-you');
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, loading, loadMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold mb-2">Sign in to see your personalized feed</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get recommendations tailored to your taste. The more you use it, the smarter it gets.
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Your Feed
            </h1>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('for-you')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                activeTab === 'for-you'
                  ? 'bg-white dark:bg-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>For You</span>
            </button>

            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                activeTab === 'following'
                  ? 'bg-white dark:bg-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Following</span>
            </button>

            <button
              onClick={() => setActiveTab('explore')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                activeTab === 'explore'
                  ? 'bg-white dark:bg-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Explore</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'for-you' && (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {feed.length === 0 && !loading && (
              <div className="text-center py-20">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-bold mb-2">Building your personalized feed...</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Save a few destinations to help us understand your taste
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  Discover Destinations
                </button>
              </div>
            )}

            {/* Feed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feed.map((card) => (
                <FeedCard
                  key={`${card.destination_id}-${card.position}`}
                  card={card}
                  onSave={() => {
                    // Could trigger haptic feedback or confetti animation
                  }}
                  onSkip={() => {
                    // Card skip animation
                  }}
                />
              ))}
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            )}

            {/* Infinite scroll trigger */}
            {hasMore && <div ref={loaderRef} className="h-20" />}

            {/* End of feed */}
            {!hasMore && feed.length > 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You've seen all the recommendations for now
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Refresh Feed
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'following' && (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Follow friends to see their activity</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Discover what places your friends are saving and visiting
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Coming soon</p>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Discover what's trending globally</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              See the most popular destinations across all users
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
