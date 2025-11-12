'use client';

import React, { useState, useEffect } from 'react';
import {
  XIcon,
  SearchIcon,
  DollarSignIcon,
  ClockIcon,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  slug?: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface AddLocationToTripProps {
  onAdd: (location: TripLocation) => void;
  onClose: () => void;
}

export function AddLocationToTrip({
  onAdd,
  onClose,
}: AddLocationToTripProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<
    'breakfast' | 'lunch' | 'dinner' | 'snack' | ''
  >('');

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchDestinations();
    } else {
      setDestinations([]);
    }
  }, [searchQuery]);

  const searchDestinations = async () => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('destinations')
        .select('*')
        .or(
          `name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
        )
        .limit(20);

      if (error) throw error;
      setDestinations((data || []) as Destination[]);
    } catch (error) {
      console.error('Error searching destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = (destination: Destination) => {
    setSelectedDestination(destination);
  };

  const handleAddLocation = () => {
    if (!selectedDestination) return;
    onAdd({
      id: selectedDestination.id || 0,
      name: selectedDestination.name,
      city: selectedDestination.city || '',
      category: selectedDestination.category || '',
      image: selectedDestination.image || '/placeholder-image.jpg',
      slug: selectedDestination.slug,
      time: selectedTime,
      cost: estimatedCost,
      duration,
      notes,
      mealType: mealType || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-950 w-full max-w-3xl max-h-[85vh] overflow-hidden border border-neutral-200 dark:border-neutral-800 flex">
        {/* Left side - Location selection */}
        <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 flex items-center justify-between flex-shrink-0">
            <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
              Select Location
            </h3>
          </div>
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
            <div className="relative">
              <SearchIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved locations..."
                className="w-full pl-8 pr-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400 dark:text-neutral-500" />
              </div>
            ) : destinations.length === 0 && searchQuery.trim().length >= 2 ? (
              <div className="text-center py-12">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No destinations found
                </p>
              </div>
            ) : destinations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  Start typing to search destinations
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {destinations.map((destination) => (
                  <button
                    key={destination.slug}
                    onClick={() => handleSelectDestination(destination)}
                    className={`w-full flex items-center gap-4 p-3 border transition-colors text-left ${
                      selectedDestination?.slug === destination.slug
                        ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/50'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-100'
                    }`}
                  >
                    {destination.image && (
                      <div className="w-14 h-14 flex-shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        <img
                          src={destination.image}
                          alt={destination.name}
                          className="w-full h-full object-cover grayscale-[20%]"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 truncate mb-1">
                        {destination.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                          {destination.category}
                        </span>
                        {destination.city && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">•</span>
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              {destination.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Details */}
        <div className="w-1/2 flex flex-col">
          <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 flex items-center justify-between flex-shrink-0">
            <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
              Add Details
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <XIcon className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedDestination ? (
              <>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    value={estimatedCost || ''}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Meal Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setMealType(type as any)}
                        className={`px-3 py-2 text-xs border transition-colors ${
                          mealType === type
                            ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                            : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reservation needed, try the signature dish..."
                    rows={3}
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors resize-none"
                  />
                </div>
                <button
                  onClick={handleAddLocation}
                  className="w-full px-6 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all"
                >
                  Add to Trip
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  Select a location to add details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
