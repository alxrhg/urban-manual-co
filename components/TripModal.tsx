'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Plus, MapPin, Calendar, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { formatDestinationsFromField } from '@/types/trip';
import { toast } from '@/ui/sonner';

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  cover_image: string | null;
}

type WizardStep = 'select' | 'name' | 'destination' | 'dates';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Mode: 'add' to add destination to trip, 'create' to create new trip only */
  mode: 'add' | 'create';
  /** For 'add' mode - destination details */
  destinationSlug?: string;
  destinationName?: string;
  destinationCity?: string;
  /** For 'create' mode - callback when trip is created */
  onCreate?: (data: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
}

/**
 * Unified TripModal - handles both adding destinations to trips and creating new trips
 *
 * In 'add' mode: Shows list of existing trips + create new option
 * In 'create' mode: Shows 3-step wizard for new trip creation
 */
export const TripModal = memo(function TripModal({
  isOpen,
  onClose,
  mode,
  destinationSlug = '',
  destinationName = '',
  destinationCity,
  onCreate,
}: TripModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Shared state
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState<WizardStep>(mode === 'add' ? 'select' : 'name');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Refs for auto-focus
  const titleInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);

  // Load user's trips for 'add' mode
  useEffect(() => {
    if (!isOpen || !user || mode !== 'add') {
      if (mode === 'create') setLoading(false);
      return;
    }

    async function loadTrips() {
      setLoading(true);
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('trips')
          .select('id, name, destination, start_date, cover_image')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setTrips(data || []);
      } catch (error) {
        console.error('Error loading trips:', error);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [isOpen, user, mode]);

  // Focus appropriate input when step changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (step === 'name' && titleInputRef.current) {
        titleInputRef.current.focus();
      } else if (step === 'destination' && destinationInputRef.current) {
        destinationInputRef.current.focus();
      } else if (step === 'dates' && startDateRef.current) {
        startDateRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [step, isOpen]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(mode === 'add' ? 'select' : 'name');
        setTitle('');
        setDestination('');
        setStartDate('');
        setEndDate('');
        setAdding(null);
        setSuccess(null);
      }, 300);
    }
  }, [isOpen, mode]);

  // Add destination to existing trip
  const handleAddToTrip = async (tripId: string) => {
    if (!user) return;

    setAdding(tripId);
    try {
      const supabaseClient = createClient();

      // Get the max order_index for day 1 (default day)
      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('day', 1)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      // Add to itinerary_items
      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destinationSlug,
          title: destinationName,
          day: 1,
          order_index: nextOrder,
          item_type: 'activity',
        });

      if (error) throw error;

      setSuccess(tripId);
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1000);
    } catch (error) {
      console.error('Error adding to trip:', error);
      toast.error('Failed to add to trip. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  // Start create trip wizard from 'add' mode
  const handleStartCreate = () => {
    // Pre-fill destination if in add mode
    if (mode === 'add' && destinationCity) {
      setTitle(`Trip to ${destinationCity}`);
      setDestination(destinationCity);
    }
    setStep('name');
  };

  // Wizard navigation
  const handleNext = useCallback(() => {
    if (step === 'name' && title.trim()) {
      setStep('destination');
    } else if (step === 'destination') {
      setStep('dates');
    }
  }, [step, title]);

  const handleBack = useCallback(() => {
    if (step === 'name' && mode === 'add') {
      setStep('select');
    } else if (step === 'destination') {
      setStep('name');
    } else if (step === 'dates') {
      setStep('destination');
    }
  }, [step, mode]);

  // Create trip (final step)
  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      if (onCreate) {
        // Use external callback (for /trips page)
        await onCreate({
          title: title.trim(),
          destination: destination.trim(),
          startDate,
          endDate,
        });
      } else if (user) {
        // Create internally (for add mode)
        const supabaseClient = createClient();

        const { data: newTrip, error: tripError } = await supabaseClient
          .from('trips')
          .insert({
            user_id: user.id,
            name: title.trim(),
            destination: destination.trim() || null,
            start_date: startDate || null,
            end_date: endDate || null,
          })
          .select()
          .single();

        if (tripError) throw tripError;

        // If in add mode, also add the destination as first item
        if (mode === 'add' && destinationSlug) {
          const { error: itemError } = await supabaseClient
            .from('itinerary_items')
            .insert({
              trip_id: newTrip.id,
              destination_slug: destinationSlug,
              title: destinationName,
              day: 1,
              order_index: 0,
              item_type: 'activity',
            });

          if (itemError) throw itemError;
        }

        setSuccess('new');
        setTimeout(() => {
          onClose();
          router.push(`/trips/${newTrip.id}`);
        }, 800);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [title, destination, startDate, endDate, onCreate, user, mode, destinationSlug, destinationName, onClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (step === 'dates') {
        handleCreate();
      } else if (step !== 'select') {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [step, handleNext, handleCreate, onClose]);

  // Calculate trip duration
  const tripDuration = startDate && endDate
    ? Math.ceil((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  const canProceed = step === 'name' ? title.trim().length > 0 : true;
  const canCreate = title.trim().length > 0;
  const isWizardStep = step !== 'select';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full sm:max-w-md bg-white dark:bg-stone-900 sm:rounded-lg rounded-t-2xl shadow-2xl overflow-hidden max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-3">
              {isWizardStep && (step !== 'name' || mode === 'add') && (
                <button
                  onClick={handleBack}
                  className="p-1.5 -ml-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-stone-400" />
                </button>
              )}
              <div>
                <h2 className="text-[17px] font-semibold text-stone-900 dark:text-white">
                  {step === 'select' && 'Add to Trip'}
                  {step === 'name' && 'Name your trip'}
                  {step === 'destination' && 'Where are you going?'}
                  {step === 'dates' && 'When?'}
                </h2>
                {step === 'select' && destinationName && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {destinationName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5 text-stone-400" />
            </button>
          </div>

          {/* Progress dots (only for wizard steps) */}
          {isWizardStep && (
            <div className="flex items-center justify-center gap-2 py-3 bg-stone-50 dark:bg-stone-900/50">
              {(['name', 'destination', 'dates'] as const).map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step
                      ? 'bg-stone-900 dark:bg-white'
                      : s === 'name' || (s === 'destination' && step === 'dates')
                      ? 'bg-stone-300 dark:bg-stone-600'
                      : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-5 overflow-y-auto" style={{ maxHeight: isWizardStep ? 'calc(85vh - 200px)' : 'calc(85vh - 120px)' }}>
            <AnimatePresence mode="wait">
              {/* Trip Selection (add mode) */}
              {step === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                    </div>
                  ) : (
                    <>
                      {/* Create New Trip */}
                      <button
                        onClick={handleStartCreate}
                        disabled={adding !== null}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-stone-900 dark:bg-white flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white dark:text-stone-900" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-stone-900 dark:text-white">Create New Trip</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Start planning a new adventure
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-stone-400" />
                      </button>

                      {/* Existing Trips */}
                      {trips.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-1">
                            Your Trips
                          </p>
                          {trips.map((trip) => (
                            <button
                              key={trip.id}
                              onClick={() => handleAddToTrip(trip.id)}
                              disabled={adding !== null}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all disabled:opacity-50"
                            >
                              {adding === trip.id ? (
                                success === trip.id ? (
                                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
                                  </div>
                                )
                              ) : trip.cover_image ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
                                  <img
                                    src={trip.cover_image}
                                    alt={trip.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                  <MapPin className="w-5 h-5 text-stone-400" />
                                </div>
                              )}
                              <div className="flex-1 text-left min-w-0">
                                <p className="font-medium text-stone-900 dark:text-white truncate">{trip.name}</p>
                                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                  {formatDestinationsFromField(trip.destination) || 'No destination set'}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {trips.length === 0 && (
                        <p className="text-center text-sm text-stone-500 dark:text-stone-400 py-4">
                          You haven&apos;t created any trips yet.
                          <br />
                          Start by creating your first trip above!
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Name Step */}
              {step === 'name' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Summer in Paris"
                    className="w-full px-4 py-3 text-[16px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                    autoFocus
                  />
                  <p className="mt-2 text-[13px] text-stone-400">
                    Give your trip a memorable name
                  </p>
                </motion.div>
              )}

              {/* Destination Step */}
              {step === 'destination' && (
                <motion.div
                  key="destination"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      ref={destinationInputRef}
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Paris, France"
                      className="w-full pl-12 pr-4 py-3 text-[16px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                    />
                  </div>
                  <p className="mt-2 text-[13px] text-stone-400">
                    City or region you&apos;re visiting (optional)
                  </p>
                </motion.div>
              )}

              {/* Dates Step */}
              {step === 'dates' && (
                <motion.div
                  key="dates"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-stone-500 mb-1.5">
                        Start
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                          ref={startDateRef}
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            if (!endDate || e.target.value > endDate) {
                              setEndDate(e.target.value);
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          className="w-full pl-10 pr-3 py-2.5 text-[14px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-stone-500 mb-1.5">
                        End
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          onKeyDown={handleKeyDown}
                          min={startDate}
                          className="w-full pl-10 pr-3 py-2.5 text-[14px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {tripDuration && tripDuration > 0 && (
                    <p className="text-[13px] text-stone-500 text-center">
                      {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
                    </p>
                  )}

                  <p className="text-[13px] text-stone-400 text-center">
                    Dates can be changed later (optional)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer (for wizard steps) */}
          {isWizardStep && (
            <div className="px-5 pb-5 pt-2">
              {step === 'dates' ? (
                <button
                  onClick={handleCreate}
                  disabled={!canCreate || isCreating}
                  className="w-full py-3 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[15px] font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : success === 'new' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Created!
                    </>
                  ) : (
                    'Create Trip'
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="w-full py-3 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[15px] font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 'destination' && (
                <button
                  onClick={() => setStep('dates')}
                  className="w-full mt-2 py-2 text-[13px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  Skip for now
                </button>
              )}

              {step === 'dates' && !isCreating && (
                <button
                  onClick={handleCreate}
                  disabled={!canCreate || isCreating}
                  className="w-full mt-2 py-2 text-[13px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  Skip dates and create trip
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default TripModal;
