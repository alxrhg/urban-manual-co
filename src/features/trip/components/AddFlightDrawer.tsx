'use client';

import { useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Plane } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Spinner } from '@/ui/spinner';

interface AddFlightDrawerProps {
  tripId?: string;
  dayNumber?: number;
  onAdd?: (flightData: FlightData) => void;
}

export interface FlightData {
  type: 'flight';
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  notes?: string;
}

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
        <div className="space-y-2">
          <Label htmlFor="airline">Airline *</Label>
          <Input
            id="airline"
            type="text"
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            placeholder="e.g. United"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="flightNumber">Flight #</Label>
          <Input
            id="flightNumber"
            type="text"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            placeholder="e.g. UA123"
          />
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from">From *</Label>
          <Input
            id="from"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="e.g. JFK"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To *</Label>
          <Input
            id="to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="e.g. LAX"
          />
        </div>
      </div>

      {/* Departure */}
      <div className="space-y-2">
        <Label>Departure</Label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
          <Input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
          />
        </div>
      </div>

      {/* Arrival */}
      <div className="space-y-2">
        <Label>Arrival</Label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
          />
          <Input
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
          />
        </div>
      </div>

      {/* Confirmation Number */}
      <div className="space-y-2">
        <Label htmlFor="confirmation">Confirmation #</Label>
        <Input
          id="confirmation"
          type="text"
          value={confirmationNumber}
          onChange={(e) => setConfirmationNumber(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Seat, luggage, etc."
          className="resize-none"
        />
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={saving || !isValid}
        className="w-full rounded-full"
      >
        {saving && <Spinner className="size-4 mr-2" />}
        Add Flight
      </Button>
    </div>
  );
}
