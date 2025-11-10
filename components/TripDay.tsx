import React from 'react';
import { PlusIcon, XIcon, ClockIcon } from 'lucide-react';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
}

interface TripDayProps {
  dayNumber: number;
  date: string;
  locations: TripLocation[];
  onAddLocation: () => void;
  onRemoveLocation: (locationId: number) => void;
}

export function TripDay({
  dayNumber,
  date,
  locations,
  onAddLocation,
  onRemoveLocation,
}: TripDayProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-2">
          Day {dayNumber}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatDate(date)}</p>
      </div>
      <div className="space-y-4">
        {locations.length === 0 ? (
          <button
            onClick={onAddLocation}
            className="w-full p-8 border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-900"
          >
            <PlusIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide">
              Add Location
            </span>
          </button>
        ) : (
          <>
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group bg-white dark:bg-gray-900"
              >
                <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-full h-full object-cover grayscale-[20%]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 truncate">
                        {location.name}
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-wide">
                        {location.category}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveLocation(location.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                      <XIcon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                  </div>
                  {location.time && (
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 tracking-wide">
                      <ClockIcon className="w-3 h-3" />
                      {location.time}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={onAddLocation}
              className="w-full p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex items-center justify-center gap-2 bg-white dark:bg-gray-900"
            >
              <PlusIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide">
                Add Another Location
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

