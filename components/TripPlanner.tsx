'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
  X,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
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
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';
import UMCard from './ui/UMCard';
import UMActionPill from './ui/UMActionPill';
import UMSectionTitle from './ui/UMSectionTitle';
import { HotelAutocompleteInput } from './HotelAutocompleteInput';
import type { Trip as TripSchema, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

type Tab = 'details' | 'itinerary' | 'hotels';

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
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showShare, setShowShare] = useState(false);
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
    startDate: string;
    endDate: string;
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
      // Only set prefilled values if prefilledDestination exists
      if (prefilledDestination) {
        setDestination(prefilledDestination.city || prefilledDestination.name || '');
        setTripName(`${prefilledDestination.name} Trip`);
        if (prefilledDestination.image) {
        setCoverImage(prefilledDestination.image);
        setCoverImagePreview(prefilledDestination.image);
      }
      } else {
        // Ensure empty state when no prefilled destination
        setTripName('');
        setDestination('');
    }
    }
  }, [isOpen, tripId, user, prefilledDestination]);

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
    setDestination('');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setHotels([]);
    setActiveTab('details');
    setCurrentTripId(null);
    setCoverImage(null);
    setCoverImageFile(null);
    setCoverImagePreview(null);
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
      setCurrentTripId(tripData.id);
      setCoverImage(tripData.cover_image || null);
      setCoverImagePreview(tripData.cover_image || null);

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
          startDate: notesData.startDate || notesData.checkInDate || tripData.start_date || '',
          endDate: notesData.endDate || notesData.checkOutDate || tripData.end_date || '',
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

      setActiveTab('itinerary');
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
    if (typeof window === 'undefined' || currentTripId || !isOpen) return;

    const draft = {
      tripName,
      destination,
      startDate,
      endDate,
      hotels,
      coverImage: coverImagePreview || coverImage,
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [coverImage, coverImagePreview, destination, endDate, hotels, isOpen, startDate, tripName, currentTripId]);

  useEffect(() => {
    if (!isOpen || tripId || currentTripId || draftRestored) return;

    if (typeof window === 'undefined') return;

    const savedDraft = localStorage.getItem(draftStorageKey);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft) as {
          tripName?: string;
          destination?: string;
          startDate?: string;
          endDate?: string;
          hotels?: Array<{ id?: string; name: string; startDate: string; endDate: string; address?: string }>;
          coverImage?: string | null;
        };

        setTripName(parsedDraft.tripName || '');
        setDestination(parsedDraft.destination || '');
        setStartDate(parsedDraft.startDate || '');
        setEndDate(parsedDraft.endDate || '');
        setHotels(parsedDraft.hotels || []);
        if (parsedDraft.coverImage) {
          setCoverImagePreview(parsedDraft.coverImage);
        }
      } catch (error) {
        console.error('Error parsing trip planner draft', error);
      }
    }

    setDraftRestored(true);
  }, [draftRestored, draftStorageKey, isOpen, tripId, currentTripId]);

  useEffect(() => {
    if (!currentTripId) {
      persistDraft();
    }
  }, [destination, endDate, hotels, persistDraft, startDate, tripName, coverImagePreview, currentTripId]);

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
      setActiveTab('itinerary');
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
            startDate: hotel.startDate,
            endDate: hotel.endDate,
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

  // Helper to check for hotel conflicts (only one hotel per night)
  const getNightsInRange = (startDate: string, endDate: string) => {
    const nights: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current.getTime() < end.getTime()) {
      nights.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return nights;
  };

  const hasHotelConflict = (allHotels: typeof hotels, currentIndex: number, newStartDate: string, newEndDate: string) => {
    const newNights = getNightsInRange(newStartDate, newEndDate);
    for (let i = 0; i < allHotels.length; i++) {
      if (i === currentIndex) continue;
      const existingHotel = allHotels[i];
      const existingNights = getNightsInRange(existingHotel.startDate, existingHotel.endDate);
      for (const newNight of newNights) {
        if (existingNights.includes(newNight)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleAddHotel = () => {
    const newHotel = {
      name: '',
      startDate: startDate || '',
      endDate: endDate || '',
    };
    setHotels([...hotels, newHotel]);
  };

  const handleUpdateHotel = (index: number, field: keyof typeof hotels[0], value: string) => {
    const updated = [...hotels];
    const newHotel = { ...updated[index], [field]: value };

    if (field === 'startDate' && newHotel.endDate && new Date(newHotel.startDate) > new Date(newHotel.endDate)) {
      toast.error('Check-in date cannot be after check-out date.');
      return;
    }
    if (field === 'endDate' && newHotel.startDate && new Date(newHotel.endDate) < new Date(newHotel.startDate)) {
      toast.error('Check-out date cannot be before check-in date.');
      return;
    }

    if (startDate && new Date(newHotel.startDate) < new Date(startDate)) {
      toast.error('Check-in date cannot be before trip start date.');
      return;
    }
    if (endDate && new Date(newHotel.endDate) > new Date(endDate)) {
      toast.error('Check-out date cannot be after trip end date.');
      return;
    }

    if (field === 'startDate' || field === 'endDate') {
      if (hasHotelConflict(updated, index, newHotel.startDate, newHotel.endDate)) {
        toast.error('This hotel conflicts with another hotel. Only one hotel per night is allowed.');
        return;
      }
    }

    updated[index] = newHotel;
    setHotels(updated);
  };

  const handleRemoveHotel = (index: number) => {
    setHotels(hotels.filter((_, i) => i !== index));
  };

  // Build header
  const headerContent = currentTripId ? (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light">{tripName || 'Trip Planner'}</h1>
          <button
            onClick={handleSaveTrip}
            disabled={saving}
          className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  ) : undefined;

  // Build content based on tabs
  const content = (
    <div className="px-6 py-8 space-y-8">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip...</p>
        </div>
      ) : !currentTripId ? (
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
            <div className={fieldErrors.destination ? 'relative' : ''}>
              <CityAutocompleteInput
              value={destination}
                onChange={setDestination}
              placeholder="Paris, France"
                className={`${
                fieldErrors.destination
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-gray-200 dark:border-gray-800'
                } bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl`}
              />
            </div>
            {fieldErrors.destination && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.destination}</p>
            )}
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
            <UMActionPill
              onClick={handleCreateTrip}
              variant="primary"
              disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
              className="w-full justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Trip'
              )}
            </UMActionPill>

            <UMActionPill
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full justify-center"
            >
              Save draft locally
            </UMActionPill>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-12">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {(['details', 'itinerary', 'hotels'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`transition-all ${
                    activeTab === tab
                      ? "font-medium text-black dark:text-white"
                      : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

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

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="space-y-10">
            {/* Cover Image Upload */}
              <section className="space-y-4">
                <UMSectionTitle>Cover Image</UMSectionTitle>
                <UMCard className="p-6 space-y-4">
                  {coverImagePreview && (
                    <div className="relative w-full h-64 rounded-[16px] overflow-hidden">
                      <Image
                        src={coverImagePreview}
                        alt="Cover"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 420px"
                      />
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
                    <UMActionPill
                      onClick={() => !uploadingCover && document.getElementById('cover-image-input')?.click()}
                      className="w-full justify-center"
                    >
                      {uploadingCover ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          {coverImagePreview ? 'Change Cover Image' : 'Upload Cover Image'}
                        </>
                      )}
                    </UMActionPill>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Upload a custom cover image, or we'll use the first location's image
                  </p>
                </UMCard>
              </section>

              {/* Trip Information */}
              <section className="space-y-4">
                <UMSectionTitle>Trip Information</UMSectionTitle>
                <UMCard className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Trip Name
                    </label>
                    <input
                      type="text"
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white ${
                        fieldErrors.tripName
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-neutral-200 dark:border-white/20'
                      }`}
                    />
                    {fieldErrors.tripName && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.tripName}</p>
                    )}
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      City
                    </label>
                    <div className={fieldErrors.destination ? 'relative' : ''}>
                      <CityAutocompleteInput
                        value={destination}
                        onChange={setDestination}
                        placeholder="e.g., Tokyo, Paris, New York"
                        className={`${
                          fieldErrors.destination
                            ? 'border-red-300 dark:border-red-700'
                            : 'border-neutral-200 dark:border-white/20'
                        } bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white rounded-xl`}
                      />
              </div>
                    {fieldErrors.destination && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.destination}</p>
                    )}
                </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        inputMode="none"
                        className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white ${
                          fieldErrors.startDate
                            ? 'border-red-300 dark:border-red-700'
                            : 'border-neutral-200 dark:border-white/20'
                        }`}
                      />
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        inputMode="none"
                        className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white ${
                          fieldErrors.endDate
                            ? 'border-red-300 dark:border-red-700'
                            : 'border-neutral-200 dark:border-white/20'
                        }`}
                      />
              </div>
                  </div>
                  {(fieldErrors.startDate || fieldErrors.endDate) && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.startDate || fieldErrors.endDate}
                    </p>
                  )}
                  {currentTripId && (
                    <UMActionPill
                      onClick={handleSaveTrip}
                      variant="primary"
                      className={`w-full justify-center ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Trip Information'
                      )}
                    </UMActionPill>
                  )}
                </UMCard>
              </section>
            </div>
          )}

          {activeTab === 'itinerary' && (
            <div className="space-y-8">
              {days.length > 0 ? (
                days.map((day, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Day {i + 1} – {day.date}
                      </h2>
                    </div>
                  <TripDay
                      dayNumber={i + 1}
                    date={day.date}
                    locations={day.locations}
                      hotelLocation=""
                      onAddLocation={() => setShowAddLocation(i)}
                      onRemoveLocation={(locationId) => handleRemoveLocation(i, locationId)}
                      onReorderLocations={(locations) => handleReorderLocations(i, locations)}
                      onDuplicateDay={() => handleDuplicateDay(i)}
                      onOptimizeRoute={() => handleOptimizeRoute(i)}
                    />
              </div>
                ))
              ) : (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 text-sm">
                  No days added yet. Create a trip first.
            </div>
              )}
            </div>
          )}

          {activeTab === 'hotels' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <UMSectionTitle>Hotels</UMSectionTitle>
                <UMActionPill onClick={handleAddHotel} variant="primary">
                  <Plus className="w-4 h-4" />
                  Add Hotel
                </UMActionPill>
              </div>

              {hotels.length === 0 ? (
                <UMCard className="p-8 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    No hotels added yet
                  </p>
                  <UMActionPill onClick={handleAddHotel} variant="primary">
                    <Plus className="w-4 h-4" />
                    Add Your First Hotel
                  </UMActionPill>
                </UMCard>
              ) : (
                <div className="space-y-4">
                  {hotels.map((hotel, index) => (
                    <UMCard key={index} className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Hotel Name
                            </label>
                            <HotelAutocompleteInput
                              value={hotel.name}
                              onChange={(name) => handleUpdateHotel(index, 'name', name)}
                              placeholder="Hotel Le Marais"
                              className="w-full"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Check-in Date
                              </label>
                              <input
                                type="date"
                                value={hotel.startDate}
                                onChange={(e) => handleUpdateHotel(index, 'startDate', e.target.value)}
                                min={startDate || ''}
                                max={endDate || ''}
                                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Check-out Date
                              </label>
                              <input
                                type="date"
                                value={hotel.endDate}
                                onChange={(e) => handleUpdateHotel(index, 'endDate', e.target.value)}
                                min={hotel.startDate || startDate || ''}
                                max={endDate || ''}
                                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveHotel(index)}
                          className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                          title="Remove hotel"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </UMCard>
                  ))}
                </div>
              )}

              {currentTripId && hotels.length > 0 && (
                <div className="pt-4">
                  <UMActionPill
                    onClick={() => !saving && handleSaveTrip()}
                    variant="primary"
                    className={`w-full justify-center ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Hotels'
                    )}
                  </UMActionPill>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={currentTripId ? undefined : 'Create Trip'}
        headerContent={headerContent}
        desktopWidth="420px"
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
