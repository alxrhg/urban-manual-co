'use client';

import { useState, useCallback, useEffect, memo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { useTripBuilder, SavedTripSummary, ActiveTrip } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

interface InlineAddToTripProps {
  destination: Destination;
  onAdded?: () => void;
}

type ViewState = 'button' | 'selecting' | 'days' | 'success';

// ============================================
// INLINE ADD TO TRIP COMPONENT
// ============================================

const InlineAddToTrip = memo(function InlineAddToTrip({
  destination,
  onAdded,
}: InlineAddToTripProps) {
  const { user } = useAuth();
  const {
    activeTrip,
    savedTrips,
    isLoadingTrips,
    startTrip,
    addToTrip,
    loadTrip,
    refreshSavedTrips,
    addDay,
  } = useTripBuilder();

  const [viewState, setViewState] = useState<ViewState>('button');
  const [selectedTrip, setSelectedTrip] = useState<ActiveTrip | SavedTripSummary | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Refresh saved trips when expanded
  useEffect(() => {
    if (viewState === 'selecting' && user) {
      refreshSavedTrips();
    }
  }, [viewState, user, refreshSavedTrips]);

  // Auto-collapse after success
  useEffect(() => {
    if (viewState === 'success') {
      const timer = setTimeout(() => {
        setViewState('button');
        setSelectedTrip(null);
        setSelectedDay(1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [viewState]);

  // Animation trigger
  const animateTransition = useCallback((nextState: ViewState) => {
    setIsAnimating(true);
    setTimeout(() => {
      setViewState(nextState);
      setIsAnimating(false);
    }, 150);
  }, []);

  const handleExpand = useCallback(() => {
    animateTransition('selecting');
  }, [animateTransition]);

  const handleClose = useCallback(() => {
    animateTransition('button');
    setSelectedTrip(null);
    setSelectedDay(1);
  }, [animateTransition]);

  const handleBack = useCallback(() => {
    animateTransition('selecting');
  }, [animateTransition]);

  const handleSelectActiveTrip = useCallback(() => {
    if (activeTrip) {
      setSelectedTrip(activeTrip);
      setSelectedDay(1);
      animateTransition('days');
    }
  }, [activeTrip, animateTransition]);

  const handleSelectSavedTrip = useCallback(async (trip: SavedTripSummary) => {
    setIsAdding(true);
    try {
      // Load the trip first
      await loadTrip(trip.id);
      setSelectedTrip(trip);
      setSelectedDay(1);
      animateTransition('days');
    } catch (error) {
      console.error('Failed to load trip:', error);
    } finally {
      setIsAdding(false);
    }
  }, [loadTrip, animateTransition]);

  const handleCreateNewTrip = useCallback(() => {
    const city = destination.city || 'New Trip';
    startTrip(city, 3);
    // After starting, the activeTrip will be set
    // Add destination to day 1
    addToTrip(destination, 1);
    setSuccessMessage(`Added to ${city} Trip · Day 1`);
    animateTransition('success');
    onAdded?.();
  }, [destination, startTrip, addToTrip, onAdded, animateTransition]);

  const handleAddToDay = useCallback(async (day: number) => {
    setIsAdding(true);
    try {
      addToTrip(destination, day);
      const tripName = selectedTrip
        ? ('title' in selectedTrip ? selectedTrip.title : selectedTrip.title)
        : activeTrip?.title || 'Trip';
      setSuccessMessage(`Added to ${tripName} · Day ${day}`);
      animateTransition('success');
      onAdded?.();
    } catch (error) {
      console.error('Failed to add to trip:', error);
    } finally {
      setIsAdding(false);
    }
  }, [destination, selectedTrip, activeTrip, addToTrip, onAdded, animateTransition]);

  const handleAddNewDay = useCallback(() => {
    addDay();
    const newDayNumber = (activeTrip?.days.length || 0) + 1;
    setSelectedDay(newDayNumber);
  }, [addDay, activeTrip]);

  // Get trip ID for view link
  const getTripLink = useCallback(() => {
    if (activeTrip?.id) {
      return `/trips/${activeTrip.id}`;
    }
    return '/trips';
  }, [activeTrip]);

  // Get number of days for selected trip
  const getDaysCount = useCallback(() => {
    if (activeTrip) {
      return activeTrip.days.length;
    }
    return 3; // Default
  }, [activeTrip]);

  // ============================================
  // RENDER CONTENT BASED ON STATE
  // ============================================

  const renderContent = () => {
    switch (viewState) {
      case 'button':
        return (
          <button
            onClick={handleExpand}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border border-[var(--editorial-text-primary)] text-[var(--editorial-text-primary)] text-[13px] font-medium tracking-[0.02em] transition-all duration-200 hover:bg-[var(--editorial-text-primary)] hover:text-[var(--editorial-bg)] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add to Trip
          </button>
        );

      case 'success':
        return (
          <div className="p-4 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center animate-scale-in">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-[14px] font-medium text-[var(--editorial-text-primary)]">
                  {successMessage}
                </span>
              </div>
              <Link
                href={getTripLink()}
                className="flex items-center gap-1 text-[13px] font-medium text-[#4A7C59] hover:underline transition-colors"
              >
                View Trip
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        );

      case 'selecting':
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)]">
                Add to Trip
              </p>
              <button
                onClick={handleClose}
                className="p-1.5 -m-1.5 rounded-md hover:bg-[var(--editorial-border)] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
              </button>
            </div>

            {/* Trip list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide">
              {/* Active trip (if exists and unsaved) */}
              {activeTrip && !activeTrip.id && (
                <button
                  onClick={handleSelectActiveTrip}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#C4A574]/30 bg-[#C4A574]/5 hover:border-[#C4A574]/50 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#C4A574]/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-[#C4A574]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[var(--editorial-text-primary)] truncate">
                        {activeTrip.title}
                      </p>
                      <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-[#C4A574]/20 text-[#C4A574] rounded">
                        Current
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--editorial-text-tertiary)]">
                      {activeTrip.days.reduce((sum, d) => sum + d.items.length, 0)} places · {activeTrip.days.length} days
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] group-hover:text-[#C4A574] transition-colors" />
                </button>
              )}

              {/* Saved trips */}
              {isLoadingTrips ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--editorial-text-tertiary)]" />
                </div>
              ) : (
                savedTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectSavedTrip(trip)}
                    disabled={isAdding}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--editorial-border)] hover:border-[var(--editorial-text-secondary)] transition-all duration-200 text-left group disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {trip.cover_image ? (
                        <Image
                          src={trip.cover_image}
                          alt={trip.title}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <MapPin className="w-5 h-5 text-[var(--editorial-text-tertiary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--editorial-text-primary)] truncate">
                        {trip.title}
                      </p>
                      <p className="text-[12px] text-[var(--editorial-text-tertiary)]">
                        {trip.itemCount} places · {trip.destination}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] group-hover:text-[var(--editorial-text-secondary)] transition-colors" />
                  </button>
                ))
              )}

              {/* No saved trips message */}
              {!isLoadingTrips && savedTrips.length === 0 && !activeTrip && (
                <div className="text-center py-4">
                  <p className="text-[13px] text-[var(--editorial-text-tertiary)]">
                    No saved trips yet
                  </p>
                </div>
              )}
            </div>

            {/* Create new trip */}
            <button
              onClick={handleCreateNewTrip}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--editorial-text-tertiary)] hover:border-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border)]/30 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg border border-dashed border-[var(--editorial-text-tertiary)] flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-[var(--editorial-text-tertiary)]" />
              </div>
              <span className="text-[14px] font-medium text-[var(--editorial-text-secondary)]">
                Create New Trip
              </span>
            </button>
          </div>
        );

      case 'days':
        const daysCount = getDaysCount();
        const days = Array.from({ length: daysCount }, (_, i) => i + 1);

        return (
          <div className="space-y-4">
            {/* Header with back button */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-[12px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors -ml-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 -m-1.5 rounded-md hover:bg-[var(--editorial-border)] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
              </button>
            </div>

            {/* Trip info card */}
            <div className="p-3 rounded-lg bg-[var(--editorial-border)]/50 border border-[var(--editorial-border)]">
              <p className="text-[13px] font-medium text-[var(--editorial-text-primary)]">
                {activeTrip?.title || 'Trip'}
              </p>
              <p className="text-[11px] text-[var(--editorial-text-tertiary)] mt-0.5">
                {activeTrip?.days.reduce((sum, d) => sum + d.items.length, 0)} places · {daysCount} days
              </p>
            </div>

            {/* Day label */}
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] px-1">
              Select Day
            </p>

            {/* Day selector - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {days.map((day) => {
                const dayData = activeTrip?.days[day - 1];
                const itemCount = dayData?.items.length || 0;
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 min-w-[72px] px-4 py-3 rounded-lg text-center transition-all duration-200 ${
                      isSelected
                        ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] shadow-sm'
                        : 'border border-[var(--editorial-border)] text-[var(--editorial-text-secondary)] hover:border-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border)]/30'
                    }`}
                  >
                    <p className="text-[13px] font-medium">Day {day}</p>
                    <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-[var(--editorial-bg)]/70' : 'text-[var(--editorial-text-tertiary)]'}`}>
                      {itemCount} {itemCount === 1 ? 'place' : 'places'}
                    </p>
                  </button>
                );
              })}

              {/* Add new day button */}
              <button
                onClick={handleAddNewDay}
                className="flex-shrink-0 min-w-[72px] px-4 py-3 rounded-lg text-center border border-dashed border-[var(--editorial-text-tertiary)] text-[var(--editorial-text-tertiary)] hover:border-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-secondary)] transition-all duration-200"
              >
                <Plus className="w-4 h-4 mx-auto" />
                <p className="text-[10px] mt-1">New</p>
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={() => handleAddToDay(selectedDay)}
              disabled={isAdding}
              className="w-full py-3.5 rounded-lg bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] text-[14px] font-medium tracking-[0.02em] transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Day {selectedDay}
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-6 border-b border-[var(--editorial-border)]">
      <div
        ref={contentRef}
        className={`transition-all duration-200 ease-out ${
          isAnimating ? 'opacity-0 transform scale-[0.98]' : 'opacity-100 transform scale-100'
        }`}
      >
        {renderContent()}
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
});

export default InlineAddToTrip;
