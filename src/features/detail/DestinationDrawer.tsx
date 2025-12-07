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
  Clock,
  Phone,
  Globe,
  Navigation,
  Share2,
  Star,
  ChevronRight,
  Building2,
  MessageSquare,
  Map,
  Info,
  ExternalLink,
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
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

// Dynamically import the static map
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

// Dynamically import edit form
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
  onDestinationClick?: (destination: Destination) => void;
  onEdit?: (destination: Destination) => void;
  onDestinationUpdate?: () => void;
  renderMode?: 'drawer' | 'inline';
  relatedDestinations?: Destination[];
}

type TabType = 'overview' | 'details' | 'related';

/**
 * DestinationDrawer - Modern card-based design
 *
 * Features organized into visual cards with tabs for content types.
 * Clean Apple design aesthetic with better information hierarchy.
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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Check admin status
  useEffect(() => {
    if (user) {
      const role = (user as any).user_metadata?.role || (user as any).app_metadata?.role;
      setIsAdmin(role === 'admin');
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Reset states when destination changes or drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setActiveTab('overview');
    }
  }, [isOpen]);

  useEffect(() => {
    setEnhancedDestination(destination);
    setActiveTab('overview');
  }, [destination]);

  // Load enriched data
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

  // Load recommendations
  useEffect(() => {
    async function loadRecommendations() {
      if (!destination?.slug || !isOpen) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);
      try {
        const response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
        if (response.ok) {
          const data = await response.json();
          if (data.recommendations && Array.isArray(data.recommendations)) {
            setRecommendations(
              data.recommendations
                .map((rec: any) => rec.destination || rec)
                .filter(Boolean)
            );
          }
        } else {
          // Fallback to related destinations API
          const fallbackResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.related) {
              setRecommendations(fallbackData.related);
            }
          }
        }
      } catch {
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    loadRecommendations();
  }, [destination?.slug, isOpen]);

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
      toast.error('Failed to update visit status.');
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
        router.push(`/trips?prefill=${encodeURIComponent(destination.slug)}`);
      }
    } catch (error) {
      console.error('Error adding to trip:', error);
      toast.error('Failed to add to trip.');
    }
  }, [user, destination, isAddedToTrip, router, toast]);

  // Handle share
  const handleShare = async () => {
    if (!destination) return;
    const url = `${window.location.origin}/destination/${destination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: destination.name,
          text: destination.micro_description || `Check out ${destination.name}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  // Handle directions
  const handleDirections = () => {
    const lat = destination?.latitude || enrichedData?.latitude;
    const lng = destination?.longitude || enrichedData?.longitude;
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

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

  // Get opening hours status
  const openingHours = enrichedData?.opening_hours;
  const isOpenNow = openingHours?.open_now;
  const todayHours = openingHours?.weekday_text?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  // Check if has architecture info
  const hasArchitectureInfo = enhancedDestination && (
    (enhancedDestination as any).architect_obj ||
    (enhancedDestination as any).design_firm_obj ||
    (enhancedDestination as any).interior_designer_obj ||
    (enhancedDestination as any).movement_obj ||
    enhancedDestination.architectural_style ||
    enhancedDestination.design_period
  );

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
        <div className="flex items-center gap-1 flex-shrink-0">
          {isAdmin && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-lg transition-colors ${
                isEditMode ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-label={isEditMode ? 'Exit edit mode' : 'Edit destination'}
            >
              <Edit className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => isSaved ? setShowSaveModal(true) : handleSave()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isSaved ? 'Manage saved' : 'Save'}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-gray-900 dark:text-white' : 'text-gray-500'}`} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleAddToTrip}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Add to trip"
            disabled={isAddedToTrip}
          >
            {isAddedToTrip ? (
              <Check className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Footer content
  const footerContent = (
    <div className="px-6 py-4">
      <Link
        href={`/destination/${destination.slug}`}
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full bg-black dark:bg-white text-white dark:text-black py-3.5 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
      >
        <span>View Full Page</span>
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );

  // Main content with new card-based design
  const mainContent = (
    <div className="pb-6">
      {isEditMode ? (
        <div className="px-6 pt-6">
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
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <div className="relative mx-6 mt-4 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[16/10]">
            {destination.image ? (
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 420px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              </div>
            )}

            {/* Overlay badges */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-black/80 backdrop-blur-sm text-xs font-medium flex items-center gap-1.5">
                  <img src="/michelin-star.svg" alt="" className="h-3 w-3" />
                  {destination.michelin_stars} Star{destination.michelin_stars > 1 ? 's' : ''}
                </span>
              )}
              {destination.crown && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-current" />
                  Crown
                </span>
              )}
              {isOpenNow !== undefined && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isOpenNow
                    ? 'bg-green-500/90 text-white'
                    : 'bg-red-500/90 text-white'
                }`}>
                  {isOpenNow ? 'Open Now' : 'Closed'}
                </span>
              )}
            </div>
          </div>

          {/* Title & Location */}
          <div className="px-6 pt-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {destination.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              {destination.category && (
                <>
                  <span>{capitalizeCategory(destination.category)}</span>
                  {destination.city && <span>·</span>}
                </>
              )}
              {destination.city && <span>{capitalizeCity(destination.city)}</span>}
              {destination.neighborhood && (
                <>
                  <span>·</span>
                  <span>{destination.neighborhood}</span>
                </>
              )}
            </p>

            {/* Rating & Price */}
            {(enrichedData?.rating || destination.price_level) && (
              <div className="flex items-center gap-3 mt-2">
                {enrichedData?.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {enrichedData.rating.toFixed(1)}
                    </span>
                    {enrichedData.user_ratings_total && (
                      <span className="text-sm text-gray-500">
                        ({enrichedData.user_ratings_total.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
                {destination.price_level && (
                  <span className="text-sm text-gray-500">
                    {'$'.repeat(destination.price_level)}
                  </span>
                )}
              </div>
            )}

            {/* Real-time status */}
            {destination.id && (
              <div className="mt-3">
                <RealtimeStatusBadge destinationId={destination.id} compact showWaitTime showAvailability />
              </div>
            )}
          </div>

          {/* Quick Actions Row */}
          <div className="px-6 mt-4">
            <div className="flex gap-2">
              <button
                onClick={() => isSaved ? setShowSaveModal(true) : handleSave()}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isSaved
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => isVisited ? handleVisitToggle() : setShowVisitedModal(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isVisited
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Check className="h-4 w-4" />
                {isVisited ? 'Visited' : 'Been Here'}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center w-12 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sign in prompt */}
          {!user && (
            <div className="px-6 mt-4">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Sign in to save and track visits
              </button>
            </div>
          )}

          {/* Parent Destination Card */}
          {parentDestination && (
            <div className="px-6 mt-4">
              <button
                onClick={() => onDestinationClick?.(parentDestination)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                  {parentDestination.image ? (
                    <Image src={parentDestination.image} alt={parentDestination.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Located inside</p>
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{parentDestination.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="px-6 mt-6">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {[
                { id: 'overview' as TabType, label: 'Overview', icon: Info },
                { id: 'details' as TabType, label: 'Details', icon: Building2 },
                { id: 'related' as TabType, label: 'Related', icon: Map },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 mt-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Description Card */}
                {(destination.micro_description || destination.description) && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">About</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {destination.micro_description || htmlToPlainText(destination.description || '')}
                    </p>
                  </div>
                )}

                {/* Contact & Hours Card */}
                {(enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website || todayHours) && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Contact & Hours</h3>
                    <div className="space-y-3">
                      {todayHours && (
                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{todayHours}</p>
                          </div>
                        </div>
                      )}
                      {enrichedData?.formatted_address && (
                        <button
                          onClick={handleDirections}
                          className="flex items-start gap-3 w-full text-left hover:opacity-70 transition-opacity"
                        >
                          <Navigation className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{enrichedData.formatted_address}</span>
                        </button>
                      )}
                      {enrichedData?.international_phone_number && (
                        <a
                          href={`tel:${enrichedData.international_phone_number}`}
                          className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                        >
                          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{enrichedData.international_phone_number}</span>
                        </a>
                      )}
                      {enrichedData?.website && (
                        <a
                          href={enrichedData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                        >
                          <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-blue-600 dark:text-blue-400 truncate flex-1">
                            {new URL(enrichedData.website).hostname.replace('www.', '')}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Map Card */}
                {(destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude) && (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="h-40">
                      <GoogleStaticMap
                        center={{
                          lat: destination.latitude || enrichedData?.latitude || 0,
                          lng: destination.longitude || enrichedData?.longitude || 0,
                        }}
                        zoom={15}
                        height="160px"
                        showPin
                      />
                    </div>
                    <button
                      onClick={handleDirections}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </button>
                  </div>
                )}

                {/* Tags */}
                {destination.tags && destination.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {destination.tags.slice(0, 8).map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Editorial Summary Card */}
                {enrichedData?.editorial_summary && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">From Google</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {htmlToPlainText(enrichedData.editorial_summary)}
                    </p>
                  </div>
                )}

                {/* Architecture & Design Card */}
                {hasArchitectureInfo && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Design & Architecture</h3>
                    <div className="space-y-3">
                      {(enhancedDestination as any).architect_obj && (
                        <Link
                          href={`/architects/${(enhancedDestination as any).architect_obj.slug}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {(enhancedDestination as any).architect_obj.image_url ? (
                              <Image
                                src={(enhancedDestination as any).architect_obj.image_url}
                                alt=""
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            ) : (
                              <Building2 className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Architect</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {(enhancedDestination as any).architect_obj.name}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      )}
                      {(enhancedDestination as any).interior_designer_obj && (
                        <Link
                          href={`/architects/${(enhancedDestination as any).interior_designer_obj.slug}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Interior Designer</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {(enhancedDestination as any).interior_designer_obj.name}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      )}
                      {(enhancedDestination as any).design_firm_obj && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Design Firm</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {(enhancedDestination as any).design_firm_obj.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {(enhancedDestination as any).movement_obj && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Movement</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {(enhancedDestination as any).movement_obj.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {enhancedDestination?.architectural_style && !(enhancedDestination as any).movement_obj && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Style</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {enhancedDestination.architectural_style}
                            </p>
                          </div>
                        </div>
                      )}
                      {enhancedDestination?.design_period && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Period</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {enhancedDestination.design_period}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reviews Card */}
                {enrichedData?.reviews?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5" />
                      What Reviewers Say
                    </h3>
                    {loadingReviewSummary ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Summarizing reviews...
                      </div>
                    ) : reviewSummary ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                        "{reviewSummary}"
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Nested Destinations */}
                {(loadingNested || nestedDestinations.length > 0) && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                      Venues Inside
                    </h3>
                    {loadingNested ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading venues...
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

                {/* No details message */}
                {!enrichedData?.editorial_summary && !hasArchitectureInfo && !enrichedData?.reviews?.length && nestedDestinations.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No additional details available</p>
                  </div>
                )}
              </div>
            )}

            {/* Related Tab */}
            {activeTab === 'related' && (
              <div className="space-y-4">
                {/* Recommendations Grid */}
                {loadingRecommendations ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-[4/5] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    ))}
                  </div>
                ) : recommendations.length > 0 ? (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      You might also like
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {recommendations.map((rec) => (
                        <button
                          key={rec.slug}
                          onClick={() => {
                            if (onDestinationClick) {
                              onDestinationClick(rec);
                            } else {
                              router.push(`/destination/${rec.slug}`);
                            }
                          }}
                          className="group text-left rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="relative aspect-square">
                            {rec.image ? (
                              <Image
                                src={rec.image}
                                alt={rec.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 200px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                <MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                            {rec.michelin_stars && rec.michelin_stars > 0 && (
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm text-[10px] font-medium flex items-center gap-1">
                                <img src="/michelin-star.svg" alt="" className="h-2.5 w-2.5" />
                                {rec.michelin_stars}
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {rec.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {rec.category && capitalizeCategory(rec.category)}
                              {rec.city && ` · ${capitalizeCity(rec.city)}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : relatedDestinations.length > 0 ? (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      More in {destination.city && capitalizeCity(destination.city)}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {relatedDestinations.map((rel) => (
                        <button
                          key={rel.slug}
                          onClick={() => onDestinationClick?.(rel)}
                          className="group text-left rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="relative aspect-square">
                            {(rel.image || rel.image_thumbnail) ? (
                              <Image
                                src={rel.image || rel.image_thumbnail || ''}
                                alt={rel.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 200px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                <MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {rel.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {rel.category && capitalizeCategory(rel.category)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No related destinations found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
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
