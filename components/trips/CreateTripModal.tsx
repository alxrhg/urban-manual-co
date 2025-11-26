'use client';

import { useState, useEffect } from 'react';
import { Plane, MapPin, Calendar, ArrowRight, Sparkles, X } from 'lucide-react';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tripData: { title: string; destination: string; startDate: string; endDate: string }) => Promise<void>;
}

const QUICK_DESTINATIONS = [
  { name: 'Paris', emoji: '🇫🇷' },
  { name: 'Tokyo', emoji: '🇯🇵' },
  { name: 'New York', emoji: '🇺🇸' },
  { name: 'London', emoji: '🇬🇧' },
  { name: 'Barcelona', emoji: '🇪🇸' },
  { name: 'Rome', emoji: '🇮🇹' },
];

export default function CreateTripModal({ isOpen, onClose, onCreate }: CreateTripModalProps) {
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Auto-generate title from destination
  useEffect(() => {
    if (destination && !title) {
      setTitle(`${destination} Trip`);
    }
  }, [destination, title]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDestination('');
      setTitle('');
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen]);

  const handleQuickDestination = (city: string) => {
    setDestination(city);
    setTitle(`${city} Trip`);
    setStep(2);
  };

  const handleNext = () => {
    if (step === 1 && destination) {
      setStep(2);
    } else if (step === 2) {
      handleCreate();
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreate({
        title: title || `${destination} Trip`,
        destination,
        startDate,
        endDate,
      });
    } finally {
      setCreating(false);
    }
  };

  const canProceed = step === 1 ? destination.trim() : true;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 mb-6">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`} />
          </div>
        </div>

        {/* Step 1: Destination */}
        {step === 1 && (
          <div className="px-6 pb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Where are you going?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Let&apos;s start planning your adventure
              </p>
            </div>

            {/* Quick picks */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Popular destinations</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.name}
                    onClick={() => handleQuickDestination(dest.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <span>{dest.emoji}</span>
                    <span>{dest.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Destination input */}
            <div className="relative">
              <CityAutocompleteInput
                value={destination}
                onChange={setDestination}
                placeholder="Search for a city..."
                className="w-full"
              />
            </div>

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="w-full mt-6 py-3.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="px-6 pb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Trip details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                When are you visiting {destination}?
              </p>
            </div>

            {/* Trip name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trip name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                placeholder="e.g. Summer in Paris"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>
            </div>

            {/* Optional dates hint */}
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              <Sparkles className="w-3 h-3 inline mr-1" />
              Dates are optional - you can add them later
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plane className="w-4 h-4" />
                    Create Trip
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
