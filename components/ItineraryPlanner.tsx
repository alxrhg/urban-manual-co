'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  WalletIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
  X,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';
import { TripShareModal } from './TripShareModal';
import { Drawer } from './ui/Drawer';
import type { Itinerary as ItinerarySchema, ItineraryItem, ItineraryDay as ItineraryDaySchema } from '@/types/common';

interface ItineraryPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string; // If provided, load existing trip
}

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  duration?: number;
}

interface DayItinerary {
  id: string;
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

export function ItineraryPlanner({ isOpen, onClose, tripId }: ItineraryPlannerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [showAddLocation, setShowAddLocation] = useState<number | null>(null);
  const [step, setStep] = useState<'create' | 'plan'>('create');
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [showShare, setShowShare] = useState(false);
  const [hotelLocation, setHotelLocation] = useState('');
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const toast = useToast();

  // Load existing trip if tripId is provided
  useEffect(() => {
    if (isOpen && tripId && user) {
      loadTrip(tripId);
    } else if (isOpen && !tripId) {
      // Reset form for new trip
      resetForm();
    }
  }, [isOpen, tripId, user]);

  // Body scroll is handled by Drawer component

  const resetForm = () => {
    setTripName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setTotalBudget(0);
    setHotelLocation('');
    setStep('create');
    setCurrentTripId(null);
    setCoverImage(null);
    setCoverImageFile(null);
    setCoverImagePreview(null);
  };

  const loadTrip = async (id: string) => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      // Load trip
      const { data: trip, error: tripError } = await supabaseClient
        .from('itineraries')
        .select('*, itinerary_days(*), itinerary_items(*)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        console.error('Error loading trip:', tripError);
        alert('Failed to load trip');
        return;
      }

      const tripData = trip as any;

      setTripName(tripData.name);
      setDestination(tripData.description || '');
      setStartDate(tripData.start_date || '');
      setEndDate(tripData.end_date || '');
      setCurrentTripId(tripData.id);
      setCoverImage(tripData.cover_image || null);
      setHotelLocation(tripData.hotel || '');
      setTotalBudget(tripData.budget || 0);

      const loadedDays = tripData.itinerary_days.map((day: any) => ({
        id: day.id,
        date: day.date,
        locations: tripData.itinerary_items
          .filter((item: any) => item.itinerary_day_id === day.id)
          .map((item: any) => ({
            id: item.id,
            name: item.destination_slug, // This should be resolved to a full destination object
            city: '',
            category: '',
            image: '',
            time: item.start_time,
            notes: item.notes,
          })),
      }));

      setDays(loadedDays);
      setStep('plan');
    } catch (error) {
      console.error('Error loading trip:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!tripName || !destination || !startDate || !endDate || !user) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Create trip in database
      const { data: trip, error: tripError } = await supabaseClient
        .from('itineraries')
        .insert({
          name: tripName,
          description: destination,
          start_date: startDate,
          end_date: endDate,
          user_id: user.id,
          hotel: hotelLocation,
          budget: totalBudget,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      setCurrentTripId(trip.id);

      // Create days array
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayCount =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const newDays: DayItinerary[] = [];

      for (let i = 0; i < dayCount; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        newDays.push({
          id: '', // Will be set on save
          date: date.toISOString().split('T')[0],
          locations: [],
          budget: 0,
        });
      }

      setDays(newDays);
      setStep('plan');
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert(error?.message || 'Failed to create trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!currentTripId || !user) {
      alert('No trip to save');
      return;
    }

    setSaving(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      let coverImageUrl = coverImage;
      if (coverImageFile) {
        setUploadingCover(true);
        const { data, error } = await supabaseClient.storage
          .from('trip-covers')
          .upload(`${user.id}/${currentTripId}/${coverImageFile.name}`, coverImageFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabaseClient.storage.from('trip-covers').getPublicUrl(data.path);
        coverImageUrl = publicUrl;
        setUploadingCover(false);
      }

      // Update trip
      const { error: tripError } = await supabaseClient
        .from('itineraries')
        .update({
          name: tripName,
          description: destination,
          start_date: startDate,
          end_date: endDate,
          cover_image: coverImageUrl,
          hotel: hotelLocation,
          budget: totalBudget,
        })
        .eq('id', currentTripId)
        .eq('user_id', user.id);

      if (tripError) throw tripError;

      // Delete all existing itinerary days and items
      const { error: deleteDaysError } = await supabaseClient
        .from('itinerary_days')
        .delete()
        .eq('itinerary_id', currentTripId);

      if (deleteDaysError) throw deleteDaysError;

      // Create itinerary days
      const daysToInsert = days.map((day, index) => ({
        itinerary_id: currentTripId,
        day_number: index + 1,
        date: day.date,
        notes: day.notes,
      }));

      const { data: newDays, error: insertDaysError } = await supabaseClient
        .from('itinerary_days')
        .insert(daysToInsert)
        .select();

      if (insertDaysError) throw insertDaysError;

      // Insert all itinerary items
      const itemsToInsert: Array<Partial<ItineraryItem>> = [];
      days.forEach((day, dayIndex) => {
        day.locations.forEach((location, locationIndex) => {
          itemsToInsert.push({
            itinerary_day_id: (newDays as ItineraryDaySchema[])[dayIndex].id,
            destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
            start_time: location.time,
            notes: location.notes,
            position: locationIndex,
          });
        });
      });

      if (itemsToInsert.length > 0) {
        const { error: insertItemsError } = await supabaseClient
          .from('itinerary_items')
          .insert(itemsToInsert);

        if (insertItemsError) throw insertItemsError;
      }

      const saveButton = document.querySelector('[title="Save trip"]') as HTMLButtonElement;
      if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.disabled = true;
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.disabled = false;
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error saving trip:', error);
      alert(error?.message || 'Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (dayIndex: number, location: TripLocation) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations: [...day.locations, location],
            }
          : day
      )
    );
    setShowAddLocation(null);

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  const handleRemoveLocation = async (dayIndex: number, locationId: number) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations: day.locations.filter((loc) => loc.id !== locationId),
            }
          : day
      )
    );

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  const handleReorderLocations = async (
    dayIndex: number,
    locations: TripLocation[]
  ) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations,
            }
          : day
      )
    );

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  const handleDuplicateDay = (dayIndex: number) => {
    const dayToDuplicate = days[dayIndex];
    const newDay = {
      ...dayToDuplicate,
      date: new Date(new Date(dayToDuplicate.date).getTime() + 86400000)
        .toISOString()
        .split('T')[0],
      locations: dayToDuplicate.locations.map((loc) => ({
        ...loc,
        id: Date.now() + Math.random(),
      })),
    };
    setDays((prev) => [
      ...prev.slice(0, dayIndex + 1),
      newDay,
      ...prev.slice(dayIndex + 1),
    ]);
  };

  const handleOptimizeRoute = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const optimized = [...day.locations].sort((a, b) => {
          if (a.time && b.time) {
            return a.time.localeCompare(b.time);
          }
          if (a.time && !b.time) return -1;
          if (!a.time && b.time) return 1;
          return 0;
        });
        return {
          ...day,
          locations: optimized,
        };
      })
    );
  };

  const handleExportToCalendar = () => {
    let icsContent =
      'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Urban Manual//Itinerary Planner//EN\n';

    days.forEach((day) => {
      day.locations.forEach((location) => {
        const date = day.date.replace(/-/g, '');
        const time = location.time?.replace(':', '') || '0900';
        icsContent += `BEGIN:VEVENT\n`;
        icsContent += `DTSTART:${date}T${time}00\n`;
        icsContent += `SUMMARY:${location.name}\n`;
        icsContent += `LOCATION:${location.city}\n`;
        icsContent += `DESCRIPTION:${location.category}\n`;
        icsContent += `END:VEVENT\n`;
      });
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], {
      type: 'text/calendar',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tripName.replace(/\s+/g, '_')}.ics`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const getAISuggestions = () => {
    return [
      'Consider adding a morning cafe visit before the museum',
      'Your dinner reservation is 2km from your last location - allow 30 min travel time',
      'Weather forecast shows rain on Day 3 - indoor activities recommended',
    ];
  };

  const headerContent = step === 'plan' ? (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">{tripName}</h2>
      </div>
      <div className="flex items-center gap-2">
        {currentTripId && (
          <button
            onClick={handleSaveTrip}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save trip"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="w-3 h-3" />
                Save
              </>
            )}
          </button>
        )}
        <button
          onClick={() => setShowShare(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Share trip"
        >
          <ShareIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={handleExportToCalendar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Export to calendar"
        >
          <DownloadIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={handlePrint}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Print itinerary"
        >
          <PrinterIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  ) : undefined;

  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip...</p>
        </div>
      ) : step === 'create' ? (
        <div className="space-y-6">
          <div>
            <label htmlFor="trip-name" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Itinerary Name *
            </label>
            <input
              id="trip-name"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Summer in Paris"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            />
          </div>

          <div>
            <label htmlFor="destination" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Destination *
            </label>
            <input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Paris, France"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            />
          </div>

          <div>
            <label htmlFor="hotel" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Hotel / Base Location
            </label>
            <input
              id="hotel"
              type="text"
              value={hotelLocation}
              onChange={(e) => setHotelLocation(e.target.value)}
              placeholder="Hotel Le Marais"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Start Date *
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                End Date *
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="budget" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Total Budget
            </label>
            <input
              id="budget"
              type="number"
              value={totalBudget || ''}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
              placeholder="2000"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
            />
          </div>

          <button
            onClick={handleCreateTrip}
            disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
            className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Itinerary'
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {/* Cover Image Upload */}
              <div className="mb-6">
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Cover Image
                </label>
                <div className="space-y-3">
                  {(coverImage || coverImagePreview) && (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={coverImagePreview || coverImage || ''}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 600px"
                      />
                      <button
                        onClick={() => {
                          setCoverImage(null);
                          setCoverImageFile(null);
                          setCoverImagePreview(null);
                          const input = document.getElementById('cover-image-input') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        aria-label="Remove cover image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div>
                    <input
                      id="cover-image-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCoverImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="cover-image-input"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm font-medium"
                    >
                      {uploadingCover ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          {coverImage || coverImagePreview ? 'Change Cover Image' : 'Upload Cover Image'}
                        </>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload a custom cover image, or we'll use the first location's image
                  </p>
                </div>
              </div>

              {/* Trip Overview */}
              <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-6">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{destination}</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <CalendarIcon className="w-4 h-4" />
                  <span>
                    {new Date(startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    –{' '}
                    {new Date(endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {/* AI Suggestions */}
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Smart Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {getAISuggestions().map((suggestion, index) => (
                      <li
                        key={index}
                        className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
                      >
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Days */}
              <div className="space-y-12">
                {days.map((day, index) => (
                  <TripDay
                    key={day.date}
                    dayNumber={index + 1}
                    date={day.date}
                    locations={day.locations}
                    hotelLocation={hotelLocation}
                    onAddLocation={() => setShowAddLocation(index)}
                    onRemoveLocation={(locationId) =>
                      handleRemoveLocation(index, locationId)
                    }
                    onReorderLocations={(locations) =>
                      handleReorderLocations(index, locations)
                    }
                    onDuplicateDay={() => handleDuplicateDay(index)}
                    onOptimizeRoute={() => handleOptimizeRoute(index)}
                  />
                ))}
              </div>
            </div>

        </>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={step === 'create' ? 'Create Itinerary' : undefined}
        headerContent={headerContent}
        desktopWidth="600px"
      >
        {content}
      </Drawer>

      {showAddLocation !== null && (
        <AddLocationToTrip
          onAdd={(location) => handleAddLocation(showAddLocation, location)}
          onClose={() => setShowAddLocation(null)}
        />
      )}

      {showShare && (
        <TripShareModal
          tripName={tripName}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
