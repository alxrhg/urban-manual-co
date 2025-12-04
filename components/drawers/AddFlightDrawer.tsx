'use client';

import { useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Plane, Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';

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

  // Autofill state
  const [showAutofill, setShowAutofill] = useState(true);
  const [lookupFlight, setLookupFlight] = useState('');
  const [lookupDate, setLookupDate] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [autofilled, setAutofilled] = useState(false);

  // Form state
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

  // Look up flight details
  const handleLookup = async () => {
    if (!lookupFlight.trim() || !lookupDate) {
      setLookupError('Enter flight number and date');
      return;
    }

    setLookingUp(true);
    setLookupError(null);

    try {
      const response = await fetch('/api/flight-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightNumber: lookupFlight.trim(),
          date: lookupDate,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setLookupError(result.error || 'Flight not found');
        return;
      }

      // Autofill the form
      const data = result.data;
      setAirline(data.airline || '');
      setFlightNumber(data.flightNumber || '');
      setFrom(data.from || '');
      setTo(data.to || '');
      setDepartureDate(data.departureDate || '');
      setDepartureTime(data.departureTime || '');
      setArrivalDate(data.arrivalDate || '');
      setArrivalTime(data.arrivalTime || '');
      setAutofilled(true);
      setShowAutofill(false);
    } catch (err) {
      console.error('Flight lookup error:', err);
      setLookupError('Failed to look up flight');
    } finally {
      setLookingUp(false);
    }
  };

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

      {/* Autofill Section */}
      <div className="rounded-xl border border-stone-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAutofill(!showAutofill)}
          className="w-full px-4 py-3 flex items-center justify-between bg-stone-50 dark:bg-gray-800/50 hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-stone-700 dark:text-gray-300">
              {autofilled ? 'Flight details loaded' : 'Look up flight details'}
            </span>
          </div>
          {showAutofill ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </button>

        {showAutofill && (
          <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
            <p className="text-xs text-stone-500 dark:text-gray-400">
              Enter your flight number and date to auto-fill the details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lookupFlight" className="text-xs">
                  Flight #
                </Label>
                <Input
                  id="lookupFlight"
                  type="text"
                  value={lookupFlight}
                  onChange={(e) => {
                    setLookupFlight(e.target.value.toUpperCase());
                    setLookupError(null);
                  }}
                  placeholder="e.g. UA123"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lookupDate" className="text-xs">
                  Date
                </Label>
                <Input
                  id="lookupDate"
                  type="date"
                  value={lookupDate}
                  onChange={(e) => {
                    setLookupDate(e.target.value);
                    setLookupError(null);
                  }}
                  className="h-9"
                />
              </div>
            </div>
            {lookupError && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {lookupError}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLookup}
              disabled={lookingUp || !lookupFlight.trim() || !lookupDate}
              className="w-full"
            >
              {lookingUp ? (
                <>
                  <Spinner className="w-3 h-3 mr-2" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 mr-2" />
                  Look Up Flight
                </>
              )}
            </Button>
          </div>
        )}
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
