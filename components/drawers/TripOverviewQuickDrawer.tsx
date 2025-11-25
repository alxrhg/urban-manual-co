'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import Image from 'next/image';
import { useTrip } from '@/hooks/useTrip';
import { formatTripDateWithYear } from '@/lib/utils';

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
      desktopWidth="420px"
      position="right"
      style="solid"
      backdropOpacity="15"
      keepStateOnClose={true}
      fullScreen={false}
    >
      <DrawerHeader
        title={tripName}
        subtitle={startDate && endDate ? `${startDate} – ${endDate}` : undefined}
        leftAccessory={
          <button
            className="text-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={onClose}
          >
            ←
          </button>
        }
      />

      {coverImage && (
        <div className="px-4 pb-4">
          <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={coverImage}
              alt={tripName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 420px"
            />
          </div>
        </div>
      )}

      {loading ? (
        <DrawerSection>
          <div className="text-center py-8">
            <p className="text-sm text-[var(--um-text-muted)]">Loading trip details...</p>
          </div>
        </DrawerSection>
      ) : (
        <>
          {/* DAYS */}
          <DrawerSection bordered>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Days</h3>
            <div className="space-y-3">
              {days.length > 0 ? (
                days.map((d: any, i: number) => (
                  <div
                    key={i}
                    className="border border-[var(--um-border)] rounded-2xl p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer flex justify-between items-center bg-white dark:bg-gray-950 transition-colors"
                    onClick={() => handleDayClick(d, i)}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Day {i + 1} – {d.date}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--um-text-muted)]">No days added yet</p>
              )}
            </div>
          </DrawerSection>

          {/* HOTELS */}
          {hotels.length > 0 && (
            <DrawerSection bordered>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Hotels</h3>
              <div className="space-y-3">
                {hotels.map((h: any, i: number) => (
                  <div
                    key={i}
                    className="border border-[var(--um-border)] rounded-2xl p-3 bg-white dark:bg-gray-950"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{h.city}</p>
                  </div>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* ACTIONS */}
          <DrawerSection>
            <button
              className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors bg-white dark:bg-gray-950 font-medium text-xs"
              onClick={handleViewFullTrip}
            >
              View Full Trip →
            </button>

            <button
              className="w-full mt-4 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-medium text-xs hover:opacity-90 transition-opacity"
              onClick={handleEditTrip}
            >
              Edit Trip (Fullscreen)
            </button>
          </DrawerSection>
        </>
      )}
    </Drawer>
  );
}

