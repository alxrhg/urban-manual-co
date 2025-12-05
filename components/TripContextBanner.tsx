'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, ChevronRight, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDestinationsFromField } from '@/types/trip';

interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface TripContextBannerProps {
  city: string;
  className?: string;
}

/**
 * Banner that appears on city pages when user has an upcoming trip there
 * Creates awareness and quick access to trip planning
 */
export function TripContextBanner({ city, className = '' }: TripContextBannerProps) {
  const { user } = useAuth();
  const [matchingTrip, setMatchingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!user || !city) {
      setLoading(false);
      return;
    }

    async function fetchTripContext() {
      try {
        const supabase = createClient();
        if (!supabase) return;

        // Get user's planning/upcoming trips
        const { data: trips, error: tripError } = await supabase
          .from('trips')
          .select('id, title, destination, start_date, end_date, status')
          .eq('user_id', user!.id)
          .in('status', ['planning', 'upcoming'])
          .order('start_date', { ascending: true, nullsFirst: false });

        if (tripError) throw tripError;

        // Find a trip that matches this city
        const cityLower = city.toLowerCase().replace(/-/g, ' ');
        const match = trips?.find((trip) => {
          const tripDest = formatDestinationsFromField(trip.destination).toLowerCase();
          return tripDest.includes(cityLower) || cityLower.includes(tripDest.split(',')[0]?.trim() || '');
        });

        setMatchingTrip(match || null);

        // Get count of saved places in this city
        if (match) {
          const { data: saved, error: savedError } = await supabase
            .from('saved_places')
            .select('destination_slug', { count: 'exact', head: true })
            .eq('user_id', user!.id);

          if (!savedError && saved) {
            // Need to check if these are in this city - join with destinations
            const { count } = await supabase
              .from('saved_places')
              .select('destination_slug, destinations!inner(city)', { count: 'exact', head: true })
              .eq('user_id', user!.id)
              .ilike('destinations.city', city);

            setSavedCount(count || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching trip context:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTripContext();
  }, [user, city]);

  // Don't show if loading, dismissed, no user, or no matching trip
  if (loading || dismissed || !user || !matchingTrip) {
    return null;
  }

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return '';
    const startDate = new Date(start);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (!end) {
      return startDate.toLocaleDateString('en-US', options);
    }

    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}`;
    }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const tripDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    tripDate.setHours(0, 0, 0, 0);
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntil(matchingTrip.start_date);
  const dateRange = formatDateRange(matchingTrip.start_date, matchingTrip.end_date);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 dark:from-stone-800 dark:to-stone-900 ${className}`}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Trip info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-white truncate">
                  {matchingTrip.title}
                </p>
                {dateRange && (
                  <span className="text-xs text-white/60 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateRange}
                  </span>
                )}
              </div>

              <p className="text-xs text-white/50 mt-0.5">
                {daysUntil !== null && daysUntil > 0 ? (
                  <span>
                    {daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                    {savedCount > 0 && ` · ${savedCount} saved`}
                  </span>
                ) : daysUntil === 0 ? (
                  <span>Today!</span>
                ) : (
                  <span>Planning{savedCount > 0 && ` · ${savedCount} saved`}</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/trips/${matchingTrip.id}`}
              className="px-3 py-1.5 text-xs font-medium text-stone-900 bg-white rounded-full hover:bg-stone-100 transition-colors flex items-center gap-1"
            >
              View trip
              <ChevronRight className="w-3 h-3" />
            </Link>

            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
