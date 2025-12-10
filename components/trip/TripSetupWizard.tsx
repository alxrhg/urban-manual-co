'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Calendar, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TripSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; destination: string; startDate: string; endDate: string }) => Promise<void>;
}

type Step = 'name' | 'destination' | 'dates';

/**
 * TripSetupWizard - Quick 3-step flow for creating a trip
 *
 * Philosophy: Collect essential info upfront so the trip page
 * isn't empty and confusing. Each step is focused and fast.
 */
export default function TripSetupWizard({ isOpen, onClose, onCreate }: TripSetupWizardProps) {
  const [step, setStep] = useState<Step>('name');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);

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

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('name');
        setTitle('');
        setDestination('');
        setStartDate('');
        setEndDate('');
      }, 300);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (step === 'name' && title.trim()) {
      setStep('destination');
    } else if (step === 'destination') {
      setStep('dates');
    }
  }, [step, title]);

  const handleBack = useCallback(() => {
    if (step === 'destination') {
      setStep('name');
    } else if (step === 'dates') {
      setStep('destination');
    }
  }, [step]);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
      });
    } finally {
      setIsCreating(false);
    }
  }, [title, destination, startDate, endDate, onCreate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (step === 'dates') {
        handleCreate();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [step, handleNext, handleCreate, onClose]);

  // Calculate trip duration for display
  const tripDuration = startDate && endDate
    ? Math.ceil((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  const canProceed = step === 'name' ? title.trim().length > 0 : true;
  const canCreate = title.trim().length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {step !== 'name' && (
                <button
                  onClick={handleBack}
                  className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
              )}
              <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                {step === 'name' && 'Name your trip'}
                {step === 'destination' && 'Where are you going?'}
                {step === 'dates' && 'When?'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-900/50">
            {(['name', 'destination', 'dates'] as Step[]).map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step
                    ? 'bg-gray-900 dark:bg-white'
                    : s === 'name' || (s === 'destination' && step === 'dates')
                    ? 'bg-gray-300 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
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
                    className="w-full px-4 py-3 text-[16px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                    autoFocus
                  />
                  <p className="mt-2 text-[13px] text-gray-400">
                    Give your trip a memorable name
                  </p>
                </motion.div>
              )}

              {step === 'destination' && (
                <motion.div
                  key="destination"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={destinationInputRef}
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Paris, France"
                      className="w-full pl-12 pr-4 py-3 text-[16px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                    />
                  </div>
                  <p className="mt-2 text-[13px] text-gray-400">
                    City or region you&apos;re visiting (optional)
                  </p>
                </motion.div>
              )}

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
                      <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                        Start
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={startDateRef}
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            // Auto-set end date if not set or if before start
                            if (!endDate || e.target.value > endDate) {
                              setEndDate(e.target.value);
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          className="w-full pl-10 pr-3 py-2.5 text-[14px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                        End
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          onKeyDown={handleKeyDown}
                          min={startDate}
                          className="w-full pl-10 pr-3 py-2.5 text-[14px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {tripDuration && tripDuration > 0 && (
                    <p className="text-[13px] text-gray-500 text-center">
                      {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
                    </p>
                  )}

                  <p className="text-[13px] text-gray-400 text-center">
                    Dates can be changed later (optional)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2">
            {step === 'dates' ? (
              <button
                onClick={handleCreate}
                disabled={!canCreate || isCreating}
                className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[15px] font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Trip'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[15px] font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 'destination' && (
              <button
                onClick={() => setStep('dates')}
                className="w-full mt-2 py-2 text-[13px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            )}

            {step === 'dates' && (
              <button
                onClick={handleCreate}
                disabled={!canCreate || isCreating}
                className="w-full mt-2 py-2 text-[13px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip dates and create trip
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
