'use client';

import { useItinerary } from '@/contexts/ItineraryContext';
import Image from 'next/image';
import { MapPin, Calendar, Clock, X, Trash2 } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ItineraryPage() {
  const { items, removeItem, updateItem, clearItinerary } = useItinerary();
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch destination details for all items
  useEffect(() => {
    if (items.length === 0) {
      setLoading(false);
      return;
    }

    const fetchDestinations = async () => {
      try {
        const slugs = items.map(item => item.listingSlug);
        const { data, error } = await supabase
          .from('destinations')
          .select('slug, name, city, category, description, image, michelin_stars')
          .in('slug', slugs);

        if (error) throw error;

        const destMap = new Map<string, Destination>();
        ((data || []) as any[]).forEach((dest: any) => {
          destMap.set(dest.slug, dest);
        });

        setDestinations(destMap);
      } catch (error) {
        console.error('Error fetching destinations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDestinations();
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading itinerary...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen um-site-container py-20">
        <div className="container mx-auto">
          <h1 className="text-2xl font-semibold mb-8">My Itinerary</h1>
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">Your itinerary is empty</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Start adding places to your itinerary from destination pages
            </p>
            <Link
              href="/"
              className="mt-6 inline-block px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity"
            >
              Browse Destinations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen um-site-container py-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">My Itinerary</h1>
          <button
            onClick={clearItinerary}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const destination = destinations.get(item.listingSlug);
            if (!destination) return null;

            return (
              <div
                key={`${item.listingId}-${index}`}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex gap-4"
              >
                {/* Image */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded overflow-hidden">
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/destination/${item.listingSlug}`}
                        className="font-medium text-black dark:text-white hover:underline"
                      >
                        {destination.name}
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{destination.city}</span>
                        {destination.category && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span className="capitalize">{destination.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.listingId)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Date/Time inputs (placeholder for future optimization) */}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={item.date || ''}
                        onChange={(e) => updateItem(item.listingId, { date: e.target.value || null })}
                        className="border border-gray-300 dark:border-gray-800 rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                    {item.date && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <input
                          type="time"
                          value={item.time || ''}
                          onChange={(e) => updateItem(item.listingId, { time: e.target.value })}
                          className="border border-gray-300 dark:border-gray-800 rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Future: Add itinerary optimization button */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Coming soon:</strong> Smart itinerary optimization will arrange these places by location and suggest the best visiting order.
          </p>
        </div>
      </div>
    </div>
  );
}

