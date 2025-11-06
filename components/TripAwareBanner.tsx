'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Plane, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
}

interface TripAwareBannerProps {
  onPlanTrip?: (tripId: string) => void;
}

export function TripAwareBanner({ onPlanTrip }: TripAwareBannerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [upcomingTrip, setUpcomingTrip] = useState<Trip | null>(null);
  const [daysUntilTrip, setDaysUntilTrip] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchUpcomingTrip();
  }, [user]);

  const fetchUpcomingTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user?.id)
        .not('start_date', 'is', null)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching trips:', error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      // Find the next upcoming trip (start_date in the future, within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const nextTrip = data.find(trip => {
        if (!trip.start_date) return false;
        const startDate = new Date(trip.start_date);
        return startDate >= now && startDate <= thirtyDaysFromNow;
      });

      if (nextTrip && nextTrip.start_date) {
        const startDate = new Date(nextTrip.start_date);
        const days = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setUpcomingTrip(nextTrip);
        setDaysUntilTrip(days);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching upcoming trip:', error);
      setLoading(false);
    }
  };

  if (loading || !upcomingTrip || daysUntilTrip === null) {
    return null;
  }

  // Different messages based on how soon the trip is
  const getMessage = () => {
    if (daysUntilTrip === 0) {
      return {
        emoji: '🎉',
        title: 'Your trip starts today!',
        subtitle: `Ready for ${upcomingTrip.destination || 'your adventure'}?`,
        cta: 'View trip details',
      };
    } else if (daysUntilTrip === 1) {
      return {
        emoji: '✈️',
        title: 'Your trip starts tomorrow!',
        subtitle: `Last-minute plans for ${upcomingTrip.destination || 'your trip'}?`,
        cta: 'Review itinerary',
      };
    } else if (daysUntilTrip <= 3) {
      return {
        emoji: '📍',
        title: `Trip in ${daysUntilTrip} days`,
        subtitle: `${upcomingTrip.destination ? `Heading to ${upcomingTrip.destination}` : 'Your adventure is almost here'}! Need any last-minute recommendations?`,
        cta: 'Plan details',
      };
    } else if (daysUntilTrip <= 10) {
      return {
        emoji: '🗓️',
        title: `Trip in ${daysUntilTrip} days`,
        subtitle: `${upcomingTrip.destination ? `Going to ${upcomingTrip.destination}` : 'Got a trip coming up'}. Wanna start planning?`,
        cta: 'Start planning',
      };
    } else if (daysUntilTrip <= 30) {
      return {
        emoji: '🌍',
        title: `Trip in ${daysUntilTrip} days`,
        subtitle: `${upcomingTrip.destination || 'Adventure ahead'}! Get inspired and start organizing.`,
        cta: 'Browse destinations',
      };
    }
    return null;
  };

  const message = getMessage();
  if (!message) return null;

  const handleClick = () => {
    if (onPlanTrip) {
      onPlanTrip(upcomingTrip.id);
    } else {
      router.push('/account?tab=trips');
    }
  };

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <button
        onClick={handleClick}
        className="w-full group relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-6 md:p-8 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      >
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-4xl" aria-hidden="true">
              {message.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                  {message.title}
                </h3>
              </div>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
                {message.subtitle}
              </p>
              {upcomingTrip.title && (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <Plane className="h-3 w-3" />
                  <span className="font-medium">{upcomingTrip.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors md:flex-shrink-0">
            <span>{message.cta}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </button>
    </div>
  );
}
