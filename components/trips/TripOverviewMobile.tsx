'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import TripOverviewHeader from './TripOverviewHeader';
import TripShortcuts, { ShortcutType } from './TripShortcuts';
import {
  ItineraryWidget,
  DocumentsWidget,
  NextActivityWidget,
  TripDocument,
} from './TripWidgets';
import type { Trip, ItineraryItem, ItineraryItemNotes, TripNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: (ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes })[];
}

interface TripOverviewMobileProps {
  trip: Trip;
  days: TripDay[];
  tripNotes?: TripNotes;
  countries?: string[];
  documents?: TripDocument[];
  onClose?: () => void;
  onOpenSettings?: () => void;
  onAddPlace?: (dayNumber: number) => void;
  onAddFlight?: (dayNumber: number) => void;
  onViewDestination?: (item: ItineraryItem & { destination?: Destination }) => void;
}

export default function TripOverviewMobile({
  trip,
  days,
  tripNotes,
  countries = [],
  documents = [],
  onClose,
  onOpenSettings,
  onAddPlace,
  onAddFlight,
  onViewDestination,
}: TripOverviewMobileProps) {
  const router = useRouter();
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  const [showFlags, setShowFlags] = useState(true);
  const [activeShortcuts, setActiveShortcuts] = useState<ShortcutType[]>([
    'flights',
    'lodgings',
    'places',
    'routes',
    'car-rental',
  ]);

  // Get current day based on trip dates
  const currentDay = useMemo(() => {
    if (!trip.start_date) return days[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(trip.start_date);
    startDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayNumber = daysDiff + 1;

    return days.find((d) => d.dayNumber === dayNumber) || days[0];
  }, [trip.start_date, days]);

  // Get next activity
  const nextActivity = useMemo(() => {
    if (!currentDay?.items.length) return null;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find first activity after current time
    const upcoming = currentDay.items.find((item) => {
      if (!item.time) return false;
      return item.time > currentTime;
    });

    return upcoming || currentDay.items[0];
  }, [currentDay]);

  // Extract countries from destinations
  const detectedCountries = useMemo(() => {
    if (countries.length > 0) return countries;

    const countrySet = new Set<string>();
    days.forEach((day) => {
      day.items.forEach((item) => {
        if (item.destination?.country) {
          countrySet.add(item.destination.country);
        }
      });
    });
    return Array.from(countrySet);
  }, [countries, days]);

  const handleShortcutClick = (shortcut: ShortcutType) => {
    const currentDayNum = currentDay?.dayNumber || 1;

    switch (shortcut) {
      case 'flights':
        onAddFlight?.(currentDayNum);
        break;
      case 'lodgings':
        openDrawer('trip-add-hotel', { trip, day: currentDay, index: 0 });
        break;
      case 'places':
        onAddPlace?.(currentDayNum);
        break;
      case 'dining':
        onAddPlace?.(currentDayNum);
        break;
      default:
        // For other shortcuts, navigate to relevant section
        break;
    }
  };

  const handleCustomize = () => {
    openDrawer('trip-customize', {
      settings: {
        showCountryFlags: showFlags,
        activeShortcuts,
      },
      onSave: (settings: any) => {
        setShowFlags(settings.showCountryFlags);
        setActiveShortcuts(settings.activeShortcuts);
      },
    });
  };

  const handleViewAllDays = () => {
    // Navigate to full trip view or expand itinerary
    router.push(`/trips/${trip.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header with Cover Image */}
      <TripOverviewHeader
        trip={trip}
        countries={detectedCountries}
        coverImage={trip.cover_image}
        onClose={onClose}
        onMore={onOpenSettings}
        onCustomize={handleCustomize}
        showFlags={showFlags}
      />

      {/* Shortcuts */}
      <div className="bg-gray-900/50 backdrop-blur-sm py-4">
        <TripShortcuts
          activeShortcuts={activeShortcuts}
          onShortcutClick={handleShortcutClick}
        />
      </div>

      {/* Widgets */}
      <div className="px-4 py-6 space-y-4">
        {/* Next Activity Widget */}
        {nextActivity && (
          <NextActivityWidget
            item={nextActivity}
            dayDate={currentDay?.date}
            onView={() => onViewDestination?.(nextActivity)}
          />
        )}

        {/* Itinerary Widget */}
        <ItineraryWidget
          currentDay={currentDay}
          onViewAllDays={handleViewAllDays}
          onAddItem={() => onAddPlace?.(currentDay?.dayNumber || 1)}
        />

        {/* Documents Widget */}
        <DocumentsWidget
          documents={documents}
          onAddDocument={() => {
            // Open document picker/creator
          }}
          onViewDocument={(doc) => {
            // View document
          }}
        />
      </div>
    </div>
  );
}
