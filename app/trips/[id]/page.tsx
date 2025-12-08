'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, X, Search, Loader2, ChevronDown, Check, ImagePlus, Route, Plus, Pencil, Car, Footprints, Train as TrainIcon, Globe, Phone, ExternalLink, Navigation, Clock, GripVertical, Square, CheckSquare, CloudRain, Sparkles, Plane, Hotel, Coffee, DoorOpen, LogOut, UtensilsCrossed, Sun, CloudSun, Cloud, Umbrella, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { parseDestinations, stringifyDestinations, parseTripNotes, stringifyTripNotes, type TripNoteItem } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
import { PageLoader } from '@/components/LoadingStates';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';

// Weather type
interface DayWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  description: string;
  precipProbability: number;
}

/**
 * TripPage - Completely rethought
 *
 * Philosophy:
 * - No sidebars - everything inline
 * - No buttons - things just work
 * - No forms - just type and select
 * - No modes - edit is default
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();

  const {
    trip,
    days,
    loading,
    updateTrip,
    reorderItems,
    removeItem,
    updateItemTime,
    updateItemNotes,
    updateItem,
    moveItemToDay,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // Expanded states
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showTripNotes, setShowTripNotes] = useState(false);

  // Weather state
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeather>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ id: string; text: string; type: string; destinationId?: number }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  // Count total items
  const totalItems = useMemo(() => {
    return days.reduce((sum, day) => sum + day.items.length, 0);
  }, [days]);

  // Auto-fix items on wrong days
  const hasAutoFixed = useRef(false);
  useEffect(() => {
    if (loading || !trip?.start_date || days.length === 0 || hasAutoFixed.current) return;
    const total = days.reduce((sum, day) => sum + day.items.length, 0);
    if (total === 0) return;

    for (const day of days) {
      for (const item of day.items) {
        const dateToCheck = item.parsedNotes?.checkInDate || item.parsedNotes?.departureDate;
        if (dateToCheck) {
          const targetDay = calculateDayNumberFromDate(trip.start_date, trip.end_date, dateToCheck);
          if (targetDay !== null && targetDay !== day.dayNumber) {
            moveItemToDay(item.id, targetDay);
          }
        }
      }
    }
    hasAutoFixed.current = true;
  }, [loading, trip?.start_date, trip?.end_date, days, moveItemToDay]);

  // Fetch weather for trip dates
  useEffect(() => {
    if (!trip?.start_date || !primaryCity || weatherLoading) return;
    if (Object.keys(weatherByDate).length > 0) return; // Already fetched

    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        // Get city coordinates (simplified - could use geocoding API)
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(primaryCity)}&count=1`
        );
        const geoData = await geoResponse.json();
        if (!geoData.results?.[0]) return;

        const { latitude, longitude } = geoData.results[0];

        // Fetch weather forecast
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=14`
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.daily) {
          const weatherMap: Record<string, DayWeather> = {};
          const getDescription = (code: number) => {
            const codes: Record<number, string> = {
              0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
              45: 'Foggy', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain',
              65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 80: 'Rain showers',
              95: 'Thunderstorm'
            };
            return codes[code] || 'Unknown';
          };

          weatherData.daily.time.forEach((date: string, i: number) => {
            weatherMap[date] = {
              date,
              tempMax: Math.round(weatherData.daily.temperature_2m_max[i]),
              tempMin: Math.round(weatherData.daily.temperature_2m_min[i]),
              weatherCode: weatherData.daily.weather_code[i],
              description: getDescription(weatherData.daily.weather_code[i]),
              precipProbability: weatherData.daily.precipitation_probability_max[i] || 0,
            };
          });
          setWeatherByDate(weatherMap);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [trip?.start_date, primaryCity, weatherLoading, weatherByDate]);

  // Fetch AI suggestions
  useEffect(() => {
    if (!trip || !primaryCity || suggestionsLoading || aiSuggestions.length > 0) return;

    const fetchSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const response = await fetch('/api/intelligence/smart-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: primaryCity,
            existingItems: days.flatMap(d => d.items.map(i => i.title)),
            tripDays: days.length,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.suggestions && Array.isArray(data.suggestions)) {
            const parsed = data.suggestions.slice(0, 3).map((s: any, i: number) => {
              // Handle smart-fill API format: { destination: { name, ... }, reason, timeSlot }
              let text = '';
              let category = 'suggestion';

              if (typeof s === 'string') {
                text = s;
              } else if (s && typeof s === 'object') {
                // Check for nested destination object (smart-fill format)
                if (s.destination && typeof s.destination === 'object') {
                  text = s.destination.name || '';
                  category = s.destination.category || s.timeSlot || 'suggestion';
                } else {
                  // Flat format fallback
                  text = s.name || s.text || s.title || '';
                  category = s.category || 'suggestion';
                }
              }

              return {
                id: `suggestion-${i}`,
                text: String(text).slice(0, 40),
                type: String(category).toLowerCase(),
                destinationId: s?.destination?.id,
              };
            }).filter((s: any) => s.text && s.text.length > 0);
            setAiSuggestions(parsed);
          }
        }
      } catch (err) {
        // Silently fail - suggestions are optional
        console.error('Suggestions fetch error:', err);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    // Delay to avoid too many requests
    const timer = setTimeout(fetchSuggestions, 1000);
    return () => clearTimeout(timer);
  }, [trip, primaryCity, days, suggestionsLoading, aiSuggestions.length]);

  // Toggle item expansion
  const toggleItem = useCallback((itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  }, []);

  // Handle trip deletion
  const handleDelete = useCallback(async () => {
    if (!user || !trip) return;
    const supabase = createClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', trip.id)
      .eq('user_id', user.id);

    if (!error) {
      router.push('/trips');
    }
  }, [user, trip, router]);

  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-xl mx-auto"><PageLoader /></div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
          <Link href="/trips" className="text-gray-900 dark:text-white hover:opacity-70">Back to trips</Link>
        </div>
      </main>
    );
  }

  // Parse trip notes
  const tripNotes = trip.notes || '';

  return (
    <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-xl mx-auto">
        {/* Back link */}
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Trips
        </Link>

        {/* Header - tap to edit */}
        <TripHeader
          trip={trip}
          primaryCity={primaryCity}
          totalItems={totalItems}
          userId={user?.id}
          onUpdate={updateTrip}
          onDelete={handleDelete}
        />

        {/* Trip Notes - expandable */}
        <div className="mt-4">
          <button
            onClick={() => setShowTripNotes(!showTripNotes)}
            className="text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {tripNotes ? 'View checklist' : 'Add checklist'}
            <ChevronDown className={`inline w-3 h-3 ml-1 transition-transform ${showTripNotes ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showTripNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <TripNotesChecklist
                  notes={tripNotes}
                  onSave={(notes) => updateTrip({ notes })}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Suggestions Section */}
        {aiSuggestions.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] font-medium text-gray-600 dark:text-gray-300">Suggestions for your trip</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                >
                  <span className="text-[13px] text-gray-700 dark:text-gray-200">{suggestion.text}</span>
                  <Plus className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Days */}
        <div className="mt-8 space-y-8">
          {days.map((day) => {
            const dayDate = day.date;
            const weather = dayDate ? weatherByDate[dayDate] : undefined;
            return (
              <DaySection
                key={day.dayNumber}
                tripId={tripId}
                dayNumber={day.dayNumber}
                date={day.date ?? undefined}
                items={day.items}
                city={primaryCity}
                tripStartDate={trip.start_date}
                tripEndDate={trip.end_date}
                expandedItemId={expandedItemId}
                onToggleItem={toggleItem}
                onReorder={(items) => reorderItems(day.dayNumber, items)}
                onRemove={removeItem}
                onUpdateItem={updateItem}
                onUpdateTime={updateItemTime}
                onRefresh={refresh}
                weather={weather}
              />
            );
          })}
        </div>

        {/* Empty state */}
        {totalItems === 0 && days.length > 0 && (
          <p className="text-center text-[13px] text-gray-400 mt-8">
            Type in any day to add places, flights, hotels, or trains
          </p>
        )}
      </div>
    </main>
  );
}

/**
 * Trip header with inline editing - includes cover, destination, delete
 */
function TripHeader({
  trip,
  primaryCity,
  totalItems,
  userId,
  onUpdate,
  onDelete,
}: {
  trip: { id: string; title: string; start_date?: string | null; end_date?: string | null; destination?: string | null; cover_image?: string | null };
  primaryCity: string;
  totalItems: number;
  userId?: string;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.start_date || '');
  const [endDate, setEndDate] = useState(trip.end_date || '');
  const [destination, setDestination] = useState(primaryCity);
  const [coverImage, setCoverImage] = useState(trip.cover_image || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdate({
      title,
      start_date: startDate || null,
      end_date: endDate || null,
      destination: destination || null,
      cover_image: coverImage || null,
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSave();
    if (e.key === 'Escape') {
      setTitle(trip.title);
      setStartDate(trip.start_date || '');
      setEndDate(trip.end_date || '');
      setDestination(primaryCity);
      setCoverImage(trip.cover_image || '');
      setIsEditing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    try {
      setUploadingImage(true);
      const supabase = createClient();
      if (!supabase) return;

      const ext = file.name.split('.').pop();
      const filename = `${trip.id}-${Date.now()}.${ext}`;
      const filePath = `trip-covers/${userId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setCoverImage(urlData.publicUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Format date display
  const dateDisplay = useMemo(() => {
    if (!trip.start_date) return 'No dates';
    const start = new Date(trip.start_date);
    const end = trip.end_date ? new Date(trip.end_date) : start;
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [trip.start_date, trip.end_date]);

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Cover image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {coverImage ? (
          <div className="relative aspect-[3/1] rounded-xl overflow-hidden group">
            <Image src={coverImage} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white/90 text-gray-900 text-xs font-medium rounded-full"
              >
                Change
              </button>
              <button
                onClick={() => setCoverImage('')}
                className="px-3 py-1.5 bg-gray-900/90 text-white text-xs font-medium rounded-full"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full aspect-[4/1] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
          >
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            <span className="text-xs">Add cover</span>
          </button>
        )}

        {/* Title */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-[22px] font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white outline-none pb-1"
          placeholder="Trip name"
        />

        {/* Destination */}
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-[14px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none"
          placeholder="Destination city"
        />

        {/* Dates */}
        <div className="flex gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onKeyDown={handleKeyDown}
            min={startDate}
            className="flex-1 text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-[13px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              onClick={() => {
                setTitle(trip.title);
                setStartDate(trip.start_date || '');
                setEndDate(trip.end_date || '');
                setDestination(primaryCity);
                setCoverImage(trip.cover_image || '');
                setIsEditing(false);
                setShowDeleteConfirm(false);
              }}
              className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Delete trip?</span>
              <button onClick={onDelete} className="text-[11px] text-red-500 font-medium">Yes</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-[11px] text-gray-500">No</button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
            >
              Delete trip
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer group">
      {/* Cover image */}
      {trip.cover_image && (
        <div className="aspect-[3/1] rounded-xl overflow-hidden mb-4 group-hover:opacity-90 transition-opacity">
          <Image src={trip.cover_image} alt="" width={600} height={200} className="w-full h-full object-cover" />
        </div>
      )}

      <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white group-hover:opacity-70 transition-opacity">
        {trip.title}
      </h1>
      <p className="text-[13px] text-gray-400 group-hover:opacity-70 transition-opacity">
        {[primaryCity, dateDisplay, `${totalItems} ${totalItems === 1 ? 'place' : 'places'}`].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

/**
 * Trip notes checklist with drag-drop and progress tracking
 */
function TripNotesChecklist({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const parsed = parseTripNotes(notes);
  const [items, setItems] = useState<TripNoteItem[]>(parsed.items);
  const [newItemText, setNewItemText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count completed checkboxes
  const checkboxItems = items.filter(i => i.type === 'checkbox');
  const completedCount = checkboxItems.filter(i => i.checked).length;
  const totalCheckboxes = checkboxItems.length;

  // Generate unique ID
  const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Toggle checkbox
  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
    setHasChanges(true);
  };

  // Add new item
  const addItem = (type: 'checkbox' | 'text' = 'checkbox') => {
    if (!newItemText.trim()) return;
    const newItem: TripNoteItem = {
      id: generateId(),
      type,
      content: newItemText.trim(),
      ...(type === 'checkbox' ? { checked: false } : {}),
    };
    setItems(prev => [...prev, newItem]);
    setNewItemText('');
    setHasChanges(true);
    inputRef.current?.focus();
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setHasChanges(true);
  };

  // Save changes
  const handleSave = () => {
    onSave(stringifyTripNotes({ items }));
    setHasChanges(false);
  };

  // Handle key press on input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItem('checkbox');
    }
  };

  // Handle reorder
  const handleReorder = (newItems: TripNoteItem[]) => {
    setItems(newItems);
    setHasChanges(true);
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Progress indicator */}
      {totalCheckboxes > 0 && (
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / totalCheckboxes) * 100}%` }}
            />
          </div>
          <span className={completedCount === totalCheckboxes ? 'text-green-500' : 'text-gray-400'}>
            {completedCount}/{totalCheckboxes} done
          </span>
        </div>
      )}

      {/* Checklist items */}
      {items.length > 0 && (
        <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-1">
          {items.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                {/* Drag handle */}
                <GripVertical className="w-3 h-3 text-gray-300 dark:text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

                {/* Checkbox or text indicator */}
                {item.type === 'checkbox' ? (
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-green-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  </div>
                )}

                {/* Content */}
                <span className={`flex-1 text-[13px] ${
                  item.type === 'checkbox' && item.checked
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {item.content}
                </span>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Add new item */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add checklist item..."
          className="flex-1 px-3 py-2 text-[13px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
        />
        <button
          onClick={() => addItem('checkbox')}
          disabled={!newItemText.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          className="text-[11px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white px-3 py-1.5 rounded-full flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> Save checklist
        </button>
      )}
    </div>
  );
}

/**
 * Day section with items and smart search
 */
function DaySection({
  tripId,
  dayNumber,
  date,
  items,
  city,
  tripStartDate,
  tripEndDate,
  expandedItemId,
  onToggleItem,
  onReorder,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onRefresh,
  weather,
}: {
  tripId: string;
  dayNumber: number;
  date?: string;
  items: EnrichedItineraryItem[];
  city: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  expandedItemId: string | null;
  onToggleItem: (id: string) => void;
  onReorder: (items: EnrichedItineraryItem[]) => void;
  onRemove: (id: string) => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onRefresh: () => void;
  weather?: DayWeather;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchSource, setSearchSource] = useState<'curated' | 'google'>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [googleResults, setGoogleResults] = useState<Array<{ id: string; name: string; formatted_address: string; latitude?: number; longitude?: number; category?: string; image?: string; rating?: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState<'flight' | 'hotel' | 'train' | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Check if route could be optimized (items with coords not in optimal order)
  const canOptimize = useMemo(() => {
    if (items.length < 3) return false;
    const withCoords = items.filter(i =>
      (i.destination?.latitude && i.destination?.longitude) ||
      (i.parsedNotes?.latitude && i.parsedNotes?.longitude)
    );
    return withCoords.length >= 3;
  }, [items]);

  // Search destinations (curated or Google)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setGoogleResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchSource === 'curated') {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchQuery} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || data.destinations || []);
            setGoogleResults([]);
          }
        } else {
          // Google Places search
          const response = await fetch('/api/google-places-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${searchQuery} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setGoogleResults(data.places || []);
            setSearchResults([]);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, city, searchSource]);

  // Add destination
  const addDestination = async (destination: Destination) => {
    setIsAdding(true);
    try {
      const existingTimes = items.map(i => i.time).filter(Boolean).sort();
      let suggestedTime = '12:00';

      if (existingTimes.length > 0) {
        const lastTime = existingTimes[existingTimes.length - 1]!;
        const [h, m] = lastTime.split(':').map(Number);
        const newHour = Math.min(h + 2, 22);
        suggestedTime = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      await fetch(`/api/trips/${tripId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_slug: destination.slug,
          day_number: dayNumber,
          time: suggestedTime,
          title: destination.name,
        }),
      });

      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
      onRefresh();
    } catch (err) {
      console.error('Add error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Add transport/hotel
  const addTransport = async (type: 'flight' | 'hotel' | 'train', data: Record<string, string>) => {
    setIsAdding(true);
    try {
      if (type === 'hotel') {
        // Create separate cards for check-in, breakfast, and checkout
        const hotelName = data.name || 'Hotel';
        const baseNotes = { type: 'hotel', name: hotelName };

        // Check-in card
        if (data.checkInTime) {
          await fetch(`/api/trips/${tripId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_number: dayNumber,
              title: hotelName,
              time: data.checkInTime,
              notes: JSON.stringify({ ...baseNotes, hotelItemType: 'check_in', checkInTime: data.checkInTime, confirmation: data.confirmation }),
            }),
          });
        }

        // Breakfast card (typically next day, but add to same day for now - user can move)
        if (data.breakfastTime) {
          await fetch(`/api/trips/${tripId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_number: dayNumber + 1, // Next day
              title: hotelName,
              time: data.breakfastTime.split('-')[0], // Use start of breakfast range
              notes: JSON.stringify({ ...baseNotes, hotelItemType: 'breakfast', breakfastTime: data.breakfastTime }),
            }),
          });
        }

        // Checkout card
        if (data.checkOutTime) {
          await fetch(`/api/trips/${tripId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_number: dayNumber + 1, // Next day
              title: hotelName,
              time: data.checkOutTime,
              notes: JSON.stringify({ ...baseNotes, hotelItemType: 'checkout', checkOutTime: data.checkOutTime }),
            }),
          });
        }
      } else {
        // Flight or train - single card
        const notes = JSON.stringify({ type, ...data });
        await fetch(`/api/trips/${tripId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_number: dayNumber,
            title: `${data.from} → ${data.to}`,
            time: data.departureTime,
            notes,
          }),
        });
      }

      setShowTransportForm(null);
      setShowAddMenu(false);
      onRefresh();
    } catch (err) {
      console.error('Add error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Optimize route
  const optimizeRoute = async () => {
    if (!canOptimize) return;
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/intelligence/route-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            latitude: item.destination?.latitude ?? item.parsedNotes?.latitude,
            longitude: item.destination?.longitude ?? item.parsedNotes?.longitude,
            time: item.time,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.optimizedOrder?.length === items.length) {
          const orderedItems = result.optimizedOrder
            .map((id: string) => items.find(item => item.id === id))
            .filter(Boolean);
          onReorder(orderedItems);
        }
      }
    } catch (err) {
      console.error('Optimize error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReorderComplete = useCallback(() => {
    if (JSON.stringify(orderedItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
      onReorder(orderedItems);
    }
  }, [orderedItems, items, onReorder]);

  // Add Google Place to trip
  const addGooglePlace = async (place: { id: string; name: string; formatted_address: string; latitude?: number; longitude?: number; category?: string; image?: string }) => {
    setIsAdding(true);
    try {
      const existingTimes = items.map(i => i.time).filter(Boolean).sort();
      let suggestedTime = '12:00';

      if (existingTimes.length > 0) {
        const lastTime = existingTimes[existingTimes.length - 1]!;
        const [h, m] = lastTime.split(':').map(Number);
        const newHour = Math.min(h + 2, 22);
        suggestedTime = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      // Create item with Google place data stored in notes
      const notes = JSON.stringify({
        type: 'place',
        googlePlaceId: place.id,
        address: place.formatted_address,
        latitude: place.latitude,
        longitude: place.longitude,
        category: place.category,
        image: place.image,
      });

      await fetch(`/api/trips/${tripId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: dayNumber,
          time: suggestedTime,
          title: place.name,
          notes,
        }),
      });

      setSearchQuery('');
      setSearchResults([]);
      setGoogleResults([]);
      setShowSearch(false);
      onRefresh();
    } catch (err) {
      console.error('Add error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const closeAllMenus = () => {
    setShowAddMenu(false);
    setShowSearch(false);
    setShowTransportForm(null);
    setSearchQuery('');
    setSearchResults([]);
    setGoogleResults([]);
    setSearchSource('curated');
  };

  const dateDisplay = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <div>
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Day {dayNumber}
            </span>
            {dateDisplay && (
              <span className="text-[11px] text-gray-300 dark:text-gray-600">{dateDisplay}</span>
            )}
          </div>
          {/* Weather display */}
          {weather && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 dark:bg-gray-800 rounded-full">
              <WeatherIcon code={weather.weatherCode} className="w-3.5 h-3.5" />
              <span className="text-[11px] text-gray-600 dark:text-gray-300">
                {weather.tempMax}°
              </span>
              {weather.precipProbability > 30 && (
                <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                  <Umbrella className="w-3 h-3" />
                  {weather.precipProbability}%
                </span>
              )}
            </div>
          )}
          {/* Day pacing indicator */}
          <DayPacing items={items} />
        </div>

        <div className="flex items-center gap-2">
          {/* Optimize prompt */}
          {canOptimize && (
            <button
              onClick={optimizeRoute}
              disabled={isOptimizing}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Route className="w-3 h-3" />}
              Optimize
            </button>
          )}

          {/* Plus button */}
          <div className="relative">
            <button
              onClick={() => { setShowAddMenu(!showAddMenu); setShowSearch(false); setShowTransportForm(null); }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showAddMenu || showSearch || showTransportForm ? 'rotate-45' : ''}`} />
            </button>

            {/* Add menu dropdown */}
            <AnimatePresence>
              {showAddMenu && !showSearch && !showTransportForm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-20"
                >
                  <button
                    onClick={() => { setShowSearch(true); setSearchSource('curated'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Search className="w-3.5 h-3.5" />
                    From curation
                  </button>
                  <button
                    onClick={() => { setShowSearch(true); setSearchSource('google'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    From Google
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                  <button
                    onClick={() => setShowTransportForm('flight')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Plane className="w-3.5 h-3.5" />
                    Flight
                  </button>
                  <button
                    onClick={() => setShowTransportForm('hotel')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Hotel className="w-3.5 h-3.5" />
                    Hotel
                  </button>
                  <button
                    onClick={() => setShowTransportForm('train')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <TrainIcon className="w-3.5 h-3.5" />
                    Train
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline search panel */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-20 p-3"
                >
                  {/* Source toggle */}
                  <div className="flex items-center gap-1 mb-2">
                    <button
                      onClick={() => { setSearchSource('curated'); setSearchQuery(''); setSearchResults([]); setGoogleResults([]); }}
                      className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                        searchSource === 'curated'
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Curated
                    </button>
                    <button
                      onClick={() => { setSearchSource('google'); setSearchQuery(''); setSearchResults([]); setGoogleResults([]); }}
                      className={`px-2.5 py-1 text-[11px] rounded-full transition-colors ${
                        searchSource === 'google'
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Google
                    </button>
                    <div className="flex-1" />
                    <button onClick={closeAllMenus}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {isSearching || isAdding ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : searchSource === 'google' ? (
                      <Globe className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Search className="w-4 h-4 text-gray-400" />
                    )}
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchSource === 'google' ? 'Search Google...' : 'Search curated...'}
                      className="flex-1 bg-transparent text-[13px] text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Search results */}
                  {(searchResults.length > 0 || googleResults.length > 0) && (
                    <div className="mt-2 max-h-60 overflow-y-auto">
                      {searchResults.map((destination) => (
                        <button
                          key={destination.id}
                          onClick={() => addDestination(destination)}
                          disabled={isAdding}
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {destination.image_thumbnail || destination.image ? (
                              <Image src={destination.image_thumbnail || destination.image || ''} alt="" width={32} height={32} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-3 h-3 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{destination.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{destination.category}</p>
                          </div>
                        </button>
                      ))}
                      {googleResults.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => addGooglePlace(place)}
                          disabled={isAdding}
                          className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {place.image ? (
                              <Image src={place.image} alt="" width={32} height={32} className="w-full h-full object-cover" />
                            ) : (
                              <Globe className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{place.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{place.category || place.formatted_address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline transport form */}
            <AnimatePresence>
              {showTransportForm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-20 p-3"
                >
                  <TransportForm
                    type={showTransportForm}
                    onSubmit={(data) => addTransport(showTransportForm, data)}
                    onCancel={closeAllMenus}
                    isAdding={isAdding}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <Reorder.Group axis="y" values={orderedItems} onReorder={setOrderedItems} className="space-y-1">
          {orderedItems.map((item, index) => (
            <div key={item.id}>
              <ItemRow
                item={item}
                isExpanded={expandedItemId === item.id}
                onToggle={() => onToggleItem(item.id)}
                onRemove={() => onRemove(item.id)}
                onUpdateItem={onUpdateItem}
                onUpdateTime={onUpdateTime}
                onDragEnd={handleReorderComplete}
              />
              {index < orderedItems.length - 1 && (
                <>
                  <TravelTime from={item} to={orderedItems[index + 1]} />
                  <GapSuggestion
                    fromItem={item}
                    toItem={orderedItems[index + 1]}
                    city={city}
                  />
                </>
              )}
            </div>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

/**
 * Transport/Hotel inline form
 */
function TransportForm({
  type,
  onSubmit,
  onCancel,
  isAdding,
}: {
  type: 'flight' | 'hotel' | 'train';
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
  isAdding: boolean;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [breakfast, setBreakfast] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const handleSubmit = () => {
    if (type === 'flight') {
      onSubmit({ from, to, departureTime, arrivalTime, airline, flightNumber });
    } else if (type === 'train') {
      onSubmit({ from, to, departureTime, arrivalTime });
    } else {
      onSubmit({ name, checkInTime: checkIn, checkOutTime: checkOut, breakfastTime: breakfast, confirmation });
    }
  };

  const canSubmit = type === 'hotel' ? name.trim() : (from.trim() && to.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-gray-900 dark:text-white capitalize">
          Add {type}
        </span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {type === 'hotel' ? (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hotel name"
            className="w-full px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Check-in</label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Check-out</label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Breakfast</label>
              <input
                type="text"
                value={breakfast}
                onChange={(e) => setBreakfast(e.target.value)}
                placeholder="e.g. 7:00-10:00"
                className="w-full mt-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Confirmation</label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Booking ref"
                className="w-full mt-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From (e.g. LHR)"
              className="flex-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              autoFocus
            />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To (e.g. CDG)"
              className="flex-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
            />
          </div>
          {type === 'flight' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="Airline (e.g. BA)"
                className="flex-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Flight # (e.g. 123)"
                className="flex-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Departure</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Arrival</label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
              />
            </div>
          </div>
        </>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isAdding}
        className="w-full py-2 text-[13px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isAdding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Add ${type}`}
      </button>
    </div>
  );
}

/**
 * Item row - with inline times and edit button
 */
function ItemRow({
  item,
  isExpanded,
  onToggle,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onDragEnd,
}: {
  item: EnrichedItineraryItem;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onDragEnd: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const itemType = item.parsedNotes?.type || 'place';

  // Build inline display with all relevant times
  const getItemDisplay = () => {
    if (itemType === 'flight') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      const arrTime = item.parsedNotes?.arrivalTime;
      const airline = [item.parsedNotes?.airline, item.parsedNotes?.flightNumber].filter(Boolean).join(' ');

      // Inline times: "10:30 dep → 14:45 arr"
      const timeDisplay = [
        depTime && `${formatTime(depTime)} dep`,
        arrTime && `${formatTime(arrTime)} arr`
      ].filter(Boolean).join(' → ');

      return {
        iconType: 'flight' as const,
        title: `${from} → ${to}`,
        inlineTimes: timeDisplay,
        subtitle: airline || undefined
      };
    }

    if (itemType === 'hotel') {
      const hotelItemType = item.parsedNotes?.hotelItemType;
      const checkIn = item.parsedNotes?.checkInTime;
      const checkOut = item.parsedNotes?.checkOutTime;
      const breakfast = item.parsedNotes?.breakfastTime;

      // Handle specific hotel activity types
      if (hotelItemType === 'check_in') {
        return {
          iconType: 'checkin' as const,
          title: `Check in · ${item.title || 'Hotel'}`,
          inlineTimes: checkIn ? formatTime(checkIn) : undefined,
          subtitle: undefined
        };
      }

      if (hotelItemType === 'checkout') {
        return {
          iconType: 'checkout' as const,
          title: `Check out · ${item.title || 'Hotel'}`,
          inlineTimes: checkOut ? formatTime(checkOut) : undefined,
          subtitle: undefined
        };
      }

      if (hotelItemType === 'breakfast') {
        return {
          iconType: 'breakfast' as const,
          title: `Breakfast · ${item.title || 'Hotel'}`,
          inlineTimes: breakfast || undefined,
          subtitle: undefined
        };
      }

      // Default hotel card (overnight stay)
      const times = [
        checkIn && `check-in ${formatTime(checkIn)}`,
        checkOut && `checkout ${formatTime(checkOut)}`,
        breakfast && `breakfast ${breakfast}`
      ].filter(Boolean).join(' · ');

      return {
        iconType: 'hotel' as const,
        title: item.title || 'Hotel',
        inlineTimes: times || undefined,
        subtitle: undefined
      };
    }

    if (itemType === 'train') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const depTime = item.parsedNotes?.departureTime;
      const arrTime = item.parsedNotes?.arrivalTime;

      const timeDisplay = [
        depTime && `${formatTime(depTime)} dep`,
        arrTime && `${formatTime(arrTime)} arr`
      ].filter(Boolean).join(' → ');

      return {
        iconType: 'train' as const,
        title: `${from} → ${to}`,
        inlineTimes: timeDisplay,
        subtitle: undefined
      };
    }

    // Regular place
    const time = item.time ? formatTime(item.time) : '';
    const duration = item.parsedNotes?.duration;
    const category = item.destination?.category || item.parsedNotes?.category || '';

    // Build time display with duration
    const timeWithDuration = [
      time,
      duration && `${duration}h`
    ].filter(Boolean).join(' · ');

    return {
      iconType: 'place' as const,
      title: item.title || item.destination?.name || 'Place',
      inlineTimes: timeWithDuration || undefined,
      subtitle: category || undefined
    };
  };

  const { iconType, title, inlineTimes, subtitle } = getItemDisplay();
  const image = item.destination?.image_thumbnail || item.destination?.image;
  const destination = item.destination;

  // Quick actions data
  const phone = item.parsedNotes?.phone;
  const website = item.parsedNotes?.website;
  const hasLocation = (destination?.latitude && destination?.longitude) ||
                      (item.parsedNotes?.latitude && item.parsedNotes?.longitude);

  return (
    <Reorder.Item
      value={item}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
    >
      <div className={`rounded-lg transition-all ${isDragging ? 'shadow-lg bg-white dark:bg-gray-900' : ''}`}>
        {/* Main row - NOT clickable for expansion */}
        <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-lg group">
          {/* Icon or image */}
          {iconType === 'flight' ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Plane className="w-3.5 h-3.5 text-gray-500" />
            </div>
          ) : iconType === 'hotel' ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Hotel className="w-3.5 h-3.5 text-gray-500" />
            </div>
          ) : iconType === 'checkin' ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <DoorOpen className="w-3.5 h-3.5 text-gray-500" />
            </div>
          ) : iconType === 'checkout' ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-3.5 h-3.5 text-gray-500" />
            </div>
          ) : iconType === 'breakfast' ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-3.5 h-3.5 text-gray-500" />
            </div>
          ) : iconType === 'train' ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <TrainIcon className="w-3.5 h-3.5 text-gray-500" />
            </div>
          ) : image ? (
            <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
              <Image src={image} alt="" width={24} height={24} className="w-full h-full object-cover" />
            </div>
          ) : (
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-gray-900 dark:text-white">{title}</span>
              {subtitle && <span className="text-[11px] text-gray-400">{subtitle}</span>}
            </div>
            {inlineTimes && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{inlineTimes}</p>
            )}
          </div>

          {/* Quick actions - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Call"
              >
                <Phone className="w-3 h-3 text-gray-400" />
              </a>
            )}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Website"
              >
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            )}
            {hasLocation && (
              <a
                href={`https://maps.apple.com/?q=${destination?.latitude || item.parsedNotes?.latitude},${destination?.longitude || item.parsedNotes?.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Directions"
              >
                <Navigation className="w-3 h-3 text-gray-400" />
              </a>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
              isExpanded
                ? 'bg-gray-900 dark:bg-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Pencil className={`w-3 h-3 ${isExpanded ? 'text-white dark:text-gray-900' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Expanded edit form */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ItemDetails
                item={item}
                itemType={itemType}
                onUpdateItem={onUpdateItem}
                onUpdateTime={onUpdateTime}
                onRemove={onRemove}
                onClose={onToggle}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

/**
 * Item details - edit form (no image)
 */
function ItemDetails({
  item,
  itemType,
  onUpdateItem,
  onUpdateTime,
  onRemove,
  onClose,
}: {
  item: EnrichedItineraryItem;
  itemType: string;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState(item.time || '');
  const [duration, setDuration] = useState(item.parsedNotes?.duration || '');
  const [notes, setNotes] = useState(item.parsedNotes?.notes || '');
  const [checkInTime, setCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [checkOutTime, setCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');
  const [breakfastTime, setBreakfastTime] = useState(item.parsedNotes?.breakfastTime || '');
  const [departureTime, setDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [arrivalTime, setArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');
  const [airline, setAirline] = useState(item.parsedNotes?.airline || '');
  const [flightNumber, setFlightNumber] = useState(item.parsedNotes?.flightNumber || '');
  const [fromAirport, setFromAirport] = useState(item.parsedNotes?.from || '');
  const [toAirport, setToAirport] = useState(item.parsedNotes?.to || '');
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    const updates: Record<string, unknown> = {};

    if (itemType === 'hotel') {
      if (checkInTime !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = checkInTime;
      if (checkOutTime !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = checkOutTime;
      if (breakfastTime !== (item.parsedNotes?.breakfastTime || '')) updates.breakfastTime = breakfastTime;
    } else if (itemType === 'flight' || itemType === 'train') {
      if (fromAirport !== (item.parsedNotes?.from || '')) updates.from = fromAirport;
      if (toAirport !== (item.parsedNotes?.to || '')) updates.to = toAirport;
      if (departureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = departureTime;
      if (arrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = arrivalTime;
      if (itemType === 'flight') {
        if (airline !== (item.parsedNotes?.airline || '')) updates.airline = airline;
        if (flightNumber !== (item.parsedNotes?.flightNumber || '')) updates.flightNumber = flightNumber;
      }
    } else {
      if (time !== item.time) onUpdateTime(item.id, time);
      if (duration !== (item.parsedNotes?.duration || '')) updates.duration = duration;
    }

    if (notes !== (item.parsedNotes?.notes || '')) updates.notes = notes;

    if (Object.keys(updates).length > 0) {
      onUpdateItem(item.id, updates);
    }
    setHasChanges(false);
    onClose();
  };

  const destination = item.destination;

  return (
    <div className="px-3 pb-3 pt-1 space-y-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-b-lg mx-3 mb-2">
      {/* Hotel times */}
      {itemType === 'hotel' && (
        <>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Check-in</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => { setCheckInTime(e.target.value); setHasChanges(true); }}
                className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Check-out</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => { setCheckOutTime(e.target.value); setHasChanges(true); }}
                className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Breakfast</label>
            <input
              type="text"
              value={breakfastTime}
              onChange={(e) => { setBreakfastTime(e.target.value); setHasChanges(true); }}
              placeholder="e.g. 7:00-10:00"
              className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
            />
          </div>
        </>
      )}

      {/* Flight/Train times */}
      {(itemType === 'flight' || itemType === 'train') && (
        <>
          {/* From/To airports */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">From</label>
              <input
                type="text"
                value={fromAirport}
                onChange={(e) => { setFromAirport(e.target.value); setHasChanges(true); }}
                placeholder={itemType === 'flight' ? 'e.g. LHR' : 'e.g. London'}
                className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">To</label>
              <input
                type="text"
                value={toAirport}
                onChange={(e) => { setToAirport(e.target.value); setHasChanges(true); }}
                placeholder={itemType === 'flight' ? 'e.g. CDG' : 'e.g. Paris'}
                className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
            </div>
          </div>
          {itemType === 'flight' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Airline</label>
                <input
                  type="text"
                  value={airline}
                  onChange={(e) => { setAirline(e.target.value); setHasChanges(true); }}
                  placeholder="e.g. BA"
                  className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Flight #</label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => { setFlightNumber(e.target.value); setHasChanges(true); }}
                  placeholder="e.g. 123"
                  className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
                />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Departure</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => { setDepartureTime(e.target.value); setHasChanges(true); }}
                className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Arrival</label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => { setArrivalTime(e.target.value); setHasChanges(true); }}
                className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
            </div>
          </div>
        </>
      )}

      {/* Regular place time + duration */}
      {itemType !== 'hotel' && itemType !== 'flight' && itemType !== 'train' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => { setTime(e.target.value); setHasChanges(true); }}
              className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
            />
          </div>
          <div className="w-20">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Duration</label>
            <div className="relative mt-1">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); setHasChanges(true); }}
                placeholder="1.5"
                className="w-full px-2 py-1.5 pr-6 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">h</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-[10px] text-gray-400 uppercase tracking-wide">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setHasChanges(true); }}
          placeholder="Add a note..."
          rows={2}
          className="w-full mt-1 px-2 py-1.5 text-[13px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none resize-none"
        />
      </div>

      {/* Address */}
      {destination?.formatted_address && (
        <p className="text-[11px] text-gray-400 leading-relaxed">{destination.formatted_address}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button onClick={onRemove} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
          Remove
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-[11px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white px-2.5 py-1 rounded-full"
          >
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Travel time between items - shows spare time, travel info, and suggestions
 */
function TravelTime({
  from,
  to,
  onUpdateTravelMode,
}: {
  from: EnrichedItineraryItem;
  to: EnrichedItineraryItem;
  onUpdateTravelMode?: (itemId: string, mode: 'walking' | 'driving' | 'transit') => void;
}) {
  const [mode, setMode] = useState<'walking' | 'driving' | 'transit'>(
    (from.parsedNotes?.travelModeToNext as 'walking' | 'driving' | 'transit') || 'driving'
  );
  const [isExpanded, setIsExpanded] = useState(false);

  // Check item types for special labels
  const fromType = from.parsedNotes?.type;
  const toType = to.parsedNotes?.type;

  // Get coordinates
  const fromLat = from.destination?.latitude || from.parsedNotes?.latitude;
  const fromLng = from.destination?.longitude || from.parsedNotes?.longitude;
  const toLat = to.destination?.latitude || to.parsedNotes?.latitude;
  const toLng = to.destination?.longitude || to.parsedNotes?.longitude;

  // Calculate distance (Haversine)
  let distanceKm = 0;
  if (fromLat && fromLng && toLat && toLng) {
    const R = 6371;
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLng = (toLng - fromLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distanceKm = R * c;
  }

  // Estimate travel time based on mode
  const getTravelMinutes = () => {
    if (distanceKm === 0) return 15; // Default 15 min if no coords
    switch (mode) {
      case 'walking': return Math.round(distanceKm * 12); // ~5 km/h
      case 'driving': return Math.round(distanceKm * 2);  // ~30 km/h
      case 'transit': return Math.round(distanceKm * 3);  // ~20 km/h
      default: return Math.round(distanceKm * 12);
    }
  };

  const travelMinutes = getTravelMinutes();

  // Calculate spare time between activities
  const calculateSpareTime = () => {
    // Get end time of 'from' activity
    const fromTime = from.time || from.parsedNotes?.departureTime || from.parsedNotes?.checkOutTime;
    const fromDuration = from.parsedNotes?.duration ? parseFloat(String(from.parsedNotes.duration)) * 60 : 90; // Default 1.5h

    // Get start time of 'to' activity
    const toTime = to.time || to.parsedNotes?.departureTime || to.parsedNotes?.checkInTime;

    if (!fromTime || !toTime) return null;

    try {
      const [fromH, fromM] = fromTime.split(':').map(Number);
      const [toH, toM] = toTime.split(':').map(Number);

      const fromEndMinutes = fromH * 60 + fromM + fromDuration;
      const toStartMinutes = toH * 60 + toM;

      const gapMinutes = toStartMinutes - fromEndMinutes - travelMinutes;
      return gapMinutes > 0 ? gapMinutes : null;
    } catch {
      return null;
    }
  };

  const spareMinutes = calculateSpareTime();

  // Format time
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Cycle through modes
  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: Array<'walking' | 'driving' | 'transit'> = ['walking', 'driving', 'transit'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
    onUpdateTravelMode?.(from.id, nextMode);
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'walking': return <Footprints className="w-3 h-3" />;
      case 'driving': return <Car className="w-3 h-3" />;
      case 'transit': return <TrainIcon className="w-3 h-3" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'walking': return 'walk';
      case 'driving': return 'drive';
      case 'transit': return 'transit';
    }
  };

  // Get destination name
  const toName = to.title || to.destination?.name || 'next stop';

  // Determine special label based on from/to types
  const getSpecialLabel = () => {
    if (fromType === 'flight') return 'from airport';
    if (fromType === 'train') return 'from station';
    if (toType === 'flight') return 'to airport';
    if (toType === 'train') return 'to station';
    return null;
  };
  const specialLabel = getSpecialLabel();

  // Suggestions for spare time
  const suggestions = [
    { emoji: '☕', label: 'Coffee break' },
    { emoji: '📸', label: 'Photo walk' },
    { emoji: '🛍️', label: 'Quick shopping' },
    { emoji: '🌳', label: 'Explore nearby' },
  ];

  // Show compact view if no significant spare time
  if (!spareMinutes || spareMinutes < 30) {
    return (
      <div className="flex justify-center py-1.5">
        <button
          onClick={cycleMode}
          className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Click to change travel mode"
        >
          {getModeIcon()}
          <span>{travelMinutes} min {specialLabel || getModeLabel()}</span>
        </button>
      </div>
    );
  }

  // Show expanded view with spare time info
  return (
    <div className="py-2">
      {/* Main connector line */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />

        {/* Spare time pill - clickable to expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
            {formatDuration(spareMinutes)} free
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <button
            onClick={cycleMode}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {getModeIcon()}
            <span>{travelMinutes}m to {toName.length > 15 ? toName.slice(0, 15) + '...' : toName}</span>
          </button>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
      </div>

      {/* Expanded suggestions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-2">
                You have {formatDuration(spareMinutes)} before {toName}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-[10px]"
                  >
                    <span>{s.emoji}</span>
                    <span className="text-gray-600 dark:text-gray-300">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Keep WalkingTime as alias for backwards compatibility
function WalkingTime({ from, to }: { from: EnrichedItineraryItem; to: EnrichedItineraryItem }) {
  return <TravelTime from={from} to={to} />;
}

function formatTime(time: string): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return time;
  }
}

/**
 * Weather icon based on weather code
 */
function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  // Weather code to icon mapping
  if (code === 0) return <Sun className={`text-amber-400 ${className}`} />;
  if (code <= 2) return <CloudSun className={`text-amber-300 ${className}`} />;
  if (code === 3) return <Cloud className={`text-gray-400 ${className}`} />;
  if (code >= 45 && code <= 48) return <Cloud className={`text-gray-400 ${className}`} />; // Fog
  if (code >= 51 && code <= 67) return <CloudRain className={`text-blue-400 ${className}`} />; // Rain
  if (code >= 71 && code <= 77) return <Cloud className={`text-blue-200 ${className}`} />; // Snow
  if (code >= 80 && code <= 82) return <CloudRain className={`text-blue-500 ${className}`} />; // Showers
  if (code >= 95) return <CloudRain className={`text-purple-400 ${className}`} />; // Thunderstorm
  return <Sun className={`text-gray-400 ${className}`} />;
}

/**
 * Day pacing meter - shows if day is packed/sparse
 */
function DayPacing({ items }: { items: EnrichedItineraryItem[] }) {
  // Calculate total hours planned
  const totalDuration = items.reduce((sum, item) => {
    const d = item.parsedNotes?.duration;
    return sum + (d ? parseFloat(String(d)) : 1.5); // Default 1.5h if not set
  }, 0);

  // Estimate travel time between items
  const travelMinutes = (items.length - 1) * 15; // Rough estimate
  const totalHours = totalDuration + travelMinutes / 60;

  // Determine pacing
  const getPacing = () => {
    if (items.length === 0) return { label: 'Empty', color: 'text-gray-400', hint: 'Add some activities' };
    if (totalHours < 4) return { label: 'Light', color: 'text-blue-500', hint: 'Room for more' };
    if (totalHours <= 8) return { label: 'Balanced', color: 'text-green-500', hint: '' };
    if (totalHours <= 10) return { label: 'Full', color: 'text-amber-500', hint: 'Consider pacing' };
    return { label: 'Packed', color: 'text-red-500', hint: 'May be too much' };
  };

  const pacing = getPacing();
  if (!pacing.hint) return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <div className={`w-1.5 h-1.5 rounded-full ${pacing.color.replace('text-', 'bg-')}`} />
      <span className={pacing.color}>{pacing.label}</span>
      {pacing.hint && <span className="text-gray-400">· {pacing.hint}</span>}
    </div>
  );
}

/**
 * Gap suggestion - shows between items when there's a time gap
 */
function GapSuggestion({
  fromItem,
  toItem,
  city,
  onAddPlace,
}: {
  fromItem: EnrichedItineraryItem;
  toItem: EnrichedItineraryItem;
  city: string;
  onAddPlace?: (type: 'coffee' | 'lunch' | 'dinner' | 'walk') => void;
}) {
  const fromTime = fromItem.time || fromItem.parsedNotes?.departureTime || fromItem.parsedNotes?.checkOutTime;
  const toTime = toItem.time || toItem.parsedNotes?.departureTime || toItem.parsedNotes?.checkInTime;
  const fromDuration = fromItem.parsedNotes?.duration || 1.5;

  if (!fromTime || !toTime) return null;

  // Calculate gap in minutes
  const [fromH, fromM] = fromTime.split(':').map(Number);
  const [toH, toM] = toTime.split(':').map(Number);
  const fromMins = fromH * 60 + fromM + (parseFloat(String(fromDuration)) * 60);
  const toMins = toH * 60 + toM;
  const gapMins = toMins - fromMins;

  // Only show suggestion for gaps > 2 hours
  if (gapMins < 120) return null;

  // Suggest based on time of day
  const midTime = fromMins + gapMins / 2;
  const hour = Math.floor(midTime / 60);

  const getSuggestion = () => {
    if (hour >= 7 && hour < 10) return { type: 'coffee' as const, label: 'Coffee break?' };
    if (hour >= 11 && hour < 14) return { type: 'lunch' as const, label: 'Lunch spot?' };
    if (hour >= 14 && hour < 17) return { type: 'walk' as const, label: 'Explore nearby?' };
    if (hour >= 18 && hour < 21) return { type: 'dinner' as const, label: 'Dinner?' };
    return null;
  };

  const suggestion = getSuggestion();
  if (!suggestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center py-1"
    >
      <button
        onClick={() => onAddPlace?.(suggestion.type)}
        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Sparkles className="w-3 h-3" />
        <span>{Math.round(gapMins / 60)}h gap · {suggestion.label}</span>
      </button>
    </motion.div>
  );
}

/**
 * Smart suggestions - shows at end of day based on what's missing
 */
function SmartSuggestions({
  items,
  city,
  onAddSuggestion,
}: {
  items: EnrichedItineraryItem[];
  city: string;
  onAddSuggestion?: (type: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Analyze what's in the day
  const hasBreakfast = items.some(i =>
    i.parsedNotes?.type === 'hotel' ||
    i.destination?.category?.toLowerCase().includes('cafe') ||
    i.destination?.category?.toLowerCase().includes('breakfast')
  );
  const hasLunch = items.some(i =>
    i.destination?.category?.toLowerCase().includes('restaurant') &&
    i.time && parseInt(i.time.split(':')[0]) >= 11 && parseInt(i.time.split(':')[0]) <= 14
  );
  const hasDinner = items.some(i =>
    i.destination?.category?.toLowerCase().includes('restaurant') &&
    i.time && parseInt(i.time.split(':')[0]) >= 18
  );

  // Build suggestions based on what's missing
  const missingItems = [];
  if (!hasBreakfast && items.length > 0) missingItems.push('breakfast');
  if (!hasLunch && items.length > 0) missingItems.push('lunch');
  if (!hasDinner && items.length > 1) missingItems.push('dinner');

  if (missingItems.length === 0 || items.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-gray-400">Missing:</span>
      {missingItems.map((item) => (
        <button
          key={item}
          onClick={() => onAddSuggestion?.(item)}
          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          + {item}
        </button>
      ))}
    </div>
  );
}

/**
 * Weather warning for outdoor activities
 */
function WeatherWarning({ item, date }: { item: EnrichedItineraryItem; date?: string }) {
  // Only show for outdoor categories
  const category = item.destination?.category?.toLowerCase() || '';
  const isOutdoor = ['park', 'garden', 'beach', 'outdoor', 'walk', 'hike', 'tour'].some(
    c => category.includes(c)
  );

  if (!isOutdoor) return null;

  // In a real implementation, this would fetch from weather API
  // For now, just show a placeholder for demonstration
  const [weather, setWeather] = useState<{ rain: boolean; temp?: number } | null>(null);

  // Mock weather check (in production, call weather API)
  useEffect(() => {
    // Only show warning sometimes for demo purposes
    if (Math.random() > 0.7) {
      setWeather({ rain: true, temp: 15 });
    }
  }, []);

  if (!weather?.rain) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 ml-2">
      <CloudRain className="w-3 h-3" />
      <span>Rain expected</span>
    </span>
  );
}
