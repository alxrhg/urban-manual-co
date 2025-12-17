'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { MapPin, ImagePlus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripData {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  destination?: string | null;
  cover_image?: string | null;
}

interface TripEditorHeaderProps {
  trip: TripData;
  primaryCity: string;
  totalItems: number;
  userId?: string;
  days: Array<{ items: EnrichedItineraryItem[] }>;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}

/**
 * TripEditorHeader - Trip header with inline editing
 * Includes map cover, destination, dates, and delete functionality
 */
export function TripEditorHeader({
  trip,
  primaryCity,
  totalItems,
  userId,
  days,
  onUpdate,
  onDelete,
}: TripEditorHeaderProps) {
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

  // Calculate map center from all items with coordinates
  const mapCenter = useMemo(() => {
    const allItems = days.flatMap(d => d.items);
    const coords = allItems
      .map(item => ({
        lat: item.destination?.latitude || item.parsedNotes?.latitude,
        lng: item.destination?.longitude || item.parsedNotes?.longitude,
      }))
      .filter(c => c.lat && c.lng) as { lat: number; lng: number }[];

    if (coords.length === 0) return null;

    const sumLat = coords.reduce((sum, c) => sum + c.lat, 0);
    const sumLng = coords.reduce((sum, c) => sum + c.lng, 0);
    return {
      lat: sumLat / coords.length,
      lng: sumLng / coords.length,
    };
  }, [days]);

  // State for map image error
  const [mapError, setMapError] = useState(false);

  // Generate static map URL
  const staticMapUrl = useMemo(() => {
    if (!mapCenter) return null;
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return null;

    const pin = `pin-s+ef4444(${mapCenter.lng},${mapCenter.lat})`;
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}/${mapCenter.lng},${mapCenter.lat},11,0/600x200@2x?access_token=${token}`;
  }, [mapCenter]);

  // Reset error when URL changes
  useEffect(() => {
    setMapError(false);
  }, [staticMapUrl]);

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

  // Format date display - parse as local time to avoid timezone shifts
  const dateDisplay = useMemo(() => {
    if (!trip.start_date) return 'No dates';
    const start = new Date(trip.start_date + 'T00:00:00');
    const end = trip.end_date ? new Date(trip.end_date + 'T00:00:00') : start;
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
          className="w-full text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white outline-none pb-1"
          placeholder="Trip name"
        />

        {/* Destination */}
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none"
          placeholder="Destination city"
        />

        {/* Dates */}
        <div className="flex gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onKeyDown={handleKeyDown}
            min={startDate}
            className="flex-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:opacity-90 transition-opacity"
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
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Delete trip?</span>
              <button onClick={onDelete} className="text-xs text-red-500 font-medium">Yes</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-500">No</button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Delete trip
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {/* Static map cover */}
      <div className="relative aspect-[3/1] rounded-xl overflow-hidden mb-4">
        {staticMapUrl && !mapError ? (
          <>
            <Image
              src={staticMapUrl}
              alt={`Map of ${primaryCity}`}
              fill
              className="object-cover"
              unoptimized
              onError={() => setMapError(true)}
            />
            {/* City overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-gray-900 dark:text-white">{primaryCity}</span>
              <span className="text-xs text-gray-400">{totalItems} pinned</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-1" />
              <span className="text-xs text-blue-500 dark:text-blue-400">{primaryCity || 'Add places to see map'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Title and info - click to edit */}
      <div onClick={() => setIsEditing(true)} className="cursor-pointer">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:opacity-70 transition-opacity">
          {trip.title}
        </h1>
        <p className="text-sm text-gray-400 group-hover:opacity-70 transition-opacity">
          {[primaryCity, dateDisplay, `${totalItems} ${totalItems === 1 ? 'place' : 'places'}`].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}

export default TripEditorHeader;
