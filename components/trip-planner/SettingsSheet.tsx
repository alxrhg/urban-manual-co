'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2 } from 'lucide-react';
import type { Trip, UpdateTrip } from '@/types/trip';
import { parseDestinations } from '@/types/trip';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onUpdate: (updates: UpdateTrip) => Promise<void>;
  onDelete: () => void;
}

export function SettingsSheet({
  open,
  onOpenChange,
  trip,
  onUpdate,
  onDelete,
}: SettingsSheetProps) {
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(trip.start_date || '');
  const [endDate, setEndDate] = useState(trip.end_date || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(trip.title);
    setDestination(parseDestinations(trip.destination).join(', '));
    setStartDate(trip.start_date || '');
    setEndDate(trip.end_date || '');
  }, [trip]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        title,
        destination: destination || null,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Trip Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          <div className="space-y-2">
            <Label>Trip Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Trip"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Paris, London, Tokyo"
              className="h-12"
            />
            <p className="text-xs text-gray-500">
              Separate multiple cities with commas
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !title}
            className="w-full h-12"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          <Separator />

          <Button
            variant={confirmDelete ? 'destructive' : 'outline'}
            onClick={handleDelete}
            className="w-full h-12"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {confirmDelete ? 'Tap again to confirm' : 'Delete Trip'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
