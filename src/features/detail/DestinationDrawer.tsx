'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';
import type { ItineraryItemNotes } from '@/types/trip';

import { DestinationDrawerHeader } from './sections';
import { DestinationDrawerContent } from './DestinationDrawerContent';
import { DestinationEditForm } from './DestinationEditForm';

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
  onDestinationClick?: (slug: string) => void;
  onEdit?: (destination: Destination) => void;
  onDestinationUpdate?: () => void;
  renderMode?: 'drawer' | 'inline';
}

export function DestinationDrawer({
  destination,
  isOpen,
  onClose,
  onSaveToggle,
  onVisitToggle,
  onDestinationClick,
  onEdit,
  onDestinationUpdate,
  renderMode = 'drawer',
}: DestinationDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Reset edit mode when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
    }
  }, [isOpen]);

  // Check admin status and load user data
  useEffect(() => {
    async function checkUserStatus() {
      if (!user || !destination?.slug) {
        setIsAdmin(false);
        setIsSaved(false);
        setIsAddedToTrip(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) return;

      try {
        // Check admin status
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const role = (session.user.app_metadata as Record<string, any> | null)?.role;
          setIsAdmin(role === 'admin');
        }

        // Check saved status
        const { data: savedData } = await supabase
          .from('saved_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .maybeSingle();
        setIsSaved(!!savedData);

        // Check if in any trip
        const { data: userTrips } = await supabase
          .from('trips')
          .select('id')
          .eq('user_id', user.id);

        if (userTrips?.length) {
          const tripIds = userTrips.map(t => t.id);
          const { data: tripItems } = await supabase
            .from('itinerary_items')
            .select('id')
            .eq('destination_slug', destination.slug)
            .in('trip_id', tripIds)
            .limit(1);
          setIsAddedToTrip(!!tripItems?.length);
        } else {
          setIsAddedToTrip(false);
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    }

    checkUserStatus();
  }, [user, destination?.slug]);

  const handleAddToTrip = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (isAddedToTrip || !destination?.slug) return;

    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data: trips } = await supabase
        .from('trips')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!trips?.length) {
        router.push(`/trips?prefill=${encodeURIComponent(destination.slug)}`);
        return;
      }

      const trip = trips[0];

      const { data: existingItems } = await supabase
        .from('itinerary_items')
        .select('day, order_index')
        .eq('trip_id', trip.id)
        .order('day', { ascending: false })
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextDay = existingItems?.day ?? 1;
      const nextOrder = (existingItems?.order_index ?? -1) + 1;
      const notesData: ItineraryItemNotes = { raw: '' };

      const { error } = await supabase
        .from('itinerary_items')
        .insert({
          trip_id: trip.id,
          destination_slug: destination.slug,
          day: nextDay,
          order_index: nextOrder,
          title: destination.name,
          notes: JSON.stringify(notesData),
        });

      if (error) throw error;

      setIsAddedToTrip(true);
      toast.success(`Added to ${trip.title}`);
    } catch (error: any) {
      console.error('Error adding to trip:', error);
      toast.error('Failed to add to trip');
    }
  }, [user, destination, isAddedToTrip, router, toast]);

  const handleSaveChange = (saved: boolean) => {
    setIsSaved(saved);
    if (onSaveToggle && destination?.slug) {
      onSaveToggle(destination.slug, saved);
    }
  };

  const handleEditSuccess = () => {
    setIsEditMode(false);
    if (onDestinationUpdate) onDestinationUpdate();
  };

  // Loading state
  if (!destination) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="solid"
        backdropOpacity="20"
        headerContent={
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Loading
            </span>
          </div>
        }
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading destination...</p>
          </div>
        </div>
      </Drawer>
    );
  }

  // Inline render mode (for split-pane layouts)
  if (renderMode === 'inline') {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <DestinationDrawerHeader
            destination={destination}
            isEditMode={isEditMode}
            isAdmin={isAdmin}
            isSaved={isSaved}
            isAddedToTrip={isAddedToTrip}
            onClose={onClose}
            onEditToggle={() => setIsEditMode(!isEditMode)}
            onSaveChange={handleSaveChange}
            onShowSaveModal={() => setShowSaveModal(true)}
            onAddToTrip={handleAddToTrip}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isEditMode ? (
            <DestinationEditForm
              destination={destination}
              onClose={() => setIsEditMode(false)}
              onSuccess={handleEditSuccess}
            />
          ) : (
            <DestinationDrawerContent
              destination={destination}
              onClose={onClose}
              onSaveToggle={onSaveToggle}
              onVisitToggle={onVisitToggle}
              onDestinationClick={onDestinationClick}
              onDestinationUpdate={onDestinationUpdate}
            />
          )}
        </div>
      </div>
    );
  }

  // Standard drawer mode
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      mobileVariant="bottom"
      desktopSpacing="right-4 top-4 bottom-4"
      desktopWidth="420px"
      position="right"
      style="solid"
      backdropOpacity="20"
      headerContent={
        <DestinationDrawerHeader
          destination={destination}
          isEditMode={isEditMode}
          isAdmin={isAdmin}
          isSaved={isSaved}
          isAddedToTrip={isAddedToTrip}
          onClose={onClose}
          onEditToggle={() => setIsEditMode(!isEditMode)}
          onSaveChange={handleSaveChange}
          onShowSaveModal={() => setShowSaveModal(true)}
          onAddToTrip={handleAddToTrip}
        />
      }
    >
      {isEditMode ? (
        <DestinationEditForm
          destination={destination}
          onClose={() => setIsEditMode(false)}
          onSuccess={handleEditSuccess}
        />
      ) : (
        <DestinationDrawerContent
          destination={destination}
          onClose={onClose}
          onSaveToggle={onSaveToggle}
          onVisitToggle={onVisitToggle}
          onDestinationClick={onDestinationClick}
          onDestinationUpdate={onDestinationUpdate}
        />
      )}
    </Drawer>
  );
}
