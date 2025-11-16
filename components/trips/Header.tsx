
import { useState } from 'react';
import { Trip } from '@/types/trip';
import { EditTripModal } from './EditTripModal';
import { trpc } from '@/lib/trpc/client';

interface HeaderProps {
  trip: Trip;
}

export function Header({ trip }: HeaderProps) {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const utils = trpc.useContext();
  const deleteTrip = trpc.trips.deleteTrip.useMutation({
    onSuccess: () => {
      utils.trips.getTripsByUser.invalidate();
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      deleteTrip.mutate({ id: trip.id });
    }
  };

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{trip.title}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {trip.start_date} - {trip.end_date}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditModalOpen(true)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
              Edit
            </button>
            <button onClick={handleDelete} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
              Delete
            </button>
          </div>
        </div>
      </div>
      <EditTripModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} trip={trip} />
    </>
  );
}
