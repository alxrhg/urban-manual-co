'use client';

import { useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Plane } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormField,
  TextareaField,
  FormErrorSummary,
  SubmitButton,
  validators,
} from '@/components/ui/form-field';

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
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

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

  const validateForm = (): string[] => {
    const validationErrors: string[] = [];
    if (!airline.trim()) validationErrors.push('Airline is required');
    if (!from.trim()) validationErrors.push('Departure location is required');
    if (!to.trim()) validationErrors.push('Destination is required');
    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (validationErrors.length > 0) return;

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
      setErrors(['Failed to add flight. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const isValid = airline.trim() && from.trim() && to.trim();

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      {/* Header Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <Plane className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      {/* Error Summary */}
      {touched && errors.length > 0 && (
        <FormErrorSummary errors={errors} />
      )}

      {/* Airline & Flight Number */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="airline"
          label="Airline"
          type="text"
          value={airline}
          onChange={(e) => {
            setAirline(e.target.value);
            if (touched) setErrors(validateForm());
          }}
          placeholder="e.g. United"
          required
          error={touched && !airline.trim() ? 'Required' : undefined}
        />
        <FormField
          id="flightNumber"
          label="Flight #"
          type="text"
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          placeholder="e.g. UA123"
          showValidation={false}
        />
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="from"
          label="From"
          type="text"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            if (touched) setErrors(validateForm());
          }}
          placeholder="e.g. JFK"
          required
          error={touched && !from.trim() ? 'Required' : undefined}
        />
        <FormField
          id="to"
          label="To"
          type="text"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            if (touched) setErrors(validateForm());
          }}
          placeholder="e.g. LAX"
          required
          error={touched && !to.trim() ? 'Required' : undefined}
        />
      </div>

      {/* Departure */}
      <div className="space-y-2">
        <Label>Departure</Label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            aria-label="Departure date"
          />
          <Input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            aria-label="Departure time"
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
            aria-label="Arrival date"
          />
          <Input
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            aria-label="Arrival time"
          />
        </div>
      </div>

      {/* Confirmation Number */}
      <FormField
        id="confirmation"
        label="Confirmation #"
        type="text"
        value={confirmationNumber}
        onChange={(e) => setConfirmationNumber(e.target.value)}
        placeholder="Optional"
        showValidation={false}
      />

      {/* Notes */}
      <TextareaField
        id="notes"
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Seat, luggage, etc."
        showValidation={false}
      />

      {/* Submit Button */}
      <SubmitButton
        isLoading={saving}
        loadingText="Adding flight..."
        className="w-full rounded-full"
      >
        Add Flight
      </SubmitButton>
    </form>
  );
}
