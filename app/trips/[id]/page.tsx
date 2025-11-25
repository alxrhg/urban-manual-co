'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import SuggestionCard from '@/components/trip/SuggestionCard';
import UMCard from '@/components/ui/UMCard';
import UMActionPill from '@/components/ui/UMActionPill';
import UMSectionTitle from '@/components/ui/UMSectionTitle';
import { Camera, Loader2, Plus, Trash2, Calendar, MapPin, ArrowLeft, Share2, Building2, Clock, Utensils } from 'lucide-react';
import Image from 'next/image';
import { TripPlanner } from '@/components/TripPlanner';
import { HotelAutocompleteInput } from '@/components/HotelAutocompleteInput';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';
import TripDayEditorDrawer from '@/components/drawers/TripDayEditorDrawer';

type Tab = 'itinerary' | 'details' | 'hotels';

interface Hotel {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  address?: string;
  notes?: string;
}

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string | null;
  const { trip, loading: tripLoading, error } = useTrip(tripId);
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCity, setEditedCity] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [hotelEditMode, setHotelEditMode] = useState(false);
  const [inlineDayEditMode, setInlineDayEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const dayEditorRef = useRef<HTMLDivElement>(null);

  // Load recommendations based on trip destination
  const loadRecommendations = async () => {
    if (!trip?.destination || !user) return;

    try {
      setLoadingRecommendations(true);
      const response = await fetch(`/api/recommendations?city=${trip.destination}&limit=6`);

      if (response.ok) {
        const data = await response.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        } else {
          setRecommendations([]);
        }
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Initialize form when trip loads
  useEffect(() => {
    if (trip) {
      setEditedTitle(trip.title || '');
      setEditedCity(trip.destination || '');
      setEditedStartDate(trip.start_date || '');
      setEditedEndDate(trip.end_date || '');
      setCoverImagePreview(trip.cover_image || null);
      setSelectedDayIndex(0);
      loadHotels();
      loadRecommendations();
    }
  }, [trip]);

  useEffect(() => {
    if (activeTab !== 'hotels' && hotelEditMode) {
      setHotelEditMode(false);
    }
  }, [activeTab, hotelEditMode]);

  // Load hotels from itinerary_items
  const loadHotels = async () => {
    if (!tripId || !user) return;

    try {
      setLoadingHotels(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data: items, error } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .like('notes', '%"type":"hotel"%')
        .order('day', { ascending: true });

      if (error) throw error;

      const parsedHotels: Hotel[] = (items || []).map((item) => {
        try {
          const notes = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes || {};
          return {
            id: item.id,
            name: item.title,
            startDate: notes.startDate || trip?.start_date || '',
            endDate: notes.endDate || trip?.end_date || '',
            address: notes.address || '',
            notes: notes.notes || '',
          };
        } catch {
          return {
            id: item.id,
            name: item.title,
            startDate: trip?.start_date || '',
            endDate: trip?.end_date || '',
          };
        }
      });

      setHotels(parsedHotels);
    } catch (error: any) {
      console.error('Error loading hotels:', error);
    } finally {
      setLoadingHotels(false);
    }
  };

  // Format dates for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateLong = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Calculate trip duration
  const getTripDuration = () => {
    if (!trip?.start_date || !trip?.end_date) return null;
    try {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return null;
    }
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

  const handleSaveTripInfo = async () => {
    if (!trip || !user) return;

    try {
      setSaving(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const updates: any = {};

      if (editedTitle !== trip.title) updates.title = editedTitle;
      if (editedCity !== (trip.destination || '')) updates.destination = editedCity || null;
      if (editedStartDate !== (trip.start_date || '')) updates.start_date = editedStartDate || null;
      if (editedEndDate !== (trip.end_date || '')) updates.end_date = editedEndDate || null;

      // Handle cover image upload
      if (coverImageFile) {
        setUploadingCover(true);
        try {
          const fileExt = coverImageFile.name.split('.').pop();
          const fileName = `${trip.id}-${Date.now()}.${fileExt}`;
          const filePath = `trip-covers/${fileName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from('trip-covers')
            .upload(filePath, coverImageFile, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabaseClient.storage
            .from('trip-covers')
            .getPublicUrl(filePath);

          updates.cover_image = publicUrl;
        } catch (error: any) {
          console.error('Cover image upload error:', error);
          alert(`Cover image upload failed: ${error.message}`);
          setUploadingCover(false);
          return;
        } finally {
          setUploadingCover(false);
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseClient
          .from('trips')
          .update(updates)
          .eq('id', trip.id)
          .eq('user_id', user.id);

        if (error) throw error;
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error saving trip:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Hotel conflict helpers
  const getNightsInRange = (startDate: string, endDate: string): string[] => {
    if (!startDate || !endDate) return [];
    const nights: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current < end) {
      nights.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return nights;
  };

  const hasHotelConflict = (hotels: Hotel[], currentIndex: number, newStartDate: string, newEndDate: string): boolean => {
    if (!newStartDate || !newEndDate) return false;
    const newNights = getNightsInRange(newStartDate, newEndDate);
    for (let i = 0; i < hotels.length; i++) {
      if (i === currentIndex) continue;
      const hotel = hotels[i];
      if (!hotel.startDate || !hotel.endDate) continue;
      const existingNights = getNightsInRange(hotel.startDate, hotel.endDate);
      const hasOverlap = newNights.some(night => existingNights.includes(night));
      if (hasOverlap) return true;
    }
    return false;
  };

  const handleAddHotel = () => {
    const newHotel: Hotel = {
      name: '',
      startDate: trip?.start_date || '',
      endDate: trip?.end_date || '',
    };
    setHotels([...hotels, newHotel]);
  };

  const handleUpdateHotel = (index: number, field: keyof Hotel, value: string) => {
    const updated = [...hotels];
    const hotel = updated[index];
    const newHotel = { ...hotel, [field]: value };

    if ((field === 'startDate' || field === 'endDate') && newHotel.startDate && newHotel.endDate) {
      if (hasHotelConflict(updated, index, newHotel.startDate, newHotel.endDate)) {
        alert('This hotel conflicts with another hotel. Only one hotel per night is allowed.');
        return;
      }
      if (new Date(newHotel.endDate) <= new Date(newHotel.startDate)) {
        alert('Check-out date must be after check-in date.');
        return;
      }
    }

    updated[index] = newHotel;
    setHotels(updated);
  };

  const handleRemoveHotel = async (index: number) => {
    const hotel = hotels[index];
    if (hotel.id && tripId) {
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) return;
        await supabaseClient.from('itinerary_items').delete().eq('id', hotel.id).eq('trip_id', tripId);
      } catch (error) {
        console.error('Error removing hotel:', error);
      }
    }
    setHotels(hotels.filter((_, i) => i !== index));
  };

  const handleSaveHotels = async () => {
    if (!tripId || !user || !trip) return;

    for (let i = 0; i < hotels.length; i++) {
      const hotel = hotels[i];
      if (!hotel.name.trim()) {
        alert(`Hotel ${i + 1} must have a name.`);
        return;
      }
      if (!hotel.startDate || !hotel.endDate) {
        alert(`Hotel ${i + 1} must have both check-in and check-out dates.`);
        return;
      }
      if (new Date(hotel.endDate) <= new Date(hotel.startDate)) {
        alert(`Hotel ${i + 1}: Check-out date must be after check-in date.`);
        return;
      }
      if (hasHotelConflict(hotels, i, hotel.startDate, hotel.endDate)) {
        alert(`Hotel ${i + 1} conflicts with another hotel.`);
        return;
      }
    }

    try {
      setSaving(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      await supabaseClient.from('itinerary_items').delete().eq('trip_id', tripId).like('notes', '%"type":"hotel"%');

      const itemsToInsert = hotels.map((hotel, index) => ({
        trip_id: tripId,
        destination_slug: null,
        day: 1,
        order_index: index,
        time: null,
        title: hotel.name,
        description: hotel.address || null,
        notes: JSON.stringify({
          type: 'hotel',
          startDate: hotel.startDate,
          endDate: hotel.endDate,
          address: hotel.address || '',
          notes: hotel.notes || '',
        }),
      }));

      if (itemsToInsert.length > 0) {
        const { error } = await supabaseClient.from('itinerary_items').insert(itemsToInsert);
        if (error) throw error;
      }

      router.refresh();
    } catch (error: any) {
      console.error('Error saving hotels:', error);
      alert(`Failed to save hotels: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (tripLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          <UMActionPill onClick={() => router.push('/trips')} className="mt-4">
            Back to Trips
          </UMActionPill>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="text-center py-12">
          <p className="text-neutral-500">Trip not found</p>
          <UMActionPill onClick={() => router.push('/trips')} className="mt-4">
            Back to Trips
          </UMActionPill>
        </div>
      </div>
    );
  }

  const isOwner = trip.user_id === user?.id;
  const tripDuration = getTripDuration();
  const tabs: { key: Tab; label: string }[] = [
    { key: 'itinerary', label: 'Itinerary' },
    { key: 'details', label: 'Details' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Cover Hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 min-h-[260px]">
          {coverImagePreview ? (
            <>
              <Image
                src={coverImagePreview}
                alt={trip.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900">
              <MapPin className="w-16 h-16 text-neutral-400 dark:text-neutral-600" />
            </div>
          )}

          <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => router.push('/trips')}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Trips
              </button>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button
                    onClick={() => setShowTripPlanner(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/10 transition"
                    title="Edit trip"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                )}
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/10 transition"
                  title="Share trip"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
                Trip
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold">{trip.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                {trip.destination && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {trip.destination}
                  </span>
                )}
                {trip.start_date && trip.end_date && (
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                  </span>
                )}
                {tripDuration && (
                  <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium backdrop-blur">
                    {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="space-y-8">
        {/* Tab Navigation - Match account page style */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 -mx-6 px-6 md:-mx-10 md:px-10">
          <div className="flex gap-6 text-sm">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-black dark:border-white text-black dark:text-white font-medium'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Itinerary Tab */}
        {activeTab === 'itinerary' && (
          <div className="space-y-6">
            {trip.days && trip.days.length > 0 ? (
              <>
                {/* Horizontal Scrollable Day Pills */}
                <div
                  ref={dayScrollRef}
                  className="overflow-x-auto -mx-6 px-6 scrollbar-hide"
                >
                  <div className="flex gap-2 min-w-max pb-2">
                    {trip.days.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDayIndex(i)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedDayIndex === i
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        Day {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Day Content */}
                {trip.days[selectedDayIndex] && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Day {selectedDayIndex + 1}
                        </h2>
                        <p className="text-sm text-neutral-500">
                          {trip.days[selectedDayIndex].date}
                        </p>
                      </div>
                      {isOwner && (
                        <div className="flex flex-wrap gap-2">
                          <UMActionPill
                            onClick={() => {
                              if (!inlineDayEditMode) {
                                setInlineDayEditMode(true);
                                setTimeout(() => dayEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                              } else {
                                dayEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                          >
                            {inlineDayEditMode ? 'Editing…' : 'Edit Day'}
                          </UMActionPill>
                          <UMActionPill
                            variant="primary"
                            onClick={() =>
                              openDrawer('place-selector', {
                                day: trip.days[selectedDayIndex],
                                trip,
                                index: selectedDayIndex,
                                replaceIndex: null,
                              })
                            }
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Place
                          </UMActionPill>
                        </div>
                      )}
                    </div>
                    <DayTimeline day={trip.days[selectedDayIndex]} fallbackCity={trip.destination || undefined} />
                    {isOwner && inlineDayEditMode && (
                      <section ref={dayEditorRef} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                            Edit itinerary
                          </h3>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            Inline editor (auto-syncs when you save)
                          </p>
                        </div>
                        <div className="rounded-[32px] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0f1012] p-4 sm:p-6">
                          <TripDayEditorDrawer
                            day={trip.days[selectedDayIndex]}
                            index={selectedDayIndex}
                            trip={trip}
                            hideHeader
                            className="space-y-8"
                          />
                        </div>
                        <div className="flex justify-end">
                          <UMActionPill onClick={() => setInlineDayEditMode(false)}>
                            Done
                          </UMActionPill>
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            ) : (
              <UMCard className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  No itinerary yet. Add dates to your trip to start planning.
                </p>
                {isOwner && (
                  <UMActionPill variant="primary" onClick={() => setShowTripPlanner(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Set Trip Dates
                  </UMActionPill>
                )}
              </UMCard>
            )}

            {/* Smart Suggestions */}
            {trip.days && trip.days.length > 0 && (
              <section className="space-y-4 pt-4">
                <UMSectionTitle>Smart Suggestions</UMSectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SuggestionCard
                    icon="🍳"
                    title="Add a morning cafe"
                    detail="3 curated options near your first stop"
                    onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
                  />
                  <SuggestionCard
                    icon="🖼️"
                    title="Museum recommendation"
                    detail="2 top picks within 10 min walk"
                    onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
                  />
                </div>
              </section>
            )}

            {/* Recommendations */}
            {(loadingRecommendations || recommendations.length > 0) && (
              <section className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
                  You Might Also Like
                </h3>
                {loadingRecommendations ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex-shrink-0 w-32">
                        <div className="aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-[16px] mb-2 animate-pulse" />
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded mb-1 animate-pulse" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
                    {recommendations.map(rec => (
                      <button
                        key={rec.slug}
                        onClick={() => router.push(`/destination/${rec.slug}`)}
                        className="group text-left flex-shrink-0 w-32"
                      >
                        <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-[16px] overflow-hidden mb-2 border border-neutral-200 dark:border-neutral-700">
                          {rec.image ? (
                            <Image
                              src={rec.image}
                              alt={rec.name}
                              fill
                              sizes="128px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-8 w-8 text-neutral-300" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-xs leading-tight line-clamp-2 text-gray-900 dark:text-white">
                          {rec.name}
                        </h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{rec.city}</p>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && isOwner && (
          <div className="space-y-8 max-w-2xl">
            {/* Cover Image */}
            <section className="space-y-4">
              <UMSectionTitle>Cover Image</UMSectionTitle>
              <UMCard className="p-6 space-y-4">
                {coverImagePreview && (
                  <div className="relative w-full h-48 rounded-[16px] overflow-hidden">
                    <Image
                      src={coverImagePreview}
                      alt="Cover"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="hidden"
                  />
                  <UMActionPill
                    onClick={() => !uploadingCover && fileInputRef.current?.click()}
                    className="w-full justify-center"
                  >
                    {uploadingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        {coverImagePreview ? 'Change Cover' : 'Upload Cover'}
                      </>
                    )}
                  </UMActionPill>
                </div>
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
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Destination
                  </label>
                  <CityAutocompleteInput
                    value={editedCity}
                    onChange={setEditedCity}
                    placeholder="e.g., Tokyo, Paris, New York"
                    className="border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editedStartDate}
                      onChange={(e) => setEditedStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editedEndDate}
                      onChange={(e) => setEditedEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <UMActionPill
                    onClick={saving ? undefined : handleSaveTripInfo}
                    variant="primary"
                    className={`w-full justify-center ${saving ? 'opacity-50' : ''}`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </UMActionPill>
                </div>
              </UMCard>
            </section>

            {/* Hotels Management */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <UMSectionTitle>Accommodations</UMSectionTitle>
                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    {hotelEditMode ? (
                      <>
                        <UMActionPill onClick={handleAddHotel} variant="primary">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Hotel
                        </UMActionPill>
                        <UMActionPill onClick={() => setHotelEditMode(false)}>
                          Done
                        </UMActionPill>
                      </>
                    ) : (
                      <UMActionPill onClick={() => setHotelEditMode(true)}>
                        Edit
                      </UMActionPill>
                    )}
                  </div>
                )}
              </div>

              {loadingHotels ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-neutral-400" />
                  <p className="text-sm text-neutral-500">Loading hotels...</p>
                </div>
              ) : hotels.length === 0 ? (
                <UMCard className="p-8 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    No hotels added yet
                  </p>
                  {isOwner && !hotelEditMode && (
                    <UMActionPill onClick={() => setHotelEditMode(true)} variant="primary">
                      Start Adding
                    </UMActionPill>
                  )}
                  {isOwner && hotelEditMode && (
                    <UMActionPill onClick={handleAddHotel} variant="primary">
                      <Plus className="w-4 h-4 mr-1" />
                      Add First Hotel
                    </UMActionPill>
                  )}
                </UMCard>
              ) : hotelEditMode ? (
                <div className="space-y-4">
                  {hotels.map((hotel, index) => (
                    <UMCard key={index} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Hotel Name
                            </label>
                            <HotelAutocompleteInput
                              value={hotel.name}
                              onChange={(value) => handleUpdateHotel(index, 'name', value)}
                              placeholder="Hotel Le Marais"
                              disabled={!isOwner}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Check-in
                              </label>
                              <input
                                type="date"
                                value={hotel.startDate}
                                onChange={(e) => handleUpdateHotel(index, 'startDate', e.target.value)}
                                min={trip?.start_date || ''}
                                max={trip?.end_date || ''}
                                disabled={!isOwner}
                                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Check-out
                              </label>
                              <input
                                type="date"
                                value={hotel.endDate}
                                onChange={(e) => handleUpdateHotel(index, 'endDate', e.target.value)}
                                min={hotel.startDate || trip?.start_date || ''}
                                max={trip?.end_date || ''}
                                disabled={!isOwner}
                                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveHotel(index)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </UMCard>
                  ))}

                  {isOwner && hotels.length > 0 && (
                    <UMActionPill
                      onClick={saving ? undefined : handleSaveHotels}
                      variant="primary"
                      className={`w-full justify-center ${saving ? 'opacity-50' : ''}`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Hotels'
                      )}
                    </UMActionPill>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {hotels.map((hotel, index) => (
                    <UMCard key={`view-${index}`} className="p-5 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {hotel.name || 'Untitled hotel'}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {hotel.address || 'Address not set'}
                          </p>
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {hotel.startDate
                            ? formatDateLong(hotel.startDate)
                            : 'Start date TBD'}{' '}
                          –{' '}
                          {hotel.endDate ? formatDateLong(hotel.endDate) : 'End date TBD'}
                        </div>
                      </div>
                      {hotel.notes && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {hotel.notes}
                        </p>
                      )}
                    </UMCard>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
*** End Patch*** End Patch
              <UMSectionTitle>Accommodations</UMSectionTitle>
              {isOwner && (
                <div className="flex flex-wrap gap-2">
                  {hotelEditMode ? (
                    <>
                      <UMActionPill onClick={handleAddHotel} variant="primary">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Hotel
                      </UMActionPill>
                      <UMActionPill onClick={() => setHotelEditMode(false)}>
                        Done
                      </UMActionPill>
                    </>
                  ) : (
                    <UMActionPill onClick={() => setHotelEditMode(true)}>
                      Edit
                    </UMActionPill>
                  )}
                </div>
              )}
            </div>

            {loadingHotels ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-neutral-400" />
                <p className="text-sm text-neutral-500">Loading hotels...</p>
              </div>
            ) : hotels.length === 0 ? (
              <UMCard className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  No hotels added yet
                </p>
                {isOwner && !hotelEditMode && (
                  <UMActionPill onClick={() => setHotelEditMode(true)} variant="primary">
                    Start Adding
                  </UMActionPill>
                )}
                {isOwner && hotelEditMode && (
                  <UMActionPill onClick={handleAddHotel} variant="primary">
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Hotel
                  </UMActionPill>
                )}
              </UMCard>
            ) : hotelEditMode ? (
              <div className="space-y-4">
                {hotels.map((hotel, index) => (
                  <UMCard key={index} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Hotel Name
                          </label>
                          <HotelAutocompleteInput
                            value={hotel.name}
                            onChange={(value) => handleUpdateHotel(index, 'name', value)}
                            placeholder="Hotel Le Marais"
                            disabled={!isOwner}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Check-in
                            </label>
                            <input
                              type="date"
                              value={hotel.startDate}
                              onChange={(e) => handleUpdateHotel(index, 'startDate', e.target.value)}
                              min={trip?.start_date || ''}
                              max={trip?.end_date || ''}
                              disabled={!isOwner}
                              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Check-out
                            </label>
                            <input
                              type="date"
                              value={hotel.endDate}
                              onChange={(e) => handleUpdateHotel(index, 'endDate', e.target.value)}
                              min={hotel.startDate || trip?.start_date || ''}
                              max={trip?.end_date || ''}
                              disabled={!isOwner}
                              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveHotel(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </UMCard>
                ))}

                {isOwner && hotels.length > 0 && (
                  <UMActionPill
                    onClick={saving ? undefined : handleSaveHotels}
                    variant="primary"
                    className={`w-full justify-center ${saving ? 'opacity-50' : ''}`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Hotels'
                    )}
                  </UMActionPill>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {hotels.map((hotel, index) => (
                  <UMCard key={`view-${index}`} className="p-5 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {hotel.name || 'Untitled hotel'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {hotel.address || 'Address not set'}
                        </p>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {hotel.startDate
                          ? formatDateLong(hotel.startDate)
                          : 'Start date TBD'}{' '}
                        –{' '}
                        {hotel.endDate ? formatDateLong(hotel.endDate) : 'End date TBD'}
                      </div>
                    </div>
                    {hotel.notes && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {hotel.notes}
                      </p>
                    )}
                  </UMCard>
                ))}
              </div>
            )}
          </div>
        )}
        </section>
      </div>

      {/* Floating Add Button (Mobile) */}
      {isOwner && activeTab === 'itinerary' && trip.days && trip.days.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <button
            onClick={() =>
              openDrawer('place-selector', {
                day: trip.days[selectedDayIndex],
                trip,
                index: selectedDayIndex,
                replaceIndex: null,
              })
            }
            className="w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Trip Planner Modal */}
      {showTripPlanner && (
        <TripPlanner
          isOpen={true}
          tripId={tripId || undefined}
          onClose={() => {
            setShowTripPlanner(false);
            if (tripId) {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
}

type TimelineEntryType = 'meal' | 'activity';

interface TimelineEntry {
  id: string;
  title: string;
  type: TimelineEntryType;
  meta?: string;
  time?: string | null;
  description?: string | null;
  duration?: string | null;
  image?: string | null;
  sortOrder: number;
}

function DayTimeline({ day, fallbackCity }: { day: any; fallbackCity?: string }) {
  const entries = buildTimelineEntries(day, fallbackCity);

  if (!entries.length) {
    return (
      <UMCard className="p-10 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No itinerary items for this day yet. Add a place to start building the plan.
        </p>
      </UMCard>
    );
  }

  return (
    <div className="rounded-[32px] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0f1012] p-5 sm:p-7">
      <div className="space-y-6">
        {entries.map((entry, index) => (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  entry.type === 'meal'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200'
                    : 'bg-neutral-900 text-white dark:bg-white/20'
                }`}
              >
                {entry.type === 'meal' ? <Utensils className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </span>
              {index < entries.length - 1 && (
                <span className="w-0.5 flex-1 bg-neutral-200 dark:bg-neutral-800 mt-2 mb-1" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {entry.time && <span>{entry.time}</span>}
                {entry.duration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.duration}
                  </span>
                )}
                {entry.meta && <span className="text-neutral-400">{entry.meta}</span>}
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{entry.title}</p>
              {entry.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{entry.description}</p>
              )}
            </div>
            {entry.image && (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden hidden sm:block flex-shrink-0">
                <Image src={entry.image} alt={entry.title} fill className="object-cover" sizes="96px" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTimelineEntries(day: any, fallbackCity?: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const mealOrder: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; baseSort: number }> = [
    { key: 'breakfast', baseSort: 360 },
    { key: 'lunch', baseSort: 780 },
    { key: 'dinner', baseSort: 1140 },
  ];

  const addEntry = (
    item: any,
    type: TimelineEntryType,
    fallbackTitle: string,
    fallbackMeta: string,
    baseSort: number,
    idx: number,
  ) => {
    if (!item) return;
    const notes = parseNotes(item);
    const time = item.time || notes?.time || null;
    const duration = notes?.duration ? `${notes.duration} min` : null;
    const meta = item.description || notes?.category || item.city || notes?.city || fallbackMeta || fallbackCity || '';
    const sortOrder = timeToSortValue(time) ?? baseSort + idx * 5;

    entries.push({
      id: item.id || `${type}-${fallbackTitle}-${idx}`,
      title: item.title || item.name || fallbackTitle,
      type,
      meta,
      time,
      description: notes?.raw || item.notes || null,
      duration,
      image: getImageFromItem(item),
      sortOrder,
    });
  };

  mealOrder.forEach(({ key, baseSort }) =>
    addEntry(day?.meals?.[key], 'meal', key.charAt(0).toUpperCase() + key.slice(1), 'Meal', baseSort, 0),
  );

  (day?.activities || []).forEach((activity: any, idx: number) => {
    addEntry(activity, 'activity', activity.title || 'Activity', activity.category || 'Activity', 600, idx);
  });

  return entries.sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseNotes(value: any) {
  if (!value?.notes) return null;
  try {
    if (typeof value.notes === 'string') {
      return JSON.parse(value.notes);
    }
    return value.notes;
  } catch {
    return null;
  }
}

function getImageFromItem(item: any): string | null {
  if (item?.image) return item.image;
  if (item?.image_thumbnail) return item.image_thumbnail;
  const notes = parseNotes(item);
  if (notes?.image) return notes.image;
  return null;
}

function timeToSortValue(time?: string | null): number | null {
  if (!time) return null;
  const trimmed = time.trim().toLowerCase();
  const ampmMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2] ?? '0', 10);
    const meridiem = ampmMatch[3];
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hours = parseInt(twentyFourHourMatch[1], 10);
    const minutes = parseInt(twentyFourHourMatch[2], 10);
    return hours * 60 + minutes;
  }
  return null;
}
