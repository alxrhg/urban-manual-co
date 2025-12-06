'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Plane, Briefcase, Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import type { TripType } from '@/types/trip';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tripId: string) => void;
}

/**
 * CreateTripModal - O3Pack-inspired trip creation modal
 * Features: Airport input, date/time selection, trip type toggle, e-ticket upload
 */
export default function CreateTripModal({ isOpen, onClose, onSuccess }: CreateTripModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('12:00');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('12:00');
  const [tripType, setTripType] = useState<TripType>('leisure');
  const [autoplan, setAutoplan] = useState(false);

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Airport code to city mapping (simplified)
  const airportToCity: Record<string, string> = {
    JFK: 'New York',
    LAX: 'Los Angeles',
    SFO: 'San Francisco',
    MIA: 'Miami',
    ORD: 'Chicago',
    LHR: 'London',
    CDG: 'Paris',
    NRT: 'Tokyo',
    HND: 'Tokyo',
    BCN: 'Barcelona',
    FCO: 'Rome',
    DXB: 'Dubai',
    SIN: 'Singapore',
    BKK: 'Bangkok',
    HKG: 'Hong Kong',
    SJU: 'San Juan',
    MEX: 'Mexico City',
    IST: 'Istanbul',
    AMS: 'Amsterdam',
  };

  /**
   * Handle airport code input - auto-fill destination city
   */
  const handleAirportChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setArrivalAirport(upperValue);

    // Auto-fill destination city if known airport
    if (upperValue.length === 3 && airportToCity[upperValue]) {
      setDestinationCity(airportToCity[upperValue]);
    }
  };

  /**
   * Handle e-ticket file upload
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data from data URL
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Determine MIME type
      const mimeType = file.type || 'image/jpeg';

      // Call extraction API
      const response = await fetch('/api/trips/extract-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType,
        }),
      });

      const result = await response.json();

      if (result.success && result.extracted) {
        const { extracted, suggestedTrip } = result;

        // Auto-fill form with extracted data
        if (extracted.arrivalAirport) {
          setArrivalAirport(extracted.arrivalAirport);
        }
        if (suggestedTrip?.destination) {
          setDestinationCity(suggestedTrip.destination);
        }
        if (extracted.departureDate) {
          setArrivalDate(extracted.departureDate);
        }
        if (extracted.departureTime) {
          setArrivalTime(extracted.departureTime);
        }
        if (extracted.arrivalDate) {
          setDepartureDate(extracted.arrivalDate);
        }
        if (extracted.arrivalTime) {
          setDepartureTime(extracted.arrivalTime);
        }
      } else {
        setExtractError(result.error || 'Could not extract flight information');
      }
    } catch (error) {
      console.error('E-ticket extraction failed:', error);
      setExtractError('Failed to process ticket. Please try again.');
    } finally {
      setIsExtracting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  /**
   * Create trip
   */
  const handleCreateTrip = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!destinationCity) {
      return;
    }

    setIsCreating(true);

    try {
      if (autoplan && arrivalDate && departureDate) {
        // Use auto-plan API for one-click planning
        const response = await fetch('/api/trips/auto-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: destinationCity,
            startDate: arrivalDate,
            endDate: departureDate,
            tripType,
            arrivalAirport: arrivalAirport || undefined,
          }),
        });

        const result = await response.json();

        if (result.success && result.data?.tripId) {
          onClose();
          if (onSuccess) {
            onSuccess(result.data.tripId);
          } else {
            router.push(`/trips/${result.data.tripId}`);
          }
        } else {
          throw new Error('Failed to create trip');
        }
      } else {
        // Create basic trip
        const supabase = createClient();
        if (!supabase) throw new Error('Database not available');

        const { data, error } = await supabase
          .from('trips')
          .insert({
            user_id: user.id,
            title: `Trip to ${destinationCity}`,
            destination: destinationCity,
            start_date: arrivalDate || null,
            end_date: departureDate || null,
            trip_type: tripType,
            arrival_airport: arrivalAirport || null,
            status: 'planning',
            is_public: false,
          })
          .select()
          .single();

        if (error) throw error;

        onClose();
        if (onSuccess && data) {
          onSuccess(data.id);
        } else if (data) {
          router.push(`/trips/${data.id}`);
        }
      }
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Trip</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Airport & Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Arrival Airport
              </label>
              <input
                type="text"
                value={arrivalAirport}
                onChange={(e) => handleAirportChange(e.target.value)}
                placeholder="Airport code or search"
                maxLength={3}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Destination City
              </label>
              <input
                type="text"
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder={arrivalAirport ? 'Enter airport first' : 'City name'}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Arrival Date & Time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-24 px-2 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Departure Date & Time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-24 px-2 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                />
              </div>
            </div>
          </div>

          {/* Trip Type Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trip Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTripType('leisure')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  tripType === 'leisure'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Plane className="w-4 h-4" />
                Leisure
              </button>
              <button
                onClick={() => setTripType('work')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  tripType === 'work'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Work
              </button>
            </div>
          </div>

          {/* Auto-plan Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-plan my trip for me</p>
                <p className="text-xs text-gray-500">AI generates a complete itinerary</p>
              </div>
            </div>
            <button
              onClick={() => setAutoplan(!autoplan)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoplan ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                  autoplan
                    ? 'translate-x-5 bg-white dark:bg-gray-900'
                    : 'translate-x-0 bg-white dark:bg-gray-400'
                }`}
              />
            </button>
          </div>

          {/* E-ticket Upload */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Or upload e-ticket</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload your e-ticket (image or PDF) and our AI will extract your trip details automatically.
                  </p>
                  {extractError && (
                    <p className="text-xs text-red-500 mt-2">{extractError}</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                  className="rounded-full"
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Choose File'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={handleCreateTrip}
            disabled={isCreating || !destinationCity}
            className="rounded-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Trip'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
