'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Bookmark, Check, Plus, ChevronDown, X, Phone, Globe, ExternalLink, Navigation, Clock, Tag, Building2, Share2 } from 'lucide-react';
import { Skeleton } from '@/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

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
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { useSequenceTracker } from '@/hooks/useSequenceTracker';
import { SequencePredictionsInline } from '@/components/SequencePredictionsInline';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { PRICE_LEVEL } from '@/lib/constants';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import { toast } from '@/ui/sonner';

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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLabel(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface DestinationPageClientProps {
  initialDestination: Destination;
  parentDestination?: Destination | null;
}

export default function DestinationPageClient({ initialDestination, parentDestination }: DestinationPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { trackAction, predictions } = useSequenceTracker();

  const [destination] = useState<Destination>(initialDestination);
  const [loading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);

  // Parse enriched JSON fields from initial destination
  const enrichedData = useState(() => {
    const enriched: any = { ...initialDestination };

    if (initialDestination.opening_hours_json) {
      try {
        enriched.opening_hours = typeof initialDestination.opening_hours_json === 'string'
          ? JSON.parse(initialDestination.opening_hours_json)
          : initialDestination.opening_hours_json;
      } catch (e) {
        console.error('Error parsing opening_hours_json:', e);
      }
    }

    if (initialDestination.reviews_json) {
      try {
        enriched.reviews = typeof initialDestination.reviews_json === 'string'
          ? JSON.parse(initialDestination.reviews_json)
          : initialDestination.reviews_json;
      } catch (e) {
        console.error('Error parsing reviews_json:', e);
      }
    }

    if (initialDestination.photos_json) {
      try {
        enriched.photos = typeof initialDestination.photos_json === 'string'
          ? JSON.parse(initialDestination.photos_json)
          : initialDestination.photos_json;
      } catch (e) {
        console.error('Error parsing photos_json:', e);
      }
    }

    return enriched;
  })[0];

  // Track destination view
  useEffect(() => {
    if (destination?.id && user?.id) {
      // Track view event to Discovery Engine for personalization
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

      // Track for sequence prediction
      trackAction({
        type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
      });
    }
  }, [destination, trackAction]);

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
        // Remove visit
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
        // Add visit with current date (no modal needed - just mark as visited)
        if (!destination.slug) {
          toast.error('Invalid destination. Please try again.');
          return;
        }

        const { error } = await supabase
          .from('visited_places')
          .upsert({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error adding visit:', error);
          // Check if error is related to activity_feed RLS policy
          if (error.message && error.message.includes('activity_feed') && error.message.includes('row-level security')) {
            // Visit was created but activity_feed insert failed - this is okay, continue
            console.warn('Visit created but activity_feed insert failed due to RLS policy. Visit status updated successfully.');
            setIsVisited(true);
            return;
          }
          toast.error(`Failed to mark as visited: ${error.message || 'Please try again.'}`);
          return;
        }

        setIsVisited(true);
        
        // Track visit action for sequence prediction
        trackAction({
          type: 'visit',
          destination_id: destination.id,
          destination_slug: destination.slug,
        });
      }
    } catch (error: any) {
      console.error('Error toggling visit:', error);
      toast.error(`Failed to update visit status: ${error.message || 'Please try again.'}`);
    }
  };

  const handleVisitedModalUpdate = async () => {
    // Reload visited status after modal updates
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

      // Handle 401/403 gracefully - user not authenticated
      if (response.status === 401 || response.status === 403) {
        try {
          const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
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
          const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
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
      } else if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Guard clause - ensure destination exists
  if (!destination) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="text-center py-20">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading destination...</p>
        </div>
      </main>
    );
  }

  const cityName = capitalizeCity(destination.city || '');

  return (
    <main className="w-full min-h-screen">
      {/* Hero Section - Full width with gradient overlay */}
      <div className="relative">
        {/* Hero Image */}
        {destination.image ? (
          <div className="relative w-full h-[50vh] md:h-[50vh] lg:h-[45vh] xl:h-[40vh]">
            <Image
              src={destination.image}
              alt={`${destination.name} - ${destination.category} in ${destination.city}`}
              fill
              sizes="100vw"
              className="object-cover"
              quality={90}
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </div>
        ) : (
          <div className="w-full h-[40vh] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800" />
        )}

        {/* Floating Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 md:top-6 md:left-6 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center text-gray-900 dark:text-white hover:bg-white dark:hover:bg-black transition-colors shadow-lg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: destination.name,
                  text: `Check out ${destination.name} in ${cityName}`,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center text-gray-900 dark:text-white hover:bg-white dark:hover:bg-black transition-colors shadow-lg"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {user && (
            <>
              <button
                onClick={() => {
                  if (!isSaved) {
                    setShowSaveModal(true);
                  }
                }}
                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors shadow-lg ${
                  isSaved
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white/90 dark:bg-black/80 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-black'
                }`}
                aria-label={isSaved ? 'Saved' : 'Save'}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleVisitToggle}
                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors shadow-lg ${
                  isVisited
                    ? 'bg-green-600 text-white'
                    : 'bg-white/90 dark:bg-black/80 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-black'
                }`}
                aria-label={isVisited ? 'Visited' : 'Mark Visited'}
              >
                <Check className={`w-5 h-5 ${isVisited ? 'stroke-[3]' : ''}`} />
              </button>
            </>
          )}
        </div>

        {/* Hero Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-12">
          <div className="max-w-4xl mx-auto">
            {/* Location Tag */}
            <a
              href={`/city/${destination.city}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 rounded-full bg-white/20 backdrop-blur-sm text-white text-[13px] font-medium hover:bg-white/30 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              {destination.neighborhood && <span>{destination.neighborhood} · </span>}
              {destination.country ? `${cityName}, ${destination.country}` : cityName}
            </a>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              {destination.name}
            </h1>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2">
              {destination.category && (
                <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[13px] font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {formatLabel(destination.category)}
                </span>
              )}
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-sm text-white text-[13px] font-medium flex items-center gap-1.5">
                  <Image
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 brightness-0 invert"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== '/michelin-star.svg') {
                        target.src = '/michelin-star.svg';
                      }
                    }}
                  />
                  {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                </span>
              )}
              {destination.crown && (
                <span className="px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-white text-[13px] font-medium">
                  Crown
                </span>
              )}
              {(enrichedData?.rating || destination.rating) && (
                <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[13px] font-medium flex items-center gap-1.5">
                  <span className="text-yellow-400">★</span>
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                  {enrichedData?.user_ratings_total && (
                    <span className="text-white/70">({enrichedData.user_ratings_total.toLocaleString()})</span>
                  )}
                </span>
              )}
              {(enrichedData?.price_level || destination.price_level) && (
                <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[13px] font-medium">
                  {PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}
                </span>
              )}
              {destination.brand && (
                <a
                  href={`/brand/${encodeURIComponent(destination.brand)}`}
                  className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[13px] font-medium flex items-center gap-1.5 hover:bg-white/30 transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {destination.brand}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Desktop only */}
      <div className="hidden lg:block sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12">
          <nav className="flex items-center gap-8 overflow-x-auto">
            <a href="#about" className="py-4 text-[14px] font-medium text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white -mb-px">
              About
            </a>
            {enrichedData?.reviews && enrichedData.reviews.length > 0 && (
              <a href="#reviews" className="py-4 text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Reviews
              </a>
            )}
            <a href="#location" className="py-4 text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Location
            </a>
            {recommendations.length > 0 && (
              <a href="#similar" className="py-4 text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Similar
              </a>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-10 lg:px-12 py-8 md:py-10">
        <div className="max-w-7xl mx-auto">
          {/* Two-column layout on desktop */}
          <div className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-12">
            {/* Main Column */}
            <div className="space-y-8 md:space-y-10">
              {/* Parent Destination Link */}
              {parentDestination && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Located inside
                  </p>
                  <HorizontalDestinationCard
                    destination={parentDestination}
                    onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                    showBadges={true}
                  />
                </div>
              )}

              {/* Quick Actions Bar - Visible on Mobile */}
              {user && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 lg:hidden">
                  <button
                    onClick={() => !isSaved && setShowSaveModal(true)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                      isSaved
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                          isVisited
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={(e) => {
                          if (!isVisited) {
                            e.preventDefault();
                            handleVisitToggle();
                          }
                        }}
                      >
                        <Check className={`h-4 w-4 ${isVisited ? 'stroke-[3]' : ''}`} />
                        {isVisited ? 'Visited' : 'Mark Visited'}
                        {isVisited && <ChevronDown className="h-4 w-4" />}
                      </button>
                    </DropdownMenuTrigger>
                    {isVisited && (
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => {
                          setShowVisitedModal(true);
                          setShowVisitedDropdown(false);
                        }}>
                          <Plus className="h-3 w-3 mr-2" />
                          Add Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          handleVisitToggle();
                          setShowVisitedDropdown(false);
                        }}>
                          <X className="h-3 w-3 mr-2" />
                          Remove Visit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                </div>
              )}

              {/* Sequence Predictions */}
              {user && predictions && predictions.predictions && predictions.predictions.length > 0 && (
                <SequencePredictionsInline
                  predictions={predictions.predictions}
                  compact={false}
                />
              )}

              {/* ML Intelligence Section */}
              {destination.id && (
                <div className="space-y-4">
                  <AnomalyAlert destinationId={destination.id} type="traffic" />
                  <ForecastInfo destinationId={destination.id} />
                  <SentimentDisplay destinationId={destination.id} days={30} />
                  <TopicsDisplay destinationId={destination.id} minTopicSize={3} />
                </div>
              )}

              {/* About Section */}
              {destination.content && (
                <div id="about" className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-6 md:p-8 scroll-mt-20">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h2>
                  <div className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {htmlToPlainText(destination.content)}
                  </div>
                  {destination.micro_description && destination.micro_description !== destination.content && (
                    <p className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10 text-[14px] text-gray-500 dark:text-gray-500 italic">
                      {destination.micro_description}
                    </p>
                  )}
                </div>
              )}

              {/* Architecture & Design */}
              <ArchitectDesignInfo destination={destination} />

              {/* Reviews Section */}
              {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
                <div id="reviews" className="scroll-mt-20">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Reviews</h2>
                  <div className="space-y-4">
                    {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-5 hover:border-gray-200 dark:hover:border-white/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[14px] font-medium text-gray-600 dark:text-gray-400">
                              {review.author_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-[14px] text-gray-900 dark:text-white">{review.author_name}</span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-[12px] ${i < (review.rating || 0) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              {review.relative_time_description && (
                                <span className="text-[12px] text-gray-400">· {review.relative_time_description}</span>
                              )}
                            </div>
                            {review.text && (
                              <p className="mt-2 text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                {review.text}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nested Destinations */}
              {destination.nested_destinations && destination.nested_destinations.length > 0 && (
                <div>
                  <NestedDestinations
                    destinations={destination.nested_destinations}
                    parentName={destination.name}
                    onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)}
                  />
                </div>
              )}

              {/* Similar Destinations */}
              {(loadingRecommendations || recommendations.length > 0) && (
                <div id="similar" className="scroll-mt-20">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">You might also like</h2>

                  {loadingRecommendations ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="aspect-[4/3] rounded-2xl" />
                          <Skeleton className="h-4 rounded-lg w-3/4" />
                          <Skeleton className="h-3 rounded-lg w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-12 text-[14px] text-gray-400">
                      No similar destinations found
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommendations.slice(0, 8).map(rec => (
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
                          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
                            {rec.image ? (
                              <Image
                                src={rec.image}
                                alt={`${rec.name} - ${rec.category} in ${rec.city}`}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                quality={75}
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                                <MapPin className="h-10 w-10 opacity-20" />
                              </div>
                            )}

                            {rec.michelin_stars && rec.michelin_stars > 0 && (
                              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium flex items-center gap-1">
                                <img
                                  src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                                  alt="Michelin star"
                                  width={12}
                                  height={12}
                                  className="h-3 w-3 brightness-0 invert"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src !== '/michelin-star.svg') {
                                      target.src = '/michelin-star.svg';
                                    }
                                  }}
                                />
                                {rec.michelin_stars}
                              </div>
                            )}
                          </div>

                          <h3 className="text-[14px] font-medium text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors line-clamp-1">
                            {rec.name}
                          </h3>
                          <p className="text-[13px] text-gray-500 mt-1">
                            {capitalizeCity(rec.city)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions - Mobile only */}
              <div className="pt-8 border-t border-gray-100 dark:border-white/10 lg:hidden">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push(`/city/${destination.city}`)}
                    className="flex-1 px-6 py-3.5 text-[14px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Explore more in {cityName}
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 px-6 py-3.5 text-[14px] font-medium border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Browse all destinations
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar - Desktop only */}
            <div id="location" className="hidden lg:block scroll-mt-20">
              <div className="sticky top-16 space-y-6">
                {/* Location & Contact Card */}
                {(enrichedData?.formatted_address || enrichedData?.vicinity || destination.formatted_address ||
                  enrichedData?.international_phone_number || destination.phone_number ||
                  enrichedData?.website || destination.website || destination.instagram_url ||
                  enrichedData?.opening_hours?.weekday_text) && (
                  <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                    <div className="p-5">
                      <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">Location & Contact</h2>

                      {/* Address */}
                      {(enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity) && (
                        <div className="flex items-start gap-3 mb-4">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                            {enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity}
                          </p>
                        </div>
                      )}

                      {/* Directions Button */}
                      {destination.latitude && destination.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[13px] font-medium hover:opacity-90 transition-opacity mb-4"
                        >
                          <Navigation className="h-4 w-4" />
                          Get Directions
                        </a>
                      )}

                      {/* Contact Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {(enrichedData?.international_phone_number || destination.phone_number) && (
                          <a
                            href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                        )}
                        {(enrichedData?.website || destination.website) && (() => {
                          const websiteUrl = (enrichedData?.website || destination.website) || '';
                          const fullUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                          return (
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                            >
                              <Globe className="h-4 w-4" />
                              Website
                            </a>
                          );
                        })()}
                      </div>
                      {destination.instagram_url && (
                        <a
                          href={destination.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/10 rounded-xl text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Instagram
                        </a>
                      )}
                    </div>

                    {/* Opening Hours */}
                    {enrichedData?.opening_hours?.weekday_text && Array.isArray(enrichedData.opening_hours.weekday_text) && (
                      <div className="px-5 py-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">Hours</h3>
                        </div>
                        <div className="space-y-1.5">
                          {enrichedData.opening_hours.weekday_text.map((day: string, index: number) => {
                            const [dayName, hoursText] = day.split(': ');
                            return (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-[12px] text-gray-500">{dayName}</span>
                                <span className="text-[12px] text-gray-900 dark:text-white font-medium">{hoursText}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions - Desktop */}
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/city/${destination.city}`)}
                    className="w-full px-5 py-3 text-[14px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Explore more in {cityName}
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full px-5 py-3 text-[14px] font-medium border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Browse all destinations
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Contact - Mobile only (shown below main content) */}
          <div className="lg:hidden mt-8 space-y-8">
            {(enrichedData?.formatted_address || enrichedData?.vicinity || destination.formatted_address ||
              enrichedData?.international_phone_number || destination.phone_number ||
              enrichedData?.website || destination.website || destination.instagram_url ||
              enrichedData?.opening_hours?.weekday_text) && (
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Location & Contact</h2>

                  {(enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity) && (
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] text-gray-900 dark:text-white font-medium">
                          {enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity}
                        </p>
                        {destination.latitude && destination.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[13px] font-medium hover:opacity-90 transition-opacity"
                          >
                            <Navigation className="h-4 w-4" />
                            Get Directions
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(enrichedData?.international_phone_number || destination.phone_number) && (
                      <a
                        href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/10 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    )}
                    {(enrichedData?.website || destination.website) && (() => {
                      const websiteUrl = (enrichedData?.website || destination.website) || '';
                      const fullUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                      return (
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/10 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                        >
                          <Globe className="h-4 w-4" />
                          Website
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      );
                    })()}
                    {destination.instagram_url && (
                      <a
                        href={destination.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/10 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        Instagram
                      </a>
                    )}
                  </div>
                </div>

                {enrichedData?.opening_hours?.weekday_text && Array.isArray(enrichedData.opening_hours.weekday_text) && (
                  <div className="px-6 py-5 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">Hours</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      {enrichedData.opening_hours.weekday_text.map((day: string, index: number) => {
                        const [dayName, hoursText] = day.split(': ');
                        return (
                          <div key={index} className="flex justify-between items-center py-1">
                            <span className="text-[13px] text-gray-500">{dayName}</span>
                            <span className="text-[13px] text-gray-900 dark:text-white font-medium">{hoursText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save to Collection Modal */}
      {destination && destination.id && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={async () => {
            setShowSaveModal(false);
            // Reload saved status after modal closes
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
          onSave={async (collectionId) => {
            // Also save to saved_places for simple save functionality
            if (destination.slug && user) {
              try {
                const { error } = await supabase
                  .from('saved_places')
                  .upsert({
                    user_id: user.id,
                    destination_slug: destination.slug,
                  });
                if (!error) {
                  setIsSaved(true);
                  
                  // Track save action for sequence prediction
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
            // Refresh visited status - will revert to false if modal was cancelled without saving
            handleVisitedModalUpdate();
          }}
          onUpdate={handleVisitedModalUpdate}
        />
      )}
    </main>
  );
}
