'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, Loader2, X } from 'lucide-react';

interface Destination {
  id: number;
  slug: string;
  name: string;
  category: string;
  image_thumbnail?: string;
  rating?: number;
  neighborhood?: string;
}

interface PersonalizedPickProps {
  city: string;
  userId?: string;
  existingSlugs?: string[];
  onAdd?: (destination: Destination, dayNumber: number) => void;
  dayNumber?: number;
  className?: string;
}

/**
 * PersonalizedPick - Shows a personalized recommendation based on user taste
 */
export default function PersonalizedPick({
  city,
  userId,
  existingSlugs = [],
  onAdd,
  dayNumber = 1,
  className = '',
}: PersonalizedPickProps) {
  const [recommendation, setRecommendation] = useState<{
    destination: Destination;
    reason: string;
    matchScore: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!city || dismissed) return;

    const fetchRecommendation = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          city,
          limit: '1',
          ...(userId && { userId }),
        });

        // Add existing slugs to exclude
        existingSlugs.forEach(slug => {
          params.append('exclude', slug);
        });

        const response = await fetch(`/api/intelligence/recommendations/advanced?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.recommendations?.[0]) {
            const rec = data.recommendations[0];
            setRecommendation({
              destination: rec.destination,
              reason: rec.reason || 'Matches your travel style',
              matchScore: rec.score || 0.8,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch personalized recommendation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [city, userId, existingSlugs.join(','), dismissed]);

  if (dismissed || added || (!loading && !recommendation)) {
    return null;
  }

  const handleAdd = () => {
    if (recommendation && onAdd) {
      onAdd(recommendation.destination, dayNumber);
      setAdded(true);
    }
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-gray-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Based on your style
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Finding a match...</span>
            </div>
          ) : recommendation ? (
            <div className="flex items-center gap-3">
              {recommendation.destination.image_thumbnail ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={recommendation.destination.image_thumbnail}
                    alt={recommendation.destination.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-gray-300" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {recommendation.destination.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {recommendation.reason}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400 capitalize">
                    {recommendation.destination.category}
                  </span>
                  {recommendation.destination.rating && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                      <span className="text-[10px] text-gray-400">
                        {recommendation.destination.rating.toFixed(1)}
                      </span>
                    </>
                  )}
                  <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                  <span className="text-[10px] text-gray-400">
                    {Math.round(recommendation.matchScore * 100)}% match
                  </span>
                </div>
              </div>

              <button
                onClick={handleAdd}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
