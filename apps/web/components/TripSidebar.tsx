'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  MapPin,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useTrip } from '@/contexts/TripContext';
import { useRouter } from 'next/navigation';

interface TripSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TripSidebar({ isOpen, onClose }: TripSidebarProps) {
  const { trips, activeTrip, setActiveTrip, createTrip, deleteTrip } = useTrip();
  const router = useRouter();
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');

  const handleCreateTrip = async () => {
    if (!newTripName.trim() || !newTripDestination.trim()) return;
    try {
      await createTrip(newTripName, newTripDestination);
      setNewTripName('');
      setNewTripDestination('');
      setShowNewTrip(false);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
    }
  };

  const getIntelligence = () => {
    if (!activeTrip || activeTrip.locations.length === 0) return null;
    const categories = activeTrip.locations.reduce(
      (acc, loc) => {
        acc[loc.category] = (acc[loc.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const suggestions = [];
    if (!categories['Dining'] && !categories['Restaurant'] && !categories['Food']) {
      suggestions.push({
        type: 'missing',
        text: 'Consider adding dining experiences',
        icon: AlertCircle,
      });
    }
    if (activeTrip.locations.length > 5) {
      suggestions.push({
        type: 'optimize',
        text: 'Route optimization available',
        icon: TrendingUp,
      });
    }
    return suggestions;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-950 border-l border-neutral-200 dark:border-neutral-800 shadow-xl z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
            Your Trips
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-lg"
          >
            <X className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {trips.length === 0 && !showNewTrip ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 mb-2">
                No trips yet
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                Start collecting locations as you browse, then organize them into trips.
              </p>
              <button
                onClick={() => setShowNewTrip(true)}
                className="px-6 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all rounded-lg"
              >
                Create First Trip
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* New Trip Form */}
              {showNewTrip && (
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-gray-900 space-y-4 rounded-lg">
                  <input
                    type="text"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    placeholder="Trip name..."
                    className="w-full px-0 py-2 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTrip();
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newTripDestination}
                    onChange={(e) => setNewTripDestination(e.target.value)}
                    placeholder="Destination..."
                    className="w-full px-0 py-2 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTrip();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTrip}
                      className="flex-1 px-4 py-2 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all rounded-lg"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewTrip(false);
                        setNewTripName('');
                        setNewTripDestination('');
                      }}
                      className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs tracking-wide hover:border-neutral-900 dark:hover:border-neutral-100 transition-all rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Trip List */}
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setActiveTrip(trip.id)}
                  className={`w-full p-4 border text-left transition-all rounded-lg ${
                    activeTrip?.id === trip.id
                      ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-gray-900'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 mb-1">
                        {trip.name}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {trip.destination}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {trip.locations.length}
                    </span>
                  </div>
                  {trip.locations.length > 0 && (
                    <div className="flex -space-x-2">
                      {trip.locations.slice(0, 4).map((location) => (
                        <div
                          key={location.id}
                          className="w-8 h-8 border-2 border-white dark:border-gray-950 overflow-hidden bg-neutral-100 dark:bg-neutral-800 rounded-full"
                        >
                          <img
                            src={location.image}
                            alt={location.name}
                            className="w-full h-full object-cover grayscale-[20%]"
                          />
                        </div>
                      ))}
                      {trip.locations.length > 4 && (
                        <div className="w-8 h-8 border-2 border-white dark:border-gray-950 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center rounded-full">
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            +{trip.locations.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              ))}

              {/* Add Trip Button */}
              {!showNewTrip && (
                <button
                  onClick={() => setShowNewTrip(true)}
                  className="w-full p-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex items-center justify-center gap-2 rounded-lg"
                >
                  <Plus className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 tracking-wide">
                    New Trip
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Active Trip Details */}
          {activeTrip && (
            <div className="border-t border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
              <div>
                <h4 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-4">
                  Intelligence
                </h4>
                <div className="space-y-3">
                  {getIntelligence()?.map((suggestion, index) => {
                    const Icon = suggestion.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                      >
                        <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {suggestion.text}
                        </p>
                      </div>
                    );
                  })}
                  {activeTrip.locations.length === 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Add locations to see intelligent suggestions
                    </p>
                  )}
                </div>
              </div>

              {/* Locations */}
              {activeTrip.locations.length > 0 && (
                <div>
                  <h4 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-4">
                    Locations ({activeTrip.locations.length})
                  </h4>
                  <div className="space-y-2">
                    {activeTrip.locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center gap-3 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <div className="w-10 h-10 flex-shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                          <img
                            src={location.image}
                            alt={location.name}
                            className="w-full h-full object-cover grayscale-[20%]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-normal text-neutral-900 dark:text-neutral-100 truncate">
                            {location.name}
                          </h5>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {location.category}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    router.push(`/trips/${activeTrip.id}`);
                    onClose();
                  }}
                  className="w-full px-4 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 rounded-lg"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  View Full Itinerary
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete "${activeTrip.name}"?`)) {
                      try {
                        await deleteTrip(activeTrip.id);
                      } catch (error) {
                        console.error('Error deleting trip:', error);
                        alert('Failed to delete trip. Please try again.');
                      }
                    }
                  }}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs tracking-wide hover:border-red-500 dark:hover:border-red-500 hover:text-red-500 dark:hover:text-red-400 transition-all rounded-lg"
                >
                  Delete Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}



