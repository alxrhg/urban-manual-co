import React, { useState } from 'react';
import { XIcon, PlusIcon, CalendarIcon, MapPinIcon } from 'lucide-react';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';

interface TripPlannerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
}

export function TripPlanner({ isOpen, onClose }: TripPlannerProps) {
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [showAddLocation, setShowAddLocation] = useState<number | null>(null);
  const [step, setStep] = useState<'create' | 'plan'>('create');

  const handleCreateTrip = () => {
    if (!tripName || !destination || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const newDays: DayItinerary[] = [];

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      newDays.push({
        date: date.toISOString().split('T')[0],
        locations: [],
      });
    }

    setDays(newDays);
    setStep('plan');
  };

  const handleAddLocation = (dayIndex: number, location: TripLocation) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations: [...day.locations, location],
            }
          : day,
      ),
    );
    setShowAddLocation(null);
  };

  const handleRemoveLocation = (dayIndex: number, locationId: number) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations: day.locations.filter((loc) => loc.id !== locationId),
            }
          : day,
      ),
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      <div
        className="absolute inset-0 bg-white/95 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-6xl max-h-[90vh] overflow-hidden border border-neutral-200 flex flex-col">
        <div className="border-b border-neutral-200 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[11px] text-neutral-400 tracking-[0.2em] uppercase">
            {step === 'create' ? 'New Trip' : tripName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-900" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === 'create' ? (
            <div className="p-8 max-w-2xl mx-auto">
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] text-neutral-400 tracking-[0.15em] uppercase mb-3">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="Summer in Paris"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 tracking-[0.15em] uppercase mb-3">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Paris, France"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] text-neutral-400 tracking-[0.15em] uppercase mb-3">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 tracking-[0.15em] uppercase mb-3">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateTrip}
                  disabled={!tripName || !destination || !startDate || !endDate}
                  className="w-full px-6 py-3 border border-neutral-900 bg-neutral-900 text-white text-xs tracking-wide hover:bg-neutral-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Create Trip
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="mb-8 pb-8 border-b border-neutral-200">
                <div className="flex items-center gap-3 text-[11px] text-neutral-500 tracking-wide">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  {destination}
                  <span className="text-neutral-300">•</span>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {new Date(startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  –{' '}
                  {new Date(endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div className="space-y-12">
                {days.map((day, index) => (
                  <TripDay
                    key={day.date}
                    dayNumber={index + 1}
                    date={day.date}
                    locations={day.locations}
                    onAddLocation={() => setShowAddLocation(index)}
                    onRemoveLocation={(locationId) =>
                      handleRemoveLocation(index, locationId)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddLocation !== null && (
        <AddLocationToTrip
          onAdd={(location) => handleAddLocation(showAddLocation, location)}
          onClose={() => setShowAddLocation(null)}
        />
      )}
    </div>
  );
}

