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
      {/* ========== MOBILE LAYOUT (Card Design) ========== */}
      <main className="lg:hidden w-full min-h-screen bg-black">
        {/* Card Container - Centered */}
        <div className="max-w-lg mx-auto">
          {/* Image Card Section */}
          <div className="relative px-4 pt-4 pb-2">
            {/* Close/Back Button */}
            <button
              onClick={() => router.back()}
              className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image Carousel Card */}
            {allImages.length > 1 ? (
              <ImageCarousel
                images={allImages}
                alt={`${destination.name} - ${destination.category} in ${destination.city}`}
                aspectRatio="4/3"
                showNavigation={false}
                showDots={true}
                className="shadow-2xl"
              />
            ) : allImages.length === 1 ? (
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative">
                <Image
                  src={allImages[0]}
                  alt={`${destination.name} - ${destination.category} in ${destination.city}`}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-gray-800 rounded-3xl flex items-center justify-center">
                <MapPin className="w-12 h-12 text-gray-600" />
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="px-6 py-6">
            {/* Name and Quick Actions Row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white leading-tight mb-2">
                {destination.name}
              </h1>
              <div className="flex items-center gap-2 text-gray-400 text-[14px]">
                {destination.category && <span>{formatLabel(destination.category)}</span>}
                {destination.category && cityName && <span>·</span>}
                {cityName && (
                  <a href={`/city/${destination.city}`} className="hover:text-white transition-colors">
                    {cityName}
                  </a>
                )}
              </div>
            </div>
            {(enrichedData?.rating || destination.rating) && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-xl">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-semibold">
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Meta Tags Row */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[13px] font-medium flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-current" />
                {destination.michelin_stars} {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
              </span>
            )}
            {destination.crown && (
              <span className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-[13px] font-medium">Crown</span>
            )}
            {(enrichedData?.price_level || destination.price_level) && (
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-medium">
                {PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}
              </span>
            )}
            {destination.neighborhood && (
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {destination.neighborhood}
              </span>
            )}
            {destination.brand && (
              <a
                href={`/brand/${encodeURIComponent(destination.brand)}`}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-medium flex items-center gap-1.5 hover:bg-white/20 transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                {destination.brand}
              </a>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: destination.name, text: `Check out ${destination.name} in ${cityName}`, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied to clipboard');
                }
              }}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            {user ? (
              <>
                <button
                  onClick={() => !isSaved && setShowSaveModal(true)}
                  className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-colors ${isSaved ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleVisitToggle}
                  className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-colors ${isVisited ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'}`}
                >
                  <Check className={`w-4 h-4 ${isVisited ? 'stroke-[3]' : ''}`} />
                  {isVisited ? 'Visited' : 'Been'}
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Save
              </button>
            )}
          </div>

            {/* Description */}
            {(destination.micro_description || destination.content) && (
              <p className="text-[15px] leading-relaxed text-gray-300 mb-6">
                {destination.micro_description || htmlToPlainText(destination.content || '').slice(0, 200)}
                {destination.content && destination.content.length > 200 && '...'}
              </p>
            )}
          </div>

          {/* Content Sections */}
          <div className="px-6 space-y-6 pb-8">
          {/* Parent Destination */}
          {parentDestination && (
            <div className="bg-white/5 rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-4">Located inside</p>
              <button onClick={() => router.push(`/destination/${parentDestination.slug}`)} className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  {parentDestination.image ? <Image src={parentDestination.image} alt={parentDestination.name} fill className="object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-gray-600" /></div>}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[16px] font-semibold text-white mb-1">{parentDestination.name}</p>
                  <p className="text-[13px] text-gray-400 flex items-center gap-1.5">
                    {parentDestination.category && <span>{formatLabel(parentDestination.category)}</span>}
                    {parentDestination.category && parentDestination.city && <span>·</span>}
                    {parentDestination.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {capitalizeCity(parentDestination.city)}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Location Card */}
          {(enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity || (destination.latitude && destination.longitude)) && (
            <div className="bg-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-gray-400">Location</p>
                  <p className="text-[15px] text-white font-medium">{enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity || `${cityName}${destination.country ? `, ${destination.country}` : ''}`}</p>
                </div>
              </div>
              {destination.latitude && destination.longitude && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl text-[14px] font-semibold hover:bg-gray-100 transition-colors">
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              )}
            </div>
          )}

          {/* Contact Card */}
          {(enrichedData?.international_phone_number || destination.phone_number || enrichedData?.website || destination.website || destination.instagram_url) && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">Contact</h3>
              <div className="flex flex-wrap gap-2">
                {(enrichedData?.international_phone_number || destination.phone_number) && (
                  <a href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`} className="flex-1 min-w-[100px] px-4 py-3 bg-white/10 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 hover:bg-white/15 transition-colors">
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
                {(enrichedData?.website || destination.website) && (
                  <a href={(() => { const url = enrichedData?.website || destination.website || ''; return url.startsWith('http') ? url : `https://${url}`; })()} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] px-4 py-3 bg-white/10 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 hover:bg-white/15 transition-colors">
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Hours Card */}
          {enrichedData?.opening_hours?.weekday_text && Array.isArray(enrichedData.opening_hours.weekday_text) && (
            <div className="bg-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-white" />
                <h3 className="text-[15px] font-semibold text-white">Hours</h3>
              </div>
              <div className="space-y-2">
                {enrichedData.opening_hours.weekday_text.map((day: string, index: number) => {
                  const [dayName, hoursText] = day.split(': ');
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-[14px] text-gray-400">{dayName}</span>
                      <span className="text-[14px] text-white font-medium">{hoursText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About */}
          {destination.content && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">About</h3>
              <p className="text-[14px] leading-relaxed text-gray-300 whitespace-pre-wrap">{htmlToPlainText(destination.content)}</p>
            </div>
          )}

          <ArchitectDesignInfo destination={destination} />

          {/* Reviews */}
          {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">Reviews</h3>
              <div className="space-y-4">
                {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                  <div key={idx} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-[13px] font-medium text-white">{review.author_name?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[14px] font-medium text-white">{review.author_name}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < (review.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {review.text && <p className="text-[14px] text-gray-400 leading-relaxed line-clamp-3">{review.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nested Destinations */}
          {destination.nested_destinations && destination.nested_destinations.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">Inside {destination.name}</h3>
              <div className="space-y-3">
                {destination.nested_destinations.map((nested) => (
                  <button key={nested.slug} onClick={() => router.push(`/destination/${nested.slug}`)} className="w-full flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {nested.image ? <Image src={nested.image} alt={nested.name} fill className="object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-gray-600" /></div>}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[14px] font-medium text-white">{nested.name}</p>
                      <p className="text-[13px] text-gray-400">{formatLabel(nested.category)}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Similar */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div>
              <h3 className="text-[15px] font-semibold text-white mb-4">You might also like</h3>
              <div className="grid grid-cols-2 gap-3">
                {loadingRecommendations ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="space-y-2"><Skeleton className="aspect-[4/3] rounded-xl bg-white/10" /><Skeleton className="h-4 rounded-lg w-3/4 bg-white/10" /></div>)
                ) : (
                  recommendations.slice(0, 4).map(rec => (
                    <button key={rec.slug} onClick={() => { trackEvent({ event_type: 'click', destination_slug: rec.slug, metadata: { source: 'destination_detail_recommendations', category: rec.category, city: rec.city } }); router.push(`/destination/${rec.slug}`); }} className="text-left group">
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white/10 mb-2">
                        {rec.image ? <Image src={rec.image} alt={rec.name} fill sizes="50vw" className="object-cover group-hover:scale-105 transition-transform" quality={75} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-gray-600" /></div>}
                        {rec.michelin_stars && rec.michelin_stars > 0 && <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium flex items-center gap-1"><Star className="w-3 h-3 fill-current" />{rec.michelin_stars}</div>}
                      </div>
                      <h4 className="text-[14px] font-medium text-white line-clamp-1">{rec.name}</h4>
                      <p className="text-[13px] text-gray-500">{capitalizeCity(rec.city)}</p>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={() => router.push(`/city/${destination.city}`)} className="w-full px-5 py-3.5 text-[14px] font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-colors">Explore more in {cityName}</button>
                <button onClick={() => router.push('/')} className="w-full px-5 py-3.5 text-[14px] font-medium bg-white/10 text-white rounded-xl hover:bg-white/15 transition-colors">Browse all destinations</button>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* ========== DESKTOP LAYOUT (Light Theme) ========== */}
      <main className="hidden lg:block w-full min-h-screen bg-white dark:bg-gray-950">
        {/* Desktop Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-[15px] font-medium">
              <ArrowLeft className="w-5 h-5" />
              Back
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
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => user ? (!isSaved && setShowSaveModal(true)) : router.push('/auth/login')}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-[14px] font-medium transition-colors ${isSaved ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                Save
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-[1fr_400px] gap-12">
            {/* Left Column - Images & Reviews */}
            <div className="space-y-8">
              {/* Main Image with Thumbnails */}
              <div>
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
                  {allImages.length > 0 ? (
                    <>
                      <Image
                        src={allImages[selectedImageIndex]}
                        alt={`${destination.name} - Image ${selectedImageIndex + 1}`}
                        fill
                        sizes="(max-width: 1200px) 100vw, 800px"
                        className="object-cover"
                        quality={90}
                        priority
                      />
                      {allImages.length > 1 && (
                        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[13px] font-medium">
                          {selectedImageIndex + 1} / {allImages.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
                {/* Thumbnails */}
                {allImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {allImages.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden ${selectedImageIndex === idx ? 'ring-2 ring-gray-900 dark:ring-white' : 'opacity-70 hover:opacity-100'} transition-all`}
                      >
                        <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" quality={60} />
                        {idx === 4 && allImages.length > 5 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[14px] font-semibold">+{allImages.length - 5}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reviews</h2>
                    {enrichedData.reviews.length > 2 && <span className="text-[14px] text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">See all {enrichedData.reviews.length} reviews</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {enrichedData.reviews.slice(0, 4).map((review: any, idx: number) => (
                      <div key={idx} className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                            <span className="text-[14px] font-semibold text-amber-800">{review.author_name?.charAt(0)?.toUpperCase() || '?'}</span>
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-gray-900 dark:text-white">{review.author_name}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < (review.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}`} />)}
                            </div>
                          </div>
                        </div>
                        {review.text && <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{review.text}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Map Section */}
              {destination.latitude && destination.longitude && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location</h2>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[14px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </a>
                  </div>
                  <div className="relative aspect-[2/1] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${destination.longitude - 0.01},${destination.latitude - 0.005},${destination.longitude + 0.01},${destination.latitude + 0.005}&layer=mapnik&marker=${destination.latitude},${destination.longitude}`}
                      className="w-full h-full"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-lg">
                      <p className="text-[13px] text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-[14px] font-medium text-gray-900 dark:text-white">{enrichedData?.formatted_address || destination.formatted_address || `${cityName}, ${destination.country || ''}`}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nested Destinations */}
              {destination.nested_destinations && destination.nested_destinations.length > 0 && (
                <NestedDestinations destinations={destination.nested_destinations} parentName={destination.name} onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)} />
              )}

              {/* Similar Destinations */}
              {recommendations.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">You might also like</h2>
                  <div className="grid grid-cols-4 gap-4">
                    {recommendations.slice(0, 8).map(rec => (
                      <button key={rec.slug} onClick={() => { trackEvent({ event_type: 'click', destination_slug: rec.slug, metadata: { source: 'destination_detail_recommendations', category: rec.category, city: rec.city } }); router.push(`/destination/${rec.slug}`); }} className="text-left group">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
                          {rec.image ? <Image src={rec.image} alt={rec.name} fill sizes="25vw" className="object-cover group-hover:scale-105 transition-transform" quality={75} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" /></div>}
                          {rec.michelin_stars && rec.michelin_stars > 0 && <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium flex items-center gap-1"><Star className="w-3 h-3 fill-current" />{rec.michelin_stars}</div>}
                        </div>
                        <h4 className="text-[14px] font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{rec.name}</h4>
                        <p className="text-[13px] text-gray-500">{capitalizeCity(rec.city)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div>
              <div className="sticky top-24 space-y-6">
                {/* Category & Rating */}
                <div className="flex items-center gap-3 text-[14px]">
                  <span className="uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">{formatLabel(destination.category)}</span>
                  {(enrichedData?.rating || destination.rating) && (
                    <>
                      <span className="flex items-center gap-1 text-gray-900 dark:text-white font-semibold">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {(enrichedData?.rating || destination.rating).toFixed(1)}
                      </span>
                    </>
                  )}
                  {(enrichedData?.price_level || destination.price_level) && (
                    <span className="text-gray-500 dark:text-gray-400">{PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}</span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{destination.name}</h1>

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[15px]">{cityName}{destination.country ? `, ${destination.country}` : ''}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {destination.michelin_stars && destination.michelin_stars > 0 && (
                    <span className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-[13px] font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                      {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                    </span>
                  )}
                  {destination.crown && <span className="px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-[13px] font-medium text-amber-700 dark:text-amber-300">Crown</span>}
                  {destination.brand && (
                    <a href={`/brand/${encodeURIComponent(destination.brand)}`} className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{destination.brand}</a>
                  )}
                </div>

                {/* Description */}
                {(destination.micro_description || destination.content) && (
                  <div>
                    {destination.micro_description && <p className="text-[15px] font-medium text-gray-900 dark:text-white mb-2">{destination.micro_description}</p>}
                    {destination.content && <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{htmlToPlainText(destination.content)}</p>}
                  </div>
                )}

                {/* Book Now Button */}
                {(destination.booking_url || destination.opentable_url || destination.resy_url || destination.website) && (
                  <a
                    href={destination.booking_url || destination.opentable_url || destination.resy_url || (destination.website?.startsWith('http') ? destination.website : `https://${destination.website}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[15px] font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Book Now
                  </a>
                )}

                {/* Info Cards */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {/* Address */}
                  {(enrichedData?.formatted_address || destination.formatted_address) && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-0.5">Address</p>
                        <p className="text-[14px] font-medium text-gray-900 dark:text-white">{enrichedData?.formatted_address || destination.formatted_address}</p>
                      </div>
                    </div>
                  )}

                  {/* Hours */}
                  {enrichedData?.opening_hours?.weekday_text && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Hours</p>
                        <div className="space-y-0.5">
                          {enrichedData.opening_hours.weekday_text.slice(0, 2).map((day: string, i: number) => {
                            const [name, hours] = day.split(': ');
                            return <p key={i} className="text-[14px] text-gray-900 dark:text-white"><span className="text-gray-500 dark:text-gray-400">{name}:</span> {hours}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="flex gap-3">
                    {(enrichedData?.international_phone_number || destination.phone_number) && (
                      <a href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                    {(enrichedData?.website || destination.website) && (
                      <a href={(() => { const url = enrichedData?.website || destination.website || ''; return url.startsWith('http') ? url : `https://${url}`; })()} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Globe className="w-4 h-4" />
                        Website
                      </a>
                    )}
                  </div>
                </div>

                <ArchitectDesignInfo destination={destination} />
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
