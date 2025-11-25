'use client';

import { useParams } from 'next/navigation';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import TripHeader from '@/components/trip/TripHeader';
import SuggestionCard from '@/components/trip/SuggestionCard';
import DayCard from '@/components/trip/DayCard';

export default function TripPage() {
  const params = useParams();
  const tripId = params?.id as string | null;
  const { trip, loading, error } = useTrip(tripId);
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  if (loading) return <div className="p-10">Loading...</div>;
  if (error) return <div className="p-10 text-red-600">Error: {error}</div>;
  if (!trip) return <div className="p-10">Trip not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <TripHeader
        trip={trip}
        onOverview={() => openDrawer('trip-overview', { trip })}
      />

      {/* Smart Suggestions */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Smart Suggestions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SuggestionCard
            icon="🍳"
            title="Breakfast near your first stop"
            detail="3 curated options very close to your first location"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          />
          <SuggestionCard
            icon="🖼️"
            title="Museum for Day 2"
            detail="2 top options within 10 minutes"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          />
          <SuggestionCard
            icon="🌅"
            title="Sunset dinner at the waterfront"
            detail="Perfect timing between 5–7 PM"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          />
        </div>
      </section>

      {/* Itinerary */}
      <section className="space-y-6 pb-24">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Itinerary</h2>

        <div className="space-y-5">
          {trip.days && trip.days.length > 0 ? (
            trip.days.map((day, i) => (
              <DayCard key={i} day={day} index={i} openDrawer={openDrawer} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No days added yet
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


