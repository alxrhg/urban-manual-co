'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  getEstimatedDuration,
  calculateTravelTime,
  analyzeDayItinerary,
  predictCrowdLevel,
  isOutdoorCategory,
  formatDuration,
} from '@/lib/trip-intelligence';
import { isClosedOnDay, getHoursForDay } from '@/lib/utils/opening-hours';
import { toast } from '@/lib/toast';

import type { Destination } from '@/types/destination';
import type {
  TripItem,
  PlaceItem,
  FlightItem,
  TrainItem,
  HotelItem,
  ActivityItem,
  TripDay,
  TripHealth,
  DayInsight,
  ActiveTrip,
  SavedTripSummary,
  SavingStatus,
  TripMode,
  isPlaceItem,
} from '../types';
import { itineraryItemToTripItem, tripItemToItineraryData } from '../types';

// ============================================
// CONTEXT TYPE
// ============================================

export interface TripContextType {
  // State
  activeTrip: ActiveTrip | null;
  savedTrips: SavedTripSummary[];
  isPanelOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  savingStatus: SavingStatus;
  mode: TripMode;

  // Trip Actions
  startTrip: (city: string, days?: number, startDate?: string) => void;
  loadTrip: (tripId: string) => Promise<void>;
  saveTrip: () => Promise<string | null>;
  clearTrip: () => void;
  switchToTrip: (tripId: string) => Promise<void>;
  refreshSavedTrips: () => Promise<void>;
  updateTripDetails: (updates: { title?: string; startDate?: string; travelers?: number }) => void;

  // Day Actions
  addDay: () => void;
  removeDay: (dayNumber: number) => void;

  // Item Actions
  addPlace: (destination: Destination, day?: number, timeSlot?: string) => Promise<void>;
  addFlight: (data: Omit<FlightItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => Promise<void>;
  addTrain: (data: Omit<TrainItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => Promise<void>;
  addHotel: (data: Omit<HotelItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => Promise<void>;
  addActivity: (data: Omit<ActivityItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  moveItem: (itemId: string, toDay: number, toIndex: number) => Promise<void>;
  moveItemToDay: (itemId: string, fromDay: number, toDay: number) => Promise<void>;
  reorderItems: (dayNumber: number, fromIndex: number, toIndex: number) => Promise<void>;
  updateItemTime: (itemId: string, timeSlot: string) => Promise<void>;
  updateItemNotes: (itemId: string, notes: string) => Promise<void>;
  updateItemDuration: (itemId: string, duration: number) => Promise<void>;

  // Panel
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // AI Actions
  generateItinerary: (city: string, days: number, preferences?: {
    categories?: string[];
    style?: string;
    mustVisit?: string[];
  }) => Promise<void>;
  optimizeDay: (dayNumber: number) => void;
  suggestNextItem: (dayNumber: number) => Promise<Destination | null>;
  autoScheduleDay: (dayNumber: number) => void;

  // Insights
  getDayInsights: (dayNumber: number) => DayInsight[];
  getTripHealth: () => TripHealth;

  // Computed
  totalItems: number;
  tripDuration: number;
  canAddMore: (day: number) => boolean;
}

const TripContext = createContext<TripContextType | null>(null);

// ============================================
// UTILITIES
// ============================================

const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_TIME_SLOTS: Record<string, string> = {
  'breakfast': '09:00',
  'brunch': '10:30',
  'cafe': '10:00',
  'coffee': '09:30',
  'lunch': '12:30',
  'restaurant': '19:00',
  'fine dining': '19:30',
  'bar': '21:00',
  'cocktail bar': '21:30',
  'museum': '10:00',
  'gallery': '14:00',
  'park': '11:00',
  'temple': '09:00',
  'shrine': '09:00',
  'shopping': '14:00',
  'hotel': '15:00',
  'default': '14:00',
};

function getDefaultTimeSlot(category?: string | null): string {
  if (!category) return DEFAULT_TIME_SLOTS.default;
  const normalized = category.toLowerCase();
  for (const [key, time] of Object.entries(DEFAULT_TIME_SLOTS)) {
    if (normalized.includes(key)) return time;
  }
  return DEFAULT_TIME_SLOTS.default;
}

function sortItemsByTime(items: TripItem[]): TripItem[] {
  return [...items].sort((a, b) => {
    if (!a.timeSlot && !b.timeSlot) return a.orderIndex - b.orderIndex;
    if (!a.timeSlot) return 1;
    if (!b.timeSlot) return -1;
    return a.timeSlot.localeCompare(b.timeSlot);
  }).map((item, idx) => ({ ...item, orderIndex: idx }));
}

function calculateDayMetrics(day: TripDay): TripDay {
  const placeItems = day.items.filter((item): item is PlaceItem => item.type === 'place');

  if (placeItems.length === 0) {
    return { ...day, totalTime: 0, totalTravel: 0, isOverstuffed: false };
  }

  const analysis = analyzeDayItinerary(
    placeItems.map(item => ({
      id: item.id,
      title: item.destination.name,
      time: item.timeSlot,
      category: item.destination.category,
      latitude: item.destination.latitude,
      longitude: item.destination.longitude,
      customDuration: item.duration,
    }))
  );

  // Add travel times and crowd levels to place items
  const itemsWithMetrics = day.items.map((item, idx) => {
    if (item.type !== 'place') return item;

    const crowd = predictCrowdLevel(
      item.destination.category,
      item.timeSlot,
      day.date ? new Date(day.date).getDay() : undefined
    );

    const placeIdx = placeItems.findIndex(p => p.id === item.id);

    return {
      ...item,
      travelTimeFromPrev: analysis.timeSlots[placeIdx]?.travelTimeFromPrev,
      crowdLevel: crowd.level,
      crowdLabel: crowd.label,
      isOutdoor: isOutdoorCategory(item.destination.category),
    };
  });

  return {
    ...day,
    items: itemsWithMetrics,
    totalTime: analysis.totalTime,
    totalTravel: analysis.totalTravelTime,
    isOverstuffed: analysis.isOverstuffed,
  };
}

// ============================================
// PROVIDER
// ============================================

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [savedTrips, setSavedTrips] = useState<SavedTripSummary[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<SavingStatus>('idle');
  const savingStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mode = activeTrip?.mode || 'builder';

  // Helper to update saving status with auto-reset
  const updateSavingStatus = useCallback((status: SavingStatus) => {
    if (savingStatusTimeoutRef.current) {
      clearTimeout(savingStatusTimeoutRef.current);
    }
    setSavingStatus(status);
    if (status === 'saved' || status === 'error') {
      savingStatusTimeoutRef.current = setTimeout(() => setSavingStatus('idle'), 2000);
    }
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (savingStatusTimeoutRef.current) clearTimeout(savingStatusTimeoutRef.current);
    };
  }, []);

  // Fetch saved trips
  const refreshSavedTrips = useCallback(async () => {
    if (!user) {
      setSavedTrips([]);
      return;
    }
    try {
      const response = await fetch('/api/trips?limit=10');
      if (response.ok) {
        const data = await response.json();
        setSavedTrips(data.trips || []);
      }
    } catch (error) {
      console.error('Error fetching saved trips:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshSavedTrips();
  }, [user, refreshSavedTrips]);

  // Load from localStorage on mount (builder mode)
  useEffect(() => {
    const saved = localStorage.getItem('urban-manual-active-trip');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure mode is set
        setActiveTrip({ ...parsed, mode: parsed.mode || 'builder' });
      } catch {
        console.error('Failed to load saved trip');
      }
    }
  }, []);

  // Save to localStorage on changes (builder mode only)
  useEffect(() => {
    if (activeTrip?.mode === 'builder') {
      localStorage.setItem('urban-manual-active-trip', JSON.stringify(activeTrip));
    }
  }, [activeTrip]);

  // Start a new trip (builder mode)
  const startTrip = useCallback((city: string, days: number = 1, startDate?: string) => {
    const tripDays: TripDay[] = Array.from({ length: days }, (_, i) => ({
      dayNumber: i + 1,
      date: startDate ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0] : undefined,
      items: [],
      totalTime: 0,
      totalTravel: 0,
      isOverstuffed: false,
    }));

    setActiveTrip({
      title: `${city} Trip`,
      city,
      startDate,
      endDate: startDate && days > 1
        ? new Date(new Date(startDate).getTime() + (days - 1) * 86400000).toISOString().split('T')[0]
        : startDate,
      days: tripDays,
      travelers: 1,
      mode: 'builder',
      isModified: false,
    });
    setIsPanelOpen(true);
  }, []);

  // Load trip from database (editor mode)
  const loadTrip = useCallback(async (tripId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('No Supabase client');

      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError) throw tripError;
      if (!tripData) throw new Error('Trip not found');

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch destinations
      const slugs = (items || [])
        .map(i => i.destination_slug)
        .filter((s): s is string => Boolean(s));

      const destinationsMap: Record<string, Destination> = {};
      if (slugs.length > 0) {
        const { data: destinations } = await supabase
          .from('destinations')
          .select('*')
          .in('slug', slugs);

        destinations?.forEach(d => {
          destinationsMap[d.slug] = d;
        });
      }

      // Build days
      const startDate = tripData.start_date ? new Date(tripData.start_date) : null;
      const endDate = tripData.end_date ? new Date(tripData.end_date) : null;
      let numDays = 1;

      if (startDate && endDate) {
        numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
      }

      const maxItemDay = Math.max(...(items || []).map(i => i.day || 1), 0);
      numDays = Math.max(numDays, maxItemDay);

      const days: TripDay[] = Array.from({ length: numDays }, (_, i) => {
        const dayNumber = i + 1;
        const dayDate = startDate
          ? new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0]
          : undefined;

        const dayItems = (items || [])
          .filter(item => item.day === dayNumber)
          .map(item => itineraryItemToTripItem(item, destinationsMap[item.destination_slug || '']));

        return calculateDayMetrics({
          dayNumber,
          date: dayDate,
          items: sortItemsByTime(dayItems),
        });
      });

      setActiveTrip({
        id: tripData.id,
        title: tripData.title,
        city: tripData.destination,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        days,
        travelers: 1,
        coverImage: tripData.cover_image,
        mode: 'editor',
        isModified: false,
        lastSaved: tripData.updated_at,
      });
      setIsPanelOpen(true);
    } catch (error) {
      console.error('Error loading trip:', error);
      toast.error('Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save trip to database
  const saveTrip = useCallback(async (): Promise<string | null> => {
    if (!activeTrip || !user) return null;

    setIsSaving(true);
    updateSavingStatus('saving');

    try {
      const response = await fetch('/api/trips', {
        method: activeTrip.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTrip.id,
          title: activeTrip.title,
          destination: activeTrip.city,
          start_date: activeTrip.startDate,
          end_date: activeTrip.endDate,
          items: activeTrip.days.flatMap(day =>
            day.items.map(item => tripItemToItineraryData(item, activeTrip.id || ''))
          ),
        }),
      });

      if (!response.ok) throw new Error('Failed to save trip');

      const data = await response.json();

      setActiveTrip(prev => prev ? {
        ...prev,
        id: data.id,
        mode: 'editor',
        isModified: false,
        lastSaved: new Date().toISOString(),
      } : null);

      updateSavingStatus('saved');
      refreshSavedTrips();
      return data.id;
    } catch (error) {
      console.error('Error saving trip:', error);
      updateSavingStatus('error');
      toast.error('Failed to save trip');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [activeTrip, user, updateSavingStatus, refreshSavedTrips]);

  // Clear trip
  const clearTrip = useCallback(() => {
    setActiveTrip(null);
    setIsPanelOpen(false);
    localStorage.removeItem('urban-manual-active-trip');
  }, []);

  // Switch to a different trip
  const switchToTrip = useCallback(async (tripId: string) => {
    if (activeTrip?.isModified && activeTrip.id !== tripId) {
      localStorage.removeItem('urban-manual-active-trip');
    }
    await loadTrip(tripId);
  }, [activeTrip, loadTrip]);

  // Update trip details
  const updateTripDetails = useCallback((updates: { title?: string; startDate?: string; travelers?: number }) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      let newDays = prev.days;
      if (updates.startDate && updates.startDate !== prev.startDate) {
        const start = new Date(updates.startDate);
        newDays = prev.days.map((day, idx) => ({
          ...day,
          date: new Date(start.getTime() + idx * 86400000).toISOString().split('T')[0],
        }));
      }

      return {
        ...prev,
        title: updates.title ?? prev.title,
        startDate: updates.startDate ?? prev.startDate,
        endDate: updates.startDate
          ? new Date(new Date(updates.startDate).getTime() + (prev.days.length - 1) * 86400000).toISOString().split('T')[0]
          : prev.endDate,
        travelers: updates.travelers ?? prev.travelers,
        days: newDays,
        isModified: true,
      };
    });
  }, []);

  // Add day
  const addDay = useCallback(() => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const newDayNumber = prev.days.length + 1;
      const lastDate = prev.days[prev.days.length - 1]?.date;
      const newDate = lastDate
        ? new Date(new Date(lastDate).getTime() + 86400000).toISOString().split('T')[0]
        : undefined;

      return {
        ...prev,
        days: [...prev.days, {
          dayNumber: newDayNumber,
          date: newDate,
          items: [],
          totalTime: 0,
          totalTravel: 0,
          isOverstuffed: false,
        }],
        endDate: newDate || prev.endDate,
        isModified: true,
      };
    });
  }, []);

  // Remove day
  const removeDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev || prev.days.length <= 1) return prev;

      const days = prev.days
        .filter(d => d.dayNumber !== dayNumber)
        .map((d, idx) => ({
          ...d,
          dayNumber: idx + 1,
          items: d.items.map(item => ({ ...item, day: idx + 1 })),
        }));

      return {
        ...prev,
        days: days.map(calculateDayMetrics),
        endDate: days[days.length - 1]?.date || prev.endDate,
        isModified: true,
      };
    });
  }, []);

  // Add place
  const addPlace = useCallback(async (destination: Destination, day?: number, timeSlot?: string) => {
    const targetDay = day || 1;
    const slot = timeSlot || getDefaultTimeSlot(destination.category);
    const duration = getEstimatedDuration(destination.category);
    const tempId = generateId();

    const newItem: PlaceItem = {
      id: tempId,
      type: 'place',
      destination,
      day: targetDay,
      orderIndex: 0,
      timeSlot: slot,
      duration,
      isOutdoor: isOutdoorCategory(destination.category),
    };

    // Optimistic update
    setActiveTrip(prev => {
      if (!prev) {
        return {
          title: `${destination.city || 'My'} Trip`,
          city: destination.city || '',
          days: [{
            dayNumber: 1,
            items: [newItem],
            totalTime: duration,
            totalTravel: 0,
            isOverstuffed: false,
          }],
          travelers: 1,
          mode: 'builder',
          isModified: true,
        };
      }

      const days = [...prev.days];
      while (days.length < targetDay) {
        days.push({
          dayNumber: days.length + 1,
          items: [],
          totalTime: 0,
          totalTravel: 0,
          isOverstuffed: false,
        });
      }

      const dayIndex = targetDay - 1;
      days[dayIndex] = calculateDayMetrics({
        ...days[dayIndex],
        items: sortItemsByTime([...days[dayIndex].items, newItem]),
      });

      return { ...prev, days, isModified: true };
    });

    setIsPanelOpen(true);

    // If in editor mode, persist to database
    if (activeTrip?.mode === 'editor' && activeTrip.id) {
      try {
        updateSavingStatus('saving');
        const supabase = createClient();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('itinerary_items')
          .insert(tripItemToItineraryData(newItem, activeTrip.id))
          .select()
          .single();

        if (error) throw error;

        // Update with real ID
        if (data) {
          setActiveTrip(prev => {
            if (!prev) return null;
            return {
              ...prev,
              days: prev.days.map(d =>
                d.dayNumber === targetDay
                  ? { ...d, items: d.items.map(i => i.id === tempId ? { ...i, id: data.id } : i) }
                  : d
              ),
            };
          });
        }
        updateSavingStatus('saved');
      } catch (error) {
        console.error('Error saving place:', error);
        updateSavingStatus('error');
        toast.error('Failed to save place');
      }
    }
  }, [activeTrip, updateSavingStatus]);

  // Add flight
  const addFlight = useCallback(async (data: Omit<FlightItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => {
    const tempId = generateId();
    const newItem: FlightItem = {
      ...data,
      id: tempId,
      type: 'flight',
      day,
      orderIndex: 0,
      timeSlot: data.departureTime,
    };

    setActiveTrip(prev => {
      if (!prev) return null;

      const days = [...prev.days];
      const dayIndex = day - 1;
      if (dayIndex < days.length) {
        days[dayIndex] = {
          ...days[dayIndex],
          items: [...days[dayIndex].items, newItem],
        };
      }

      return { ...prev, days, isModified: true };
    });

    // Persist if in editor mode
    if (activeTrip?.mode === 'editor' && activeTrip.id) {
      try {
        updateSavingStatus('saving');
        const supabase = createClient();
        if (!supabase) return;

        const { data: saved, error } = await supabase
          .from('itinerary_items')
          .insert(tripItemToItineraryData(newItem, activeTrip.id))
          .select()
          .single();

        if (error) throw error;
        if (saved) {
          setActiveTrip(prev => prev ? {
            ...prev,
            days: prev.days.map(d =>
              d.dayNumber === day
                ? { ...d, items: d.items.map(i => i.id === tempId ? { ...i, id: saved.id } : i) }
                : d
            ),
          } : null);
        }
        updateSavingStatus('saved');
      } catch (error) {
        console.error('Error saving flight:', error);
        updateSavingStatus('error');
        toast.error('Failed to save flight');
      }
    }
  }, [activeTrip, updateSavingStatus]);

  // Add train (similar pattern)
  const addTrain = useCallback(async (data: Omit<TrainItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => {
    const tempId = generateId();
    const newItem: TrainItem = {
      ...data,
      id: tempId,
      type: 'train',
      day,
      orderIndex: 0,
      timeSlot: data.departureTime,
    };

    setActiveTrip(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      const dayIndex = day - 1;
      if (dayIndex < days.length) {
        days[dayIndex] = { ...days[dayIndex], items: [...days[dayIndex].items, newItem] };
      }
      return { ...prev, days, isModified: true };
    });

    if (activeTrip?.mode === 'editor' && activeTrip.id) {
      try {
        updateSavingStatus('saving');
        const supabase = createClient();
        if (!supabase) return;
        const { data: saved, error } = await supabase
          .from('itinerary_items')
          .insert(tripItemToItineraryData(newItem, activeTrip.id))
          .select()
          .single();
        if (error) throw error;
        if (saved) {
          setActiveTrip(prev => prev ? {
            ...prev,
            days: prev.days.map(d =>
              d.dayNumber === day
                ? { ...d, items: d.items.map(i => i.id === tempId ? { ...i, id: saved.id } : i) }
                : d
            ),
          } : null);
        }
        updateSavingStatus('saved');
      } catch {
        updateSavingStatus('error');
        toast.error('Failed to save train');
      }
    }
  }, [activeTrip, updateSavingStatus]);

  // Add hotel
  const addHotel = useCallback(async (data: Omit<HotelItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => {
    const tempId = generateId();
    const newItem: HotelItem = {
      ...data,
      id: tempId,
      type: 'hotel',
      day,
      orderIndex: 0,
      timeSlot: data.checkInTime,
    };

    setActiveTrip(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      const dayIndex = day - 1;
      if (dayIndex < days.length) {
        days[dayIndex] = { ...days[dayIndex], items: [...days[dayIndex].items, newItem] };
      }
      return { ...prev, days, isModified: true };
    });

    if (activeTrip?.mode === 'editor' && activeTrip.id) {
      try {
        updateSavingStatus('saving');
        const supabase = createClient();
        if (!supabase) return;
        const { data: saved, error } = await supabase
          .from('itinerary_items')
          .insert(tripItemToItineraryData(newItem, activeTrip.id))
          .select()
          .single();
        if (error) throw error;
        if (saved) {
          setActiveTrip(prev => prev ? {
            ...prev,
            days: prev.days.map(d =>
              d.dayNumber === day
                ? { ...d, items: d.items.map(i => i.id === tempId ? { ...i, id: saved.id } : i) }
                : d
            ),
          } : null);
        }
        updateSavingStatus('saved');
      } catch {
        updateSavingStatus('error');
        toast.error('Failed to save hotel');
      }
    }
  }, [activeTrip, updateSavingStatus]);

  // Add activity
  const addActivity = useCallback(async (data: Omit<ActivityItem, 'id' | 'type' | 'day' | 'orderIndex'>, day: number) => {
    const tempId = generateId();
    const newItem: ActivityItem = {
      ...data,
      id: tempId,
      type: 'activity',
      day,
      orderIndex: 0,
    };

    setActiveTrip(prev => {
      if (!prev) return null;
      const days = [...prev.days];
      const dayIndex = day - 1;
      if (dayIndex < days.length) {
        days[dayIndex] = { ...days[dayIndex], items: [...days[dayIndex].items, newItem] };
      }
      return { ...prev, days, isModified: true };
    });

    if (activeTrip?.mode === 'editor' && activeTrip.id) {
      try {
        updateSavingStatus('saving');
        const supabase = createClient();
        if (!supabase) return;
        const { data: saved, error } = await supabase
          .from('itinerary_items')
          .insert(tripItemToItineraryData(newItem, activeTrip.id))
          .select()
          .single();
        if (error) throw error;
        if (saved) {
          setActiveTrip(prev => prev ? {
            ...prev,
            days: prev.days.map(d =>
              d.dayNumber === day
                ? { ...d, items: d.items.map(i => i.id === tempId ? { ...i, id: saved.id } : i) }
                : d
            ),
          } : null);
        }
        updateSavingStatus('saved');
      } catch {
        updateSavingStatus('error');
        toast.error('Failed to save activity');
      }
    }
  }, [activeTrip, updateSavingStatus]);

  // Remove item
  const removeItem = useCallback(async (itemId: string) => {
    const previousTrip = activeTrip;

    setActiveTrip(prev => {
      if (!prev) return null;
      return {
        ...prev,
        days: prev.days.map(day => calculateDayMetrics({
          ...day,
          items: day.items.filter(item => item.id !== itemId),
        })),
        isModified: true,
      };
    });

    if (activeTrip?.mode === 'editor' && !itemId.startsWith('item_')) {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { error } = await supabase
          .from('itinerary_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      } catch {
        setActiveTrip(previousTrip);
        toast.error('Failed to remove item');
      }
    }
  }, [activeTrip]);

  // Move item
  const moveItem = useCallback(async (itemId: string, toDay: number, toIndex: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      let movedItem: TripItem | null = null;
      const days = prev.days.map(day => {
        const item = day.items.find(i => i.id === itemId);
        if (item) {
          movedItem = { ...item, day: toDay };
        }
        return { ...day, items: day.items.filter(i => i.id !== itemId) };
      });

      if (!movedItem) return prev;

      while (days.length < toDay) {
        days.push({ dayNumber: days.length + 1, items: [], totalTime: 0, totalTravel: 0, isOverstuffed: false });
      }

      const dayIndex = toDay - 1;
      const items = [...days[dayIndex].items];
      items.splice(toIndex, 0, movedItem);
      days[dayIndex] = calculateDayMetrics({
        ...days[dayIndex],
        items: items.map((item, idx) => ({ ...item, orderIndex: idx })),
      });

      return { ...prev, days: days.map(calculateDayMetrics), isModified: true };
    });
  }, []);

  // Move item to day
  const moveItemToDay = useCallback(async (itemId: string, fromDay: number, toDay: number) => {
    if (fromDay === toDay) return;

    setActiveTrip(prev => {
      if (!prev) return null;

      let movedItem: TripItem | null = null;
      const days = prev.days.map(day => {
        if (day.dayNumber === fromDay) {
          const item = day.items.find(i => i.id === itemId);
          if (item) movedItem = { ...item, day: toDay };
          return { ...day, items: day.items.filter(i => i.id !== itemId) };
        }
        return day;
      });

      if (!movedItem) return prev;

      const targetIdx = toDay - 1;
      if (targetIdx >= 0 && targetIdx < days.length) {
        days[targetIdx] = calculateDayMetrics({
          ...days[targetIdx],
          items: [...days[targetIdx].items, movedItem],
        });
      }

      return { ...prev, days: days.map(calculateDayMetrics), isModified: true };
    });

    if (activeTrip?.mode === 'editor' && !itemId.startsWith('item_')) {
      try {
        const supabase = createClient();
        if (!supabase) return;
        await supabase
          .from('itinerary_items')
          .update({ day: toDay })
          .eq('id', itemId);
      } catch {
        toast.error('Failed to move item');
      }
    }
  }, [activeTrip]);

  // Reorder items
  const reorderItems = useCallback(async (dayNumber: number, fromIndex: number, toIndex: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      const items = [...day.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);

      const reordered = items.map((item, idx) => ({ ...item, orderIndex: idx }));

      const days = [...prev.days];
      days[dayIndex] = calculateDayMetrics({ ...days[dayIndex], items: reordered });

      return { ...prev, days, isModified: true };
    });
  }, []);

  // Update item time
  const updateItemTime = useCallback(async (itemId: string, timeSlot: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;
      return {
        ...prev,
        days: prev.days.map(day => calculateDayMetrics({
          ...day,
          items: sortItemsByTime(day.items.map(item =>
            item.id === itemId ? { ...item, timeSlot } : item
          )),
        })),
        isModified: true,
      };
    });

    if (activeTrip?.mode === 'editor' && !itemId.startsWith('item_')) {
      try {
        const supabase = createClient();
        if (!supabase) return;
        await supabase
          .from('itinerary_items')
          .update({ time: timeSlot })
          .eq('id', itemId);
      } catch {
        toast.error('Failed to update time');
      }
    }
  }, [activeTrip]);

  // Update item notes
  const updateItemNotes = useCallback(async (itemId: string, notes: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;
      return {
        ...prev,
        days: prev.days.map(day => ({
          ...day,
          items: day.items.map(item =>
            item.id === itemId ? { ...item, notes } : item
          ),
        })),
        isModified: true,
      };
    });
  }, []);

  // Update item duration
  const updateItemDuration = useCallback(async (itemId: string, duration: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;
      return {
        ...prev,
        days: prev.days.map(day => calculateDayMetrics({
          ...day,
          items: day.items.map(item =>
            item.id === itemId ? { ...item, duration } : item
          ),
        })),
        isModified: true,
      };
    });
  }, []);

  // Panel controls
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen(p => !p), []);

  // AI: Generate itinerary
  const generateItinerary = useCallback(async (
    city: string,
    days: number,
    preferences?: { categories?: string[]; style?: string; mustVisit?: string[] }
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/intelligence/itinerary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, days, preferences }),
      });

      if (!response.ok) throw new Error('Failed to generate');
      const data = await response.json();

      const tripDays: TripDay[] = Array.from({ length: days }, (_, i) => ({
        dayNumber: i + 1,
        items: [],
        totalTime: 0,
        totalTravel: 0,
        isOverstuffed: false,
      }));

      for (const item of data.items || []) {
        const dayIndex = (item.day || 1) - 1;
        if (dayIndex >= tripDays.length) continue;

        const newItem: PlaceItem = {
          id: generateId(),
          type: 'place',
          destination: item.destination,
          day: item.day,
          orderIndex: tripDays[dayIndex].items.length,
          timeSlot: item.time_of_day === 'morning' ? '10:00'
            : item.time_of_day === 'afternoon' ? '14:00'
            : item.time_of_day === 'evening' ? '19:00' : '12:00',
          duration: item.duration_minutes || 90,
        };

        tripDays[dayIndex].items.push(newItem);
      }

      setActiveTrip({
        title: `${city} Trip`,
        city,
        days: tripDays.map(calculateDayMetrics),
        travelers: 1,
        mode: 'builder',
        isModified: true,
      });
      setIsPanelOpen(true);
    } catch (error) {
      console.error('Error generating:', error);
      toast.error('Failed to generate itinerary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // AI: Optimize day
  const optimizeDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      const placeItems = day.items.filter((item): item is PlaceItem => item.type === 'place');
      if (placeItems.length <= 1) return prev;

      // TSP nearest neighbor
      const optimized: PlaceItem[] = [];
      const remaining = [...placeItems];

      let current = remaining.shift()!;
      optimized.push(current);

      while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const travel = calculateTravelTime(
            current.destination.latitude,
            current.destination.longitude,
            remaining[i].destination.latitude,
            remaining[i].destination.longitude
          );
          const dist = travel?.distance || Infinity;
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        current = remaining.splice(nearestIdx, 1)[0];
        optimized.push(current);
      }

      // Reassign times
      const timeSlots = ['09:30', '11:30', '13:30', '15:30', '18:00', '20:00'];
      const reordered: TripItem[] = [
        ...day.items.filter(i => i.type !== 'place'),
        ...optimized.map((item, idx) => ({
          ...item,
          orderIndex: idx,
          timeSlot: timeSlots[idx] || timeSlots[timeSlots.length - 1],
        })),
      ];

      const days = [...prev.days];
      days[dayIndex] = calculateDayMetrics({ ...days[dayIndex], items: sortItemsByTime(reordered) });

      return { ...prev, days, isModified: true };
    });
  }, []);

  // AI: Suggest next item
  const suggestNextItem = useCallback(async (dayNumber: number): Promise<Destination | null> => {
    if (!activeTrip) return null;

    const day = activeTrip.days[dayNumber - 1];
    if (!day) return null;

    try {
      const response = await fetch('/api/intelligence/suggest-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: activeTrip.city,
          currentItems: day.items.filter((i): i is PlaceItem => i.type === 'place').map(i => i.destination.slug),
          timeOfDay: day.items.length < 2 ? 'morning' : day.items.length < 4 ? 'afternoon' : 'evening',
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.destination || null;
    } catch {
      return null;
    }
  }, [activeTrip]);

  // Auto-schedule day
  const autoScheduleDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      if (day.items.length === 0) return prev;

      const scheduled = day.items.map((item, idx) => {
        if (item.type !== 'place') return item;

        const cat = (item.destination.category || '').toLowerCase();
        let baseTime: string;

        if (cat.includes('coffee') || cat.includes('breakfast') || cat.includes('bakery')) {
          baseTime = '09:00';
        } else if (cat.includes('brunch')) {
          baseTime = '10:30';
        } else if (cat.includes('museum') || cat.includes('gallery') || cat.includes('temple')) {
          baseTime = idx === 0 ? '10:00' : '14:00';
        } else if (cat.includes('lunch') || (cat.includes('restaurant') && idx < day.items.length / 2)) {
          baseTime = '12:30';
        } else if (cat.includes('park') || cat.includes('garden')) {
          baseTime = '15:00';
        } else if (cat.includes('bar') || cat.includes('cocktail')) {
          baseTime = '19:00';
        } else if (cat.includes('restaurant') || cat.includes('dining')) {
          baseTime = '19:30';
        } else {
          const defaultTimes = ['10:00', '12:00', '14:30', '16:30', '18:30', '20:00'];
          baseTime = defaultTimes[idx] || '14:00';
        }

        return { ...item, timeSlot: baseTime };
      });

      const days = [...prev.days];
      days[dayIndex] = calculateDayMetrics({
        ...days[dayIndex],
        items: sortItemsByTime(scheduled),
      });

      return { ...prev, days, isModified: true };
    });
  }, []);

  // Get day insights
  const getDayInsights = useCallback((dayNumber: number): DayInsight[] => {
    if (!activeTrip) return [];

    const day = activeTrip.days[dayNumber - 1];
    if (!day) return [];

    const insights: DayInsight[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Check closures
    if (day.date) {
      const dayOfWeek = new Date(day.date).getDay();

      day.items.forEach(item => {
        if (item.type !== 'place') return;
        const openingHours = item.destination.opening_hours_json;
        if (openingHours) {
          const closureCheck = isClosedOnDay(openingHours, dayOfWeek);
          if (closureCheck.isClosed) {
            insights.push({
              type: 'warning',
              icon: 'clock',
              message: `${item.destination.name} is closed on ${dayNames[dayOfWeek]}s`,
              action: 'Move to another day',
            });
          }
        }
      });
    }

    // Time conflicts
    const times = day.items.filter(i => i.timeSlot).map(i => i.timeSlot!);
    if (times.length > new Set(times).size) {
      insights.push({
        type: 'warning',
        icon: 'clock',
        message: 'Some activities have overlapping times',
        action: 'Auto-schedule',
      });
    }

    // Overstuffed
    if (day.isOverstuffed) {
      insights.push({
        type: 'warning',
        icon: 'clock',
        message: `Day is too packed (${formatDuration(day.totalTime || 0)})`,
        action: 'Move items',
      });
    }

    // Long travel
    const longTravel = day.items.find((i): i is PlaceItem =>
      i.type === 'place' && i.travelTimeFromPrev !== undefined && i.travelTimeFromPrev > 45
    );
    if (longTravel) {
      insights.push({
        type: 'tip',
        icon: 'route',
        message: `Long travel to ${longTravel.destination.name}`,
        action: 'Optimize route',
      });
    }

    return insights;
  }, [activeTrip]);

  // Get trip health
  const getTripHealth = useCallback((): TripHealth => {
    if (!activeTrip) {
      return {
        score: 0,
        label: 'No trip',
        insights: [],
        categoryBalance: {},
        totalWalkingTime: 0,
        hasTimeConflicts: false,
        missingMeals: [],
      };
    }

    let score = 100;
    const insights: DayInsight[] = [];
    const categoryBalance: Record<string, number> = {};
    let totalWalkingTime = 0;
    let hasTimeConflicts = false;
    const missingMeals: number[] = [];

    activeTrip.days.forEach(day => {
      day.items.forEach(item => {
        if (item.type === 'place') {
          const cat = item.destination.category || 'other';
          categoryBalance[cat] = (categoryBalance[cat] || 0) + 1;
        }
      });

      totalWalkingTime += day.totalTravel || 0;

      if (day.isOverstuffed) score -= 10;

      const times = day.items.filter(i => i.timeSlot).map(i => i.timeSlot!);
      if (times.length !== new Set(times).size) {
        hasTimeConflicts = true;
        score -= 5;
      }
    });

    score = Math.max(0, Math.min(100, score));

    let label: string;
    if (score >= 90) label = 'Excellent';
    else if (score >= 75) label = 'Good';
    else if (score >= 60) label = 'Fair';
    else if (score >= 40) label = 'Needs work';
    else label = 'Poor';

    return {
      score,
      label,
      insights,
      categoryBalance,
      totalWalkingTime,
      hasTimeConflicts,
      missingMeals,
    };
  }, [activeTrip]);

  // Computed values
  const totalItems = useMemo(() =>
    activeTrip?.days.reduce((sum, day) => sum + day.items.length, 0) || 0
  , [activeTrip]);

  const tripDuration = useMemo(() => activeTrip?.days.length || 0, [activeTrip]);

  const canAddMore = useCallback((day: number) => {
    if (!activeTrip) return true;
    const dayData = activeTrip.days[day - 1];
    if (!dayData) return true;
    return !dayData.isOverstuffed && dayData.items.length < 8;
  }, [activeTrip]);

  const value: TripContextType = {
    activeTrip,
    savedTrips,
    isPanelOpen,
    isLoading,
    isSaving,
    savingStatus,
    mode,
    startTrip,
    loadTrip,
    saveTrip,
    clearTrip,
    switchToTrip,
    refreshSavedTrips,
    updateTripDetails,
    addDay,
    removeDay,
    addPlace,
    addFlight,
    addTrain,
    addHotel,
    addActivity,
    removeItem,
    moveItem,
    moveItemToDay,
    reorderItems,
    updateItemTime,
    updateItemNotes,
    updateItemDuration,
    openPanel,
    closePanel,
    togglePanel,
    generateItinerary,
    optimizeDay,
    suggestNextItem,
    autoScheduleDay,
    getDayInsights,
    getTripHealth,
    totalItems,
    tripDuration,
    canAddMore,
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
