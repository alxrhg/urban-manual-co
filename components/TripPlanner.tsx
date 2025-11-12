'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XIcon,
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  WalletIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
  ArrowRight,
  SearchIcon,
  BookmarkIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';
import { TripBudgetTracker } from './TripBudgetTracker';
import { TripWeatherForecast } from './TripWeatherForecast';
import { TripPackingList } from './TripPackingList';
import { TripShareModal } from './TripShareModal';
import {
  useSavedPlaces,
  SavedPlaceWithDestination,
} from '@/features/lists/useSavedPlaces';

interface TripPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string; // If provided, load existing trip
  initialDestination?: {
    slug: string;
    name: string;
    city?: string | null;
    category?: string | null;
  };
}

interface TripSummary {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
}

interface TripLocation {
  id: number;
  slug?: string;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

export function TripPlanner({ isOpen, onClose, tripId, initialDestination }: TripPlannerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [showAddLocation, setShowAddLocation] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'create' | 'plan'>('create');
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [showShare, setShowShare] = useState(false);
  const [hotelLocation, setHotelLocation] = useState('');
  const [activeTab, setActiveTab] = useState<
    'itinerary' | 'saved' | 'budget' | 'weather' | 'packing'
  >('itinerary');
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripSummaries, setTripSummaries] = useState<TripSummary[]>([]);
  const [loadingTripSummaries, setLoadingTripSummaries] = useState(false);
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [bypassSelection, setBypassSelection] = useState(false);
  const [savedPlacesSearch, setSavedPlacesSearch] = useState('');
  const [selectedSavedDayIndex, setSelectedSavedDayIndex] = useState(0);

  const {
    places: savedPlaces,
    loading: loadingSavedPlaces,
    error: savedPlacesError,
  } = useSavedPlaces({ userId: user?.id || undefined });

  const filteredSavedPlaces = useMemo(() => {
    if (!savedPlacesSearch.trim()) {
      return savedPlaces;
    }

    const query = savedPlacesSearch.toLowerCase();

    return savedPlaces.filter((place) => {
      const destination = place.destination;
      const terms = [
        destination?.name,
        destination?.city,
        destination?.category,
        place.destinationSlug,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      return terms.some((term) => term.includes(query));
    });
  }, [savedPlaces, savedPlacesSearch]);

  const fetchTripSummaries = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingTripSummaries(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;
      const { data, error } = await supabaseClient
        .from('trips')
        .select('id,title,description,destination,start_date,end_date,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTripSummaries(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      setTripSummaries([]);
    } finally {
      setLoadingTripSummaries(false);
    }
  }, [user]);

  // Initialize drawer state based on provided props
  useEffect(() => {
    if (!isOpen) return;

    if (tripId && user) {
      resetForm();
      setStep('plan');
      loadTrip(tripId);
      return;
    }

    if (initialDestination) {
      if (bypassSelection || step === 'plan') return;
      if (step !== 'select') {
      resetForm();
        setStep('select');
        fetchTripSummaries();
      }
      return;
    }

    resetForm();
    setStep('create');
  }, [isOpen, tripId, user, initialDestination, step, bypassSelection, fetchTripSummaries]);

  useEffect(() => {
    if (!isOpen) {
      setBypassSelection(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSavedDayIndex >= days.length) {
      setSelectedSavedDayIndex(days.length > 0 ? Math.max(days.length - 1, 0) : 0);
    }
  }, [days.length, selectedSavedDayIndex]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  const resetForm = (options?: { preserveTrip?: boolean }) => {
    setTripName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setTotalBudget(0);
    setHotelLocation('');
    setActiveTab('itinerary');
    setSavedPlacesSearch('');
    setSelectedSavedDayIndex(0);
    if (!options?.preserveTrip) {
      setCurrentTripId(null);
    }
  };

  const loadTrip = async (id: string) => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      // Load trip
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        console.error('Error loading trip:', tripError);
        alert('Failed to load trip');
        return;
      }

      setTripName(trip.title);
      setDestination(trip.destination || '');
      setStartDate(trip.start_date || '');
      setEndDate(trip.end_date || '');
      setHotelLocation(trip.description || ''); // Using description for hotel location
      setCurrentTripId(trip.id);
      setTotalBudget(trip.total_budget || 0);

      // Load itinerary items
      // First verify trip ownership to avoid RLS recursion
      const { data: tripCheck, error: tripCheckError } = await supabaseClient
        .from('trips')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (tripCheckError || !tripCheck) {
        console.error('Error verifying trip ownership:', tripCheckError);
        alert('Trip not found or access denied');
        return;
      }

      const { data: items, error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', id)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) {
        console.error('Error loading itinerary items:', itemsError);
        // If recursion error, continue with empty items
        if (itemsError.message && itemsError.message.includes('infinite recursion')) {
          console.warn('RLS recursion detected, continuing with empty items');
        }
      }

      const { data: dayBudgets, error: dayBudgetsError } = await supabaseClient
        .from('itinerary_day_budgets')
        .select('day_index, planned_budget')
        .eq('trip_id', id);

      if (dayBudgetsError) {
        console.error('Error loading day budgets:', dayBudgetsError);
      }

      const budgetsMap = new Map<number, number>();
      (dayBudgets || []).forEach((entry: any) => {
        const index = Number(entry.day_index);
        if (Number.isFinite(index)) {
          budgetsMap.set(index, Number(entry.planned_budget) || 0);
        }
      });

      // Group items by day
      if (items && items.length > 0) {
        const daysMap = new Map<number, TripLocation[]>();
        items.forEach((item) => {
          const day = item.day;
          if (!daysMap.has(day)) {
            daysMap.set(day, []);
          }

          // Parse notes for additional data (cost, duration, mealType)
          let notesData: any = {};
          if (item.notes) {
            try {
              notesData = JSON.parse(item.notes);
            } catch {
              notesData = { raw: item.notes };
            }
          }

          const location: TripLocation = {
            id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
            slug: item.destination_slug || undefined,
            name: item.title,
            city: destination || '',
            category: item.description || '',
            image: notesData.image || '/placeholder-image.jpg',
            time: item.time || undefined,
            notes: typeof notesData === 'string' ? notesData : notesData.raw || undefined,
            cost: notesData.cost || undefined,
            duration: notesData.duration || undefined,
            mealType: notesData.mealType || undefined,
          };

          daysMap.get(day)!.push(location);
        });

        // Create days array
        const start = new Date(trip.start_date || Date.now());
        const end = new Date(trip.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          const dayNum = i + 1;
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: daysMap.get(dayNum) || [],
            budget: budgetsMap.get(dayNum) ?? 0,
          });
        }

        setDays(newDays);
      } else {
        // No items, create empty days
        const start = new Date(trip.start_date || Date.now());
        const end = new Date(trip.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          const dayNum = i + 1;
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: [],
            budget: budgetsMap.get(dayNum) ?? 0,
          });
        }
        setDays(newDays);
      }

      setStep('plan');
    } catch (error) {
      console.error('Error loading trip:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDestinationToTrip = async (targetTripId: string) => {
    if (!user) return;
    if (!initialDestination) {
      await loadTrip(targetTripId);
      setCurrentTripId(targetTripId);
      setStep('plan');
      setActiveTab('itinerary');
      setShowAddLocation(null);
      return;
    }

    setAddingToTripId(targetTripId);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('id')
        .eq('id', targetTripId)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        throw new Error('Trip not found or you do not have permission to add items to this trip');
      }

      let nextDay = 1;
      let nextOrder = 0;
      const { data: nextPositionData, error: nextPositionError } = await supabaseClient.rpc(
        'get_next_itinerary_position',
        { p_trip_id: targetTripId }
      );

      if (nextPositionError) {
        console.warn('get_next_itinerary_position RPC failed, falling back to defaults:', nextPositionError);
        if (
          nextPositionError.code !== 'PGRST116' &&
          !(nextPositionError.message && nextPositionError.message.includes('infinite recursion'))
        ) {
          throw nextPositionError;
        }
      } else if (nextPositionData && typeof nextPositionData === 'object') {
        if (typeof nextPositionData.next_day === 'number') {
          nextDay = Math.max(1, nextPositionData.next_day);
        }
        if (typeof nextPositionData.next_order === 'number') {
          nextOrder = Math.max(0, nextPositionData.next_order);
        }
      }

      const notesData = {
        raw: '',
        cost: undefined,
        duration: undefined,
        mealType: undefined,
        image: undefined,
        city: initialDestination.city || undefined,
        category: initialDestination.category || undefined,
      };

      const { error: insertError } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: targetTripId,
          destination_slug: initialDestination.slug,
          day: nextDay,
          order_index: nextOrder,
          title: initialDestination.name,
          description: initialDestination.category || '',
          notes: JSON.stringify(notesData),
        });

      if (insertError) throw insertError;

      await loadTrip(targetTripId);
      setCurrentTripId(targetTripId);
      setStep('plan');
      setActiveTab('itinerary');
      setShowAddLocation(null);
      fetchTripSummaries();
    } catch (error: any) {
      console.error('Error adding destination to trip:', error);
      alert(error?.message || 'Failed to add destination to trip. Please try again.');
    } finally {
      setAddingToTripId(null);
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
        .from('trips')
        .insert({
          title: tripName,
          description: hotelLocation || null,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          status: 'planning',
          user_id: user.id,
          total_budget: totalBudget || null,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      if (initialDestination) {
        await handleAddDestinationToTrip(trip.id);
        return;
      }

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
          date: date.toISOString().split('T')[0],
          locations: [],
          budget: 0,
        });
      }

      setDays(newDays);
      setStep('plan');
      setActiveTab('itinerary');
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

      // Update trip (including budget)
      const { error: tripError } = await supabaseClient
        .from('trips')
        .update({
          title: tripName,
          description: hotelLocation || null,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          total_budget: totalBudget > 0 ? totalBudget : null,
        })
        .eq('id', currentTripId)
        .eq('user_id', user.id);

      if (tripError) throw tripError;

      // Delete all existing itinerary items
      const { error: deleteError } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('trip_id', currentTripId);

      if (deleteError) throw deleteError;

      // Insert all itinerary items
      const itemsToInsert: Array<{
        trip_id: string;
        destination_slug: string;
        day: number;
        order_index: number;
        time: string | null;
        title: string;
        description: string;
        notes: string;
      }> = [];
      days.forEach((day, dayIndex) => {
        day.locations.forEach((location, locationIndex) => {
          // Store additional data in notes as JSON
          const notesData: any = {
            raw: location.notes || '',
            cost: location.cost,
            duration: location.duration,
            mealType: location.mealType,
            image: location.image,
            city: location.city,
            category: location.category,
            slug: location.slug,
          };

          itemsToInsert.push({
            trip_id: currentTripId,
            destination_slug:
              location.slug || location.name.toLowerCase().replace(/\s+/g, '-'),
            day: dayIndex + 1,
            order_index: locationIndex,
            time: location.time || null,
            title: location.name,
            description: location.category,
            notes: JSON.stringify(notesData),
          });
        });
      });

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('itinerary_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      const budgetPayload = days.map((day, index) => ({
        trip_id: currentTripId,
        day_index: index + 1,
        budget_date: day.date || null,
        planned_budget: day.budget ?? 0,
      }));

      if (budgetPayload.length > 0) {
        const { error: budgetError } = await supabaseClient
          .from('itinerary_day_budgets')
          .upsert(budgetPayload, { onConflict: 'trip_id,day_index' });

        if (budgetError) throw budgetError;

        const { error: cleanupError } = await supabaseClient
          .from('itinerary_day_budgets')
          .delete()
          .eq('trip_id', currentTripId)
          .gt('day_index', budgetPayload.length);

        if (cleanupError) throw cleanupError;
      } else {
        const { error: cleanupError } = await supabaseClient
          .from('itinerary_day_budgets')
          .delete()
          .eq('trip_id', currentTripId);
        if (cleanupError) throw cleanupError;
      }

      // Show success feedback without alert
      // The save button will show "Saved" briefly
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

  const handleUpdateDayBudget = (dayIndex: number, budget: number) => {
    setDays((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              budget,
            }
          : day
      )
    );
  };

  const handlePersistDayBudget = async (
    dayIndex: number,
    budget: number,
    date: string
  ) => {
    if (!currentTripId || !user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('itinerary_day_budgets')
        .upsert(
          {
            trip_id: currentTripId,
            day_index: dayIndex + 1,
            budget_date: date || null,
            planned_budget: budget,
          },
          { onConflict: 'trip_id,day_index' }
        );

      if (error) throw error;
    } catch (err) {
      console.error('Error syncing day budget:', err);
    }
  };

  const handleUpdateTotalBudget = (budget: number) => {
    setTotalBudget(budget);
  };

  const handlePersistTotalBudget = async (budget: number) => {
    if (!currentTripId || !user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .update({ total_budget: budget > 0 ? budget : null })
        .eq('id', currentTripId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error syncing total budget:', err);
    }
  };

  const handleAddSavedPlace = async (place: SavedPlaceWithDestination) => {
    if (days.length === 0) {
      alert('Set your trip dates first to add saved places.');
      return;
    }

    const destination = place.destination;
    const location: TripLocation = {
      id: Date.now() + Math.random(),
      slug: destination?.slug || place.destinationSlug,
      name: destination?.name || place.destinationSlug,
      city: destination?.city || destination?.name || '',
      category: destination?.category || 'Saved place',
      image: destination?.image || '/placeholder-image.jpg',
      notes: place.notes || undefined,
    };

    await handleAddLocation(selectedSavedDayIndex, location);
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
    // Simple optimization - in real app would use actual routing API
    setDays((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const optimized = [...day.locations].sort((a, b) => {
          // Sort by meal type and time
          const mealOrder = {
            breakfast: 0,
            snack: 1,
            lunch: 2,
            dinner: 3,
          };
          const aOrder = a.mealType ? mealOrder[a.mealType] : 999;
          const bOrder = b.mealType ? mealOrder[b.mealType] : 999;
          return aOrder - bOrder;
        });
        return {
          ...day,
          locations: optimized,
        };
      })
    );
  };

  const handleExportToCalendar = () => {
    // Generate ICS file content
    let icsContent =
      'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Urban Manual//Trip Planner//EN\n';

    days.forEach((day, dayIndex) => {
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

  const getTotalSpent = () => {
    return days.reduce((total, day) => {
      return (
        total +
        day.locations.reduce((dayTotal, loc) => dayTotal + (loc.cost || 0), 0)
      );
    }, 0);
  };

  const getAISuggestions = () => {
    // Mock AI suggestions - in real app would call AI API
    return [
      'Consider adding a morning cafe visit before the museum',
      'Your dinner reservation is 2km from your last location - allow 30 min travel time',
      'Weather forecast shows rain on Day 3 - indoor activities recommended',
    ];
  };

  const plannerTabs: { id: typeof activeTab; label: string }[] = [
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'saved', label: 'Saved places' },
    { id: 'budget', label: 'Budget' },
    { id: 'weather', label: 'Weather' },
    { id: 'packing', label: 'Packing' },
  ];

  const baseTranslateClass = isOpen ? 'translate-x-0' : 'translate-x-full';
  const desktopTranslateClass = isOpen ? 'md:translate-x-0' : 'md:translate-x-[calc(100%+1.5rem)]';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full transform transition-transform duration-300 ease-in-out ${baseTranslateClass} ${desktopTranslateClass} md:inset-y-auto md:top-4 md:bottom-4 md:w-auto md:right-4`}
      >
        <div
          className="flex h-full w-full flex-col bg-white shadow-2xl dark:bg-gray-950 md:w-[640px] md:max-w-[640px] md:rounded-3xl md:ring-1 md:ring-black/5 md:border md:border-gray-200 dark:md:border-gray-800 md:overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-5 py-6 md:px-8 md:py-8 dark:border-gray-800">
              <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                {step === 'plan'
                  ? 'Trip planner'
                  : step === 'select'
                  ? 'Add to trip'
                  : 'Start a trip'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {step === 'plan'
                  ? tripName || 'Untitled trip'
                  : step === 'select'
                  ? `Add “${initialDestination?.name ?? ''}” to a trip`
                  : 'Create a new itinerary'}
              </h2>
              {step === 'plan' && destination && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{destination}</p>
              )}
              {step === 'select' && initialDestination?.city && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{initialDestination.city}</p>
              )}
                </div>
            <div className="flex flex-wrap items-center gap-2">
            {step === 'plan' && (
              <>
                {currentTripId && (
                  <button
                    onClick={handleSaveTrip}
                    disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-900/60"
                    title="Save trip"
                  >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
                      {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
                <button
                  onClick={() => setShowShare(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  title="Share trip"
                >
                    <ShareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportToCalendar}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  title="Export to calendar"
                >
                    <DownloadIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handlePrint}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  title="Print itinerary"
                >
                    <PrinterIcon className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                aria-label="Close"
            >
                <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8">
            {step === 'select' && initialDestination ? (
              <div className="space-y-8">
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                  <div className="flex flex-col gap-4">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                      Add to trip
                    </span>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Add “{initialDestination.name}” to your itinerary
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Choose an itinerary that fits this spot or start a new plan that mirrors the homepage’s clean structure.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {initialDestination.city && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          {initialDestination.city}
                        </span>
                      )}
                      {initialDestination.category && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                          <SparklesIcon className="h-3.5 w-3.5" />
                          {initialDestination.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                      Your itineraries
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Tap to keep building</span>
                  </div>
                  {loadingTripSummaries ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : tripSummaries.length > 0 ? (
                    <div className="space-y-3">
                      {tripSummaries.map((trip) => (
                        <button
                          key={trip.id}
                          onClick={() => handleAddDestinationToTrip(trip.id)}
                          disabled={addingToTripId === trip.id}
                          className="group flex w-full items-start justify-between gap-4 rounded-3xl border border-gray-200 bg-white/95 p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950/80 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-400 dark:text-gray-500">
                                Itinerary
                              </span>
                              <span className="text-[0.65rem] font-medium uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                                Updated {new Date(trip.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 transition-colors group-hover:text-gray-600 dark:text-white dark:group-hover:text-gray-200">
                              {trip.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {trip.destination && <span className="uppercase tracking-[2px]">{trip.destination}</span>}
                              {(trip.start_date || trip.end_date) && (
                                <span>
                                  {[trip.start_date, trip.end_date]
                                    .filter(Boolean)
                                    .map((date) => (date ? new Date(date).toLocaleDateString() : ''))
                                    .join(' – ')}
                                </span>
                              )}
                            </div>
                          </div>
                          {addingToTripId === trip.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          ) : (
                            <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-gray-200 bg-white/90 p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-400">
                      You haven’t created any trips yet. Start a new itinerary below.
                    </div>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-gray-900 bg-black px-6 py-7 text-white shadow-xl dark:border-gray-100 dark:bg-white dark:text-black">
                  <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_rgba(255,255,255,0)_60%)] dark:[background:radial-gradient(circle_at_top,_rgba(0,0,0,0.14),_rgba(0,0,0,0)_60%)]" aria-hidden="true" />
                  <div className="relative flex flex-col gap-5">
                    <span className="inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[3px]">
                      <SparklesIcon className="h-4 w-4" />
                      Start fresh
                    </span>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold leading-snug">
                        Start a new itinerary for this destination
                      </h3>
                      <p className="text-sm text-gray-300 dark:text-gray-600">
                        We’ll prefill the essentials so you can curate days, budgets, and highlights with the same polish as the homepage grid.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setBypassSelection(true);
                          resetForm();
                          setTripName(initialDestination.name);
                          if (initialDestination.city) {
                            setDestination(initialDestination.city);
                          }
                          setStep('create');
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-black transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40 dark:bg-black dark:text-white dark:focus:ring-black/40"
                      >
                        Start a new trip
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : step === 'create' ? (
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white/95 px-6 py-8 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                  <div className="flex flex-col gap-4">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                      New trip
                    </span>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Build your itinerary in our signature style
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Define the essentials and we’ll keep everything structured just like the homepage layout you’re used to.
                      </p>
                    </div>
                    {(initialDestination?.name || initialDestination?.city) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {initialDestination?.name && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                            <SparklesIcon className="h-3.5 w-3.5" />
                            {initialDestination.name}
                          </span>
                        )}
                        {initialDestination?.city && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {initialDestination.city}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Trip name *
                      </label>
                      <input
                        type="text"
                        value={tripName}
                        onChange={(e) => setTripName(e.target.value)}
                        placeholder="Summer in Paris"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Destination *
                      </label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Paris, France"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Hotel / base location
                      </label>
                      <input
                        type="text"
                        value={hotelLocation}
                        onChange={(e) => setHotelLocation(e.target.value)}
                        placeholder="Hotel Le Marais"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Start date *
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        End date *
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Total budget
                      </label>
                      <input
                        type="number"
                        value={totalBudget || ''}
                        onChange={(e) => setTotalBudget(Number(e.target.value))}
                        placeholder="2000"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-medium uppercase tracking-[2px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Smart planning
                      </span>
                      <span>Budget, packing, and weather tools unlock once you create the trip.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateTrip}
                      disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        'Create trip'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  {plannerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                        activeTab === tab.id
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

              {activeTab === 'itinerary' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {destination}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                        {new Date(endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {totalBudget > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                          <WalletIcon className="h-3.5 w-3.5" />
                          ${getTotalSpent()} / ${totalBudget}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                      <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Smart suggestions
                      </p>
                      <ul className="mt-3 space-y-2">
                        {getAISuggestions().map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {days.map((day, index) => (
                      <TripDay
                        key={day.date}
                        dayNumber={index + 1}
                        date={day.date}
                        locations={day.locations}
                        hotelLocation={hotelLocation}
                        plannedBudget={day.budget}
                        onAddLocation={() => setShowAddLocation(index)}
                        onRemoveLocation={(locationId) => handleRemoveLocation(index, locationId)}
                        onReorderLocations={(locations) => handleReorderLocations(index, locations)}
                        onDuplicateDay={() => handleDuplicateDay(index)}
                        onOptimizeRoute={() => handleOptimizeRoute(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                        <BookmarkIcon className="h-3.5 w-3.5" />
                        Saved places
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Drop favorites directly into your itinerary without leaving the planner.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                      <div className="relative w-full sm:w-64">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          value={savedPlacesSearch}
                          onChange={(e) => setSavedPlacesSearch(e.target.value)}
                          placeholder="Search saved places"
                          className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-gray-700 dark:focus:ring-gray-700"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                          Day
                        </span>
                        <select
                          value={selectedSavedDayIndex}
                          onChange={(e) => setSelectedSavedDayIndex(Number(e.target.value))}
                          disabled={days.length === 0}
                          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200 dark:focus:border-gray-700 dark:focus:ring-gray-700"
                        >
                          {days.length === 0 ? (
                            <option value={0}>No days yet</option>
                          ) : (
                            days.map((day, index) => (
                              <option value={index} key={day.date}>
                                Day {index + 1} •
                                {' '}
                                {new Date(day.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {loadingSavedPlaces ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : savedPlacesError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                        Unable to load saved places right now. Please try again.
                      </div>
                    ) : filteredSavedPlaces.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-400">
                        {savedPlaces.length === 0
                          ? 'You haven’t saved any places yet. Explore destinations and tap save to build your library.'
                          : 'No saved places match your search.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredSavedPlaces.map((place) => {
                          const destination = place.destination;
                          return (
                            <div
                              key={place.id}
                              className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/70 dark:hover:border-gray-700 md:flex-row"
                            >
                              <div className="h-24 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900 md:h-24 md:w-32">
                                {destination?.image ? (
                                  <img
                                    src={destination.image}
                                    alt={destination.name}
                                    className="h-full w-full object-cover grayscale-[20%]"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[0.6rem] font-semibold uppercase tracking-[3px] text-gray-400 dark:text-gray-600">
                                    Saved spot
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-1 flex-col justify-between gap-3">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {destination?.name || place.destinationSlug}
                                      </p>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        {destination?.category && (
                                          <span className="uppercase tracking-[2px]">
                                            {destination.category}
                                          </span>
                                        )}
                                        {destination?.city && (
                                          <>
                                            <span>•</span>
                                            <span>{destination.city}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAddSavedPlace(place)}
                                      disabled={days.length === 0}
                                      className="inline-flex items-center gap-2 rounded-full border border-gray-900 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-900 transition hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-gray-100 dark:text-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-900 dark:disabled:border-gray-800 dark:disabled:text-gray-600"
                                    >
                                      Add to day {selectedSavedDayIndex + 1}
                                    </button>
                                  </div>
                                  {place.notes && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      “{place.notes}”
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs uppercase tracking-[2px] text-gray-400 dark:text-gray-500">
                                  Saved {new Date(place.savedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'budget' && (
                <TripBudgetTracker
                  days={days}
                  totalBudget={totalBudget}
                  onUpdateBudget={handleUpdateTotalBudget}
                  onPersistTotalBudget={handlePersistTotalBudget}
                  onUpdateDayBudget={handleUpdateDayBudget}
                  onPersistDayBudget={handlePersistDayBudget}
                />
              )}

              {activeTab === 'weather' && (
                <TripWeatherForecast
                  destination={destination}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}

              {activeTab === 'packing' && (
                <TripPackingList
                  destination={destination}
                  days={days}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddLocation !== null && (
        <AddLocationToTrip
          onAdd={(location) => handleAddLocation(showAddLocation, location)}
          onClose={() => setShowAddLocation(null)}
        />
      )}

      {showShare && (
        <TripShareModal tripName={tripName} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}
