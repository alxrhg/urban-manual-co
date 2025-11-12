'use client';

import React, { useState, Fragment } from 'react';
import {
  PlusIcon,
  XIcon,
  ClockIcon,
  DollarSignIcon,
  MapPinIcon,
  AlertCircleIcon,
  GripVerticalIcon,
  CopyIcon,
  RouteIcon,
  SunriseIcon,
  SunsetIcon,
} from 'lucide-react';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  slug?: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface TripDayProps {
  dayNumber: number;
  date: string;
  locations: TripLocation[];
  hotelLocation?: string;
  onAddLocation: () => void;
  onRemoveLocation: (locationId: number) => void;
  onReorderLocations: (locations: TripLocation[]) => void;
  onDuplicateDay: () => void;
  onOptimizeRoute: () => void;
}

export function TripDay({
  dayNumber,
  date,
  locations,
  hotelLocation,
  onAddLocation,
  onRemoveLocation,
  onReorderLocations,
  onDuplicateDay,
  onOptimizeRoute,
}: TripDayProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTotalCost = () => {
    return locations.reduce((total, loc) => total + (loc.cost || 0), 0);
  };

  const getTotalDuration = () => {
    return locations.reduce((total, loc) => total + (loc.duration || 60), 0);
  };

  const calculateTravelTime = (index: number) => {
    if (index === 0) return null;
    // Mock calculation - in real app would use routing API
    return Math.floor(Math.random() * 30) + 10;
  };

  const getMealIcon = (mealType?: string) => {
    switch (mealType) {
      case 'breakfast':
        return <SunriseIcon className="w-3 h-3" />;
      case 'dinner':
        return <SunsetIcon className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newLocations = [...locations];
    const draggedItem = newLocations[draggedIndex];
    newLocations.splice(draggedIndex, 1);
    newLocations.splice(index, 0, draggedItem);
    onReorderLocations(newLocations);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-2">
            Day {dayNumber}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            {formatDate(date)}
          </p>
          {locations.length > 0 && (
            <div className="flex items-center gap-4 text-[10px] text-neutral-400 dark:text-neutral-500 tracking-wide">
              {getTotalCost() > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSignIcon className="w-3 h-3" />${getTotalCost()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {Math.floor(getTotalDuration() / 60)}h{' '}
                {getTotalDuration() % 60}m
              </span>
              <span>{locations.length} stops</span>
            </div>
          )}
        </div>
        {locations.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOptimizeRoute}
              className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              title="Optimize route"
            >
              <RouteIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tracking-wide">
                Optimize
              </span>
            </button>
            <button
              onClick={onDuplicateDay}
              className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              title="Duplicate day"
            >
              <CopyIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tracking-wide">
                Duplicate
              </span>
            </button>
          </div>
        )}
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
            {locations.map((location, index) => {
              const travelTime = calculateTravelTime(index);
              return (
                <Fragment key={location.id}>
                  {travelTime && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-neutral-50 dark:bg-neutral-900/50 border-l-2 border-neutral-300 dark:border-neutral-700">
                      <MapPinIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tracking-wide">
                        {travelTime} min travel
                        {hotelLocation && index === 0 && ` from ${hotelLocation}`}
                      </span>
                    </div>
                  )}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group cursor-move bg-white dark:bg-gray-900 ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVerticalIcon className="w-4 h-4 text-neutral-300 dark:text-neutral-600 mt-2 flex-shrink-0" />
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
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 truncate">
                              {location.name}
                            </h4>
                            {location.mealType && (
                              <span className="text-neutral-400 dark:text-neutral-500">
                                {getMealIcon(location.mealType)}
                              </span>
                            )}
                          </div>
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
                      <div className="flex items-center gap-4 text-[10px] text-neutral-400 dark:text-neutral-500 tracking-wide">
                        {location.time && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {location.time}
                          </span>
                        )}
                        {location.duration && (
                          <span>{location.duration} min</span>
                        )}
                        {location.cost && (
                          <span className="flex items-center gap-1">
                            <DollarSignIcon className="w-3 h-3" />$
                            {location.cost}
                          </span>
                        )}
                      </div>
                      {location.notes && (
                        <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 border-l-2 border-neutral-300 dark:border-neutral-700">
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {location.notes}
                          </p>
                        </div>
                      )}
                      {/* Opening hours warning */}
                      {location.category === 'Culture' && location.time && (
                        <div className="mt-3 flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-500">
                          <AlertCircleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>Check opening hours before visiting</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
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
