'use client';

import { useParams } from 'next/navigation';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';

export default function TripPage() {
  const params = useParams();
  const tripId = params?.id as string | null;
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const { trip, loading, error } = useTrip(tripId);

  if (loading) return <div className="px-4 py-8">Loading...</div>;
  if (error) return <div className="px-4 py-8 text-red-600">Error: {error}</div>;
  if (!trip) return <div className="px-4 py-8">Trip not found</div>;

  return (
    <div className="px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{trip.title}</h1>
        <button
          className="bg-black text-white px-4 py-2 rounded-full"
          onClick={() => openDrawer('trip-overview', { trip })}
        >
          Overview
        </button>
      </header>

      <div className="space-y-4">
        {trip.days.map((d, i) => (
          <div
            key={d.date}
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            onClick={() =>
              openDrawer('trip-day', {
                day: d,
                dayIndex: i,
                trip,
              })
            }
          >
            <div className="flex justify-between items-center">
              <h2 className="font-medium">{d.date}</h2>
              <span className="text-sm opacity-60">{d.city}</span>
            </div>

            <div className="mt-2 text-sm opacity-70">
              {d.meals.breakfast?.title || 'No breakfast'} · {d.meals.lunch?.title || 'No lunch'} ·{' '}
              {d.meals.dinner?.title || 'No dinner'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

