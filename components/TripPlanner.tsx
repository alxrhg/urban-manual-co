'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
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
import type { Trip as TripSchema, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

interface TripPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string; // If provided, load existing trip
  prefilledDestination?: PrefilledDestination | null;
}

interface PrefilledDestination {
  slug?: string;
  name: string;
  image?: string;
  city?: string;
  category?: string;
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
  slug?: string;
  blockType?: 'destination' | 'flight' | 'train' | 'custom';
  customLocation?: {
    place_id?: string;
    formatted_address?: string;
    geometry?: any;
  };
  airline?: string;
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  notes?: string;
}

export function TripPlanner({
  isOpen,
  onClose,
  tripId,
  prefilledDestination,
}: TripPlannerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [showAddLocation, setShowAddLocation] = useState<number | null>(null);
  const [step, setStep] = useState<'create' | 'plan'>('create');
  const [showShare, setShowShare] = useState(false);
  const [hotelLocation, setHotelLocation] = useState('');
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    tripName?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hotels, setHotels] = useState<Array<{
    id?: string;
    name: string;
    checkInDate: string;
    checkOutDate: string;
    address?: string;
  }>>([]);
  const toast = useToast();

  const draftStorageKey = 'tripPlannerDraft';

  // Load existing trip if tripId is provided
  useEffect(() => {
    if (isOpen && tripId && user) {
      loadTrip(tripId);
    } else if (isOpen && !tripId) {
      // Reset form for new trip
      resetForm();
    }
  }, [isOpen, tripId, user]);

  useEffect(() => {
    if (isOpen && !tripId && prefilledDestination) {
      setDestination((prev) => prev || prefilledDestination.city || prefilledDestination.name);
      setTripName((prev) => prev || `${prefilledDestination.name} Trip`);

      if (!coverImage && prefilledDestination.image) {
        setCoverImage(prefilledDestination.image);
        setCoverImagePreview(prefilledDestination.image);
      }
    }
  }, [isOpen, tripId, prefilledDestination, coverImage]);

  const createPrefilledLocation = (): TripLocation | null => {
    if (!prefilledDestination) return null;

    return {
      id: Date.now(),
      name: prefilledDestination.name,
      city: prefilledDestination.city || '',
      category: prefilledDestination.category || '',
      image: prefilledDestination.image || '/placeholder-image.jpg',
      slug: prefilledDestination.slug,
      blockType: 'destination',
    };
  };

  // Body scroll is handled by Drawer component

  const resetForm = () => {
    setTripName('');
    setDestination(prefilledDestination?.city || prefilledDestination?.name || '');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setHotelLocation('');
    setHotels([]);
    setStep('create');
    setCurrentTripId(null);
    setCoverImage(prefilledDestination?.image || null);
    setCoverImageFile(null);
    setCoverImagePreview(prefilledDestination?.image || null);
    setValidationErrors([]);
    setFieldErrors({});
    setDraftRestored(false);
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

      const tripData = trip as TripSchema;

      setTripName(tripData.title);
      setDestination(tripData.destination || '');
      setStartDate(tripData.start_date || '');
      setEndDate(tripData.end_date || '');
      setHotelLocation(tripData.description || ''); // Using description for hotel location
      setCurrentTripId(tripData.id);
      setCoverImage(tripData.cover_image || null);

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

      // Separate hotels from regular itinerary items
      const hotelItems: ItineraryItem[] = [];
      const locationItems: ItineraryItem[] = [];
      
      if (items && items.length > 0) {
        (items as ItineraryItem[]).forEach((item) => {
          let notesData: any = {};
          if (item.notes) {
            try {
              notesData = JSON.parse(item.notes);
            } catch {
              notesData = { raw: item.notes };
            }
          }
          
          // Check if this is a hotel item
          if (notesData.type === 'hotel') {
            hotelItems.push(item);
          } else {
            locationItems.push(item);
          }
        });
      }

      // Load hotels
      const loadedHotels = hotelItems.map((item) => {
        let notesData: any = {};
        if (item.notes) {
          try {
            notesData = JSON.parse(item.notes);
          } catch {
            notesData = {};
          }
        }
        return {
          id: item.id,
          name: item.title,
          checkInDate: notesData.checkInDate || notesData.startDate || tripData.start_date || '',
          checkOutDate: notesData.checkOutDate || notesData.endDate || tripData.end_date || '',
          address: notesData.address || item.description || '',
        };
      });
      setHotels(loadedHotels);

      // Group location items by day
      if (locationItems.length > 0) {
        const daysMap = new Map<number, TripLocation[]>();
        locationItems.forEach((item) => {
          const day = item.day;
          if (!daysMap.has(day)) {
            daysMap.set(day, []);
          }

          // Parse notes for additional data (duration, etc.)
          let notesData: ItineraryItemNotes = {};
          if (item.notes) {
            try {
              notesData = JSON.parse(item.notes) as ItineraryItemNotes;
            } catch {
              notesData = { raw: item.notes };
            }
          }

          const location: TripLocation = {
            id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
            name: item.title,
            city: destination || '',
            category: item.description || '',
            image: notesData.image || '/placeholder-image.jpg',
            time: item.time || undefined,
            notes: notesData.raw || undefined,
            duration: notesData.duration || undefined,
            slug: notesData.slug || item.destination_slug || undefined,
          };

          daysMap.get(day)!.push(location);
        });

        // Create days array
        const start = new Date(tripData.start_date || Date.now());
        const end = new Date(tripData.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          const dayNum = i + 1;
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: daysMap.get(dayNum) || [],
          });
        }

        setDays(newDays);
      } else {
        // No items, create empty days
        const start = new Date(tripData.start_date || Date.now());
        const end = new Date(tripData.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: [],
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

  const validateRequiredFields = () => {
    const errors: string[] = [];
    const nextFieldErrors: typeof fieldErrors = {};

    if (!tripName.trim()) {
      errors.push('Trip name is required.');
      nextFieldErrors.tripName = 'Please add a name for your trip.';
    }

    if (!destination.trim()) {
      errors.push('Destination is required.');
      nextFieldErrors.destination = 'Please choose where you are travelling.';
    }

    if (!startDate) {
      errors.push('Start date is required.');
      nextFieldErrors.startDate = 'Select when your trip begins.';
    }

    if (!endDate) {
      errors.push('End date is required.');
      nextFieldErrors.endDate = 'Select when your trip ends.';
    }

    setValidationErrors(errors);
    setFieldErrors(nextFieldErrors);

    return errors.length === 0;
  };

  const persistDraft = useCallback(() => {
    if (typeof window === 'undefined' || step !== 'create' || !isOpen) return;

    const draft = {
      tripName,
      destination,
      startDate,
      endDate,
      hotelLocation,
      coverImage: coverImagePreview || coverImage,
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [coverImage, coverImagePreview, destination, endDate, hotelLocation, isOpen, startDate, step, tripName]);

  useEffect(() => {
    if (!isOpen || tripId || step !== 'create' || draftRestored) return;

    if (typeof window === 'undefined') return;

    const savedDraft = localStorage.getItem(draftStorageKey);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft) as {
          tripName?: string;
          destination?: string;
          startDate?: string;
          endDate?: string;
          hotelLocation?: string;
          coverImage?: string | null;
        };

        setTripName(parsedDraft.tripName || '');
        setDestination(parsedDraft.destination || '');
        setStartDate(parsedDraft.startDate || '');
        setEndDate(parsedDraft.endDate || '');
        setHotelLocation(parsedDraft.hotelLocation || '');
        if (parsedDraft.coverImage) {
          setCoverImagePreview(parsedDraft.coverImage);
        }
      } catch (error) {
        console.error('Error parsing trip planner draft', error);
      }
    }

    setDraftRestored(true);
  }, [draftRestored, draftStorageKey, isOpen, step, tripId]);

  useEffect(() => {
    if (step === 'create') {
      persistDraft();
    }
  }, [destination, endDate, hotelLocation, persistDraft, startDate, step, tripName, coverImagePreview]);

  const handleSaveDraft = () => {
    persistDraft();
    toast.success('Draft saved locally.');
  };

  const handleCreateTrip = async () => {
    if (!validateRequiredFields()) {
      return;
    }

    if (!user) {
      toast.error('Please sign in to create a trip.');
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
          date: date.toISOString().split('T')[0],
          locations: [],
        });
      }

      const prefilledLocation = createPrefilledLocation();
      if (prefilledLocation && newDays.length > 0) {
        const hasLocationAlready = newDays[0].locations.some(
          (loc) =>
            (loc.slug && prefilledLocation.slug && loc.slug === prefilledLocation.slug) ||
            loc.name === prefilledLocation.name
        );

        if (!hasLocationAlready) {
          newDays[0] = {
            ...newDays[0],
            locations: [prefilledLocation, ...newDays[0].locations],
          };
        }

        if (!coverImage && prefilledLocation.image) {
          setCoverImage(prefilledLocation.image);
          setCoverImagePreview(prefilledLocation.image);
        }
      }

      setDays(newDays);
      setStep('plan');
      setValidationErrors([]);
      setFieldErrors({});
      if (typeof window !== 'undefined') {
        localStorage.removeItem(draftStorageKey);
      }
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert(error?.message || 'Failed to create trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!validateRequiredFields()) {
      return;
    }

    if (!currentTripId || !user) {
      alert('No trip to save');
      return;
    }

    setSaving(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Upload cover image if file selected
      let coverImageUrl = coverImage;
      if (coverImageFile) {
        setUploadingCover(true);
        try {
          const formDataToSend = new FormData();
          formDataToSend.append('file', coverImageFile);
          formDataToSend.append('tripId', currentTripId);

          const { data: { session } } = await supabaseClient.auth.getSession();
          const token = session?.access_token;
          if (!token) {
            throw new Error('Not authenticated');
          }

          const res = await fetch('/api/upload-trip-cover', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formDataToSend,
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Upload failed');
          }

          const data = await res.json();
          coverImageUrl = data.url;
          setCoverImage(coverImageUrl);
        } catch (error: any) {
          console.error('Cover image upload error:', error);
          toast.error(`Cover image upload failed: ${error.message}`);
          setUploadingCover(false);
          return;
        } finally {
          setUploadingCover(false);
        }
      }

      // Update trip
      const { error: tripError } = await supabaseClient
        .from('trips')
        .update({
          title: tripName,
          description: hotelLocation || null,
          destination: destination || null,
          start_date: startDate || null,
          end_date: endDate || null,
          cover_image: coverImageUrl || null,
        })
        .eq('id', currentTripId)
        .eq('user_id', user.id);

      if (tripError) throw tripError;

      // Delete only non-hotel itinerary items (preserve hotels)
      const { error: deleteError } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('trip_id', currentTripId)
        .not('notes', 'like', '%"type":"hotel"%');

      if (deleteError) throw deleteError;

      // Delete existing hotels and re-insert them
      const { error: deleteHotelsError } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('trip_id', currentTripId)
        .like('notes', '%"type":"hotel"%');

      if (deleteHotelsError) throw deleteHotelsError;

      // Insert all itinerary items (locations)
      const itemsToInsert: Array<{
        trip_id: string;
        destination_slug: string | null;
        day: number;
        order_index: number;
        time: string | null;
        title: string;
        description: string | null;
        notes: string | null;
      }> = [];
      days.forEach((day, dayIndex) => {
        day.locations.forEach((location, locationIndex) => {
          // Store additional data in notes as JSON
          const notesData: ItineraryItemNotes = {
            raw: location.notes || '',
            duration: location.duration,
            image: location.image,
            city: location.city,
            category: location.category,
            slug: location.slug,
          };

          itemsToInsert.push({
            trip_id: currentTripId,
            destination_slug:
              location.slug || location.name.toLowerCase().replace(/\s+/g, '-') || null,
            day: dayIndex + 1,
            order_index: locationIndex,
            time: location.time || null,
            title: location.name,
            description: location.category || null,
            notes: JSON.stringify(notesData),
          });
        });
      });

      // Insert hotels
      hotels.forEach((hotel, index) => {
        itemsToInsert.push({
          trip_id: currentTripId,
          destination_slug: null,
          day: 1, // Hotels span multiple days, store in day 1
          order_index: index,
          time: null,
          title: hotel.name,
          description: hotel.address || null,
          notes: JSON.stringify({
            type: 'hotel',
            checkInDate: hotel.checkInDate,
            checkOutDate: hotel.checkOutDate,
            address: hotel.address || '',
          }),
        });
      });

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('itinerary_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      setValidationErrors([]);
      setFieldErrors({});

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
          // Sort by time if available
          if (a.time && b.time) {
            return a.time.localeCompare(b.time);
          }
          // Put items with time first
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

  const getAISuggestions = () => {
    // Mock AI suggestions - in real app would call AI API
    return [
      'Consider adding a morning cafe visit before the museum',
      'Your dinner reservation is 2km from your last location - allow 30 min travel time',
      'Weather forecast shows rain on Day 3 - indoor activities recommended',
    ];
  };

  const progressHeader = (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium transition-colors ${
            step === 'create'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            Details
          </span>
          <span className="text-gray-300 dark:text-gray-700 text-xs">→</span>
          <span className={`text-xs font-medium transition-colors ${
            step === 'plan'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            Itinerary
          </span>
        </div>
        {(saving || uploadingCover) && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>
      <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 dark:bg-white transition-all duration-300 ease-out"
          style={{ width: step === 'plan' ? '100%' : '50%' }}
        />
      </div>
    </div>
  );

  // Build custom header with tabs and actions
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
          disabled={saving}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Share trip"
        >
          <ShareIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={handleExportToCalendar}
          disabled={saving}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export to calendar"
        >
          <DownloadIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={handlePrint}
          disabled={saving}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Print itinerary"
        >
          <PrinterIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  ) : undefined;

  // Build content based on step and tab
  const content = (
    <div className="px-6 py-6">
      {progressHeader}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip...</p>
        </div>
      ) : step === 'create' ? (
        <div className="space-y-6">
          {validationErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 flex gap-2.5 text-xs text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1.5">Please fix the required fields:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor={`trip-planner-name-${currentTripId || 'new'}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Trip Name
            </label>
            <input
              id={`trip-planner-name-${currentTripId || 'new'}`}
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Summer in Paris"
              autoComplete="off"
              className={`w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-gray-900 focus:outline-none transition-colors text-sm ${
                fieldErrors.tripName
                  ? 'border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400'
                  : 'border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-white'
              }`}
            />
            {fieldErrors.tripName && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.tripName}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor={`trip-planner-destination-${currentTripId || 'new'}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Destination
            </label>
            <input
              id={`trip-planner-destination-${currentTripId || 'new'}`}
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Paris, France"
              autoComplete="off"
              className={`w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-gray-900 focus:outline-none transition-colors text-sm ${
                fieldErrors.destination
                  ? 'border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400'
                  : 'border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-white'
              }`}
            />
            {fieldErrors.destination && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.destination}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor={`trip-planner-hotel-${currentTripId || 'new'}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Hotel / Base Location
            </label>
            <input
              id={`trip-planner-hotel-${currentTripId || 'new'}`}
              type="text"
              value={hotelLocation}
              onChange={(e) => setHotelLocation(e.target.value)}
              placeholder="Hotel Le Marais"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor={`trip-planner-start-date-${currentTripId || 'new'}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                id={`trip-planner-start-date-${currentTripId || 'new'}`}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                autoComplete="off"
                className={`w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-gray-900 focus:outline-none transition-colors text-sm ${
                  fieldErrors.startDate
                    ? 'border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400'
                    : 'border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-white'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor={`trip-planner-end-date-${currentTripId || 'new'}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                id={`trip-planner-end-date-${currentTripId || 'new'}`}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                autoComplete="off"
                className={`w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-gray-900 focus:outline-none transition-colors text-sm ${
                  fieldErrors.endDate
                    ? 'border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400'
                    : 'border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-white'
                }`}
              />
            </div>
          </div>

          {(fieldErrors.startDate || fieldErrors.endDate) && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.startDate || fieldErrors.endDate}
            </p>
          )}

          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleCreateTrip}
              disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
              className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Trip'
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Save draft locally
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {validationErrors.length > 0 && (
              <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 flex gap-3 text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold mb-2">Please fix the required fields before saving:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
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

              {/* Hotels Section */}
              <div className="mb-12 pb-8 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Hotels</h3>
                  <button
                    onClick={() => {
                      setHotels([...hotels, {
                        name: '',
                        checkInDate: startDate || '',
                        checkOutDate: endDate || '',
                      }]);
                    }}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    + Add Hotel
                  </button>
                </div>
                <div className="space-y-4">
                  {hotels.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No hotels added yet</p>
                  ) : (
                    hotels.map((hotel, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Hotel Name
                          </label>
                          <input
                            type="text"
                            value={hotel.name}
                            onChange={(e) => {
                              const updated = [...hotels];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setHotels(updated);
                            }}
                            placeholder="Hotel name"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Check-in
                            </label>
                            <input
                              type="date"
                              value={hotel.checkInDate}
                              onChange={(e) => {
                                const updated = [...hotels];
                                updated[index] = { ...updated[index], checkInDate: e.target.value };
                                setHotels(updated);
                              }}
                              min={startDate}
                              max={endDate}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Check-out
                            </label>
                            <input
                              type="date"
                              value={hotel.checkOutDate}
                              onChange={(e) => {
                                const updated = [...hotels];
                                updated[index] = { ...updated[index], checkOutDate: e.target.value };
                                setHotels(updated);
                              }}
                              min={hotel.checkInDate || startDate}
                              max={endDate}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address (Optional)
                          </label>
                          <input
                            type="text"
                            value={hotel.address || ''}
                            onChange={(e) => {
                              const updated = [...hotels];
                              updated[index] = { ...updated[index], address: e.target.value };
                              setHotels(updated);
                            }}
                            placeholder="Hotel address"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setHotels(hotels.filter((_, i) => i !== index));
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove Hotel
                        </button>
                      </div>
                    ))
                  )}
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
        title={step === 'create' ? 'Create Trip' : undefined}
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
