'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Calendar, Clock, Loader2, MapPin, NotebookPen } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';
import type { ItineraryItem, ItineraryItemNotes, Trip } from '@/types/trip';

interface TripQuickViewDrawerProps {
  isOpen: boolean;
  tripId: string | null;
  onClose: () => void;
}

interface TimelineItem {
  id: string;
  title: string;
  city?: string;
  category?: string;
  time?: string | null;
  notes?: string;
  image?: string;
  destinationSlug?: string | null;
}

export function TripQuickViewDrawer({ isOpen, tripId, onClose }: TripQuickViewDrawerProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) {
      fetchTrip();
    }
  }, [isOpen, tripId]);

  const fetchTrip = async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) {
        setLoading(false);
        return;
      }

      const { data: tripData } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();

      if (tripData) {
        setTrip(tripData as Trip);
      } else {
        setTrip(null);
      }

      const { data: itemsData } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      setItineraryItems(itemsData || []);

      const slugs = (itemsData || [])
        .map((item) => item.destination_slug)
        .filter((slug: string | null) => slug !== null) as string[];

      if (slugs.length > 0) {
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('*')
          .in('slug', slugs);

        if (destData) {
          const destMap = new Map<string, Destination>();
          destData.forEach((dest) => destMap.set(dest.slug, dest));
          setDestinations(destMap);
        }
      }
    } catch (error) {
      console.error('Failed to load trip quick view:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDateForDay = (dayNumber: number) => {
    if (!trip?.start_date) return null;
    const startDate = new Date(trip.start_date);
    startDate.setDate(startDate.getDate() + dayNumber - 1);
    return startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const parseTimelineItem = (item: ItineraryItem): TimelineItem => {
    const destination = item.destination_slug ? destinations.get(item.destination_slug) : null;

    let notesData: ItineraryItemNotes = {};
    if (item.notes) {
      try {
        notesData = JSON.parse(item.notes) as ItineraryItemNotes;
      } catch {
        notesData = { raw: item.notes };
      }
    }

    return {
      id: item.id,
      title: destination?.name || item.title,
      city: destination?.city || notesData.city,
      category: destination?.category || item.description || notesData.category,
      time: item.time,
      notes: notesData.raw,
      image: destination?.image || notesData.image,
      destinationSlug: item.destination_slug,
    };
  };

  const groupedTimeline = useMemo(() => {
    const itemsByDay = itineraryItems.reduce((acc, item) => {
      if (!acc[item.day]) acc[item.day] = [];
      acc[item.day].push(parseTimelineItem(item));
      return acc;
    }, {} as Record<number, TimelineItem[]>);

    return Object.keys(itemsByDay)
      .map((day) => Number(day))
      .sort((a, b) => a - b)
      .map((dayNumber) => ({ dayNumber, items: itemsByDay[dayNumber] }));
  }, [itineraryItems, destinations]);

  const headerContent = trip ? (
    <div className="flex items-center justify-between w-full">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-1">Timeline</p>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{trip.title}</h2>
        {(trip.start_date || trip.end_date || trip.destination) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
            {trip.destination && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {trip.destination}
              </span>
            )}
            {(trip.start_date || trip.end_date) && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(trip.start_date) || 'TBD'}
                {trip.end_date ? ` – ${formatDate(trip.end_date)}` : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  ) : undefined;

  const renderTimeline = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip timeline...</p>
        </div>
      );
    }

    if (!trip) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <NotebookPen className="w-6 h-6 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-300">We couldn't find this trip.</p>
        </div>
      );
    }

    if (groupedTimeline.length === 0) {
      return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">No itinerary items yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Timeline will appear here once stops are added.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groupedTimeline.map(({ dayNumber, items }) => (
          <div
            key={dayNumber}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Day {dayNumber}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getDateForDay(dayNumber) || 'Date to be decided'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {items.length} stop{items.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="relative pl-10">
                  {index !== items.length - 1 && (
                    <span className="absolute left-[17px] top-6 bottom-0 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-gray-800 dark:via-gray-800" />
                  )}
                  <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-800">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                          {item.time && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              <Clock className="w-3 h-3" />
                              {item.time}
                            </span>
                          )}
                        </div>
                        {(item.city || item.category) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {[item.city, item.category].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{item.notes}</p>
                        )}
                      </div>

                      {item.image && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                          <Image src={item.image} alt={item.title} fill className="object-cover" sizes="64px" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      headerContent={headerContent}
      desktopWidth="520px"
      zIndex={1200}
      mobileVariant="bottom"
      backdropOpacity="25"
      desktopSpacing="right-6 top-6 bottom-6"
    >
      <div className="px-5 py-6 space-y-4 bg-gray-50/80 dark:bg-gray-950/60 h-full overflow-y-auto">
        {trip?.cover_image && (
          <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <Image src={trip.cover_image} alt={trip.title} fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm font-semibold">{trip.title}</p>
              {(trip.destination || trip.start_date) && (
                <p className="text-xs text-white/80">
                  {[trip.destination, formatDate(trip.start_date)].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">{renderTimeline()}</div>
      </div>
    </Drawer>
  );
}

