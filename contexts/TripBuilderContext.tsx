'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Destination } from '@/types/destination';
import { useAuth } from './AuthContext';
import {
  getEstimatedDuration,
  calculateTravelTime,
  analyzeDayItinerary,
  predictCrowdLevel,
  isOutdoorCategory,
} from '@/lib/trip-intelligence';

// ============================================
// TYPES
// ============================================

export interface TripItem {
  id: string;
  destination: Destination;
  day: number;
  orderIndex: number;
  timeSlot?: string; // "09:00"
  duration: number; // minutes
  notes?: string;
  // Computed
  travelTimeFromPrev?: number;
  crowdLevel?: number;
  crowdLabel?: string;
  isOutdoor?: boolean;
}

export interface TripDay {
  dayNumber: number;
  date?: string; // ISO date
  items: TripItem[];
  // Computed
  totalTime: number;
  totalTravel: number;
  isOverstuffed: boolean;
  weather?: {
    condition: string;
    temp: number;
    isRainy: boolean;
  };
}

export interface ActiveTrip {
  id?: string; // Supabase ID if saved
  title: string;
  city: string;
  startDate?: string;
  endDate?: string;
  days: TripDay[];
  travelers: number;
  // State
  isModified: boolean;
  lastSaved?: string;
}

export interface TripBuilderContextType {
  // State
  activeTrip: ActiveTrip | null;
  isPanelOpen: boolean;
  isBuilding: boolean;

  // Actions
  startTrip: (city: string, days?: number, startDate?: string) => void;
  addToTrip: (destination: Destination, day?: number, timeSlot?: string) => void;
  removeFromTrip: (itemId: string) => void;
  moveItem: (itemId: string, toDay: number, toIndex: number) => void;
  updateItemTime: (itemId: string, timeSlot: string) => void;
  clearTrip: () => void;
  saveTrip: () => Promise<string | null>;
  loadTrip: (tripId: string) => Promise<void>;

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

  // Computed
  totalItems: number;
  tripDuration: number;
  canAddMore: (day: number) => boolean;
}

const TripBuilderContext = createContext<TripBuilderContextType | null>(null);

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

function calculateTripMetrics(days: TripDay[]): TripDay[] {
  return days.map(day => {
    const analysis = analyzeDayItinerary(
      day.items.map(item => ({
        id: item.id,
        title: item.destination.name,
        time: item.timeSlot,
        category: item.destination.category,
        latitude: item.destination.latitude,
        longitude: item.destination.longitude,
        customDuration: item.duration,
      }))
    );

    // Add travel times and crowd levels to items
    const itemsWithMetrics = day.items.map((item, idx) => {
      const crowd = predictCrowdLevel(
        item.destination.category,
        item.timeSlot,
        day.date ? new Date(day.date).getDay() : undefined
      );

      return {
        ...item,
        travelTimeFromPrev: analysis.timeSlots[idx]?.travelTimeFromPrev,
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
  });
}

// ============================================
// PROVIDER
// ============================================

export function TripBuilderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Load trip from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('urban-manual-active-trip');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveTrip(parsed);
      } catch (e) {
        console.error('Failed to load saved trip:', e);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (activeTrip) {
      localStorage.setItem('urban-manual-active-trip', JSON.stringify(activeTrip));
    } else {
      localStorage.removeItem('urban-manual-active-trip');
    }
  }, [activeTrip]);

  // Auto-open panel when trip has items
  useEffect(() => {
    if (activeTrip && activeTrip.days.some(d => d.items.length > 0) && !isPanelOpen) {
      setIsPanelOpen(true);
    }
  }, [activeTrip?.days]);

  // Start a new trip
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
      isModified: false,
    });
    setIsPanelOpen(true);
  }, []);

  // Add destination to trip
  const addToTrip = useCallback((destination: Destination, day?: number, timeSlot?: string) => {
    setActiveTrip(prev => {
      // If no active trip, start one
      if (!prev) {
        const newTrip: ActiveTrip = {
          title: `${destination.city || 'My'} Trip`,
          city: destination.city || '',
          days: [{
            dayNumber: 1,
            items: [],
            totalTime: 0,
            totalTravel: 0,
            isOverstuffed: false,
          }],
          travelers: 1,
          isModified: true,
        };
        prev = newTrip;
      }

      const targetDay = day || 1;
      const duration = getEstimatedDuration(destination.category);
      const slot = timeSlot || getDefaultTimeSlot(destination.category);

      // Ensure we have enough days
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

      // Add item to day
      const dayIndex = targetDay - 1;
      const newItem: TripItem = {
        id: generateId(),
        destination,
        day: targetDay,
        orderIndex: days[dayIndex].items.length,
        timeSlot: slot,
        duration,
        isOutdoor: isOutdoorCategory(destination.category),
      };

      days[dayIndex] = {
        ...days[dayIndex],
        items: sortItemsByTime([...days[dayIndex].items, newItem]),
      };

      // Recalculate metrics
      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });

    // Open panel when adding
    setIsPanelOpen(true);
  }, []);

  // Remove item from trip
  const removeFromTrip = useCallback((itemId: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const days = prev.days.map(day => ({
        ...day,
        items: day.items
          .filter(item => item.id !== itemId)
          .map((item, idx) => ({ ...item, orderIndex: idx })),
      }));

      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });
  }, []);

  // Move item to different day/position
  const moveItem = useCallback((itemId: string, toDay: number, toIndex: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      // Find the item
      let movedItem: TripItem | null = null;
      const days = prev.days.map(day => {
        const item = day.items.find(i => i.id === itemId);
        if (item) {
          movedItem = { ...item, day: toDay };
        }
        return {
          ...day,
          items: day.items.filter(i => i.id !== itemId),
        };
      });

      if (!movedItem) return prev;

      // Ensure target day exists
      while (days.length < toDay) {
        days.push({
          dayNumber: days.length + 1,
          items: [],
          totalTime: 0,
          totalTravel: 0,
          isOverstuffed: false,
        });
      }

      // Insert at new position
      const dayIndex = toDay - 1;
      const items = [...days[dayIndex].items];
      items.splice(toIndex, 0, movedItem);

      days[dayIndex] = {
        ...days[dayIndex],
        items: items.map((item, idx) => ({ ...item, orderIndex: idx })),
      };

      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });
  }, []);

  // Update item time
  const updateItemTime = useCallback((itemId: string, timeSlot: string) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const days = prev.days.map(day => ({
        ...day,
        items: sortItemsByTime(
          day.items.map(item =>
            item.id === itemId ? { ...item, timeSlot } : item
          )
        ),
      }));

      const updatedDays = calculateTripMetrics(days);

      return {
        ...prev,
        days: updatedDays,
        isModified: true,
      };
    });
  }, []);

  // Clear trip
  const clearTrip = useCallback(() => {
    setActiveTrip(null);
    setIsPanelOpen(false);
    localStorage.removeItem('urban-manual-active-trip');
  }, []);

  // Save trip to Supabase
  const saveTrip = useCallback(async (): Promise<string | null> => {
    if (!activeTrip || !user) return null;

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
            day.items.map(item => ({
              destination_slug: item.destination.slug,
              day: item.day,
              order_index: item.orderIndex,
              time: item.timeSlot,
              title: item.destination.name,
              notes: JSON.stringify({
                duration: item.duration,
                category: item.destination.category,
                image: item.destination.image,
                city: item.destination.city,
              }),
            }))
          ),
        }),
      });

      if (!response.ok) throw new Error('Failed to save trip');

      const data = await response.json();

      setActiveTrip(prev => prev ? {
        ...prev,
        id: data.id,
        isModified: false,
        lastSaved: new Date().toISOString(),
      } : null);

      return data.id;
    } catch (error) {
      console.error('Error saving trip:', error);
      return null;
    }
  }, [activeTrip, user]);

  // Load trip from Supabase
  const loadTrip = useCallback(async (tripId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) throw new Error('Failed to load trip');

      const data = await response.json();

      // Convert to ActiveTrip format
      const daysMap = new Map<number, TripItem[]>();

      for (const item of data.items || []) {
        const day = item.day || 1;
        if (!daysMap.has(day)) daysMap.set(day, []);

        const notes = item.notes ? JSON.parse(item.notes) : {};

        daysMap.get(day)!.push({
          id: item.id,
          destination: {
            slug: item.destination_slug,
            name: item.title,
            category: notes.category,
            city: notes.city || data.destination,
            image: notes.image,
          } as Destination,
          day,
          orderIndex: item.order_index,
          timeSlot: item.time,
          duration: notes.duration || 60,
        });
      }

      const maxDay = Math.max(...Array.from(daysMap.keys()), 1);
      const days: TripDay[] = Array.from({ length: maxDay }, (_, i) => ({
        dayNumber: i + 1,
        items: sortItemsByTime(daysMap.get(i + 1) || []),
        totalTime: 0,
        totalTravel: 0,
        isOverstuffed: false,
      }));

      setActiveTrip({
        id: data.id,
        title: data.title,
        city: data.destination,
        startDate: data.start_date,
        endDate: data.end_date,
        days: calculateTripMetrics(days),
        travelers: 1,
        isModified: false,
        lastSaved: data.updated_at,
      });

      setIsPanelOpen(true);
    } catch (error) {
      console.error('Error loading trip:', error);
    }
  }, []);

  // Generate full itinerary with AI
  const generateItinerary = useCallback(async (
    city: string,
    days: number,
    preferences?: { categories?: string[]; style?: string; mustVisit?: string[] }
  ) => {
    setIsBuilding(true);

    try {
      const response = await fetch('/api/intelligence/itinerary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, days, preferences }),
      });

      if (!response.ok) throw new Error('Failed to generate itinerary');

      const data = await response.json();

      // Convert to ActiveTrip format
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

        tripDays[dayIndex].items.push({
          id: generateId(),
          destination: item.destination,
          day: item.day,
          orderIndex: tripDays[dayIndex].items.length,
          timeSlot: item.time_of_day === 'morning' ? '10:00'
            : item.time_of_day === 'afternoon' ? '14:00'
            : item.time_of_day === 'evening' ? '19:00' : '12:00',
          duration: item.duration_minutes || 90,
        });
      }

      setActiveTrip({
        title: `${city} Trip`,
        city,
        days: calculateTripMetrics(tripDays),
        travelers: 1,
        isModified: true,
      });

      setIsPanelOpen(true);
    } catch (error) {
      console.error('Error generating itinerary:', error);
    } finally {
      setIsBuilding(false);
    }
  }, []);

  // Optimize a single day's routing
  const optimizeDay = useCallback((dayNumber: number) => {
    setActiveTrip(prev => {
      if (!prev) return null;

      const dayIndex = dayNumber - 1;
      if (dayIndex >= prev.days.length) return prev;

      const day = prev.days[dayIndex];
      if (day.items.length <= 1) return prev;

      // TSP-lite: sort by nearest neighbor
      const items = [...day.items];
      const optimized: TripItem[] = [];

      // Start with first item
      let current = items.shift()!;
      optimized.push(current);

      while (items.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < items.length; i++) {
          const travel = calculateTravelTime(
            current.destination.latitude,
            current.destination.longitude,
            items[i].destination.latitude,
            items[i].destination.longitude
          );
          const dist = travel?.distance || Infinity;
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        current = items.splice(nearestIdx, 1)[0];
        optimized.push(current);
      }

      // Reassign order indexes and time slots
      const timeSlots = ['09:30', '11:30', '13:30', '15:30', '18:00', '20:00'];
      const reordered = optimized.map((item, idx) => ({
        ...item,
        orderIndex: idx,
        timeSlot: timeSlots[idx] || timeSlots[timeSlots.length - 1],
      }));

      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], items: reordered };

      return {
        ...prev,
        days: calculateTripMetrics(days),
        isModified: true,
      };
    });
  }, []);

  // Suggest next item for a day
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
          currentItems: day.items.map(i => i.destination.slug),
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

  // Panel controls
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen(p => !p), []);

  // Computed values
  const totalItems = useMemo(() =>
    activeTrip?.days.reduce((sum, day) => sum + day.items.length, 0) || 0
  , [activeTrip]);

  const tripDuration = useMemo(() =>
    activeTrip?.days.length || 0
  , [activeTrip]);

  const canAddMore = useCallback((day: number) => {
    if (!activeTrip) return true;
    const dayData = activeTrip.days[day - 1];
    if (!dayData) return true;
    return !dayData.isOverstuffed && dayData.items.length < 8;
  }, [activeTrip]);

  const value: TripBuilderContextType = {
    activeTrip,
    isPanelOpen,
    isBuilding,
    startTrip,
    addToTrip,
    removeFromTrip,
    moveItem,
    updateItemTime,
    clearTrip,
    saveTrip,
    loadTrip,
    openPanel,
    closePanel,
    togglePanel,
    generateItinerary,
    optimizeDay,
    suggestNextItem,
    totalItems,
    tripDuration,
    canAddMore,
  };

  return (
    <TripBuilderContext.Provider value={value}>
      {children}
    </TripBuilderContext.Provider>
  );
}

export function useTripBuilder() {
  const context = useContext(TripBuilderContext);
  if (!context) {
    throw new Error('useTripBuilder must be used within a TripBuilderProvider');
  }
  return context;
}
