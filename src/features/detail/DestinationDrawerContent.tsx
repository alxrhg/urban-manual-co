'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Plus, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import type { Destination } from '@/types/destination';
import type { ItineraryItemNotes } from '@/types/trip';

import {
  DestinationHero,
  DestinationIdentity,
  DestinationActions,
  DestinationInfo,
  DestinationDescription,
  DestinationMap,
  DestinationBooking,
  DestinationNested,
} from './sections';

interface DestinationDrawerContentProps {
  destination: Destination;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
  onDestinationClick?: (slug: string) => void;
  onDestinationUpdate?: () => void;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DestinationDrawerContent({
  destination,
  onClose,
  onSaveToggle,
  onVisitToggle,
  onDestinationClick,
  onDestinationUpdate,
}: DestinationDrawerContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // State
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Enriched data
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enhancedDestination, setEnhancedDestination] = useState<Destination>(destination);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);

  // Generate directions URL
  const googleMapsUrl = destination.google_maps_url ||
    (destination.latitude && destination.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
      : null);
  const defaultQuery = `${destination.name || 'Destination'}, ${destination.city ? capitalizeCity(destination.city) : ''}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(defaultQuery)}`;
  const directionsUrl = googleMapsUrl || appleMapsUrl;

  // Load enriched data
  useEffect(() => {
    async function loadData() {
      if (!destination?.slug) return;

      const supabase = createClient();
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('destinations')
          .select(`
            formatted_address,
            international_phone_number,
            website,
            rating,
            user_ratings_total,
            price_level,
            opening_hours_json,
            editorial_summary,
            utc_offset,
            timezone_id,
            latitude,
            longitude,
            reviews_json,
            architect,
            architectural_style,
            design_period,
            architect_id,
            interior_designer_id,
            movement_id,
            architectural_significance,
            design_story,
            construction_year,
            architect:architects!architect_id(id, name, slug, bio, image_url),
            interior_designer:architects!interior_designer_id(id, name, slug, bio, image_url),
            movement:design_movements(id, name, slug, description)
          `)
          .eq('slug', destination.slug)
          .single();

        if (!error && data) {
          const enriched: any = { ...data };

          // Parse JSON fields
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours = typeof data.opening_hours_json === 'string'
                ? JSON.parse(data.opening_hours_json)
                : data.opening_hours_json;
            } catch (e) {
              console.error('Error parsing opening_hours_json:', e);
            }
          }

          if (data.reviews_json) {
            try {
              enriched.reviews = typeof data.reviews_json === 'string'
                ? JSON.parse(data.reviews_json)
                : data.reviews_json;

              // Generate AI summary of reviews
              if (Array.isArray(enriched.reviews) && enriched.reviews.length > 0) {
                generateReviewSummary(enriched.reviews, destination.name);
              }
            } catch (e) {
              console.error('Error parsing reviews_json:', e);
            }
          }

          // Merge architect data
          let updated = { ...destination } as any;
          if (data.architect && typeof data.architect === 'object') {
            const arch = Array.isArray(data.architect) ? data.architect[0] : data.architect;
            if (arch?.name) {
              updated.architect_obj = arch;
              updated.architect_id = arch.id;
            }
          }
          if (data.interior_designer && typeof data.interior_designer === 'object') {
            const designer = Array.isArray(data.interior_designer) ? data.interior_designer[0] : data.interior_designer;
            if (designer?.name) {
              updated.interior_designer_obj = designer;
            }
          }
          if (data.movement && typeof data.movement === 'object') {
            const movement = Array.isArray(data.movement) ? data.movement[0] : data.movement;
            if (movement?.name) {
              updated.movement_obj = movement;
            }
          }

          setEnhancedDestination(updated);
          setEnrichedData(enriched);
        }
      } catch (error) {
        console.error('Error loading enriched data:', error);
      }

      // Load saved/visited status
      if (user) {
        try {
          const { data: savedData } = await supabase
            .from('saved_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .maybeSingle();
          setIsSaved(!!savedData);

          const { data: visitedData } = await supabase
            .from('visited_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .maybeSingle();
          setIsVisited(!!visitedData);

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
          }
        } catch (error) {
          console.error('Error loading user status:', error);
        }
      }
    }

    loadData();
  }, [destination, user]);

  // Load nested destinations
  useEffect(() => {
    async function loadNested() {
      if (!destination?.id) return;

      setLoadingNested(true);
      const supabase = createClient();
      if (!supabase) {
        setLoadingNested(false);
        return;
      }

      try {
        if (destination.parent_destination_id) {
          const parent = await getParentDestination(supabase, destination.id);
          setParentDestination(parent);
        }

        const nested = await getNestedDestinations(supabase, destination.id, false);
        setNestedDestinations(nested || []);
      } catch (error) {
        console.error('Error loading nested destinations:', error);
      } finally {
        setLoadingNested(false);
      }
    }

    loadNested();
  }, [destination]);

  const generateReviewSummary = async (reviews: any[], name: string) => {
    if (!reviews.length) return;

    setLoadingReviewSummary(true);
    try {
      const response = await fetch('/api/reviews/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews, destinationName: name }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) setReviewSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating review summary:', error);
    } finally {
      setLoadingReviewSummary(false);
    }
  };

  const handleAddToTrip = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (isAddedToTrip || !destination?.slug) return;

    setActionError(null);

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

      // Get next order
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
      setActionError(error?.message || 'Failed to add to trip');
      toast.error('Failed to add to trip');
    }
  };

  const handleSaveChange = (saved: boolean) => {
    setIsSaved(saved);
    if (onSaveToggle) onSaveToggle(destination.slug, saved);
  };

  const handleVisitChange = (visited: boolean) => {
    setIsVisited(visited);
    if (onVisitToggle) onVisitToggle(destination.slug, visited);
  };

  const handleSaveModalClose = () => {
    setShowSaveModal(false);
    if (onDestinationUpdate) onDestinationUpdate();
  };

  const handleVisitedModalUpdate = () => {
    setShowVisitedModal(false);
    if (onDestinationUpdate) onDestinationUpdate();
  };

  const latitude = enrichedData?.latitude || destination.latitude;
  const longitude = enrichedData?.longitude || destination.longitude;

  return (
    <>
      <div className="p-5 space-y-6">
        {/* Error Alert */}
        {actionError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 flex gap-2 text-xs text-red-800 dark:text-red-200">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{actionError}</p>
            </div>
          </div>
        )}

        {/* Hero Image */}
        <DestinationHero image={destination.image} name={destination.name} />

        {/* Identity Section */}
        <DestinationIdentity destination={enhancedDestination} enrichedData={enrichedData} />

        {/* Action Buttons */}
        <DestinationActions
          destination={destination}
          isSaved={isSaved}
          isVisited={isVisited}
          onSaveChange={handleSaveChange}
          onVisitChange={handleVisitChange}
          onShowSaveModal={() => setShowSaveModal(true)}
          onShowVisitedModal={() => setShowVisitedModal(true)}
          directionsUrl={directionsUrl}
        />

        {/* Sign in prompt */}
        {!user && (
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Sign in to save and track visits
          </button>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* Nested Destinations */}
        <DestinationNested
          parentDestination={parentDestination}
          nestedDestinations={nestedDestinations}
          loading={loadingNested}
          onDestinationClick={onDestinationClick}
        />

        {/* Info Section */}
        <DestinationInfo destination={destination} enrichedData={enrichedData} />

        {/* Booking Links */}
        <DestinationBooking destination={destination} />

        {/* Description */}
        <DestinationDescription
          destination={destination}
          enrichedData={enrichedData}
          reviewSummary={reviewSummary}
          loadingReviewSummary={loadingReviewSummary}
        />

        {/* Architecture Info */}
        <ArchitectDesignInfo destination={enhancedDestination} />

        {/* Map */}
        <DestinationMap latitude={latitude} longitude={longitude} />
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          {destination.slug && (
            <Link
              href={`/destination/${destination.slug}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black text-center py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
            >
              View Full Details
            </Link>
          )}

          <button
            onClick={handleAddToTrip}
            disabled={isAddedToTrip}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              isAddedToTrip
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isAddedToTrip ? (
              <>
                <Check className="h-4 w-4" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Trip
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      {destination?.slug && destination?.id && (
        <>
          <SaveDestinationModal
            isOpen={showSaveModal}
            onClose={handleSaveModalClose}
            destinationId={destination.id}
            destinationSlug={destination.slug}
          />
          <VisitedModal
            isOpen={showVisitedModal}
            onClose={() => setShowVisitedModal(false)}
            destinationSlug={destination.slug}
            destinationName={destination.name}
            onUpdate={handleVisitedModalUpdate}
          />
        </>
      )}
    </>
  );
}
