'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Bookmark, Check, Plus, ChevronDown, X, Phone, Globe, ExternalLink, Navigation, Clock, Tag, Building2, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { CARD_MEDIA, CARD_TITLE, CARD_WRAPPER } from '@/components/CardStyles';
import { trackEvent } from '@/lib/analytics/track';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { useAuth } from '@/contexts/AuthContext';
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { ForecastInfo } from '@/components/ForecastInfo';
import { SentimentDisplay } from '@/components/SentimentDisplay';
import { TopicsDisplay } from '@/components/TopicsDisplay';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { useSequenceTracker } from '@/hooks/useSequenceTracker';
import { SequencePredictionsInline } from '@/components/SequencePredictionsInline';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { PRICE_LEVEL } from '@/lib/constants';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';

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
          alert('Invalid destination. Please try again.');
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
          if (error.message && error.message.includes('activity_feed') && error.message.includes('row-level security')) {
            console.warn('Visit created but activity_feed insert failed due to RLS policy. Visit status updated successfully.');
            setIsVisited(true);
            return;
          }
          alert(`Failed to mark as visited: ${error.message || 'Please try again.'}`);
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
      alert(`Failed to update visit status: ${error.message || 'Please try again.'}`);
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

  // Guard clause
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

  // Check if we have location/contact info
  const hasLocationInfo = enrichedData?.formatted_address || enrichedData?.vicinity || destination.formatted_address;
  const hasContactInfo = enrichedData?.international_phone_number || destination.phone_number ||
    enrichedData?.website || destination.website || destination.instagram_url;
  const hasOpeningHours = enrichedData?.opening_hours?.weekday_text && Array.isArray(enrichedData.opening_hours.weekday_text);

  return (
    <main className="w-full min-h-screen">
      {/* Back button - fixed position on mobile, absolute on desktop */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-900 lg:relative lg:bg-transparent lg:backdrop-blur-none lg:border-none">
        <div className="px-6 md:px-10 lg:px-12 py-4 lg:py-8">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Desktop: Two-column layout */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-12">

            {/* Left Column - Sticky on desktop */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="lg:sticky lg:top-8 space-y-6">

                {/* Hero Image */}
                {destination.image && (
                  <div className="relative aspect-[4/3] lg:aspect-[3/4] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
                    <Image
                      src={destination.image}
                      alt={`${destination.name} - ${destination.category} in ${destination.city}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                      quality={90}
                      priority
                    />

                    {/* Badges overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                      {destination.michelin_stars && destination.michelin_stars > 0 && (
                        <span className="px-3 py-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full text-xs font-medium flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                          <Image
                            src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                            alt="Michelin star"
                            width={14}
                            height={14}
                            className="h-3.5 w-3.5"
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
                      {(enrichedData?.rating || destination.rating) && (
                        <span className="px-3 py-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full text-xs font-medium flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          {(enrichedData?.rating || destination.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions - Desktop only */}
                <div className="hidden lg:block space-y-3">
                  {user && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!isSaved) {
                            setShowSaveModal(true);
                          }
                        }}
                        className={`flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          isSaved
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                            : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>

                      <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                              isVisited
                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
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
                            {isVisited && <ChevronDown className="h-3 w-3 ml-1" />}
                          </button>
                        </DropdownMenuTrigger>
                        {isVisited && (
                          <DropdownMenuContent align="center" className="w-48">
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

                  {/* Share button */}
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
                    className="w-full px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>

                {/* Location & Contact - Desktop */}
                {(hasLocationInfo || hasContactInfo) && (
                  <div className="hidden lg:block border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                    {/* Address */}
                    {hasLocationInfo && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                            {enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity}
                          </p>
                          {destination.latitude && destination.longitude && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              <Navigation className="h-3 w-3" />
                              Get Directions
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact buttons */}
                    {hasContactInfo && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(enrichedData?.international_phone_number || destination.phone_number) && (
                          <a
                            href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
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
                              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Website
                            </a>
                          );
                        })()}
                        {destination.instagram_url && (
                          <a
                            href={destination.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Opening Hours - Desktop */}
                {hasOpeningHours && (
                  <div className="hidden lg:block border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      Hours
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      {enrichedData.opening_hours.weekday_text.map((day: string, index: number) => {
                        const [dayName, hoursText] = day.split(': ');
                        return (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">{dayName}</span>
                            <span className="text-gray-900 dark:text-white text-xs font-medium">{hoursText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Main content */}
            <div className="lg:col-span-7 xl:col-span-8 mt-6 lg:mt-0">
              <div className="space-y-8">

                {/* Header Section */}
                <div className="space-y-4">
                  {/* Location link */}
                  <a
                    href={`/city/${destination.city}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <MapPin className="h-3 w-3" />
                    {destination.neighborhood && <span>{destination.neighborhood} · </span>}
                    {destination.country ? `${cityName}, ${destination.country}` : cityName}
                  </a>

                  {/* Title */}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                    {destination.name}
                  </h1>

                  {/* Meta badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {parentDestination && (
                      <LocatedInBadge
                        parent={parentDestination}
                        onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                      />
                    )}

                    {destination.category && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Tag className="h-3 w-3" />
                        {formatLabel(destination.category)}
                      </span>
                    )}
                    {destination.brand && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        {destination.brand}
                      </span>
                    )}
                    {destination.michelin_stars && destination.michelin_stars > 0 && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Image
                          src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                          alt="Michelin star"
                          width={12}
                          height={12}
                          className="h-3 w-3"
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
                    {(enrichedData?.rating || destination.rating) && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        {(enrichedData?.rating || destination.rating).toFixed(1)}
                      </span>
                    )}
                    {destination.crown && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                        Crown
                      </span>
                    )}
                    {(enrichedData?.price_level || destination.price_level) && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {PRICE_LEVEL.LABELS[(enrichedData?.price_level || destination.price_level) as keyof typeof PRICE_LEVEL.LABELS]}
                      </span>
                    )}
                    {enrichedData?.user_ratings_total && (
                      <span className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400">
                        {enrichedData.user_ratings_total.toLocaleString()} reviews
                      </span>
                    )}
                  </div>

                  {/* Mobile action buttons */}
                  {user && (
                    <div className="flex gap-2 lg:hidden">
                      <button
                        onClick={() => {
                          if (!isSaved) {
                            setShowSaveModal(true);
                          }
                        }}
                        className={`flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          isSaved
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                            : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                              isVisited
                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
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
                          </button>
                        </DropdownMenuTrigger>
                        {isVisited && (
                          <DropdownMenuContent align="center" className="w-48">
                            <DropdownMenuItem onClick={() => setShowVisitedModal(true)}>
                              <Plus className="h-3 w-3 mr-2" />
                              Add Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleVisitToggle}>
                              <X className="h-3 w-3 mr-2" />
                              Remove Visit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>

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
                        className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Parent destination card */}
                  {parentDestination && (
                    <div className="pt-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Located inside
                      </p>
                      <HorizontalDestinationCard
                        destination={parentDestination}
                        onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                        showBadges={true}
                      />
                    </div>
                  )}
                </div>

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

                {/* About */}
                {destination.content && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-gray-900 dark:text-white">About</h2>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {stripHtmlTags(destination.content)}
                    </p>
                    {destination.micro_description && destination.micro_description !== destination.content && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 italic pt-2 border-t border-gray-100 dark:border-gray-800">
                        {destination.micro_description}
                      </p>
                    )}
                  </div>
                )}

                {/* Architecture & Design */}
                <ArchitectDesignInfo destination={destination} />

                {/* Location & Contact - Mobile only */}
                {(hasLocationInfo || hasContactInfo) && (
                  <div className="lg:hidden border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                    <h2 className="text-sm font-medium">Location & Contact</h2>

                    {hasLocationInfo && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {enrichedData?.formatted_address || destination.formatted_address || enrichedData?.vicinity}
                          </p>
                          {destination.latitude && destination.longitude && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              <Navigation className="h-3 w-3" />
                              Get Directions
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {hasContactInfo && (
                      <div className="flex flex-wrap gap-2">
                        {(enrichedData?.international_phone_number || destination.phone_number) && (
                          <a
                            href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
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
                              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Website
                            </a>
                          );
                        })()}
                        {destination.instagram_url && (
                          <a
                            href={destination.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Opening Hours - Mobile only */}
                {hasOpeningHours && (
                  <div className="lg:hidden border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      Opening Hours
                    </h3>
                    <div className="space-y-2 text-sm">
                      {enrichedData.opening_hours.weekday_text.map((day: string, index: number) => {
                        const [dayName, hoursText] = day.split(': ');
                        return (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">{dayName}</span>
                            <span className="text-gray-900 dark:text-white font-medium">{hoursText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-medium">Top Reviews</h2>
                    <div className="space-y-3">
                      {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                        <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">{review.author_name}</span>
                            <span className="text-yellow-500 text-sm">★</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{review.rating}</span>
                            {review.relative_time_description && (
                              <span className="text-xs text-gray-400">· {review.relative_time_description}</span>
                            )}
                          </div>
                          {review.text && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
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
                  <div className="space-y-4">
                    <NestedDestinations
                      destinations={destination.nested_destinations}
                      parentName={destination.name}
                      onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)}
                    />
                  </div>
                )}

                {/* Similar Destinations */}
                {(loadingRecommendations || recommendations.length > 0) && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-medium">Similar Destinations</h2>

                    {loadingRecommendations ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="aspect-video rounded-lg" />
                            <Skeleton className="h-3 rounded w-3/4" />
                            <Skeleton className="h-2 rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : recommendations.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400">
                        No similar destinations found
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {recommendations.slice(0, 6).map(rec => (
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
                            className={`${CARD_WRAPPER} text-left`}
                          >
                            <div className={CARD_MEDIA}>
                              {rec.image ? (
                                <Image
                                  src={rec.image}
                                  alt={`${rec.name} - ${rec.category} in ${rec.city}`}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 33vw"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  quality={75}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                                  <MapPin className="h-8 w-8 opacity-20" />
                                </div>
                              )}

                              {rec.michelin_stars && rec.michelin_stars > 0 && (
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-xs flex items-center gap-1">
                                  <img
                                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                                    alt="Michelin star"
                                    width={12}
                                    height={12}
                                    className="h-3 w-3"
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

                            <h3 className={CARD_TITLE}>
                              {rec.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {capitalizeCity(rec.city)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 min-w-[140px] px-5 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    Back to catalogue
                  </button>
                  <button
                    onClick={() => router.push(`/city/${destination.city}`)}
                    className="flex-1 min-w-[140px] px-5 py-2.5 text-sm font-medium bg-black text-white dark:bg-white dark:text-black rounded-xl hover:opacity-80 transition-opacity"
                  >
                    Explore {cityName}
                  </button>
                </div>
              </div>
            </div>
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
    </main>
  );
}
