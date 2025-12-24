'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Calendar, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TripSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; destination: string; startDate: string; endDate: string }) => Promise<void>;
}

type Step = 'name' | 'destination' | 'dates';

/**
 * TripSetupWizard - "Of Study" inspired editorial design
 *
 * Philosophy: Conscious by design. Each step of creating a journey
 * should feel intentional, like curating a meaningful experience.
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[var(--editorial-text-primary)]/40 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
          className="relative w-full max-w-lg bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-editorial-label block mb-2">New Journey</span>
                <h2
                  className="text-2xl font-normal text-[var(--editorial-text-primary)]"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  {step === 'name' && 'Name your journey'}
                  {step === 'destination' && 'Where will you go?'}
                  {step === 'dates' && 'When will you travel?'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="px-8 py-6">
            <div className="flex items-center gap-2">
              {(['name', 'destination', 'dates'] as Step[]).map((s, i) => {
                const isActive = s === step;
                const isPast = ['name', 'destination', 'dates'].indexOf(s) < ['name', 'destination', 'dates'].indexOf(step);
                return (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                        isActive
                          ? 'bg-[var(--editorial-accent)] text-white'
                          : isPast
                            ? 'bg-[var(--editorial-accent)]/20 text-[var(--editorial-accent)]'
                            : 'bg-[var(--editorial-border)] text-[var(--editorial-text-tertiary)]'
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < 2 && (
                      <div className={`w-12 h-px mx-2 ${isPast ? 'bg-[var(--editorial-accent)]/30' : 'bg-[var(--editorial-border)]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-4">
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
                    placeholder="A Week in Kyoto"
                    className="w-full px-0 py-3 text-xl bg-transparent border-0 border-b border-[var(--editorial-border)] text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)] outline-none focus:border-[var(--editorial-accent)] transition-colors"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    autoFocus
                  />
                  <p className="mt-4 text-editorial-meta">
                    Give your journey a name that captures its essence.
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
                    <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--editorial-text-tertiary)]" />
                    <input
                      ref={destinationInputRef}
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Kyoto, Japan"
                      className="w-full pl-8 pr-0 py-3 text-xl bg-transparent border-0 border-b border-[var(--editorial-border)] text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)] outline-none focus:border-[var(--editorial-accent)] transition-colors"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    />
                  </div>
                  <p className="mt-4 text-editorial-meta">
                    The city or region you&apos;ll be exploring.
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
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-editorial-label block mb-3">
                        Departure
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--editorial-text-tertiary)]" />
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
                          className="w-full pl-6 pr-0 py-2 text-[15px] bg-transparent border-0 border-b border-[var(--editorial-border)] text-[var(--editorial-text-primary)] outline-none focus:border-[var(--editorial-accent)] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-editorial-label block mb-3">
                        Return
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--editorial-text-tertiary)]" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          onKeyDown={handleKeyDown}
                          min={startDate}
                          className="w-full pl-6 pr-0 py-2 text-[15px] bg-transparent border-0 border-b border-[var(--editorial-border)] text-[var(--editorial-text-primary)] outline-none focus:border-[var(--editorial-accent)] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {tripDuration && tripDuration > 0 && (
                    <div className="text-center py-3 bg-[var(--editorial-accent)]/5 border border-[var(--editorial-accent)]/10">
                      <span className="text-[var(--editorial-accent)] text-[15px] font-medium">
                        {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  )}

                  <p className="text-editorial-meta text-center">
                    Dates can be adjusted later.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-[var(--editorial-bg)] border-t border-[var(--editorial-border)]">
            <div className="flex items-center justify-between">
              {step !== 'name' ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {step === 'destination' && (
                  <button
                    onClick={() => setStep('dates')}
                    className="text-[13px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                  >
                    Skip
                  </button>
                )}

                {step === 'dates' ? (
                  <button
                    onClick={handleCreate}
                    disabled={!canCreate || isCreating}
                    className="btn-editorial-accent flex items-center gap-2 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Begin Journey
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="btn-editorial-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {step === 'dates' && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleCreate}
                  disabled={!canCreate || isCreating}
                  className="text-[13px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] transition-colors"
                >
                  Skip dates and begin
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
