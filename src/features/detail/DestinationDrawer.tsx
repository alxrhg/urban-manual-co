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
  ExternalLink,
  ArrowRight,
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
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

// Dynamically import heavy components
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

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

/**
 * DestinationDrawer - Apple Design System
 *
 * Clean, minimal design matching the homepage aesthetic.
 * Continuous scroll layout with clear sections.
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

  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'related'>('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);

  // Data
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enhancedDestination, setEnhancedDestination] = useState<Destination | null>(destination);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Check admin
  useEffect(() => {
    if (user) {
      const role = (user as any).user_metadata?.role || (user as any).app_metadata?.role;
      setIsAdmin(role === 'admin');
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Reset on close
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

  // Load data
  useEffect(() => {
    async function loadData() {
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
            reviews_json,
            latitude,
            longitude,
            architect,
            architectural_style,
            design_period,
            architect:architects!architect_id(id, name, slug, bio, image_url),
            design_firm:design_firms(id, name, slug, description, image_url),
            interior_designer:architects!interior_designer_id(id, name, slug, bio, image_url),
            movement:design_movements(id, name, slug, description)
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
            } catch (e) { /* ignore */ }
          }

          if (data.reviews_json) {
            try {
              enriched.reviews = typeof data.reviews_json === 'string'
                ? JSON.parse(data.reviews_json)
                : data.reviews_json;
              if (Array.isArray(enriched.reviews) && enriched.reviews.length > 0) {
                generateReviewSummary(enriched.reviews, destination.name);
              }
            } catch (e) { /* ignore */ }
          }

          // Merge architect data
          let updated = { ...destination };
          const dataObj = data as any;

          if (dataObj.architect) {
            const obj = Array.isArray(dataObj.architect) ? dataObj.architect[0] : dataObj.architect;
            if (obj?.name) {
              updated = { ...updated, architect_id: obj.id, architect: updated.architect || obj.name };
              (updated as any).architect_obj = obj;
            }
          }
          if (dataObj.design_firm?.name) (updated as any).design_firm_obj = dataObj.design_firm;
          if (dataObj.interior_designer) {
            const obj = Array.isArray(dataObj.interior_designer) ? dataObj.interior_designer[0] : dataObj.interior_designer;
            if (obj?.name) (updated as any).interior_designer_obj = obj;
          }
          if (dataObj.movement) {
            const obj = Array.isArray(dataObj.movement) ? dataObj.movement[0] : dataObj.movement;
            if (obj?.name) (updated as any).movement_obj = obj;
          }

          setEnhancedDestination(updated);
          setEnrichedData(enriched);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }

      // Load saved/visited
      if (user && destination.slug) {
        try {
          const supabase = createClient();
          const [savedResult, visitedResult] = await Promise.all([
            supabase.from('saved_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
            supabase.from('visited_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
          ]);
          setIsSaved(!!savedResult.data);
          setIsVisited(!!visitedResult.data);
        } catch (error) {
          console.error('Error loading status:', error);
        }
      }
    }

    loadData();
  }, [destination, user]);

  // Load nested
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
        console.error('Error loading nested:', error);
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
          if (data.recommendations) {
            setRecommendations(data.recommendations.map((rec: any) => rec.destination || rec).filter(Boolean));
          }
        } else {
          const fallback = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
          if (fallback.ok) {
            const data = await fallback.json();
            if (data.related) setRecommendations(data.related);
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

  // Generate review summary
  const generateReviewSummary = async (reviews: any[], name: string) => {
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
    } catch {
      /* ignore */
    } finally {
      setLoadingReviewSummary(false);
    }
  };

  // Handlers
  const handleSave = useCallback(async () => {
    if (!user || !destination?.slug) {
      router.push('/auth/login');
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.from('saved_places').upsert({ user_id: user.id, destination_slug: destination.slug });
      if (!error) {
        setIsSaved(true);
        onSaveToggle?.(destination.slug, true);
        setShowSaveModal(true);
      }
    } catch {
      toast.error('Failed to save');
    }
  }, [user, destination, router, onSaveToggle, toast]);

  const handleVisitToggle = useCallback(async () => {
    if (!user || !destination?.slug) return;
    try {
      const supabase = createClient();
      if (isVisited) {
        await supabase.from('visited_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
        setIsVisited(false);
        onVisitToggle?.(destination.slug, false);
      } else {
        await supabase.from('visited_places').upsert({ user_id: user.id, destination_slug: destination.slug, visited_at: new Date().toISOString() }, { onConflict: 'user_id,destination_slug' });
        setIsVisited(true);
        onVisitToggle?.(destination.slug, true);
      }
    } catch {
      toast.error('Failed to update');
    }
  }, [user, destination, isVisited, onVisitToggle, toast]);

  const handleAddToTrip = useCallback(async () => {
    if (!user || !destination?.slug) {
      router.push('/auth/login');
      return;
    }
    if (isAddedToTrip) return;

    try {
      const supabase = createClient();
      const { data: trips } = await supabase.from('trips').select('id, title').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);

      if (trips?.length === 1) {
        const { data: orderData } = await supabase.rpc('get_next_itinerary_order', { p_trip_id: trips[0].id });
        const result = Array.isArray(orderData) ? orderData[0] : orderData;
        const { error } = await supabase.from('itinerary_items').insert({
          trip_id: trips[0].id,
          destination_slug: destination.slug,
          day: result?.next_day ?? 1,
          order_index: result?.next_order ?? 0,
          title: destination.name,
        });
        if (!error) {
          setIsAddedToTrip(true);
          toast.success(`Added to ${trips[0].title}`);
        }
      } else {
        router.push(`/trips?prefill=${encodeURIComponent(destination.slug)}`);
      }
    } catch {
      toast.error('Failed to add');
    }
  }, [user, destination, isAddedToTrip, router, toast]);

  const handleShare = async () => {
    if (!destination) return;
    const url = `${window.location.origin}/destination/${destination.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: destination.name, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  };

  const handleDirections = () => {
    const lat = destination?.latitude || enrichedData?.latitude;
    const lng = destination?.longitude || enrichedData?.longitude;
    if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Scroll lock
  useEffect(() => {
    if (isOpen) document.documentElement.style.overflow = 'hidden';
    else document.documentElement.style.overflow = '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Loading
  if (!destination) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} mobileVariant="side" desktopSpacing="right-4 top-4 bottom-4" desktopWidth="420px" position="right" style="glassy" backdropOpacity="18">
        <div className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Drawer>
    );
  }

  // Opening hours
  const openingHours = enrichedData?.opening_hours;
  const isOpenNow = openingHours?.open_now;
  const todayHours = openingHours?.weekday_text?.[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  // Architecture info
  const hasArchInfo = enhancedDestination && ((enhancedDestination as any).architect_obj || (enhancedDestination as any).design_firm_obj || (enhancedDestination as any).interior_designer_obj || (enhancedDestination as any).movement_obj || enhancedDestination.architectural_style);

  // Header
  const headerContent = (
    <div className="flex items-center justify-between w-full gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
          <X className="h-4 w-4 text-gray-900 dark:text-white" strokeWidth={1.5} />
        </button>
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
          {isEditMode ? 'Edit' : destination.name}
        </h2>
      </div>
      {user && (
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-full transition-colors ${isEditMode ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              <Edit className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
          <button onClick={() => isSaved ? setShowSaveModal(true) : handleSave()} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-gray-900 dark:text-white' : 'text-gray-500'}`} strokeWidth={1.5} />
          </button>
          <button onClick={handleAddToTrip} disabled={isAddedToTrip} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            {isAddedToTrip ? <Check className="h-4 w-4 text-green-600" /> : <Plus className="h-4 w-4 text-gray-500" />}
          </button>
        </div>
      )}
    </div>
  );

  // Footer
  const footerContent = (
    <div className="px-6 py-4">
      <Link
        href={`/destination/${destination.slug}`}
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full h-[44px] bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-[13px] font-medium hover:opacity-90 transition-opacity"
      >
        View Full Page <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  // Main content
  const mainContent = (
    <div className="px-6 pb-6">
      {isEditMode ? (
        <div className="pt-4">
          <DestinationEditForm
            destination={destination}
            onCancel={() => setIsEditMode(false)}
            onSave={() => { setIsEditMode(false); onDestinationUpdate?.(); }}
            onDelete={() => { onClose(); onDestinationUpdate?.(); }}
          />
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="relative mt-4 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[16/10]">
            {destination.image ? (
              <Image src={destination.image} alt={destination.name} fill className="object-cover" priority sizes="420px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              </div>
            )}
            {/* Badges */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/95 dark:bg-black/80 backdrop-blur-sm text-[11px] font-medium flex items-center gap-1">
                  <img src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg" alt="Michelin" className="h-3.5 w-3.5" />
                  {destination.michelin_stars} Star{destination.michelin_stars > 1 ? 's' : ''}
                </span>
              )}
              {destination.crown && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-medium flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-current" /> Crown
                </span>
              )}
              {isOpenNow !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${isOpenNow ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'}`}>
                  {isOpenNow ? 'Open' : 'Closed'}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="mt-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">{destination.name}</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
              {destination.category && capitalizeCategory(destination.category)}
              {destination.city && ` · ${capitalizeCity(destination.city)}`}
              {destination.neighborhood && ` · ${destination.neighborhood}`}
            </p>
            {(enrichedData?.rating || destination.price_level) && (
              <div className="flex items-center gap-2 mt-2">
                {enrichedData?.rating && (
                  <span className="flex items-center gap-1 text-[13px]">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{enrichedData.rating.toFixed(1)}</span>
                    {enrichedData.user_ratings_total && <span className="text-gray-500">({enrichedData.user_ratings_total.toLocaleString()})</span>}
                  </span>
                )}
                {destination.price_level && <span className="text-[13px] text-gray-500">{'$'.repeat(destination.price_level)}</span>}
              </div>
            )}
            {destination.id && <div className="mt-2"><RealtimeStatusBadge destinationId={destination.id} compact showWaitTime showAvailability /></div>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {user ? (
              <>
                <button
                  onClick={() => isSaved ? setShowSaveModal(true) : handleSave()}
                  className={`flex-1 h-[38px] flex items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                    isSaved ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
                  }`}
                >
                  <Bookmark className={`h-[15px] w-[15px] ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => isVisited ? handleVisitToggle() : setShowVisitedModal(true)}
                  className={`flex-1 h-[38px] flex items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                    isVisited ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
                  }`}
                >
                  <Check className="h-[15px] w-[15px]" />
                  {isVisited ? 'Visited' : 'Been Here'}
                </button>
                <button
                  onClick={handleAddToTrip}
                  disabled={isAddedToTrip}
                  className={`flex-1 h-[38px] flex items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                    isAddedToTrip ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {isAddedToTrip ? <Check className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
                  {isAddedToTrip ? 'Added' : 'Trip'}
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="flex-1 h-[38px] flex items-center justify-center gap-2 rounded-full border border-gray-200/80 dark:border-white/[0.12] text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
              >
                Sign in to save
              </button>
            )}
            <button onClick={handleShare} className="h-[38px] w-[38px] flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-all duration-200">
              <Share2 className="h-[15px] w-[15px]" />
            </button>
          </div>

          {/* Parent destination */}
          {parentDestination && (
            <button
              onClick={() => onDestinationClick?.(parentDestination)}
              className="w-full flex items-center gap-3 mt-6 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors text-left group"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {parentDestination.image ? (
                  <Image src={parentDestination.image} alt={parentDestination.name} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-gray-400" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Located inside</p>
                <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-600 dark:group-hover:text-gray-200">{parentDestination.name}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 flex-shrink-0" />
            </button>
          )}

          {/* Tab Navigation - text link style */}
          <div className="flex items-center gap-4 mt-6 text-[13px]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`transition-colors duration-200 ${activeTab === 'overview' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`transition-colors duration-200 ${activeTab === 'details' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('related')}
              className={`transition-colors duration-200 ${activeTab === 'related' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Related
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Description */}
              {(destination.micro_description || destination.description) && (
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">About</p>
                  <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed">
                    {destination.micro_description || htmlToPlainText(destination.description || '')}
                  </p>
                </div>
              )}

              {/* Contact & Hours */}
              {(todayHours || enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website) && (
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Contact & Hours</p>
                  <div className="space-y-2.5">
                    {todayHours && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[13px] text-gray-700 dark:text-gray-300">{todayHours}</span>
                      </div>
                    )}
                    {enrichedData?.formatted_address && (
                      <button onClick={handleDirections} className="flex items-start gap-3 text-left hover:opacity-70 transition-opacity">
                        <Navigation className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[13px] text-gray-700 dark:text-gray-300">{enrichedData.formatted_address}</span>
                      </button>
                    )}
                    {enrichedData?.international_phone_number && (
                      <a href={`tel:${enrichedData.international_phone_number}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-[13px] text-gray-700 dark:text-gray-300">{enrichedData.international_phone_number}</span>
                      </a>
                    )}
                    {enrichedData?.website && (
                      <a href={enrichedData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                        <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-[13px] text-blue-600 dark:text-blue-400 truncate">{new URL(enrichedData.website).hostname.replace('www.', '')}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Map */}
              {(destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude) && (
                <div className="mt-6">
                  <div className="rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/[0.12]">
                    <div className="h-36">
                      <GoogleStaticMap
                        center={{ lat: destination.latitude || enrichedData?.latitude || 0, lng: destination.longitude || enrichedData?.longitude || 0 }}
                        zoom={15}
                        height="144px"
                        showPin
                      />
                    </div>
                    <button onClick={handleDirections} className="w-full flex items-center justify-center gap-2 h-[38px] text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors">
                      <Navigation className="h-3.5 w-3.5" /> Get Directions
                    </button>
                  </div>
                </div>
              )}

              {/* Tags */}
              {destination.tags && destination.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {destination.tags.slice(0, 6).map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.08] text-[11px] text-gray-600 dark:text-gray-400">{tag}</span>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'details' && (
            <>
              {/* Nested destinations */}
              {(loadingNested || nestedDestinations.length > 0) && (
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Venues Inside</p>
                  {loadingNested ? (
                    <div className="flex items-center gap-2 text-[13px] text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                  ) : (
                    <div className="space-y-2">
                      {nestedDestinations.slice(0, 4).map((nested) => (
                        <button
                          key={nested.slug}
                          onClick={() => onDestinationClick?.(nested)}
                          className="w-full flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {nested.image ? (
                              <Image src={nested.image} alt={nested.name} width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-gray-400" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{nested.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{nested.category && capitalizeCategory(nested.category)}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Architecture */}
              {hasArchInfo && (
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Design & Architecture</p>
                  <div className="space-y-2">
                    {(enhancedDestination as any).architect_obj && (
                      <Link href={`/architects/${(enhancedDestination as any).architect_obj.slug}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                          {(enhancedDestination as any).architect_obj.image_url ? (
                            <Image src={(enhancedDestination as any).architect_obj.image_url} alt="" width={40} height={40} className="object-cover" />
                          ) : (
                            <span className="text-[13px] font-medium text-gray-500">{(enhancedDestination as any).architect_obj.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400">Architect</p>
                          <p className="text-[13px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{(enhancedDestination as any).architect_obj.name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      </Link>
                    )}
                    {(enhancedDestination as any).interior_designer_obj && (
                      <Link href={`/architects/${(enhancedDestination as any).interior_designer_obj.slug}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-[13px] font-medium text-gray-500">{(enhancedDestination as any).interior_designer_obj.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400">Interior Designer</p>
                          <p className="text-[13px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{(enhancedDestination as any).interior_designer_obj.name}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      </Link>
                    )}
                    {enhancedDestination?.architectural_style && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-[11px] font-medium text-gray-500">S</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400">Style</p>
                          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{enhancedDestination.architectural_style}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews with Google logo */}
              {enrichedData?.reviews?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-4" />
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Reviews</span>
                  </div>
                  {loadingReviewSummary ? (
                    <div className="flex items-center gap-2 text-[13px] text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Summarizing...</div>
                  ) : reviewSummary ? (
                    <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed italic">"{reviewSummary}"</p>
                  ) : null}
                </div>
              )}

              {/* No details fallback */}
              {!loadingNested && nestedDestinations.length === 0 && !hasArchInfo && !enrichedData?.reviews?.length && (
                <div className="mt-6 text-center py-8 text-gray-400 dark:text-gray-500">
                  <p className="text-[13px]">No additional details available</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'related' && (
            <>
              {/* Related */}
              {loadingRecommendations ? (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                </div>
              ) : (recommendations.length > 0 || relatedDestinations.length > 0) ? (
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">You Might Also Like</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(recommendations.length > 0 ? recommendations : relatedDestinations).slice(0, 6).map((rec) => (
                      <button
                        key={rec.slug}
                        onClick={() => onDestinationClick ? onDestinationClick(rec) : router.push(`/destination/${rec.slug}`)}
                        className="group text-left"
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                          {rec.image ? (
                            <Image src={rec.image} alt={rec.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="180px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" /></div>
                          )}
                          {rec.michelin_stars && rec.michelin_stars > 0 && (
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm text-[10px] font-medium flex items-center gap-0.5">
                              <img src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg" alt="Michelin" className="h-3 w-3" /> {rec.michelin_stars}
                            </div>
                          )}
                        </div>
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white mt-2 truncate group-hover:text-gray-600 dark:group-hover:text-gray-200">{rec.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{rec.category && capitalizeCategory(rec.category)}{rec.city && ` · ${capitalizeCity(rec.city)}`}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center py-8 text-gray-400 dark:text-gray-500">
                  <p className="text-[13px]">No related destinations found</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  // Render
  if (renderMode === 'inline') {
    return (
      <>
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
          <div className="flex-shrink-0 min-h-[3.5rem] px-6 flex items-center border-b border-black/5 dark:border-white/5">{headerContent}</div>
          <div className="flex-1 overflow-y-auto">{mainContent}</div>
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">{footerContent}</div>
        </div>
        {destination?.id && <SaveDestinationModal destinationId={destination.id} destinationSlug={destination.slug} isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} />}
        {destination && <VisitedModal destinationSlug={destination.slug} destinationName={destination.name} isOpen={showVisitedModal} onClose={() => setShowVisitedModal(false)} onUpdate={() => { setShowVisitedModal(false); setIsVisited(true); if (destination.slug) onVisitToggle?.(destination.slug, true); }} />}
      </>
    );
  }

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} mobileVariant="side" desktopSpacing="right-4 top-4 bottom-4" desktopWidth="420px" position="right" style="glassy" backdropOpacity="18" keepStateOnClose zIndex={9999} headerContent={headerContent} footerContent={footerContent}>
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
              setIsSaved(true);
              onSaveToggle?.(destination.slug, true);
            }
          }}
        />
      )}
      {destination && <VisitedModal destinationSlug={destination.slug} destinationName={destination.name} isOpen={showVisitedModal} onClose={() => setShowVisitedModal(false)} onUpdate={() => { setShowVisitedModal(false); setIsVisited(true); if (destination.slug) onVisitToggle?.(destination.slug, true); }} />}
    </>
  );
}
