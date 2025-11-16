
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItineraryItem } from '@/types/trip';
import { trpc } from '@/lib/trpc/client';

interface ItineraryCardProps {
  item: ItineraryItem;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
}

export function ItineraryCard({ item, index, moveCard }: ItineraryCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useContext();
  const deleteItineraryItem = trpc.trips.deleteItineraryItem.useMutation({
    onSuccess: () => {
      utils.trips.getTrip.invalidate({ id: item.trip_id });
    },
  });

  const [, drop] = useDrop({
    accept: 'card',
    hover(draggedItem: { index: number }) {
      if (draggedItem.index !== index) {
        moveCard(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'card',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const handleDelete = () => {
    deleteItineraryItem.mutate({ id: item.id });
  };

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="p-4 mb-4 bg-white dark:bg-gray-700 rounded-lg shadow-md"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold">{item.title}</h3>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700">
          Delete
        </button>
      </div>
      <p>{item.description}</p>
      {item.destination && (
        <p className="text-sm text-gray-500">{item.destination.name}, {item.destination.city}</p>
      )}
    </div>
  );
}
