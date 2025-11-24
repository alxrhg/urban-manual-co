'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import TripHeader from '@/components/trip/TripHeader';
import DayCard from '@/components/trip/DayCard';
import SuggestionCard from '@/components/trip/SuggestionCard';
import UMCard from '@/components/ui/UMCard';
import UMActionPill from '@/components/ui/UMActionPill';
import UMSectionTitle from '@/components/ui/UMSectionTitle';
import { Camera, Loader2, ChevronRight } from 'lucide-react';
import Image from 'next/image';

type Tab = 'details' | 'itinerary';

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string | null;
  const { trip, loading: tripLoading, error } = useTrip(tripId);
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [saving, setSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when trip loads
  useEffect(() => {
    if (trip) {
      setEditedTitle(trip.title || '');
      setEditedStartDate(trip.start_date || '');
      setEditedEndDate(trip.end_date || '');
      setCoverImagePreview(trip.cover_image || null);
    }
  }, [trip]);

  // Format dates for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
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
        setUploadingCover(true);
        try {
          const fileExt = coverImageFile.name.split('.').pop();
          const fileName = `${trip.id}-${Date.now()}.${fileExt}`;
          const filePath = `trip-covers/${fileName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from('trip-covers')
            .upload(filePath, coverImageFile, {
              upsert: true,
            });

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

        // Refresh the page to show updated data
        router.refresh();
        alert('Trip saved successfully!');
      }
    } catch (error: any) {
      console.error('Error saving trip:', error);
      alert(`Failed to save trip: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (tripLoading) return <div className="p-10">Loading…</div>;
  if (error) return <div className="p-10 text-red-600">Error: {error}</div>;
  if (!trip) return <div className="p-10">Trip not found</div>;

  const isOwner = trip.user_id === user?.id;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <TripHeader
        trip={{
          name: trip.title,
          startDate: formatDate(trip.start_date),
          endDate: formatDate(trip.end_date),
        }}
        onOverview={() => openDrawer('trip-overview', { trip })}
        onSave={isOwner ? handleSave : undefined}
        onShare={() => {
          // TODO: Implement share functionality
          console.log('Share trip');
        }}
        onPrint={() => {
          window.print();
        }}
      />

      {/* Tabs */}
      <div className="flex gap-4 border-b border-neutral-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`pb-3 px-1 text-sm font-medium transition-colors flex items-center gap-1 ${
            activeTab === 'itinerary'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Itinerary
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-10">
          {/* Cover Image Upload */}
          {isOwner && (
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
                      sizes="(max-width: 768px) 100vw, 800px"
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
          )}

          {/* Trip Details */}
          {isOwner && (
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
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white"
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
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white"
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
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </UMCard>
            </section>
          )}

          {/* Smart Suggestions */}
          <section className="space-y-4">
            <UMSectionTitle>Smart Suggestions</UMSectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SuggestionCard
                icon="🍳"
                title="Consider adding a morning cafe visit"
                detail="3 curated options very close to your first location"
                onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
              />
              <SuggestionCard
                icon="🖼️"
                title="Museum for Day 2"
                detail="2 top options within 10 minutes"
                onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
              />
              <SuggestionCard
                icon="🌅"
                title="Sunset dinner at the waterfront"
                detail="Perfect timing between 5–7 PM"
                onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
              />
            </div>
          </section>
        </div>
      )}

      {activeTab === 'itinerary' && (
        <div className="space-y-8">
          {trip.days && trip.days.length > 0 ? (
            trip.days.map((day, i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Day {i + 1} – {day.date}
                  </h2>
                  {isOwner && (
                    <UMActionPill
                      onClick={() => openDrawer('trip-day-editor', { day, index: i, trip })}
                    >
                      Edit Day
                    </UMActionPill>
                  )}
                </div>
                <DayCard day={day} index={i} openDrawer={openDrawer} trip={trip} />
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 text-sm">
              No days added yet
            </div>
          )}
        </div>
      )}

      {/* Save Button (Fixed at bottom) */}
      {isOwner && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSave}
            disabled={saving || uploadingCover}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save trip"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
