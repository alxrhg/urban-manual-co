'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  X,
  MapPin,
  Bookmark,
  Plus,
  Loader2,
  Check,
  Edit,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { htmlToPlainText } from '@/lib/sanitize';
import { Drawer } from '@/components/ui/Drawer';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { NestedDestinations } from '@/components/NestedDestinations';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';

// Modular components
import {
  DestinationHero,
  DestinationIdentity,
  DestinationActions,
  DestinationMeta,
  DrawerRecommendations,
} from './components';

// Dynamically import the static map
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  ),
});

// Dynamically import edit form (heavy component)
const DestinationEditForm = dynamic(
  () => import('./components/DestinationEditForm').then(mod => mod.DestinationEditForm),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  }
);

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
  /** Called when clicking a related/nested destination */
  onDestinationClick?: (destination: Destination) => void;
  onEdit?: (destination: Destination) => void;
  onDestinationUpdate?: () => void;
  renderMode?: 'drawer' | 'inline';
  /** Related destinations to show (optional - will use recommendations API if not provided) */
  relatedDestinations?: Destination[];
}

/**
 * DestinationDrawer - Refactored destination detail drawer
 *
 * A modular, clean implementation using extracted components.
 * Supports both drawer and inline render modes.
 */
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
  relatedDestinations = [],
}: DestinationDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // Core state
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);

  // Data state
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enhancedDestination, setEnhancedDestination] = useState<Destination | null>(destination);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);

  // Check admin status
  useEffect(() => {
    if (user) {
      const role = (user as any).user_metadata?.role || (user as any).app_metadata?.role;
      setIsAdmin(role === 'admin');
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Reset edit mode when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
    }
  }, [isOpen]);

  // Update enhanced destination when prop changes
  useEffect(() => {
    setEnhancedDestination(destination);
  }, [destination]);

  // Load enriched data and saved/visited status
  useEffect(() => {
    async function loadDestinationData() {
      if (!destination?.slug) {
        setEnrichedData(null);
        setEnhancedDestination(null);
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false);
        setReviewSummary(null);
        return;
      }

      setIsAddedToTrip(false);

      try {
        const supabase = createClient();

        // Fetch enriched data
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
            google_name,
            utc_offset,
            vicinity,
            reviews_json,
            timezone_id,
            latitude,
            longitude,
            architect,
            architectural_style,
            design_period,
            architect_info_json,
            architect:architects!architect_id(id, name, slug, bio, birth_year, death_year, nationality, design_philosophy, image_url),
            design_firm:design_firms(id, name, slug, description, founded_year, image_url),
            interior_designer:architects!interior_designer_id(id, name, slug, bio, birth_year, death_year, nationality, image_url),
            movement:design_movements(id, name, slug, description, period_start, period_end)
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

              // Generate AI summary if reviews exist
              if (Array.isArray(enriched.reviews) && enriched.reviews.length > 0) {
                generateReviewSummary(enriched.reviews, destination.name);
              }
            } catch (e) {
              console.error('Error parsing reviews_json:', e);
            }
          }

          // Merge architect data
          let updated = { ...destination };
          const dataObj = data as any;

          if (dataObj.architect) {
            const architectObj = Array.isArray(dataObj.architect) ? dataObj.architect[0] : dataObj.architect;
            if (architectObj?.name) {
              updated = { ...updated, architect_id: architectObj.id, architect: updated.architect || architectObj.name };
              (updated as any).architect_obj = architectObj;
            }
          }

          if (dataObj.design_firm && typeof dataObj.design_firm === 'object' && dataObj.design_firm.name) {
            (updated as any).design_firm_obj = dataObj.design_firm;
          }

          if (dataObj.interior_designer) {
            const designerObj = Array.isArray(dataObj.interior_designer) ? dataObj.interior_designer[0] : dataObj.interior_designer;
            if (designerObj?.name) {
              (updated as any).interior_designer_obj = designerObj;
            }
          }

          if (dataObj.movement) {
            const movementObj = Array.isArray(dataObj.movement) ? dataObj.movement[0] : dataObj.movement;
            if (movementObj?.name) {
              (updated as any).movement_obj = movementObj;
            }
          }

          setEnhancedDestination(updated);
          setEnrichedData(enriched);
        }
      } catch (error) {
        console.error('Error loading enriched data:', error);
        setEnrichedData(null);
      }

      // Load saved and visited status
      if (!user || !destination.slug) {
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

      try {
        const supabase = createClient();

        const [savedResult, visitedResult] = await Promise.all([
          supabase.from('saved_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
          supabase.from('visited_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
        ]);

        setIsSaved(!!savedResult.data);
        setIsVisited(!!visitedResult.data);
      } catch (error) {
        console.error('Error loading saved/visited status:', error);
      }
    }

    loadDestinationData();
  }, [destination, user]);

  // Load nested destinations
  useEffect(() => {
    async function loadNested() {
      if (!destination?.id) {
        setParentDestination(null);
        setNestedDestinations([]);
        return;
      }

      setLoadingNested(true);
      try {
        const supabase = createClient();
        const [parent, nested] = await Promise.all([
          getParentDestination(supabase, destination.id),
          getNestedDestinations(supabase, destination.id),
        ]);
        setParentDestination(parent);
        setNestedDestinations(nested);
      } catch (error) {
        console.error('Error loading nested destinations:', error);
      } finally {
        setLoadingNested(false);
      }
    }

    loadNested();
  }, [destination?.id]);

  // Generate AI review summary
  const generateReviewSummary = async (reviews: any[], destinationName: string) => {
    if (!reviews || reviews.length === 0) return;

    setLoadingReviewSummary(true);
    try {
      const response = await fetch('/api/reviews/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews, destinationName }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setReviewSummary(data.summary);
        }
      }
    } catch (error) {
      console.error('Error generating review summary:', error);
    } finally {
      setLoadingReviewSummary(false);
    }
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (!user || !destination?.slug) {
      router.push('/auth/login');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('saved_places')
        .upsert({ user_id: user.id, destination_slug: destination.slug });

      if (!error) {
        setIsSaved(true);
        onSaveToggle?.(destination.slug, true);
        setShowSaveModal(true);
      } else {
        toast.error('Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save. Please try again.');
    }
  }, [user, destination, router, onSaveToggle, toast]);

  // Handle visit toggle
  const handleVisitToggle = useCallback(async () => {
    if (!user || !destination?.slug) return;

    try {
      const supabase = createClient();

      if (isVisited) {
        const { error } = await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);

        if (!error) {
          setIsVisited(false);
          onVisitToggle?.(destination.slug, false);
        }
      } else {
        const { error } = await supabase
          .from('visited_places')
          .upsert({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString(),
          }, { onConflict: 'user_id,destination_slug' });

        if (!error) {
          setIsVisited(true);
          onVisitToggle?.(destination.slug, true);
        }
      }
    } catch (error) {
      console.error('Error toggling visit:', error);
      toast.error('Failed to update visit status. Please try again.');
    }
  }, [user, destination, isVisited, onVisitToggle, toast]);

  // Handle add to trip
  const handleAddToTrip = useCallback(async () => {
    if (!user || !destination?.slug) {
      router.push('/auth/login');
      return;
    }

    if (isAddedToTrip) return;

    try {
      const supabase = createClient();
      const { data: trips } = await supabase
        .from('trips')
        .select('id, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (trips && trips.length === 1) {
        // Add to the single trip
        const { data: orderData } = await supabase.rpc('get_next_itinerary_order', { p_trip_id: trips[0].id });
        const result = Array.isArray(orderData) ? orderData[0] : orderData;
        const nextDay = result?.next_day ?? 1;
        const nextOrder = result?.next_order ?? 0;

        const { error } = await supabase.from('itinerary_items').insert({
          trip_id: trips[0].id,
          destination_slug: destination.slug,
          day: nextDay,
          order_index: nextOrder,
          title: destination.name,
        });

        if (!error) {
          setIsAddedToTrip(true);
          toast.success(`Added to ${trips[0].title} · Day ${nextDay}`);
        }
      } else {
        // Navigate to trips page
        router.push(`/trips?prefill=${encodeURIComponent(destination.slug)}`);
      }
    } catch (error) {
      console.error('Error adding to trip:', error);
      toast.error('Failed to add to trip. Please try again.');
    }
  }, [user, destination, isAddedToTrip, router, toast]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Loading state
  if (!destination) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Details</h2>
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

  // Header content
  const headerContent = (
    <div className="flex items-center justify-between w-full gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4 text-gray-900 dark:text-white" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {isEditMode ? 'Edit Destination' : destination.name}
        </h2>
      </div>
      {user && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-lg transition-colors ${
                isEditMode ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
              aria-label={isEditMode ? 'Exit edit mode' : 'Edit destination'}
            >
              <Edit className={`h-4 w-4 ${isEditMode ? '' : 'text-gray-900 dark:text-white/90'}`} strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => isSaved ? setShowSaveModal(true) : handleSave()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isSaved ? 'Remove from saved' : 'Save destination'}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleAddToTrip}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Add to trip"
            disabled={isAddedToTrip}
          >
            {isAddedToTrip ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Footer content
  const footerContent = (
    <div className="px-6 py-4">
      <div className="flex gap-3">
        {destination.slug && (
          <Link
            href={`/destination/${destination.slug}`}
            onClick={onClose}
            className="flex-1 bg-black dark:bg-white text-white dark:text-black text-center py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
          >
            View Full Details
          </Link>
        )}
        <button
          onClick={handleAddToTrip}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            isAddedToTrip
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          disabled={isAddedToTrip}
        >
          {isAddedToTrip ? (
            <>
              <Check className="h-4 w-4" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Add to Trip</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Main content
  const mainContent = (
    <div className="p-6">
      {isEditMode ? (
        <DestinationEditForm
          destination={destination}
          onCancel={() => setIsEditMode(false)}
          onSave={() => {
            setIsEditMode(false);
            onDestinationUpdate?.();
          }}
          onDelete={() => {
            onClose();
            onDestinationUpdate?.();
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Hero Image */}
          <DestinationHero destination={destination} className="mt-[18px]" />

          {/* Identity Block */}
          <DestinationIdentity destination={destination} enrichedData={enrichedData} />

          {/* Action Buttons */}
          <DestinationActions
            destination={destination}
            isSaved={isSaved}
            isVisited={isVisited}
            onSaveClick={handleSave}
            onVisitClick={handleVisitToggle}
            onSaveToggle={onSaveToggle}
            onShowSaveModal={() => setShowSaveModal(true)}
            onShowVisitedModal={() => setShowVisitedModal(true)}
            className="mt-4"
          />

          {/* Sign in prompt */}
          {!user && (
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Sign in to save and track visits
            </button>
          )}

          <div className="border-t border-gray-200 dark:border-gray-800" />

          {/* Parent Destination */}
          {parentDestination && (
            <button
              onClick={() => onDestinationClick?.(parentDestination)}
              className="w-full flex items-center gap-3 p-3 -mx-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {parentDestination.image ? (
                  <Image src={parentDestination.image} alt={parentDestination.name} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                    <MapPin className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Located inside</p>
                <p className="font-medium text-sm text-black dark:text-white truncate">{parentDestination.name}</p>
                {parentDestination.category && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{parentDestination.category}</p>
                )}
              </div>
            </button>
          )}

          {/* Real-Time Status */}
          {destination.id && <RealtimeStatusBadge destinationId={destination.id} compact={false} showWaitTime showAvailability />}

          {/* Meta Information */}
          <DestinationMeta destination={destination} enrichedData={enrichedData} />

          {/* Nested Destinations */}
          {(loadingNested || nestedDestinations.length > 0) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              {loadingNested ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading venues located here…
                </div>
              ) : (
                <NestedDestinations
                  destinations={nestedDestinations}
                  parentName={destination.name}
                  onDestinationClick={(nested) => onDestinationClick?.(nested)}
                />
              )}
            </div>
          )}

          {/* Description */}
          {destination.description && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {htmlToPlainText(destination.description)}
              </div>
            </div>
          )}

          {/* Editorial Summary */}
          {enrichedData?.editorial_summary && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {htmlToPlainText(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {/* Architecture & Design */}
          {enhancedDestination && <ArchitectDesignInfo destination={enhancedDestination} />}

          {/* AI Review Summary */}
          {enrichedData?.reviews?.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">What Reviewers Say</h3>
              {loadingReviewSummary ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Summarizing reviews...</span>
                </div>
              ) : reviewSummary ? (
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewSummary}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Map */}
          {(destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <GoogleStaticMap
                  center={{
                    lat: destination.latitude || enrichedData?.latitude || 0,
                    lng: destination.longitude || enrichedData?.longitude || 0,
                  }}
                  zoom={15}
                  height="192px"
                  className="rounded-2xl"
                  showPin
                />
              </div>
            </div>
          )}

          {/* Recommendations */}
          <DrawerRecommendations
            destinationSlug={destination.slug}
            isOpen={isOpen}
            onDestinationClick={onDestinationClick}
            className="mt-6"
          />
        </div>
      )}
    </div>
  );

  // Render based on mode
  if (renderMode === 'inline') {
    return (
      <>
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
          <div className="flex-shrink-0 min-h-[3.5rem] px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5">
            {headerContent}
          </div>
          <div className="flex-1 overflow-y-auto">{mainContent}</div>
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">{footerContent}</div>
        </div>

        {/* Modals */}
        {destination?.id && (
          <SaveDestinationModal
            destinationId={destination.id}
            destinationSlug={destination.slug}
            isOpen={showSaveModal}
            onClose={() => setShowSaveModal(false)}
          />
        )}
        {destination && (
          <VisitedModal
            destinationSlug={destination.slug}
            destinationName={destination.name}
            isOpen={showVisitedModal}
            onClose={() => setShowVisitedModal(false)}
            onUpdate={() => {
              setShowVisitedModal(false);
              setIsVisited(true);
              if (destination.slug) onVisitToggle?.(destination.slug, true);
            }}
          />
        )}
      </>
    );
  }

  // Default drawer mode
  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        keepStateOnClose
        zIndex={9999}
        headerContent={headerContent}
        footerContent={footerContent}
      >
        {mainContent}
      </Drawer>

      {/* Modals */}
      {destination?.id && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={async (collectionId) => {
            if (collectionId === null && destination.slug && user) {
              const supabase = createClient();
              await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
              setIsSaved(false);
              onSaveToggle?.(destination.slug, false);
            } else if (collectionId !== null && destination.slug && user) {
              const supabase = createClient();
              await supabase.from('saved_places').upsert({ user_id: user.id, destination_slug: destination.slug });
              setIsSaved(true);
              onSaveToggle?.(destination.slug, true);
            }
          }}
        />
      )}
      {destination && (
        <VisitedModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showVisitedModal}
          onClose={() => setShowVisitedModal(false)}
          onUpdate={() => {
            setShowVisitedModal(false);
            setIsVisited(true);
            if (destination.slug) onVisitToggle?.(destination.slug, true);
          }}
        />
      )}
    </>
  );
}
