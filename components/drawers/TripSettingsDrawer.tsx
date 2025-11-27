'use client';

import { useState, useMemo } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Loader2, Globe, Lock, ImageIcon, Calendar, Zap } from 'lucide-react';
import type { Trip } from '@/types/trip';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
}

// Smart status detection based on dates
function detectTripStatus(startDate: string | null, endDate: string | null): Trip['status'] {
  if (!startDate) return 'planning';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : start;
  end.setHours(23, 59, 59, 999);

  if (today < start) return 'upcoming';
  if (today >= start && today <= end) return 'ongoing';
  if (today > end) return 'completed';

  return 'planning';
}

// Calculate trip duration and days info
function getTripInfo(startDate: string | null, endDate: string | null) {
  if (!startDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : start;
  end.setHours(0, 0, 0, 0);

  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysUntil = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysSince = Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return { duration, daysUntil, daysSince, currentDay };
}

// Status display config
const STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-900/20' },
  upcoming: { label: 'Upcoming', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', bgLight: 'bg-amber-50 dark:bg-amber-900/20' },
  ongoing: { label: 'Ongoing', color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-900/20' },
  completed: { label: 'Completed', color: 'bg-neutral-400', textColor: 'text-neutral-600 dark:text-neutral-400', bgLight: 'bg-neutral-100 dark:bg-neutral-800' },
};

// Format date string for HTML date input (YYYY-MM-DD format)
function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Parse date string directly to avoid timezone issues
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const year = parts[0].length === 4 ? parts[0] : parts[2];
      const month = parts[0].length === 4 ? parts[1] : parts[0];
      const day = parts[0].length === 4 ? parts[2] : parts[1];
      // Validate and format
      if (year.length === 4 && month.length <= 2 && day.length <= 2) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    // Fallback: parse as Date and use local date components
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  } catch {
    return '';
  }
}

export default function TripSettingsDrawer({
  trip,
  onUpdate,
  onDelete,
}: TripSettingsDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const { user } = useAuth();

  // Basic info
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination || '');
  const [startDate, setStartDate] = useState(formatDateForInput(trip.start_date));
  const [endDate, setEndDate] = useState(formatDateForInput(trip.end_date));
  const [isPublic, setIsPublic] = useState(trip.is_public);
  const [coverImage, setCoverImage] = useState(trip.cover_image || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Smart auto-detected status based on dates
  const smartStatus = useMemo(() => detectTripStatus(startDate, endDate), [startDate, endDate]);
  const statusConfig = STATUS_CONFIG[smartStatus];

  // Smart trip info (duration, countdown, etc.)
  const tripInfo = useMemo(() => getTripInfo(startDate, endDate), [startDate, endDate]);

  // Smart info text
  const getSmartInfoText = () => {
    if (!tripInfo) return null;

    if (smartStatus === 'upcoming' && tripInfo.daysUntil > 0) {
      return `${tripInfo.daysUntil} day${tripInfo.daysUntil === 1 ? '' : 's'} away`;
    }
    if (smartStatus === 'ongoing') {
      return `Day ${tripInfo.currentDay} of ${tripInfo.duration}`;
    }
    if (smartStatus === 'completed' && tripInfo.daysSince > 0) {
      return `${tripInfo.daysSince} day${tripInfo.daysSince === 1 ? '' : 's'} ago`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const updates: Partial<Trip> = {
        title,
        destination: destination || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: smartStatus, // Auto-set status based on dates
        is_public: isPublic,
        cover_image: coverImage || null,
      };

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      if (onUpdate) onUpdate(updates);
      closeDrawer();
    } catch (err) {
      console.error('Error saving trip:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      setDeleting(true);
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      closeDrawer();
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Error deleting trip:', err);
    } finally {
      setDeleting(false);
    }
  };

  const smartInfoText = getSmartInfoText();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Smart Status Banner */}
        <div className={`px-4 py-3 ${statusConfig.bgLight} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusConfig.color} ${smartStatus === 'ongoing' ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-medium ${statusConfig.textColor}`}>{statusConfig.label}</span>
            {smartInfoText && (
              <span className="text-sm text-gray-500 dark:text-gray-400">· {smartInfoText}</span>
            )}
          </div>
          {tripInfo && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {tripInfo.duration} day{tripInfo.duration !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <DrawerSection bordered>
          {/* Cover Image Preview */}
          {coverImage && (
            <div className="relative w-full h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
              <img src={coverImage} alt="Trip cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setCoverImage('')}
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <Label>Trip Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Amazing Trip"
              className="h-11"
            />
          </div>

          <div className="space-y-1">
            <Label>Destination</Label>
            <CityAutocompleteInput
              value={destination}
              onChange={setDestination}
              placeholder="e.g. Tokyo, Paris, New York"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Visibility</Label>
              <Button
                variant={isPublic ? 'default' : 'outline'}
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full justify-start ${isPublic ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30' : ''}`}
              >
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {isPublic ? 'Public' : 'Private'}
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Cover</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <Input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="URL..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Delete Section */}
        <DrawerSection>
          {showDeleteConfirm ? (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Delete this trip and all items?
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" />
              Delete Trip
            </Button>
          )}
        </DrawerSection>
      </div>

      <DrawerActionBar>
        <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </Button>
      </DrawerActionBar>
    </div>
  );
}
