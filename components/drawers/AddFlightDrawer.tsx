'use client';

import { useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Plane, Loader2, Car, Clock } from 'lucide-react';
import type { FlightData, TravelClass } from '@/types/trip';

interface AddFlightDrawerProps {
  tripId?: string;
  dayNumber?: number;
  onAdd?: (flightData: FlightData) => void;
}

// Re-export FlightData for backward compatibility
export type { FlightData } from '@/types/trip';

const TRAVEL_CLASS_OPTIONS: { value: TravelClass; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
];

export default function AddFlightDrawer({
  tripId,
  dayNumber,
  onAdd,
}: AddFlightDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const [saving, setSaving] = useState(false);

  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [travelClass, setTravelClass] = useState<TravelClass | ''>('');
  const [departureLounge, setDepartureLounge] = useState('');
  const [arrivalLounge, setArrivalLounge] = useState('');
  const [travelTimeToAirport, setTravelTimeToAirport] = useState('');
  const [travelTimeFromAirport, setTravelTimeFromAirport] = useState('');

  const handleSubmit = async () => {
    if (!airline.trim() || !from.trim() || !to.trim()) return;

    setSaving(true);
    try {
      const flightData: FlightData = {
        type: 'flight',
        airline: airline.trim(),
        flightNumber: flightNumber.trim(),
        from: from.trim(),
        to: to.trim(),
        departureDate,
        departureTime,
        arrivalDate,
        arrivalTime,
        confirmationNumber: confirmationNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        travelClass: travelClass || undefined,
        departureLounge: departureLounge.trim() || undefined,
        arrivalLounge: arrivalLounge.trim() || undefined,
        travelTimeToAirport: travelTimeToAirport ? parseInt(travelTimeToAirport, 10) : undefined,
        travelTimeFromAirport: travelTimeFromAirport ? parseInt(travelTimeFromAirport, 10) : undefined,
      };

      if (onAdd) {
        onAdd(flightData);
      }
      closeDrawer();
    } catch (err) {
      console.error('Error adding flight:', err);
    } finally {
      setSaving(false);
    }
  };

  const isValid = airline.trim() && from.trim() && to.trim();

  return (
    <div className="p-4 space-y-6">
      {/* Header Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <Plane className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      {/* Airline & Flight Number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Airline *
          </label>
          <input
            type="text"
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="e.g. United"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Flight #
          </label>
          <input
            type="text"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="e.g. UA123"
          />
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            From *
          </label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="e.g. JFK"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            To *
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="e.g. LAX"
          />
        </div>
      </div>

      {/* Departure */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Departure
        </label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
      </div>

      {/* Arrival */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Arrival
        </label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
          <input
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
      </div>

      {/* Confirmation Number & Travel Class */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Confirmation #
          </label>
          <input
            type="text"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Class
          </label>
          <select
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value as TravelClass | '')}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          >
            <option value="">Select class</option>
            {TRAVEL_CLASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lounge Access */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Lounge Access
        </label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={departureLounge}
            onChange={(e) => setDepartureLounge(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="Departure lounge"
          />
          <input
            type="text"
            value={arrivalLounge}
            onChange={(e) => setArrivalLounge(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="Arrival lounge"
          />
        </div>
      </div>

      {/* Travel Time To/From Airport */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Travel Time (minutes)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="number"
              min="0"
              value={travelTimeToAirport}
              onChange={(e) => setTravelTimeToAirport(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              placeholder="To airport"
            />
          </div>
          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="number"
              min="0"
              value={travelTimeFromAirport}
              onChange={(e) => setTravelTimeFromAirport(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              placeholder="From airport"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white resize-none"
          placeholder="Seat, luggage, etc."
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={saving || !isValid}
        className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Add Flight
      </button>
    </div>
  );
}
