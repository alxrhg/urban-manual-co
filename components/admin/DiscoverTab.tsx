"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface RecommendedPlace {
  place_id: string;
  name: string;
  city: string;
  score: number;
}

export default function DiscoverTab() {
  const [items, setItems] = useState<RecommendedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendations() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/discovery/recommend", { cache: 'no-store' });

        if (!response.ok) {
          let errorDetail = '';
          try {
            const body = await response.json();
            errorDetail = body?.error || body?.message || '';
          } catch {
            // ignore JSON parse failure
          }
          const statusText = response.statusText || `HTTP ${response.status}`;
          throw new Error(errorDetail || `Failed to fetch: ${statusText}`);
        }

        const data = await response.json();
        if (!isMounted) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('[DiscoverTab] Error fetching recommendations:', err);
        if (!isMounted) return;
        setError(err.message || 'Failed to load recommendations');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No recommendations available. Run the fetch endpoint to discover new places.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Showing {items.length} recommended places based on similarity to your curated destinations
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((p) => (
          <div 
            key={p.place_id} 
            className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:shadow-sm transition-shadow"
          >
            <div className="text-sm font-medium mb-1">{p.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.city}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Score: {p.score?.toFixed(3) || 'N/A'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

