'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Bookmark,
  Check,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Globe,
  ExternalLink,
  Navigation,
  Clock,
  Building2,
  Share2,
  Star,
  Images,
  Map,
  MessageSquare,
  Info,
} from 'lucide-react';
import { Skeleton } from '@/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { htmlToPlainText } from '@/lib/sanitize';
import { trackEvent } from '@/lib/analytics/track';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { useAuth } from '@/contexts/AuthContext';
import { NestedDestinations } from '@/components/NestedDestinations';
import { ForecastInfo } from '@/components/ForecastInfo';
import { SentimentDisplay } from '@/components/SentimentDisplay';
import { TopicsDisplay } from '@/components/TopicsDisplay';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { useSequenceTracker } from '@/hooks/useSequenceTracker';
import { SequencePredictionsInline } from '@/components/SequencePredictionsInline';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { PRICE_LEVEL } from '@/lib/constants';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import { toast } from '@/ui/sonner';
import GoogleMap from '@/components/GoogleMap';

// New components
import {
  ImageLightbox,
  EnhancedReviews,
  StickyHeader,
  DestinationHighlights,
  PerfectFor,
} from '@/components/destination';

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  michelin_stars?: number;
  crown?: boolean;
  rating?: number;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLabel(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface DestinationPageClientProps {
  initialDestination: Destination;
  parentDestination?: Destination | null;
  siblingDestinations?: Destination[];
}

export default function DestinationPageClient({
  initialDestination,
  parentDestination,
  siblingDestinations = [],
}: DestinationPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { trackAction, predictions } = useSequenceTracker();

  const [destination] = useState<Destination>(initialDestination);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Parse enriched JSON fields from initial destination
  const enrichedData = useState(() => {
    const enriched: any = { ...initialDestination };

    if (initialDestination.opening_hours_json) {
      try {
        enriched.opening_hours =
          typeof initialDestination.opening_hours_json === 'string'
            ? JSON.parse(initialDestination.opening_hours_json)
            : initialDestination.opening_hours_json;
      } catch (e) {
        console.error('Error parsing opening_hours_json:', e);
      }
    }

    if (initialDestination.reviews_json) {
      try {
        enriched.reviews =
          typeof initialDestination.reviews_json === 'string'
            ? JSON.parse(initialDestination.reviews_json)
            : initialDestination.reviews_json;
      } catch (e) {
        console.error('Error parsing reviews_json:', e);
      }
    }

    if (initialDestination.photos_json) {
      try {
        enriched.photos =
          typeof initialDestination.photos_json === 'string'
            ? JSON.parse(initialDestination.photos_json)
            : initialDestination.photos_json;
      } catch (e) {
        console.error('Error parsing photos_json:', e);
      }
    }

    return enriched;
  })[0];

  // Collect all images for gallery
  const allImages = useMemo(
    () =>
      [
        destination.image,
        ...(enrichedData?.photos?.map(
          (p: { photo_reference?: string; url?: string }) =>
            p.url ||
            (p.photo_reference
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
              : null)
        ) || []),
      ].filter((img): img is string => !!img),
    [destination.image, enrichedData?.photos]
  );

  // Track destination view
  useEffect(() => {
    if (destination?.id && user?.id) {
      fetch('/api/discovery/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventType: 'view',
          documentId: destination.slug,
        }),
      }).catch((error) => {
        console.warn('Failed to track view event:', error);
      });
    }

    if (destination?.id) {
      trackEvent({
        event_type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
        metadata: {
          category: destination.category,
          city: destination.city,
        },
      });

      trackAction({
        type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
      });
    }
  }, [destination, trackAction, user?.id]);

  useEffect(() => {
    if (destination) {
      loadRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [destination]);

  // Check if destination is saved
  useEffect(() => {
    async function checkIfSaved() {
      if (!user || !destination?.slug) return;

      try {
        const { data } = await supabase
          .from('saved_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .single();

        setIsSaved(!!data);
      } catch (error) {
        setIsSaved(false);
      }
    }

    checkIfSaved();
  }, [user, destination]);

  // Check if destination is visited
  useEffect(() => {
    async function checkIfVisited() {
      if (!user || !destination?.slug) return;

      try {
        const { data } = await supabase
          .from('visited_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .single();

        setIsVisited(!!data);
      } catch (error) {
        setIsVisited(false);
      }
    }

    checkIfVisited();
  }, [user, destination]);

  const handleVisitToggle = async () => {
    if (!user || !destination) {
      if (!user) {
        router.push('/auth/login');
      }
      return;
    }

    try {
      if (isVisited) {
        const { error } = await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);

        if (error) {
          console.error('Error removing visit:', error);
          throw error;
        }

        setIsVisited(false);
      } else {
        if (!destination.slug) {
          toast.error('Invalid destination. Please try again.');
          return;
        }

        const { error } = await supabase.from('visited_places').upsert({
          user_id: user.id,
          destination_slug: destination.slug,
          visited_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Error adding visit:', error);
          if (
            error.message &&
            error.message.includes('activity_feed') &&
            error.message.includes('row-level security')
          ) {
            console.warn(
              'Visit created but activity_feed insert failed due to RLS policy.'
            );
            setIsVisited(true);
            return;
          }
          toast.error(
            `Failed to mark as visited: ${error.message || 'Please try again.'}`
          );
          return;
        }

        setIsVisited(true);

        trackAction({
          type: 'visit',
          destination_id: destination.id,
          destination_slug: destination.slug,
        });
      }
    } catch (error: any) {
      console.error('Error toggling visit:', error);
      toast.error(
        `Failed to update visit status: ${error.message || 'Please try again.'}`
      );
    }
  };

  const handleVisitedModalUpdate = async () => {
    if (!user || !destination) return;

    try {
      const { data: visitedData, error } = await supabase
        .from('visited_places')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .maybeSingle();

      if (error) {
        console.error('Error checking visited status:', error);
      }

      setIsVisited(!!visitedData);
    } catch (error) {
      console.error('Error updating visited status:', error);
    }
  };

  const loadRecommendations = async () => {
    if (!destination) return;

    setLoadingRecommendations(true);
    try {
      const response = await fetch(`/api/recommendations?limit=6`);

      if (response.status === 401 || response.status === 403) {
        try {
          const relatedResponse = await fetch(
            `/api/related-destinations?slug=${destination.slug}&limit=6`
          );
          if (relatedResponse.ok) {
            const data = await relatedResponse.json();
            setRecommendations(
              (data.related || []).map((dest: any) => ({
                slug: dest.slug,
                name: dest.name,
                city: dest.city,
                category: dest.category,
                image: dest.image,
                michelin_stars: dest.michelin_stars,
                crown: dest.crown,
                rating: dest.rating,
              }))
            );
          } else {
            setRecommendations([]);
          }
        } catch {
          setRecommendations([]);
        }
        setLoadingRecommendations(false);
        return;
      }

      if (!response.ok) {
        try {
          const relatedResponse = await fetch(
            `/api/related-destinations?slug=${destination.slug}&limit=6`
          );
          if (relatedResponse.ok) {
            const data = await relatedResponse.json();
            setRecommendations(
              (data.related || []).map((dest: any) => ({
                slug: dest.slug,
                name: dest.name,
                city: dest.city,
                category: dest.category,
                image: dest.image,
                michelin_stars: dest.michelin_stars,
                crown: dest.crown,
                rating: dest.rating,
              }))
            );
          } else {
            setRecommendations([]);
          }
        } catch {
          setRecommendations([]);
        }
        setLoadingRecommendations(false);
        return;
      }

      const data = await response.json();

      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(
          data.recommendations
            .map((rec: any) => rec.destination)
            .filter(Boolean)
            .slice(0, 6)
        );
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: destination.name,
        text: `Check out ${destination.name} in ${cityName}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleSaveClick = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!isSaved) {
      setShowSaveModal(true);
    }
  };

  const goToPreviousImage = () => {
    setSelectedImageIndex((prev) =>
      prev > 0 ? prev - 1 : allImages.length - 1
    );
  };

  const goToNextImage = () => {
    setSelectedImageIndex((prev) =>
      prev < allImages.length - 1 ? prev + 1 : 0
    );
  };

  // Guard clause
  if (!destination) {
    return (
      <main className="w-full px-4 sm:px-6 pt-16 pb-24 sm:py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading destination...
            </p>
          </div>
        </div>
      </main>
    );
  }

  const cityName = capitalizeCity(destination.city || '');
  const bookingUrl =
    destination.booking_url ||
    destination.opentable_url ||
    destination.resy_url ||
    destination.website;

  return (
    <>
      {/* Sticky Header */}
      <StickyHeader
        destinationName={destination.name}
        city={destination.city}
        rating={enrichedData?.rating || destination.rating || undefined}
        reviewCount={enrichedData?.user_ratings_total || destination.user_ratings_total || undefined}
        category={destination.category}
        isSaved={isSaved}
        isVisited={isVisited}
        bookingUrl={bookingUrl}
        onSave={handleSaveClick}
        onVisit={handleVisitToggle}
        onShare={handleShare}
        destinationId={destination.id}
        destinationSlug={destination.slug}
      />

      <main className="w-full px-4 sm:px-6 pt-16 pb-24 sm:py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link
            href={`/city/${destination.city}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {cityName}
          </Link>

          {/* Hero Image Section */}
          <div className="mb-6">
            <div
              className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group"
              onClick={() => setShowLightbox(true)}
            >
              {allImages.length > 0 ? (
                <>
                  <Image
                    src={allImages[selectedImageIndex]}
                    alt={`${destination.name} - Image ${selectedImageIndex + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 896px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    quality={90}
                    priority
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                  {/* Image counter */}
                  {allImages.length > 1 && (
                    <button
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[12px] font-medium flex items-center gap-2 hover:bg-black/70 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLightbox(true);
                      }}
                    >
                      <Images className="w-4 h-4" />
                      {selectedImageIndex + 1} / {allImages.length}
                    </button>
                  )}

                  {/* Navigation arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPreviousImage();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToNextImage();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {allImages.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden ${
                      selectedImageIndex === idx
                        ? 'ring-2 ring-gray-900 dark:ring-white'
                        : 'opacity-70 hover:opacity-100'
                    } transition-all`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      quality={60}
                    />
                    {idx === 4 && allImages.length > 5 && (
                      <div
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[12px] font-medium cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLightbox(true);
                        }}
                      >
                        +{allImages.length - 5}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Header */}
          <div className="mb-6">
            {/* Category & Rating */}
            <div className="flex items-center gap-3 text-[13px] mb-3">
              <span className="uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                {formatLabel(destination.category)}
              </span>
              {(enrichedData?.rating || destination.rating) && (
                <span className="flex items-center gap-1.5 text-gray-900 dark:text-white font-medium">
                  <img
                    src="/google-logo.svg"
                    alt="Google"
                    className="w-3.5 h-3.5"
                  />
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                  {(enrichedData?.user_ratings_total ||
                    destination.user_ratings_total) && (
                    <span className="text-gray-400 font-normal">
                      (
                      {enrichedData?.user_ratings_total ||
                        destination.user_ratings_total}
                      )
                    </span>
                  )}
                </span>
              )}
              {(enrichedData?.price_level || destination.price_level) && (
                <span className="text-gray-500 dark:text-gray-400">
                  {
                    PRICE_LEVEL.LABELS[
                      (enrichedData?.price_level ||
                        destination.price_level) as keyof typeof PRICE_LEVEL.LABELS
                    ]
                  }
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
              {destination.name}
            </h1>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-[14px]">
                {destination.neighborhood && `${destination.neighborhood} · `}
                {cityName}
                {destination.country ? `, ${destination.country}` : ''}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-[12px] font-medium text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <img
                    src="/michelin-star.svg"
                    alt="Michelin"
                    className="w-3 h-3"
                  />
                  {destination.michelin_stars} Michelin{' '}
                  {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                </span>
              )}
              {destination.crown && (
                <span className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-[12px] font-medium text-amber-700 dark:text-amber-300">
                  Crown
                </span>
              )}
              {destination.brand && (
                <Link
                  href={`/brand/${encodeURIComponent(destination.brand)}`}
                  className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                >
                  <Building2 className="w-3 h-3" />
                  {destination.brand}
                </Link>
              )}
            </div>

            {/* Highlights */}
            <div className="mb-4">
              <DestinationHighlights
                destination={destination}
                reviews={enrichedData?.reviews}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleSaveClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  isSaved
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`}
                />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <DropdownMenu
                open={showVisitedDropdown}
                onOpenChange={setShowVisitedDropdown}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => {
                      if (!isVisited) {
                        e.preventDefault();
                        user ? handleVisitToggle() : router.push('/auth/login');
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                      isVisited
                        ? 'bg-green-600 text-white'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Check
                      className={`w-4 h-4 ${isVisited ? 'stroke-[3]' : ''}`}
                    />
                    {isVisited ? 'Visited' : 'Mark Visited'}
                    {isVisited && <ChevronDown className="w-3 h-3" />}
                  </button>
                </DropdownMenuTrigger>
                {isVisited && (
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        setShowVisitedModal(true);
                        setShowVisitedDropdown(false);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Add Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleVisitToggle();
                        setShowVisitedDropdown(false);
                      }}
                    >
                      <X className="h-3 w-3 mr-2" />
                      Remove Visit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>

              {/* Book Now button (prominent) */}
              {bookingUrl && (
                <a
                  href={
                    bookingUrl.startsWith('http')
                      ? bookingUrl
                      : `https://${bookingUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-[13px] font-semibold hover:opacity-90 transition-opacity ml-auto"
                >
                  <ExternalLink className="w-4 h-4" />
                  Book Now
                </a>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-8"
          >
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Reviews</span>
                {enrichedData?.reviews?.length > 0 && (
                  <span className="text-xs text-gray-400">
                    ({enrichedData.reviews.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <Images className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
                {allImages.length > 0 && (
                  <span className="text-xs text-gray-400">
                    ({allImages.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Parent Destination */}
              {parentDestination && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-3">
                    Located inside
                  </p>
                  <HorizontalDestinationCard
                    destination={parentDestination}
                    onClick={() =>
                      router.push(`/destination/${parentDestination.slug}`)
                    }
                    showBadges={true}
                  />
                </div>
              )}

              {/* Description */}
              {(destination.micro_description || destination.content) && (
                <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-3">
                    About
                  </h2>
                  {destination.micro_description && (
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white mb-2">
                      {destination.micro_description}
                    </p>
                  )}
                  {destination.content && (
                    <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
                      {htmlToPlainText(destination.content)}
                    </p>
                  )}
                </div>
              )}

              {/* Architecture & Design */}
              <ArchitectDesignInfo destination={destination} />

              {/* Perfect For */}
              <PerfectFor
                destination={destination}
                reviews={enrichedData?.reviews}
              />

              {/* ML Intelligence */}
              {destination.id && (
                <div className="space-y-4">
                  <AnomalyAlert destinationId={destination.id} type="traffic" />
                  <ForecastInfo destinationId={destination.id} />
                  <SentimentDisplay destinationId={destination.id} days={30} />
                  <TopicsDisplay
                    destinationId={destination.id}
                    minTopicSize={3}
                  />
                </div>
              )}

              {/* Contact & Hours */}
              {(enrichedData?.formatted_address ||
                destination.formatted_address ||
                enrichedData?.opening_hours?.weekday_text) && (
                <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-4">
                    Contact & Hours
                  </h2>

                  <div className="space-y-4">
                    {/* Address */}
                    {(enrichedData?.formatted_address ||
                      destination.formatted_address) && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[13px] text-gray-600 dark:text-gray-400">
                          {enrichedData?.formatted_address ||
                            destination.formatted_address}
                        </p>
                      </div>
                    )}

                    {/* Contact Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {destination.latitude && destination.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
                        >
                          <Navigation className="w-4 h-4" />
                          Get Directions
                        </a>
                      )}
                      {(enrichedData?.international_phone_number ||
                        destination.phone_number) && (
                        <a
                          href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      )}
                      {(enrichedData?.website || destination.website) && (
                        <a
                          href={(() => {
                            const url =
                              enrichedData?.website || destination.website || '';
                            return url.startsWith('http')
                              ? url
                              : `https://${url}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          Website
                        </a>
                      )}
                    </div>

                    {/* Opening Hours */}
                    {enrichedData?.opening_hours?.weekday_text &&
                      Array.isArray(enrichedData.opening_hours.weekday_text) && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                              Hours
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {enrichedData.opening_hours.weekday_text.map(
                              (day: string, index: number) => {
                                const [dayName, hoursText] = day.split(': ');
                                return (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center text-sm"
                                  >
                                    <span className="text-gray-500">
                                      {dayName}
                                    </span>
                                    <span className="text-gray-900 dark:text-white font-medium">
                                      {hoursText}
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Sibling Destinations */}
              {siblingDestinations.length > 0 && parentDestination && (
                <div>
                  <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-4">
                    Also inside {parentDestination.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {siblingDestinations.slice(0, 4).map((sibling) => (
                      <div
                        key={sibling.slug}
                        className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
                      >
                        <HorizontalDestinationCard
                          destination={sibling}
                          onClick={() =>
                            router.push(`/destination/${sibling.slug}`)
                          }
                          showBadges={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nested Destinations */}
              {destination.nested_destinations &&
                destination.nested_destinations.length > 0 && (
                  <NestedDestinations
                    destinations={destination.nested_destinations}
                    parentName={destination.name}
                    onDestinationClick={(nested) =>
                      router.push(`/destination/${nested.slug}`)
                    }
                  />
                )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              {enrichedData?.reviews &&
              Array.isArray(enrichedData.reviews) &&
              enrichedData.reviews.length > 0 ? (
                <EnhancedReviews
                  reviews={enrichedData.reviews}
                  overallRating={enrichedData?.rating || destination.rating || undefined}
                  totalRatings={
                    enrichedData?.user_ratings_total ||
                    destination.user_ratings_total ||
                    undefined
                  }
                  destinationName={destination.name}
                />
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No reviews available yet
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              {allImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setShowLightbox(true);
                      }}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group"
                    >
                      <Image
                        src={img}
                        alt={`${destination.name} - Image ${idx + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        quality={75}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Images className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No images available
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map">
              {destination.latitude && destination.longitude ? (
                <div className="space-y-4">
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <GoogleMap
                      latitude={destination.latitude}
                      longitude={destination.longitude}
                      height="100%"
                      className="w-full h-full"
                      interactive={true}
                      staticMode={false}
                      showInfoWindow={true}
                      infoWindowContent={{
                        title: destination.name,
                        address:
                          enrichedData?.formatted_address ||
                          destination.formatted_address,
                        category: destination.category,
                        rating: enrichedData?.rating || destination.rating,
                      }}
                    />
                  </div>

                  {/* Address & Directions */}
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                            {destination.name}
                          </p>
                          <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-0.5">
                            {enrichedData?.formatted_address ||
                              destination.formatted_address ||
                              `${destination.neighborhood || ''} ${cityName}`.trim()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                      >
                        <Navigation className="w-4 h-4" />
                        Directions
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Map className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Location not available
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Similar Destinations */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div className="mt-12">
              <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-4">
                You might also like
              </h2>
              {loadingRecommendations ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[4/3] rounded-xl" />
                      <Skeleton className="h-4 rounded w-3/4" />
                      <Skeleton className="h-3 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recommendations.slice(0, 8).map((rec) => (
                    <button
                      key={rec.slug}
                      onClick={() => {
                        trackEvent({
                          event_type: 'click',
                          destination_slug: rec.slug,
                          metadata: {
                            source: 'destination_detail_recommendations',
                            category: rec.category,
                            city: rec.city,
                          },
                        });
                        router.push(`/destination/${rec.slug}`);
                      }}
                      className="text-left group"
                    >
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
                        {rec.image ? (
                          <Image
                            src={rec.image}
                            alt={rec.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform"
                            quality={75}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                        {rec.michelin_stars && rec.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-medium flex items-center gap-1">
                            <img
                              src="/michelin-star.svg"
                              alt="Michelin"
                              className="w-2.5 h-2.5"
                            />
                            {rec.michelin_stars}
                          </div>
                        )}
                      </div>
                      <h3 className="text-[13px] font-medium text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors line-clamp-1">
                        {rec.name}
                      </h3>
                      <p className="text-[12px] text-gray-500">
                        {capitalizeCity(rec.city)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sequence Predictions */}
          {user &&
            predictions &&
            predictions.predictions &&
            predictions.predictions.length > 0 && (
              <div className="mt-8">
                <SequencePredictionsInline
                  predictions={predictions.predictions}
                  compact={false}
                />
              </div>
            )}

          {/* Mobile CTA */}
          <div className="lg:hidden mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
            {bookingUrl && (
              <a
                href={
                  bookingUrl.startsWith('http')
                    ? bookingUrl
                    : `https://${bookingUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" />
                Book Now
              </a>
            )}
            <button
              onClick={() => router.push(`/city/${destination.city}`)}
              className="w-full px-4 py-3 text-[14px] font-medium border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
            >
              Explore more in {cityName}
            </button>
          </div>
        </div>
      </main>

      {/* Image Lightbox */}
      <ImageLightbox
        images={allImages}
        initialIndex={selectedImageIndex}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        destinationName={destination.name}
      />

      {/* Save to Collection Modal */}
      {destination && destination.id && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={async () => {
            setShowSaveModal(false);
            if (user && destination?.slug) {
              try {
                const { data } = await supabase
                  .from('saved_places')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('destination_slug', destination.slug)
                  .single();
                setIsSaved(!!data);
              } catch {
                setIsSaved(false);
              }
            }
          }}
          onSave={async () => {
            if (destination.slug && user) {
              try {
                const { error } = await supabase.from('saved_places').upsert({
                  user_id: user.id,
                  destination_slug: destination.slug,
                });
                if (!error) {
                  setIsSaved(true);
                  trackAction({
                    type: 'save',
                    destination_id: destination.id,
                    destination_slug: destination.slug,
                  });
                }
              } catch (error) {
                console.error('Error saving to saved_places:', error);
              }
            }
            setShowSaveModal(false);
          }}
        />
      )}

      {/* Visited Modal */}
      {destination && (
        <VisitedModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showVisitedModal}
          onClose={() => {
            setShowVisitedModal(false);
            handleVisitedModalUpdate();
          }}
          onUpdate={handleVisitedModalUpdate}
        />
      )}
    </>
  );
}
