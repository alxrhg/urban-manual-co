'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  X,
  Loader2,
  Share2,
  Download,
  Printer,
  Save,
  Upload,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TripDay } from '@/components/TripDay';
import { AddLocationToTrip } from '@/components/AddLocationToTrip';
import type { Trip, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

export default function TripDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      fetchTripDetails();
    }
  }, [authLoading, user, tripId]);

  const fetchTripDetails = async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Fetch trip details
      const { data: tripData, error: tripError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !tripData) {
        console.error('Error fetching trip:', tripError);
        router.push('/trips');
        return;
      }

      const trip = tripData as Trip;
      
      // Check if user owns this trip or if it's public
      if (!trip.is_public && trip.user_id !== user?.id) {
        router.push('/trips');
        return;
      }

      setTrip(trip);
      setEditedTitle(trip.title);
      setEditedStartDate(trip.start_date || '');
      setEditedEndDate(trip.end_date || '');
      if (trip.cover_image) {
        setCoverImagePreview(trip.cover_image);
      }

      // Fetch itinerary items
      const { data: itemsData, error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) {
        console.error('Error fetching itinerary items:', itemsError);
      } else {
        setItineraryItems(itemsData || []);

        // Fetch destinations for items with destination_slug
        const slugs = (itemsData || [])
          .map((item: any) => item.destination_slug)
          .filter((slug: string | null) => slug !== null) as string[];

        if (slugs.length > 0) {
          const { data: destData, error: destError } = await supabaseClient
            .from('destinations')
            .select('*')
            .in('slug', slugs);

          if (!destError && destData) {
            const destMap = new Map<string, Destination>();
            destData.forEach((dest: any) => {
              destMap.set(dest.slug, dest);
            });
            setDestinations(destMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!trip || !user) return;

    try {
      setSaving(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const updates: any = {};
      
      if (editedTitle !== trip.title) {
        updates.title = editedTitle;
      }
      
      if (editedStartDate !== (trip.start_date || '')) {
        updates.start_date = editedStartDate || null;
      }
      
      if (editedEndDate !== (trip.end_date || '')) {
        updates.end_date = editedEndDate || null;
      }

      // Handle cover image upload
      if (coverImageFile) {
        const fileExt = coverImageFile.name.split('.').pop();
        const fileName = `${trip.id}-${Date.now()}.${fileExt}`;
        const filePath = `trip-covers/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('trip-covers')
          .upload(filePath, coverImageFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabaseClient.storage
            .from('trip-covers')
            .getPublicUrl(filePath);
          updates.cover_image = publicUrl;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseClient
          .from('trips')
          .update(updates)
          .eq('id', trip.id)
          .eq('user_id', user.id);

        if (error) throw error;

        // Update local state
        setTrip({
          ...trip,
          ...updates,
        });
        setIsEditingTitle(false);
        setIsEditingDates(false);
        setCoverImageFile(null);
        setCoverImagePreview(updates.cover_image || coverImagePreview);
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!trip) return;
    
    const url = `${window.location.origin}/trips/${trip.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: `Check out my trip: ${trip.title}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleExportToCalendar = () => {
    if (!trip || !trip.start_date) {
      alert('Please set a start date for your trip first.');
      return;
    }

    // Generate ICS file
    const startDate = new Date(trip.start_date);
    const endDate = trip.end_date ? new Date(trip.end_date) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Urban Manual//Trip Calendar//EN',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${trip.title}`,
      `DESCRIPTION:${trip.description || ''}`,
      `LOCATION:${trip.destination || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${trip.title.replace(/\s+/g, '-')}.ics`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteItineraryItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the trip?')) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItineraryItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  const deleteTrip = async () => {
    if (!trip || !confirm(`Are you sure you want to delete "${trip.title}"?`)) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', trip.id);

      if (error) throw error;

      router.push('/trips');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  // Group items by day
  const itemsByDay = itineraryItems.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  // Calculate date for a specific day based on trip start_date
  const getDateForDay = (dayNumber: number): string => {
    if (!trip?.start_date) {
      const date = new Date();
      date.setDate(date.getDate() + dayNumber - 1);
      return date.toISOString().split('T')[0];
    }
    const startDate = new Date(trip.start_date);
    startDate.setDate(startDate.getDate() + dayNumber - 1);
    return startDate.toISOString().split('T')[0];
  };

  const transformItemsToLocations = (items: ItineraryItem[]) => {
    return items.map((item) => {
      const destination = item.destination_slug
        ? destinations.get(item.destination_slug)
        : null;

      let notesData: ItineraryItemNotes = {};
      if (item.notes) {
        try {
          notesData = JSON.parse(item.notes) as ItineraryItemNotes;
        } catch {
          notesData = { raw: item.notes };
        }
      }

      return {
        id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
        name: destination?.name || item.title,
        city: destination?.city || notesData.city || '',
        category: destination?.category || item.description || '',
        image: destination?.image || notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
        notes: notesData.raw || undefined,
        duration: notesData.duration || undefined,
      };
    });
  };

  const handleAddLocation = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setShowAddLocationModal(true);
  };

  const handleLocationAdded = async (location: {
    id: number;
    name: string;
    city: string;
    category: string;
    image: string;
    time?: string;
    notes?: string;
    duration?: number;
  }) => {
    if (!trip || selectedDay === null) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', trip.id)
        .eq('day', selectedDay)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = existingItems ? (existingItems.order_index || 0) + 1 : 0;

      const notesData = {
        raw: location.notes || '',
        duration: location.duration,
        image: location.image,
        city: location.city,
        category: location.category,
      };

      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: trip.id,
          destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
          day: selectedDay,
          order_index: nextOrder,
          time: location.time || null,
          title: location.name,
          description: location.category,
          notes: JSON.stringify(notesData),
        });

      if (error) throw error;

      await fetchTripDetails();
      setShowAddLocationModal(false);
      setSelectedDay(null);
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Failed to add location. Please try again.');
    }
  };

  const handleRemoveLocation = async (locationId: number) => {
    const itemId = itineraryItems.find(item => parseInt(item.id) === locationId)?.id;
    if (itemId) {
      await deleteItineraryItem(itemId);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Smart suggestions (mock data - can be replaced with real suggestions)
  const smartSuggestions = [
    { text: 'Add breakfast spots near your first destination', icon: CheckCircle2 },
    { text: 'Consider adding a museum visit for Day 2', icon: Sparkles },
    { text: 'You might enjoy a sunset dinner at the waterfront', icon: CheckCircle2 },
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const coverImageUrl = coverImagePreview || trip.cover_image;
  const dateRange = trip.start_date && trip.end_date
    ? `${formatDate(trip.start_date)}–${formatDate(trip.end_date)}`
    : trip.start_date
    ? `From ${formatDate(trip.start_date)}`
    : null;
  const metaInfo = [trip.destination, dateRange].filter(Boolean).join(' · ');

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Back Button */}
      <div className="w-full px-6 md:px-10 lg:px-12 pt-6">
        <button
          onClick={() => router.push('/trips')}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Back to Trips"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trips</span>
        </button>
      </div>

      {/* Main Content - 720px width, centered */}
      <div className="w-full flex justify-center px-6 md:px-10 lg:px-12 py-12">
        <div className="w-full max-w-[720px] flex flex-col gap-12">
          {/* Header Section - Inline Header */}
          <div className="flex flex-col gap-3">
            {isEditingTitle ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:outline-none focus:border-gray-900 dark:focus:border-white"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setEditedTitle(trip.title);
                    setIsEditingTitle(false);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1
                className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => trip.user_id === user?.id && setIsEditingTitle(true)}
              >
                {trip.title}
              </h1>
            )}
            
            {isEditingDates ? (
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={formatDateForInput(editedStartDate)}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                />
                <span className="text-gray-500">–</span>
                <input
                  type="date"
                  value={formatDateForInput(editedEndDate)}
                  onChange={(e) => setEditedEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                />
                <button
                  onClick={() => {
                    setEditedStartDate(trip.start_date || '');
                    setEditedEndDate(trip.end_date || '');
                    setIsEditingDates(false);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => trip.user_id === user?.id && setIsEditingDates(true)}
              >
                {metaInfo}
              </div>
            )}
          </div>

          {/* Action Row - Button Group, Subtle Variant, Small Size */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleExportToCalendar}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {trip.user_id === user?.id && (
              <button
                onClick={deleteTrip}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>

          {/* Smart Suggestions - Card */}
          {smartSuggestions.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Smart Suggestions
              </h2>
              <ul className="space-y-2">
                {smartSuggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <li key={index} className="flex items-start gap-3">
                      <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {suggestion.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Itinerary Section */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Itinerary
            </h2>
            {Object.keys(itemsByDay).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-10 py-16 text-center space-y-4">
                <MapPin className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add destinations to this trip to start building your itinerary.
                </p>
                <button
                  onClick={() => handleAddLocation(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Add First Location
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(itemsByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, items]) => {
                    const dayNumber = Number(day);
                    const dayDate = getDateForDay(dayNumber);
                    const locations = transformItemsToLocations(items);

                    return (
                      <div
                        key={day}
                        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6"
                      >
                        <TripDay
                          dayNumber={dayNumber}
                          date={dayDate}
                          locations={locations}
                          onAddLocation={() => handleAddLocation(dayNumber)}
                          onRemoveLocation={handleRemoveLocation}
                          onReorderLocations={async (reorderedLocations) => {
                            try {
                              const supabaseClient = createClient();
                              if (!supabaseClient || !user) return;

                              await supabaseClient
                                .from('itinerary_items')
                                .delete()
                                .eq('trip_id', tripId)
                                .eq('day', dayNumber);

                              const itemsToInsert = reorderedLocations.map((loc, idx) => {
                                const originalItem = items.find(
                                  (item) => item.title === loc.name || item.destination_slug === loc.name.toLowerCase().replace(/\s+/g, '-')
                                );
                                
                                let notesData: ItineraryItemNotes = {};
                                if (originalItem?.notes) {
                                  try {
                                    notesData = JSON.parse(originalItem.notes) as ItineraryItemNotes;
                                  } catch {
                                    notesData = { raw: originalItem.notes };
                                  }
                                }

                                const updatedNotes = JSON.stringify({
                                  raw: loc.notes || notesData.raw || '',
                                  duration: loc.duration || notesData.duration,
                                  image: loc.image || notesData.image,
                                  city: loc.city || notesData.city,
                                  category: loc.category || notesData.category,
                                });

                                return {
                                  trip_id: tripId,
                                  destination_slug: originalItem?.destination_slug || loc.name.toLowerCase().replace(/\s+/g, '-'),
                                  day: dayNumber,
                                  order_index: idx,
                                  time: loc.time || originalItem?.time || null,
                                  title: loc.name,
                                  description: loc.category || originalItem?.description || '',
                                  notes: updatedNotes,
                                };
                              });

                              if (itemsToInsert.length > 0) {
                                await supabaseClient
                                  .from('itinerary_items')
                                  .insert(itemsToInsert);
                              }

                              await fetchTripDetails();
                            } catch (error) {
                              console.error('Error reordering locations:', error);
                              alert('Failed to reorder locations. Please try again.');
                            }
                          }}
                          onDuplicateDay={async () => {
                            alert('Duplicate day feature coming soon');
                          }}
                          onOptimizeRoute={async () => {
                            alert('Route optimization feature coming soon');
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Cover Image Section */}
          {trip.user_id === user?.id && (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Cover Image
              </h2>
              <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
                {coverImagePreview ? (
                  <Image
                    src={coverImagePreview}
                    alt="Cover"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 720px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Cover Image
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recommended: 16:9, 1920x1080px
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Add Location Modal */}
      {trip && selectedDay !== null && (
        <AddLocationToTrip
          onAdd={handleLocationAdded}
          onClose={() => {
            setShowAddLocationModal(false);
            setSelectedDay(null);
          }}
        />
      )}
    </main>
  );
}
