'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  MapPin,
  Bookmark,
  Check,
  Plus,
  ChevronDown,
  X,
  Star,
  Phone,
  Globe,
  Navigation,
  ExternalLink,
  Tag,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
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
import { NestedDestinations } from '@/components/NestedDestinations';

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

function formatPriceLevel(value?: number | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const levels = ['Free', '$', '$$', '$$$', '$$$$'];
  const descriptions = ['Complimentary', 'Budget-friendly', 'Casual', 'Upscale', 'Luxury'];

  const index = Math.max(0, Math.min(levels.length - 1, value));
  return `${levels[index]} • ${descriptions[index]}`;
}

function parseTags(tags?: string[] | string | null): string[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.map(tag => tag.trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function getHostname(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (error) {
    return url.replace(/^https?:\/\//, '');
  }
}

interface DestinationPageClientProps {
  initialDestination: Destination;
  parentDestination?: Destination | null;
}

type ContactItem = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  helper?: string;
};

export default function DestinationPageClient({ initialDestination, parentDestination }: DestinationPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();

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

    }
  }, [destination]);

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
          // Check if error is related to activity_feed RLS policy
          if (error.message && error.message.includes('activity_feed') && error.message.includes('row-level security')) {
            // Visit was created but activity_feed insert failed - this is okay, continue
            console.warn('Visit created but activity_feed insert failed due to RLS policy. Visit status updated successfully.');
            setIsVisited(true);
            return;
          }
          alert(`Failed to mark as visited: ${error.message || 'Please try again.'}`);
          return;
        }

        setIsVisited(true);
      }
    } catch (error: any) {
      console.error('Error toggling visit:', error);
      alert(`Failed to update visit status: ${error.message || 'Please try again.'}`);
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
      let response = await fetch(`/api/recommendations?limit=6`);

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


  const cityName = capitalizeCity(destination.city);

  const ratingCandidate =
    typeof enrichedData?.rating === 'number' ? enrichedData.rating : destination.rating;
  const ratingValue = typeof ratingCandidate === 'number' ? ratingCandidate : null;
  const ratingCountCandidate = enrichedData?.user_ratings_total ?? destination.user_ratings_total;
  const ratingCount = typeof ratingCountCandidate === 'number' ? ratingCountCandidate : null;
  const saveCount = destination.save_count ?? destination.saves_count ?? null;
  const visitsCount = destination.visits_count ?? null;
  const priceLabel = formatPriceLevel(destination.price_level);
  const tags = parseTags(destination.tags);
  const heroSummary =
    destination.micro_description ||
    (destination.content
      ? stripHtmlTags(destination.content)
          .split('
')
          .map(part => part.trim())
          .filter(Boolean)[0]
      : null);
  const mapUrl =
    destination.google_maps_url ||
    (destination.latitude && destination.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
      : null);
  const phoneNumber = destination.phone_number || destination.international_phone_number || null;
  const instagramUrl =
    destination.instagram_url ||
    (destination.instagram_handle
      ? `https://instagram.com/${destination.instagram_handle.replace(/^@/, '')}`
      : null);
  const instagramLabel = destination.instagram_handle
    ? `@${destination.instagram_handle.replace(/^@/, '')}`
    : instagramUrl
    ? getHostname(instagramUrl)
    : null;

  const contactItems: ContactItem[] = [];
  const addressLine =
    destination.formatted_address ||
    destination.vicinity ||
    (destination.city ? `${cityName}${destination.country ? `, ${destination.country}` : ''}` : null);

  if (addressLine) {
    contactItems.push({
      icon: MapPin,
      label: 'Address',
      value: addressLine,
      href: mapUrl || undefined,
      helper: destination.neighborhood || undefined,
    });
  }

  if (phoneNumber) {
    contactItems.push({
      icon: Phone,
      label: 'Call',
      value: phoneNumber,
      href: `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`,
    });
  }

  if (destination.website) {
    contactItems.push({
      icon: Globe,
      label: 'Website',
      value: getHostname(destination.website),
      href: destination.website,
    });
  }

  if (instagramUrl && instagramLabel) {
    contactItems.push({
      icon: ExternalLink,
      label: 'Instagram',
      value: instagramLabel,
      href: instagramUrl,
    });
  }

  const statItems: { icon: LucideIcon; label: string; value: string; helper?: string }[] = [];

  if (ratingValue !== null) {
    statItems.push({
      icon: Star,
      label: 'Google rating',
      value: ratingValue.toFixed(1),
      helper: ratingCount ? `${ratingCount.toLocaleString()} reviews` : undefined,
    });
  }

  if (typeof saveCount === 'number' && saveCount > 0) {
    statItems.push({
      icon: Bookmark,
      label: 'Saved',
      value: saveCount.toLocaleString(),
      helper: 'travelers planning trips',
    });
  }

  if (typeof visitsCount === 'number' && visitsCount > 0) {
    statItems.push({
      icon: Check,
      label: 'Visited',
      value: visitsCount.toLocaleString(),
      helper: 'trips logged',
    });
  }

  if (priceLabel) {
    statItems.push({
      icon: Tag,
      label: 'Price level',
      value: priceLabel,
    });
  }

  const openingHours = Array.isArray(enrichedData?.opening_hours?.weekday_text)
    ? enrichedData.opening_hours.weekday_text
    : null;
  const isOpenNow =
    typeof enrichedData?.opening_hours?.open_now === 'boolean'
      ? enrichedData.opening_hours.open_now
      : null;

  return (
    <main className="bg-gradient-to-b from-white via-white to-gray-50 dark:from-black dark:via-black dark:to-gray-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-gray-900 text-white shadow-xl ring-1 ring-black/5 dark:border-white/10">
          <div className="absolute inset-0">
            {destination.image ? (
              <Image
                src={destination.image}
                alt={`${destination.name} - ${destination.category} in ${destination.city}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
          </div>

          <div className="relative z-10 flex flex-col gap-10 px-6 py-10 sm:px-10 sm:py-16">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <a
                    href={`/city/${destination.city}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 font-medium text-white/80 backdrop-blur transition hover:border-white/40 hover:text-white"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {destination.country ? `${cityName}, ${destination.country}` : cityName}
                  </a>

                  {parentDestination && (
                    <button
                      onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-white/80 transition hover:border-white/40 hover:text-white"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Part of <span className="font-medium">{parentDestination.name}</span>
                    </button>
                  )}

                  {destination.category && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-white/70">
                      {formatLabel(destination.category)}
                    </span>
                  )}

                  {destination.michelin_stars && destination.michelin_stars > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-white/80">
                      <Image
                        src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                        alt="Michelin star"
                        width={12}
                        height={12}
                        className="h-3 w-3"
                      />
                      {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                    </span>
                  )}

                  {destination.crown && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-white/80">
                      Signature crown
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    {destination.name}
                  </h1>
                  {heroSummary && (
                    <p className="max-w-3xl text-base text-white/80 sm:text-lg">
                      {heroSummary}
                    </p>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs text-white/75">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {user ? (
                <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:flex-col lg:items-end">
                  <button
                    onClick={() => {
                      if (!isSaved) {
                        setShowSaveModal(true);
                      }
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      isSaved
                        ? 'border border-white/30 bg-white/90 text-gray-900 shadow-sm'
                        : 'border border-white/30 bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? 'text-gray-900' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition ${
                          isVisited
                            ? 'bg-emerald-500/90 text-white shadow-sm hover:bg-emerald-500'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        onClick={(e) => {
                          if (!isVisited) {
                            e.preventDefault();
                            handleVisitToggle();
                          }
                        }}
                      >
                        <Check className={`h-4 w-4 ${isVisited ? 'stroke-[3]' : ''}`} />
                        {isVisited ? 'Visited' : 'Mark visited'}
                        {isVisited && <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </DropdownMenuTrigger>
                    {isVisited && (
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setShowVisitedModal(true);
                            setShowVisitedDropdown(false);
                          }}
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Add details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            handleVisitToggle();
                            setShowVisitedDropdown(false);
                          }}
                        >
                          <X className="mr-2 h-3.5 w-3.5" />
                          Remove visit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/auth/login')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <Bookmark className="h-4 w-4" />
                  Sign in to save
                </button>
              )}
            </div>

            {statItems.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statItems.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={`${stat.label}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                        <Icon className="h-3.5 w-3.5" />
                        {stat.label}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">{stat.value}</div>
                      {stat.helper && (
                        <p className="mt-1 text-xs text-white/70">{stat.helper}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,2fr),minmax(280px,1fr)] lg:gap-14">
          <div className="space-y-8 lg:space-y-10">
            {destination.content && (
              <section className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Overview
                </div>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {stripHtmlTags(destination.content)}
                </div>
              </section>
            )}

            {openingHours && (
              <section className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    Opening hours
                  </div>
                  {isOpenNow !== null && (
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                        isOpenNow
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {isOpenNow ? 'Open now' : 'Closed now'}
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {openingHours.map((day: string, index: number) => {
                    const [dayName, hoursText] = day.split(': ');
                    return (
                      <div
                        key={`${dayName}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 transition hover:bg-gray-100/80 dark:hover:bg-gray-900/80"
                      >
                        <span className="font-medium text-gray-600 dark:text-gray-400">{dayName}</span>
                        <span className="text-gray-900 dark:text-gray-100">{hoursText}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
              <section className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <Star className="h-3.5 w-3.5" />
                  Traveler voices
                </div>
                <div className="mt-5 space-y-4">
                  {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-gray-200/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/80"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {review.author_name}
                          </p>
                          {review.relative_time_description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {review.relative_time_description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          {review.rating}
                        </div>
                      </div>
                      {review.text && (
                        <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                          {review.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {destination.nested_destinations && destination.nested_destinations.length > 0 && (
              <section className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                <NestedDestinations
                  destinations={destination.nested_destinations}
                  parentName={destination.name}
                  onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)}
                />
              </section>
            )}

            {(loadingRecommendations || recommendations.length > 0) && (
              <section className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <Navigation className="h-3.5 w-3.5" />
                  Similar spots
                </div>

                {loadingRecommendations ? (
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {[1, 2, 3, 4, 5, 6].slice(0, 6).map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="aspect-square rounded-2xl" />
                        <Skeleton className="h-3 w-3/4 rounded-full" />
                        <Skeleton className="h-2 w-1/2 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
                    No similar destinations found yet.
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                        className={`${CARD_WRAPPER} group flex flex-col text-left`}
                      >
                        <div className={`${CARD_MEDIA} mb-3`}>
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
                            <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-700">
                              <MapPin className="h-10 w-10 opacity-20" />
                            </div>
                          )}

                          {rec.michelin_stars && rec.michelin_stars > 0 && (
                            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-2xl border border-white/80 bg-white/90 px-3 py-1 text-xs text-gray-700 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-200">
                              <img
                                src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                                alt="Michelin star"
                                width={12}
                                height={12}
                                className="h-3 w-3"
                              />
                              {rec.michelin_stars}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h3 className={CARD_TITLE}>{rec.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {capitalizeCity(rec.city)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:space-y-8">
            <div className="rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  Plan your visit
                </span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{destination.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {destination.country ? `${cityName}, ${destination.country}` : cityName}
                </p>
              </div>

              {contactItems.length > 0 && (
                <div className="mt-6 space-y-4">
                  {contactItems.map((item, idx) => {
                    const Icon = item.icon;
                    const content = (
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                            {item.label}
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.value}
                          </p>
                          {item.helper && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.helper}</p>
                          )}
                        </div>
                      </div>
                    );

                    return item.href ? (
                      <a
                        key={`${item.label}-${idx}`}
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="block rounded-2xl border border-transparent px-2 py-2 transition hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                      >
                        {content}
                      </a>
                    ) : (
                      <div
                        key={`${item.label}-${idx}`}
                        className="rounded-2xl border border-gray-100 px-2 py-2 dark:border-gray-800"
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 space-y-3">
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <Navigation className="h-4 w-4" />
                    View on Google Maps
                  </a>
                )}

                <button
                  onClick={() => router.push(`/city/${destination.city}`)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Explore {cityName}
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to catalogue
                </button>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Highlights</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gray-400">Mood & vibe</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={`highlight-${tag}`}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parentDestination && (
              <div className="rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Part of</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Discover other experiences within {parentDestination.name}.
                </p>
                <button
                  onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  <Navigation className="h-4 w-4" />
                  Visit {parentDestination.name}
                </button>
              </div>
            )}
          </aside>
        </section>
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
