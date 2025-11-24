"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import UMCard from "@/components/ui/UMCard";
import UMFeaturePill from "@/components/ui/UMFeaturePill";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

const LOADING_TIMEOUT = 15000; // 15 seconds

interface TripListDrawerProps {
  trips?: any[];
  onNewTrip?: () => void;
}

/**
 * TripListDrawer
 * Only the CONTENT that appears INSIDE <Drawer>.
 * Drawer shell (header, borders, style) is handled in DrawerMount.
 */
export default function TripListDrawer({ trips: propsTrips, onNewTrip }: TripListDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const [trips, setTrips] = useState<any[]>(propsTrips || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const supabaseClient = createClient();
      if (!supabaseClient) {
        throw new Error('Failed to initialize database connection');
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), LOADING_TIMEOUT);
      });

      const fetchPromise = (async () => {
        const { data, error } = await supabaseClient
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTrips(data || []);
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      setError(error.message || 'Failed to load trips. Please try again.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!propsTrips) {
      fetchTrips();
    } else {
      setTrips(propsTrips);
    }
  }, [propsTrips, fetchTrips]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      // Parse date string as local date (YYYY-MM-DD format)
      // Split to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      if (year && month && day) {
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      // Fallback to original parsing if format is different
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return null;
    const startFormatted = formatDate(start);
    const endFormatted = formatDate(end);
    if (startFormatted && endFormatted) {
      return `${startFormatted} → ${endFormatted}`;
    }
    return startFormatted || endFormatted;
  };

  const handleNewTrip = () => {
    if (onNewTrip) {
      onNewTrip();
    } else if (!user) {
      router.push('/auth/login');
    } else {
      closeDrawer();
      setTimeout(() => {
        router.push('/trips');
      }, 200);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      
      setTrips(trips.filter(t => t.id !== tripId));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          <p className="text-sm text-neutral-500">Loading trips...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
            <p className="text-xs text-neutral-500">{error}</p>
          </div>
          <UMActionPill onClick={fetchTrips}>
            Try Again
          </UMActionPill>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 py-6 space-y-8">
        {/* MAIN CTA */}
        <UMFeaturePill onClick={handleNewTrip}>
          + New Trip
        </UMFeaturePill>

        {/* LIST HEADER */}
        <div className="flex items-center justify-between">
          <UMSectionTitle>All Trips</UMSectionTitle>
          <UMActionPill
            onClick={() => {
              closeDrawer();
              setTimeout(() => {
                router.push('/trips');
              }, 200);
            }}
          >
            View All →
          </UMActionPill>
        </div>

        {/* TRIP LIST */}
        <div className="space-y-6">
          {trips.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-neutral-500 text-sm">
                You have no trips yet.
              </p>
              <UMFeaturePill onClick={handleNewTrip}>
                Create Trip
              </UMFeaturePill>
            </div>
          ) : (
            trips.map((trip) => {
              const tripName = trip.name || trip.title || 'Untitled Trip';
              const city = trip.destination || 'Unknown';
              const dateRange = formatDateRange(trip.start_date, trip.end_date);
              const coverImage = trip.cover_image || trip.coverImage;

              return (
                <UMCard key={trip.id}>
                  <button
                    onClick={() => openDrawer("trip-overview", { trip })}
                    className="w-full text-left"
                  >
                    {/* IMAGE */}
                    {coverImage && (
                      <div className="w-full h-40 relative overflow-hidden rounded-t-[16px]">
                        <Image
                          src={coverImage}
                          alt={tripName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="p-4 space-y-1">
                      <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        {tripName}
                      </p>

                      {/* SUBTITLE */}
                      <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
                        {city} {dateRange && `• ${dateRange}`}
                      </p>

                      {/* ACTION ROW */}
                      <div className="flex gap-2 pt-3">
                        <UMActionPill
                          onClick={(e) => {
                            e?.stopPropagation();
                            openDrawer("trip-overview", { trip });
                          }}
                        >
                          View
                        </UMActionPill>

                        <UMActionPill
                          onClick={(e) => {
                            e?.stopPropagation();
                            closeDrawer();
                            setTimeout(() => {
                              router.push(`/trips/${trip.id}`);
                            }, 200);
                          }}
                        >
                          Edit
                        </UMActionPill>
                      </div>
                    </div>
                  </button>
                </UMCard>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
