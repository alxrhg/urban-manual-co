'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, MapPin, Bookmark, Check, Plus, ChevronDown, Phone, Globe, ExternalLink, Navigation, Clock, Tag, Building2, Share2, Star, ChevronRight } from 'lucide-react';
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

  return (
    <main className="w-full min-h-screen bg-black">
      {/* Card Container - Centered on larger screens */}
      <div className="max-w-lg mx-auto">
        {/* Image Card Section */}
        <div className="relative px-4 pt-4 pb-2">
          {/* Close/Back Button - Outside card on top right */}
          <button
            onClick={() => router.back()}
            className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image Carousel Card */}
          {allImages.length > 0 ? (
            <ImageCarousel
              images={allImages}
              alt={`${destination.name} - ${destination.category} in ${destination.city}`}
              aspectRatio="4/3"
              showNavigation={false}
              showDots={true}
              className="shadow-2xl"
            />
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
              {/* Details Row */}
              <div className="flex items-center gap-2 text-gray-400 text-[14px]">
                {destination.category && (
                  <span>{formatLabel(destination.category)}</span>
                )}
                {destination.category && cityName && <span>·</span>}
                {cityName && (
                  <a
                    href={`/city/${destination.city}`}
                    className="hover:text-white transition-colors"
                  >
                    {cityName}
                  </a>
                )}
              </div>
            </div>

            {/* Rating Badge */}
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
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[13px] font-medium flex items-center gap-1.5">
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
                {destination.michelin_stars} {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
              </span>
            )}
            {destination.crown && (
              <span className="px-3 py-1.5 rounded-full bg-amber-500 text-white text-[13px] font-medium">
                Crown
              </span>
            )}
            {(enrichedData?.price_level || destination.price_level) && (
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-medium">
                {PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}
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
            {destination.neighborhood && (
              <span className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {destination.neighborhood}
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 mb-6">
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
                  className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-colors ${
                    isSaved
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleVisitToggle}
                  className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-colors ${
                    isVisited
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
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
            <div className="mb-6">
              <p className="text-[15px] leading-relaxed text-gray-300">
                {destination.micro_description || htmlToPlainText(destination.content || '').slice(0, 200)}
                {destination.content && destination.content.length > 200 && '...'}
              </p>
            </div>
          )}
        </div>

        {/* Content Sections */}
        <div className="px-6 space-y-6">
          {/* Parent Destination Link */}
          {parentDestination && (
            <button
              onClick={() => router.push(`/destination/${parentDestination.slug}`)}
              className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                {parentDestination.image ? (
                  <Image
                    src={parentDestination.image}
                    alt={parentDestination.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Located inside</p>
                <p className="text-[15px] font-medium text-white">{parentDestination.name}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Location Card */}
          {(enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity ||
            destination.latitude && destination.longitude) && (
            <div className="bg-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-gray-400">Location</p>
                  <p className="text-[15px] text-white font-medium">
                    {enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity || `${cityName}${destination.country ? `, ${destination.country}` : ''}`}
                  </p>
                </div>
              </div>
              {destination.latitude && destination.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl text-[14px] font-semibold hover:bg-gray-100 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              )}
            </div>
          )}

          {/* Contact Card */}
          {(enrichedData?.international_phone_number || destination.phone_number ||
            enrichedData?.website || destination.website || destination.instagram_url) && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">Contact</h3>
              <div className="flex flex-wrap gap-2">
                {(enrichedData?.international_phone_number || destination.phone_number) && (
                  <a
                    href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                    className="flex-1 min-w-[120px] px-4 py-3 bg-white/10 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
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
                      className="flex-1 min-w-[120px] px-4 py-3 bg-white/10 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  );
                })()}
                {destination.instagram_url && (
                  <a
                    href={destination.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[120px] px-4 py-3 bg-white/10 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
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

          {/* About Section */}
          {destination.content && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">About</h3>
              <p className="text-[14px] leading-relaxed text-gray-300 whitespace-pre-wrap">
                {htmlToPlainText(destination.content)}
              </p>
            </div>
          )}

          {/* Architecture & Design */}
          <ArchitectDesignInfo destination={destination} />

          {/* Reviews Section */}
          {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-5">
              <h3 className="text-[15px] font-semibold text-white mb-4">Reviews</h3>
              <div className="space-y-4">
                {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                  <div key={idx} className="pb-4 border-b border-white/10 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-[13px] font-medium text-white">
                          {review.author_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[14px] font-medium text-white">{review.author_name}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < (review.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                              />
                            ))}
                          </div>
                          {review.relative_time_description && (
                            <span className="text-[12px] text-gray-500">{review.relative_time_description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {review.text && (
                      <p className="text-[14px] text-gray-400 leading-relaxed line-clamp-3">
                        {review.text}
                      </p>
                    )}
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
                  <button
                    key={nested.slug}
                    onClick={() => router.push(`/destination/${nested.slug}`)}
                    className="w-full flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {nested.image ? (
                        <Image
                          src={nested.image}
                          alt={nested.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
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

          {/* Similar Destinations */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div className="pb-8">
              <h3 className="text-[15px] font-semibold text-white mb-4">You might also like</h3>
              {loadingRecommendations ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[4/3] rounded-xl bg-white/10" />
                      <Skeleton className="h-4 rounded-lg w-3/4 bg-white/10" />
                      <Skeleton className="h-3 rounded-lg w-1/2 bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {recommendations.slice(0, 4).map(rec => (
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
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white/10 mb-2">
                        {rec.image ? (
                          <Image
                            src={rec.image}
                            alt={`${rec.name} - ${rec.category} in ${rec.city}`}
                            fill
                            sizes="50vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            quality={75}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        {rec.michelin_stars && rec.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-medium flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            {rec.michelin_stars}
                          </div>
                        )}
                      </div>
                      <h4 className="text-[14px] font-medium text-white line-clamp-1 group-hover:text-gray-300 transition-colors">
                        {rec.name}
                      </h4>
                      <p className="text-[13px] text-gray-500">{capitalizeCity(rec.city)}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Explore More Button */}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/city/${destination.city}`)}
                  className="w-full px-5 py-3.5 text-[14px] font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Explore more in {cityName}
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-5 py-3.5 text-[14px] font-medium bg-white/10 text-white rounded-xl hover:bg-white/15 transition-colors"
                >
                  Browse all destinations
                </button>
              </div>
            </div>
          )}
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
