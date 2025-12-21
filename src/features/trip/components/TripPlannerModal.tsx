'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Plus, MapPin, Calendar, ChevronLeft, Loader2, Search, GripVertical } from 'lucide-react';
import { useTripBuilder, SavedTripSummary } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * TripPlannerModal - Unified Trip Planner
 *
 * A single modal that provides access to all trip functionality:
 * - List view: Browse and manage all saved trips
 * - Editor view: Edit the current active trip
 *
 * This replaces the fragmented experience of:
 * - Header "Trips" button → /trips page
 * - NavigationBar "Create Trip" → /trips/[id]
 * - Floating widget → inline panel
 */
const TripPlannerModal = memo(function TripPlannerModal() {
  const { user } = useAuth();
  const {
    isModalOpen,
    modalMode,
    closeModal,
    setModalMode,
    savedTrips,
    activeTrip,
    isLoadingTrips,
    startTrip,
    loadTrip,
    clearTrip,
    removeFromTrip,
    totalItems,
    saveTrip,
  } = useTripBuilder();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [isCreating, setIsCreating] = useState(false);

  // Reset search when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSearchTerm('');
    }
  }, [isModalOpen]);

  // Handle creating a new trip
  const handleCreateTrip = useCallback(async () => {
    setIsCreating(true);
    try {
      startTrip('New Trip', 1);
      setModalMode('editor');
    } finally {
      setIsCreating(false);
    }
  }, [startTrip, setModalMode]);

  // Handle selecting a trip from the list
  const handleSelectTrip = useCallback(async (tripId: string) => {
    await loadTrip(tripId);
    setModalMode('editor');
  }, [loadTrip, setModalMode]);

  // Handle going back to list view
  const handleBackToList = useCallback(() => {
    setModalMode('list');
  }, [setModalMode]);

  // Filter trips based on search and tab
  const filteredTrips = savedTrips.filter(trip => {
    // Search filter
    if (searchTerm && !trip.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Tab filter
    if (activeTab === 'upcoming') {
      if (!trip.start_date) return false;
      return new Date(trip.start_date) >= new Date();
    }
    if (activeTab === 'past') {
      if (!trip.end_date) return false;
      return new Date(trip.end_date) < new Date();
    }

    return true;
  });

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:max-h-[80vh] z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {modalMode === 'list' ? (
          <TripListView
            trips={filteredTrips}
            isLoading={isLoadingTrips}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectTrip={handleSelectTrip}
            onCreateTrip={handleCreateTrip}
            onClose={closeModal}
            isCreating={isCreating}
            isLoggedIn={!!user}
          />
        ) : (
          <TripEditorView
            trip={activeTrip}
            totalItems={totalItems}
            onBack={handleBackToList}
            onClose={closeModal}
            onRemoveItem={removeFromTrip}
            onSave={saveTrip}
            onClear={clearTrip}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Trip List View - Shows all saved trips
 */
function TripListView({
  trips,
  isLoading,
  searchTerm,
  onSearchChange,
  activeTab,
  onTabChange,
  onSelectTrip,
  onCreateTrip,
  onClose,
  isCreating,
  isLoggedIn,
}: {
  trips: SavedTripSummary[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeTab: 'all' | 'upcoming' | 'past';
  onTabChange: (tab: 'all' | 'upcoming' | 'past') => void;
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onClose: () => void;
  isCreating: boolean;
  isLoggedIn: boolean;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Trips</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trips..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border-0 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {(['all', 'upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-2">Sign in to save trips</p>
            <p className="text-xs text-gray-400">Your trips will be synced across devices</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm ? 'No trips found' : 'No trips yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={onCreateTrip}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create your first trip
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onSelect={() => onSelectTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Create button */}
      {isLoggedIn && trips.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onCreateTrip}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Trip
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Trip Card - Individual trip in the list
 */
function TripCard({
  trip,
  onSelect,
}: {
  trip: SavedTripSummary;
  onSelect: () => void;
}) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const startDate = formatDate(trip.start_date);
  const endDate = formatDate(trip.end_date);
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : startDate || 'No dates';

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
    >
      {/* Cover image */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {trip.cover_image ? (
          <Image
            src={trip.cover_image}
            alt=""
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Trip info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {trip.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">
          {trip.destination || 'No destination'}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateRange}
          </span>
          <span>·</span>
          <span>{trip.itemCount} {trip.itemCount === 1 ? 'place' : 'places'}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          trip.status === 'planning'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : trip.status === 'completed'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {trip.status}
        </span>
      </div>
    </button>
  );
}

/**
 * Trip Editor View - Edit the current active trip
 */
function TripEditorView({
  trip,
  totalItems,
  onBack,
  onClose,
  onRemoveItem,
  onSave,
  onClear,
}: {
  trip: any;
  totalItems: number;
  onBack: () => void;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onSave: () => Promise<string | null>;
  onClear: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  // Flatten all items across days for simple list view
  const allItems = trip?.days?.flatMap((day: any) =>
    day.items.map((item: any) => ({
      ...item,
      dayNumber: day.dayNumber,
      dayDate: day.date,
    }))
  ) || [];

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Back to trips"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {trip?.title || 'New Trip'}
              </h2>
              <p className="text-xs text-gray-400">
                {totalItems} {totalItems === 1 ? 'place' : 'places'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Add places while browsing
            </p>
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
            >
              Browse destinations
            </button>
          </div>
        ) : (
          <div className="pb-6">
            {trip?.days?.map((day: any) => (
              <div key={day.dayNumber}>
                {/* Day header */}
                <div className="px-5 py-2 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    Day {day.dayNumber}
                    {day.date && (
                      <span className="ml-2 font-normal normal-case">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </span>
                </div>

                {/* Items */}
                <div className="px-3">
                  {day.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg group hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      {/* Time */}
                      <span className="w-10 text-[11px] text-gray-400 text-center flex-shrink-0">
                        {item.timeSlot || '—'}
                      </span>

                      {/* Image */}
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {item.destination?.image ? (
                          <Image
                            src={item.destination.image_thumbnail || item.destination.image}
                            alt=""
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <span className="flex-1 text-[13px] text-gray-900 dark:text-white truncate">
                        {item.destination?.name}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 cursor-grab">
                          <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5"
                        >
                          <X className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {totalItems > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          <button
            onClick={onClear}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Save Trip
          </button>
        </div>
      )}
    </>
  );
}

export default TripPlannerModal;
