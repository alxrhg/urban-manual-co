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
 * TripEditorHeader - "Of Study" Editorial Design
 *
 * Philosophy: Each journey deserves the same consideration as the spaces
 * we inhabit. Conscious by design, intentional in planning.
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
      <div className="space-y-6 p-6 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)]">
        <span className="text-editorial-label block">Edit Journey</span>

        {/* Cover image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {coverImage ? (
          <div className="relative aspect-[3/1] overflow-hidden group border border-[var(--editorial-border)]">
            <Image src={coverImage} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-primary)] text-xs font-medium"
              >
                Change
              </button>
              <button
                onClick={() => setCoverImage('')}
                className="px-4 py-2 bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] text-xs font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full aspect-[4/1] border border-dashed border-[var(--editorial-border)] flex items-center justify-center gap-2 text-[var(--editorial-text-tertiary)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)] transition-colors"
          >
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            <span className="text-xs">Add cover image</span>
          </button>
        )}

        {/* Title - Editorial serif style */}
        <div>
          <label className="text-editorial-label block mb-2">Journey Name</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-xl text-[var(--editorial-text-primary)] bg-transparent border-0 border-b border-[var(--editorial-border)] focus:border-[var(--editorial-accent)] outline-none pb-2 transition-colors"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            placeholder="A Week in Kyoto"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="text-editorial-label block mb-2">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm text-[var(--editorial-text-primary)] bg-transparent border-0 border-b border-[var(--editorial-border)] focus:border-[var(--editorial-accent)] outline-none pb-2 transition-colors"
            placeholder="City or region"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-editorial-label block mb-2">Departure</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm text-[var(--editorial-text-primary)] bg-transparent border-0 border-b border-[var(--editorial-border)] focus:border-[var(--editorial-accent)] outline-none pb-2 transition-colors"
            />
          </div>
          <div>
            <label className="text-editorial-label block mb-2">Return</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onKeyDown={handleKeyDown}
              min={startDate}
              className="w-full text-sm text-[var(--editorial-text-primary)] bg-transparent border-0 border-b border-[var(--editorial-border)] focus:border-[var(--editorial-accent)] outline-none pb-2 transition-colors"
            />
          </div>
        </div>

        {/* Actions - Editorial button style */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--editorial-border)]">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="btn-editorial-accent"
            >
              Save Changes
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
              className="text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--editorial-text-tertiary)]">Delete this journey?</span>
              <button onClick={onDelete} className="text-xs text-[var(--editorial-accent)] font-medium">Yes, delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-[var(--editorial-text-tertiary)]">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)] transition-colors"
            >
              Delete journey
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {/* Static map cover - Editorial style */}
      <div className="relative aspect-[3/1] overflow-hidden mb-6 border border-[var(--editorial-border)]">
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
            {/* City overlay - Editorial label style */}
            <div className="absolute bottom-4 left-4 bg-[var(--editorial-bg-elevated)]/95 backdrop-blur-sm px-4 py-2 border border-[var(--editorial-border)]">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--editorial-text-tertiary)] block">Destination</span>
              <span className="text-sm font-medium text-[var(--editorial-text-primary)]">{primaryCity}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-[var(--editorial-accent)]/5 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--editorial-accent)]/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[var(--editorial-accent)]" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--editorial-text-tertiary)] block mb-1">Destination</span>
              <span className="text-sm text-[var(--editorial-text-secondary)]">{primaryCity || 'Add places to see map'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Title and info - Editorial "Of Study" style */}
      <div onClick={() => setIsEditing(true)} className="cursor-pointer">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--editorial-text-tertiary)] block mb-2">
          {dateDisplay}
        </span>
        <h1
          className="text-2xl sm:text-3xl font-normal text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors mb-2"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: '-0.01em' }}
        >
          {trip.title}
        </h1>
        <p className="text-sm text-[var(--editorial-text-secondary)] group-hover:opacity-80 transition-opacity">
          {totalItems} {totalItems === 1 ? 'destination' : 'destinations'} planned
        </p>
      </div>
    </div>
  );
}

export default TripEditorHeader;
