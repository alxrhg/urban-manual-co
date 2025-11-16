
import { Trip, ItineraryItem } from '@/types/trip';
import { ItineraryCard } from './ItineraryCard';
import { AddItineraryItemModal } from './AddItineraryItemModal';
import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

interface ItineraryProps {
  trip: Trip;
  setTrip: (trip: Trip) => void;
}

export function Itinerary({ trip, setTrip }: ItineraryProps) {
  const [isAddToTripModalOpen, setIsAddToTripModalOpen] = useState(false);
  const updateOrder = trpc.trips.updateItineraryOrder.useMutation();

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const newItinerary = [...trip.itinerary];
    const dragCard = newItinerary[dragIndex];
    newItinerary.splice(dragIndex, 1);
    newItinerary.splice(hoverIndex, 0, dragCard);
    setTrip({ ...trip, itinerary: newItinerary });
    const orderedIds = newItinerary.map((item) => item.id);
    updateOrder.mutate({ trip_id: trip.id, ordered_ids: orderedIds });
  };

  const handleAddItem = (tripId: string) => {
    // In a real application, you would add a new item to the itinerary
    // and then update the trip state.
    console.log(`Added new item to trip ${tripId}`);
    setIsAddToTripModalOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Itinerary</h3>
        <button
          onClick={() => setIsAddToTripModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Item
        </button>
      </div>
      {trip.itinerary.map((item, index) => (
        <ItineraryCard key={item.id} index={index} item={item} moveCard={moveCard} />
      ))}
      <AddItineraryItemModal
        isOpen={isAddToTripModalOpen}
        onClose={() => setIsAddToTripModalOpen(false)}
        trip={trip}
      />
    </div>
  );
}
