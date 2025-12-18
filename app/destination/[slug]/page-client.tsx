'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, MapPin, Bookmark, Check, Plus, ChevronDown, Phone, Globe, ExternalLink, Navigation, Clock, Tag, Building2, Share2, Star, ChevronRight, ArrowLeft, Heart } from 'lucide-react';
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
import { ImageCarousel } from '@/ui/image-carousel';

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

  // Collect all available images
  const allImages = (() => {
    const images: string[] = [];
    if (destination.image) images.push(destination.image);
    if (enrichedData?.photos && Array.isArray(enrichedData.photos)) {
      enrichedData.photos.forEach((photo: any) => {
        if (photo.photo_url && !images.includes(photo.photo_url)) {
          images.push(photo.photo_url);
        }
      });
    }
    if (destination.primary_photo_url && !images.includes(destination.primary_photo_url)) {
      images.push(destination.primary_photo_url);
    }
    return images;
  })();

  // State for selected thumbnail on desktop
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  return (
    <>
      {/* ========== MOBILE LAYOUT ========== */}
      <main className="lg:hidden w-full min-h-screen bg-black">
        {/* Hero Image Section */}
        <div className="relative h-[55vh] min-h-[360px]">
          {allImages.length > 0 ? (
            <ImageCarousel
              images={allImages}
              alt={`${destination.name} - ${destination.category} in ${destination.city}`}
              aspectRatio="4/3"
              showNavigation={false}
              showDots={true}
              className="rounded-none h-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-gray-600" />
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Save & Share Buttons */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <button
              onClick={() => user ? (!isSaved && setShowSaveModal(true)) : router.push('/auth/login')}
              className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${isSaved ? 'bg-white text-red-500' : 'bg-black/40 text-white/80 hover:text-white'}`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: destination.name, text: `Check out ${destination.name} in ${cityName}`, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied to clipboard');
                }
              }}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Sheet - Overlapping design with cream background */}
        <div className="relative -mt-6 bg-[#F8F6F3] rounded-t-3xl min-h-[50vh]">
          <div className="px-5 pt-6 pb-8">
            {/* Name and Rating Row */}
            <div className="flex items-start justify-between gap-4 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">{destination.name}</h1>
              {(enrichedData?.rating || destination.rating) && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-white shrink-0">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900">{(enrichedData?.rating || destination.rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Subtitle */}
            <p className="text-sm text-gray-500 mb-4">
              {destination.category && formatLabel(destination.category)}
              {destination.category && cityName && ' · '}
              {cityName && <a href={`/city/${destination.city}`} className="hover:text-gray-700">{cityName}</a>}
              {destination.country && `, ${destination.country}`}
              {(enrichedData?.price_level || destination.price_level) && ` · ${PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}`}
            </p>

            <div className="h-px bg-gray-200 mb-4" />

            {/* Description */}
            {(destination.micro_description || destination.content) && (
              <p className="text-gray-900 mb-4">
                {destination.micro_description && <span className="font-medium">{destination.micro_description}</span>}
                {destination.micro_description && destination.content && ' '}
                {destination.content && <span className="text-gray-600">{htmlToPlainText(destination.content).slice(0, 150)}...</span>}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-700">
                  <Star className="w-3 h-3 fill-current" />
                  {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                </span>
              )}
              {destination.crown && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">
                  Crown
                </span>
              )}
              {destination.neighborhood && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                  <MapPin className="w-3 h-3" />
                  {destination.neighborhood}
                </span>
              )}
            </div>

            {/* Action Buttons - Card Style */}
            <div className="space-y-2 mb-6">
              {/* Location Card */}
              {(enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity || (destination.latitude && destination.longitude)) && (
                <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Location</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity || `${cityName}${destination.country ? `, ${destination.country}` : ''}`}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              )}

              {/* Phone Card */}
              {(enrichedData?.international_phone_number || destination.phone_number) && (
                <a href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Contact</p>
                      <p className="text-xs text-gray-500">{enrichedData?.international_phone_number || destination.phone_number}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
              )}

              {/* Website Card */}
              {(enrichedData?.website || destination.website) && (
                <a href={(() => { const url = enrichedData?.website || destination.website || ''; return url.startsWith('http') ? url : `https://${url}`; })()} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Website</p>
                      <p className="text-xs text-gray-500">Visit official site</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
              )}
            </div>

            {/* Reviews Section */}
            {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                  <button className="text-sm text-gray-500">See all</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                  {enrichedData.reviews.slice(0, 5).map((review: any, idx: number) => (
                    <div key={idx} className="shrink-0 w-64 p-4 bg-white rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                          <span className="text-xs font-semibold text-amber-800">{review.author_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{review.author_name}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                          </div>
                        </div>
                      </div>
                      {review.text && <p className="text-sm text-gray-600 line-clamp-3">{review.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map Section */}
            {destination.latitude && destination.longitude && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative rounded-2xl overflow-hidden border border-gray-100"
                >
                  <div className="aspect-[2/1] bg-gray-100 relative">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${destination.longitude - 0.01},${destination.latitude - 0.005},${destination.longitude + 0.01},${destination.latitude + 0.005}&layer=mapnik&marker=${destination.latitude},${destination.longitude}`}
                      className="w-full h-full border-0"
                      title="Location map"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 pointer-events-none" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm">
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{enrichedData?.formatted_address || destination.formatted_address || `${cityName}, ${destination.country || ''}`}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shadow-lg">
                      <Navigation className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </a>
              </div>
            )}

            {/* Parent Destination */}
            {parentDestination && (
              <button onClick={() => router.push(`/destination/${parentDestination.slug}`)} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 mb-6">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  {parentDestination.image ? <Image src={parentDestination.image} alt={parentDestination.name} fill className="object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><MapPin className="w-5 h-5 text-gray-400" /></div>}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Located inside</p>
                  <p className="text-[15px] font-medium text-gray-900">{parentDestination.name}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}

            {/* Nested Destinations */}
            {destination.nested_destinations && destination.nested_destinations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Inside {destination.name}</h2>
                <div className="space-y-2">
                  {destination.nested_destinations.map((nested) => (
                    <button key={nested.slug} onClick={() => router.push(`/destination/${nested.slug}`)} className="w-full flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        {nested.image ? <Image src={nested.image} alt={nested.name} fill className="object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><MapPin className="w-4 h-4 text-gray-400" /></div>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[14px] font-medium text-gray-900">{nested.name}</p>
                        <p className="text-[13px] text-gray-500">{formatLabel(nested.category)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Destinations */}
            {(loadingRecommendations || recommendations.length > 0) && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">You might also like</h2>
                <div className="grid grid-cols-2 gap-3">
                  {loadingRecommendations ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="space-y-2"><Skeleton className="aspect-[4/3] rounded-xl bg-gray-200" /><Skeleton className="h-4 rounded-lg w-3/4 bg-gray-200" /></div>)
                  ) : (
                    recommendations.slice(0, 4).map(rec => (
                      <button key={rec.slug} onClick={() => { trackEvent({ event_type: 'click', destination_slug: rec.slug, metadata: { source: 'destination_detail_recommendations', category: rec.category, city: rec.city } }); router.push(`/destination/${rec.slug}`); }} className="text-left group">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2">
                          {rec.image ? <Image src={rec.image} alt={rec.name} fill sizes="50vw" className="object-cover group-hover:scale-105 transition-transform" quality={75} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-gray-300" /></div>}
                          {rec.michelin_stars && rec.michelin_stars > 0 && <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium flex items-center gap-1"><Star className="w-3 h-3 fill-current" />{rec.michelin_stars}</div>}
                        </div>
                        <h4 className="text-[14px] font-medium text-gray-900 line-clamp-1">{rec.name}</h4>
                        <p className="text-[13px] text-gray-500">{capitalizeCity(rec.city)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <button onClick={() => router.push(`/city/${destination.city}`)} className="w-full h-14 rounded-2xl bg-gray-900 text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
              <ExternalLink className="w-5 h-5" />
              Explore {cityName}
            </button>
          </div>
        </div>
      </main>

      {/* ========== DESKTOP LAYOUT ========== */}
      <main className="hidden lg:block min-h-screen bg-[#F8F6F3]">
        {/* Top Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#F8F6F3]/80 backdrop-blur-md border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: destination.name, text: `Check out ${destination.name} in ${cityName}`, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied to clipboard');
                  }
                }}
                className="h-10 px-4 rounded-full bg-white border border-gray-200 flex items-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>
              <button
                onClick={() => user ? (!isSaved && setShowSaveModal(true)) : router.push('/auth/login')}
                className={`h-10 px-4 rounded-full border flex items-center gap-2 transition-colors ${isSaved ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-8 py-10">
            <div className="grid grid-cols-12 gap-12">
              {/* Left Column - Gallery */}
              <div className="col-span-7">
                {/* Main Image */}
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-4 group">
                  {allImages.length > 0 ? (
                    <>
                      <Image
                        src={allImages[selectedImageIndex]}
                        alt={`${destination.name} - Image ${selectedImageIndex + 1}`}
                        fill
                        sizes="(max-width: 1200px) 100vw, 800px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        quality={90}
                        priority
                      />
                      {/* Navigation Arrows */}
                      {allImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setSelectedImageIndex((prev) => (prev + 1) % allImages.length)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {/* Image Counter */}
                      {allImages.length > 1 && (
                        <div className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
                          {selectedImageIndex + 1} / {allImages.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Thumbnail Grid */}
                {allImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {allImages.slice(0, 4).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative aspect-square rounded-xl overflow-hidden transition-all ${selectedImageIndex === idx ? 'ring-2 ring-gray-900 ring-offset-2' : 'opacity-70 hover:opacity-100'}`}
                      >
                        <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" quality={60} />
                        {idx === 3 && allImages.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium">+{allImages.length - 4}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reviews Section */}
                {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold text-gray-900">Reviews</h2>
                      {enrichedData.reviews.length > 4 && (
                        <button className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                          See all {enrichedData.reviews.length} reviews
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {enrichedData.reviews.slice(0, 4).map((review: any, idx: number) => (
                        <div key={idx} className="p-5 bg-white rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                              <span className="text-sm font-semibold text-amber-800">{review.author_name?.charAt(0)?.toUpperCase() || '?'}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{review.author_name}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                              </div>
                            </div>
                          </div>
                          {review.text && <p className="text-gray-600 line-clamp-3">{review.text}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Map Section - Desktop */}
                {destination.latitude && destination.longitude && (
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold text-gray-900">Location</h2>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <Navigation className="w-4 h-4" />
                        Get Directions
                      </a>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative rounded-2xl overflow-hidden border border-gray-100 group"
                    >
                      <div className="aspect-[2/1] bg-gray-100 relative">
                        <iframe
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${destination.longitude - 0.01},${destination.latitude - 0.005},${destination.longitude + 0.01},${destination.latitude + 0.005}&layer=mapnik&marker=${destination.latitude},${destination.longitude}`}
                          className="w-full h-full border-0"
                          title="Location map"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 pointer-events-none group-hover:bg-black/5 transition-colors" />
                      </div>
                      <div className="absolute bottom-4 left-4 px-4 py-3 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm">
                        <p className="text-xs text-gray-500 mb-0.5">Address</p>
                        <p className="font-medium text-gray-900">{enrichedData?.formatted_address || destination.formatted_address || `${cityName}, ${destination.country || ''}`}</p>
                      </div>
                    </a>
                  </div>
                )}

                {/* Nested Destinations */}
                {destination.nested_destinations && destination.nested_destinations.length > 0 && (
                  <div className="mt-12">
                    <NestedDestinations destinations={destination.nested_destinations} parentName={destination.name} onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)} />
                  </div>
                )}

                {/* Similar Destinations */}
                {recommendations.length > 0 && (
                  <div className="mt-12">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">You might also like</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {recommendations.slice(0, 6).map(rec => (
                        <button key={rec.slug} onClick={() => { trackEvent({ event_type: 'click', destination_slug: rec.slug, metadata: { source: 'destination_detail_recommendations', category: rec.category, city: rec.city } }); router.push(`/destination/${rec.slug}`); }} className="text-left group">
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2">
                            {rec.image ? <Image src={rec.image} alt={rec.name} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform" quality={75} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-gray-300" /></div>}
                            {rec.michelin_stars && rec.michelin_stars > 0 && <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium flex items-center gap-1"><Star className="w-3 h-3 fill-current" />{rec.michelin_stars}</div>}
                          </div>
                          <h4 className="text-[14px] font-medium text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors">{rec.name}</h4>
                          <p className="text-[13px] text-gray-500">{capitalizeCity(rec.city)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Details */}
              <div className="col-span-5">
                <div className="sticky top-24">
                  {/* Category & Rating */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {formatLabel(destination.category)}
                    </span>
                    {(enrichedData?.rating || destination.rating) && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-900">{(enrichedData?.rating || destination.rating).toFixed(1)}</span>
                      </div>
                    )}
                    {(enrichedData?.price_level || destination.price_level) && (
                      <span className="text-sm text-gray-500">{PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}</span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-tight">{destination.name}</h1>

                  {/* Location */}
                  <p className="flex items-center gap-1.5 text-gray-500 mb-6">
                    <MapPin className="w-4 h-4" />
                    {cityName}{destination.country ? `, ${destination.country}` : ''}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {destination.michelin_stars && destination.michelin_stars > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-700">
                        <Star className="w-3 h-3 fill-current" />
                        {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                      </span>
                    )}
                    {destination.crown && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">
                        Crown
                      </span>
                    )}
                    {destination.brand && (
                      <a href={`/brand/${encodeURIComponent(destination.brand)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                        {destination.brand}
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  {(destination.micro_description || destination.content) && (
                    <div className="mb-8">
                      <p className="text-lg text-gray-700 leading-relaxed">
                        {destination.micro_description && <span className="font-semibold text-gray-900">{destination.micro_description}</span>}
                        {destination.micro_description && destination.content && ' '}
                        {destination.content && htmlToPlainText(destination.content)}
                      </p>
                    </div>
                  )}

                  {/* Book Button */}
                  {(destination.booking_url || destination.opentable_url || destination.resy_url || destination.website) && (
                    <a
                      href={destination.booking_url || destination.opentable_url || destination.resy_url || (destination.website?.startsWith('http') ? destination.website : `https://${destination.website}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-14 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium text-base mb-6 flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Book Now
                    </a>
                  )}

                  {/* Info Cards */}
                  <div className="space-y-3">
                    {(enrichedData?.formatted_address || destination.formatted_address) && (
                      <div className="p-4 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 mb-0.5">Address</p>
                            <p className="text-sm text-gray-500">{enrichedData?.formatted_address || destination.formatted_address}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {enrichedData?.opening_hours?.weekday_text && (
                      <div className="p-4 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 mb-0.5">Hours</p>
                            {enrichedData.opening_hours.weekday_text.slice(0, 2).map((h: string, i: number) => {
                              const [dayName, hoursText] = h.split(': ');
                              return <p key={i} className="text-sm text-gray-500">{dayName}: {hoursText}</p>;
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {(enrichedData?.international_phone_number || destination.phone_number) && (
                        <a href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`} className="p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Phone className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 mb-0.5">Call</p>
                              <p className="text-sm text-gray-500 truncate">{enrichedData?.international_phone_number || destination.phone_number}</p>
                            </div>
                          </div>
                        </a>
                      )}

                      {(enrichedData?.website || destination.website) && (
                        <a href={(() => { const url = enrichedData?.website || destination.website || ''; return url.startsWith('http') ? url : `https://${url}`; })()} target="_blank" rel="noopener noreferrer" className="p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Globe className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 mb-0.5">Website</p>
                              <p className="text-sm text-gray-500 truncate">Visit site</p>
                            </div>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <ArchitectDesignInfo destination={destination} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
    </>
  );
}
