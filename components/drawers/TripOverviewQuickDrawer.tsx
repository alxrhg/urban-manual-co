'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import Image from 'next/image';
import { useTrip } from '@/hooks/useTrip';
import { formatTripDateWithYear } from '@/lib/utils';
import UMFeaturePill from '@/components/ui/UMFeaturePill';
import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';

interface Trip {
  id?: string;
  name?: string;
  title?: string;
  startDate?: string;
  start_date?: string | null;
  endDate?: string;
  end_date?: string | null;
  days?: Array<{
    date: string;
    city: string;
    [key: string]: any;
  }>;
  cities?: string[];
  hotels?: Array<{
    name: string;
    city: string;
    [key: string]: any;
  }>;
  flights?: Array<{
    airline: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    [key: string]: any;
  }>;
  coverImage?: string;
  cover_image?: string;
  [key: string]: any;
}

interface TripOverviewQuickDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

export default function TripOverviewQuickDrawer({ isOpen, onClose, trip }: TripOverviewQuickDrawerProps) {
  const router = useRouter();
  const openFullscreen = useDrawerStore((s) => s.openFullscreen);
  
  // If trip has an ID, fetch full trip data
  const { trip: fullTrip, loading } = useTrip(trip?.id || null);
  const displayTrip = fullTrip || trip;

  if (!displayTrip) return null;

  const tripName = (displayTrip as any).name || displayTrip.title || 'Untitled Trip';

  const startDate = formatTripDateWithYear((displayTrip as any).startDate || displayTrip.start_date);
  const endDate = formatTripDateWithYear((displayTrip as any).endDate || displayTrip.end_date);
  const days = (displayTrip as any).days || [];
  const hotels = (displayTrip as any).hotels || [];
  const coverImage = (displayTrip as any).coverImage || displayTrip.cover_image;

  const handleDayClick = (day: any, index: number) => {
    openFullscreen('trip-day', { day, dayIndex: index, trip: displayTrip });
  };

  const handleViewFullTrip = () => {
    onClose();
    if (displayTrip.id) {
      setTimeout(() => {
        router.push(`/trips/${displayTrip.id}`);
      }, 200);
    }
  };

  const handleEditTrip = () => {
    openFullscreen('trip-editor', { trip: displayTrip });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      desktopWidth="440px"
      position="right"
      style="solid"
      backdropOpacity="20"
      keepStateOnClose={true}
      fullScreen={false}
    >
      <DrawerHeader
        title={tripName}
        subtitle={startDate && endDate ? `${startDate} – ${endDate}` : undefined}
        onClose={onClose}
      />

      <div className="pb-24">
        {coverImage && (
          <div className="px-4 pb-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Image
                src={coverImage}
                alt={tripName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 440px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
              <div className="absolute bottom-3 left-4 text-white">
                <h3 className="text-lg font-semibold leading-tight">{tripName}</h3>
                <div className="flex items-center gap-2 text-xs opacity-90 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{startDate} – {endDate}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading trip details...</p>
          </div>
        ) : (
          <>
            {/* DAYS */}
            <div className="px-4 mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-1">Itinerary</h3>
              <div className="space-y-2">
                {days.length > 0 ? (
                  days.map((d: any, i: number) => (
                    <button
                      key={i}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left"
                      onClick={() => handleDayClick(d, i)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                          Day {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {d.date}
                          </p>
                          {d.city && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {d.city}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 dark:text-gray-600 transition-colors" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 rounded-xl bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-2">No days added yet</p>
                    <button 
                      onClick={handleEditTrip}
                      className="text-xs font-medium text-black dark:text-white underline underline-offset-2"
                    >
                      Start Planning
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* HOTELS */}
            {hotels.length > 0 && (
              <div className="px-4 mb-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-1">Accommodations</h3>
                <div className="space-y-2">
                  {hotels.map((h: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{h.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{h.city}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-3">
          <button
            className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors bg-white dark:bg-gray-950 font-medium text-sm"
            onClick={handleEditTrip}
          >
            Edit Trip
          </button>
          
          <button
            className="w-full py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-medium text-sm hover:opacity-90 transition-opacity"
            onClick={handleViewFullTrip}
          >
            View Full Trip
          </button>
        </div>
      </div>
    </Drawer>
  );
}
