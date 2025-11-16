
'use client';

import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Trip, ItineraryItem } from '@/types/trip';
import { Header } from '@/components/trips/Header';
import { Itinerary } from '@/components/trips/Itinerary';
import { Map } from '@/components/trips/Map';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreateTripModal } from '@/components/trips/CreateTripModal';

export default function TripsPage() {
  const { user } = useAuth();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const { data: trips, isLoading: tripsIsLoading, error: tripsError } = trpc.trips.getTripsByUser.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user }
  );

  const { data: selectedTrip, isLoading: tripIsLoading, error: tripError } = trpc.trips.getTrip.useQuery(
    { id: selectedTripId || '' },
    { enabled: !!selectedTripId }
  );

  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (selectedTrip) {
      setTrip(selectedTrip as Trip);
    }
  }, [selectedTrip]);

  if (tripsIsLoading) {
    return <div>Loading trips...</div>;
  }

  if (tripsError) {
    return <div>Error loading trips: {tripsError.message}</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <aside className="w-1/3 h-full overflow-y-auto bg-white dark:bg-gray-800 shadow-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Your Trips</h2>
              <button onClick={() => setCreateModalOpen(true)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                New Trip
              </button>
            </div>
            <ul>
              {trips?.map((trip: Trip) => (
                <li key={trip.id} onClick={() => setSelectedTripId(trip.id)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg">
                  {trip.title}
                </li>
              ))}
            </ul>
          </div>
          {trip && <Header trip={trip} />}
          {trip && <Itinerary trip={trip} setTrip={setTrip} />}
        </aside>
        <main className="w-2/3 h-full">
          {trip && <Map trip={trip} />}
        </main>
      </div>
      <CreateTripModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />
    </DndProvider>
  );
}
