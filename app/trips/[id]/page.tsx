'use client';

import { useParams } from 'next/navigation';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import TripHeader from '@/components/trip/TripHeader';
import DayCard from '@/components/trip/DayCard';
import SuggestionCard from '@/components/trip/SuggestionCard';

export default function TripPage() {
  const params = useParams();
  const tripId = params?.id as string | null;
  const { trip, loading, error } = useTrip(tripId);
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Format dates for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) return <div className="p-10">Loading…</div>;
  if (error) return <div className="p-10 text-red-600">Error: {error}</div>;
  if (!trip) return <div className="p-10">Trip not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-14 space-y-16">
      <TripHeader
        trip={{
          name: trip.title,
          startDate: formatDate(trip.start_date),
          endDate: formatDate(trip.end_date),
        }}
        onOverview={() => openDrawer('trip-overview', { trip })}
        onSave={() => {
          // TODO: Implement save functionality
          console.log('Save trip');
        }}
        onShare={() => {
          // TODO: Implement share functionality
          console.log('Share trip');
        }}
        onPrint={() => {
          // TODO: Implement print functionality
          window.print();
        }}
      />

      <section className="space-y-3">
        <h2 className="text-sm tracking-widest text-[var(--um-text-muted)] uppercase">
          SMART SUGGESTIONS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SuggestionCard
            icon="🍳"
            title="Breakfast near first destination"
            detail="3 curated picks close to stop #1"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          />
          <SuggestionCard
            icon="🖼️"
            title="Museum for Day 2"
            detail="Cultural picks within short travel time"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          />
          <SuggestionCard
            icon="🌅"
            title="Sunset Dinner"
            detail="Perfect timing between 5–7 PM"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm tracking-widest text-[var(--um-text-muted)] uppercase">
          ITINERARY
        </h2>
        <div className="space-y-8">
          {trip.days && trip.days.length > 0 ? (
            trip.days.map((day, i) => (
              <DayCard key={i} day={day} index={i} openDrawer={openDrawer} trip={trip} />
            ))
          ) : (
            <div className="text-center py-12 text-[var(--um-text-muted)] text-sm">
              No days added yet
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
