'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Star,
  Bookmark,
  Share2,
  Navigation,
  ExternalLink,
  Clock,
  Phone,
  Globe,
  Building2,
  ChevronRight,
  Check,
  Plus,
  Loader2,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

// Lazy load map
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

interface DestinationContentProps {
  destination: Destination;
  related?: Destination[];
  whyThis?: string;
  tripContext?: {
    day?: number;
    fit?: string;
  };
  onOpenRelated: (destination: Destination) => void;
  onShowSimilar: () => void;
  onShowWhyThis: () => void;
}

interface EnrichedData {
  formatted_address?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { weekday_text?: string[] };
  architect_obj?: { id: string; name: string; slug: string; image_url?: string };
  interior_designer_obj?: { id: string; name: string; slug: string };
  design_firm_obj?: { id: string; name: string; slug: string };
  movement_obj?: { id: string; name: string; slug: string };
  architectural_style?: string;
}

/**
 * DestinationContent - Full-featured destination view
 */
const DestinationContent = memo(function DestinationContent({
  destination,
  related = [],
  onOpenRelated,
}: DestinationContentProps) {
  const { user } = useAuth();
  const { activeTrip, addToTrip } = useTripBuilder();

  // State
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [similarPlaces, setSimilarPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const imageUrl = destination.image || destination.image_thumbnail;

  // Load enriched data
  useEffect(() => {
    async function loadData() {
      if (!destination?.slug) return;
      setLoading(true);

      try {
        const supabase = createClient();

        // Fetch enriched destination data with relations
        const { data } = await supabase
          .from('destinations')
          .select(`
            formatted_address,
            international_phone_number,
            website,
            rating,
            user_ratings_total,
            price_level,
            opening_hours_json,
            architectural_style,
            architect:architects!architect_id(id, name, slug, image_url),
            design_firm:design_firms(id, name, slug),
            interior_designer:architects!interior_designer_id(id, name, slug),
            movement:design_movements(id, name, slug)
          `)
          .eq('slug', destination.slug)
          .single();

        if (data) {
          const enriched: EnrichedData = {
            formatted_address: data.formatted_address,
            international_phone_number: data.international_phone_number,
            website: data.website,
            rating: data.rating,
            user_ratings_total: data.user_ratings_total,
            price_level: data.price_level,
            architectural_style: data.architectural_style,
          };

          // Parse opening hours
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours = typeof data.opening_hours_json === 'string'
                ? JSON.parse(data.opening_hours_json)
                : data.opening_hours_json;
            } catch {}
          }

          // Extract architect objects
          const d = data as any;
          if (d.architect) {
            const obj = Array.isArray(d.architect) ? d.architect[0] : d.architect;
            if (obj?.name) enriched.architect_obj = obj;
          }
          if (d.interior_designer) {
            const obj = Array.isArray(d.interior_designer) ? d.interior_designer[0] : d.interior_designer;
            if (obj?.name) enriched.interior_designer_obj = obj;
          }
          if (d.design_firm?.name) enriched.design_firm_obj = d.design_firm;
          if (d.movement) {
            const obj = Array.isArray(d.movement) ? d.movement[0] : d.movement;
            if (obj?.name) enriched.movement_obj = obj;
          }

          setEnrichedData(enriched);
        }

        // Load saved/visited status
        if (user) {
          const [savedRes, visitedRes] = await Promise.all([
            supabase.from('saved_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
            supabase.from('visited_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
          ]);
          setIsSaved(!!savedRes.data);
          setIsVisited(!!visitedRes.data);
        }

        // Load parent destination
        if (destination.parent_destination_id) {
          const { data: parent } = await supabase
            .from('destinations')
            .select('id, slug, name, category, image, image_thumbnail')
            .eq('id', destination.parent_destination_id)
            .single();
          if (parent) setParentDestination(parent as Destination);
        }

        // Load nested destinations
        if (destination.id) {
          const { data: nested } = await supabase
            .from('destinations')
            .select('id, slug, name, category, image, image_thumbnail')
            .eq('parent_destination_id', destination.id)
            .limit(5);
          if (nested) setNestedDestinations(nested as Destination[]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [destination?.slug, destination?.id, destination?.parent_destination_id, user]);

  // Fetch similar places
  useEffect(() => {
    if (destination.slug) {
      fetch(`/api/intelligence/similar?slug=${destination.slug}&limit=4&filter=all`)
        .then(res => res.ok ? res.json() : { similar: [] })
        .then(data => setSimilarPlaces(data.similar || []))
        .catch(() => setSimilarPlaces([]));
    }
  }, [destination.slug]);

  // Parse opening hours
  const openingHours = enrichedData?.opening_hours?.weekday_text || [];
  const todayHours = getTodayHours(openingHours);
  const isOpenNow = checkIfOpen(openingHours);

  // Has architecture info
  const hasArchInfo = enrichedData?.architect_obj || enrichedData?.interior_designer_obj ||
                      enrichedData?.architectural_style || destination.architect;

  // Handlers
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: destination.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [destination]);

  const handleDirections = useCallback(() => {
    if (!destination.latitude || !destination.longitude) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
      '_blank'
    );
  }, [destination]);

  const handleSave = useCallback(async () => {
    if (!user || !destination.slug) return;
    const supabase = createClient();

    if (isSaved) {
      await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
      setIsSaved(false);
    } else {
      await supabase.from('saved_places').insert({ user_id: user.id, destination_slug: destination.slug });
      setIsSaved(true);
    }
  }, [user, destination.slug, isSaved]);

  const handleVisit = useCallback(async () => {
    if (!user || !destination.slug) return;
    const supabase = createClient();

    if (isVisited) {
      await supabase.from('visited_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
      setIsVisited(false);
    } else {
      await supabase.from('visited_places').insert({ user_id: user.id, destination_slug: destination.slug });
      setIsVisited(true);
    }
  }, [user, destination.slug, isVisited]);

  const handleAddToTrip = useCallback((day?: number) => {
    setIsAddingToTrip(true);
    addToTrip(destination, day);
    setTimeout(() => setIsAddingToTrip(false), 1500);
  }, [addToTrip, destination]);

  // Use enriched rating if available
  const rating = enrichedData?.rating || destination.rating;
  const reviewCount = enrichedData?.user_ratings_total;

  return (
    <div className="pb-8">
      {/* Hero Image */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <Image src={imageUrl} alt={destination.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/95 text-[11px] font-medium flex items-center gap-1">
              <img src="/michelin-star.svg" alt="" className="w-3 h-3" />
              {destination.michelin_stars}★
            </span>
          )}
          {destination.crown && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-medium flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-current" />
            </span>
          )}
          {isOpenNow !== null && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isOpenNow ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'
            }`}>
              {isOpenNow ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
      </div>

      <div className="px-5">
        {/* Title & Meta */}
        <div className="pt-5 pb-4">
          <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight">
            {destination.name}
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            {destination.category && capitalizeCategory(destination.category)}
            {destination.city && ` · ${capitalizeCity(destination.city)}`}
          </p>
          {/* Rating with review count */}
          {rating && (
            <div className="flex items-center gap-1.5 mt-2">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-[13px] font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
              {reviewCount && (
                <span className="text-[13px] text-gray-500">({reviewCount.toLocaleString()} reviews)</span>
              )}
              {enrichedData?.price_level && (
                <span className="text-[13px] text-gray-500 ml-2">{'$'.repeat(enrichedData.price_level)}</span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={user ? handleSave : undefined}
            className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border text-[14px] font-medium transition-all ${
              isSaved
                ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/20 text-[14px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={handleDirections}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/20 text-[14px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          >
            <Navigation className="h-4 w-4" />
            Go
          </button>
        </div>

        {/* Been Here Button */}
        {user && (
          <button
            onClick={handleVisit}
            className={`w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-xl border text-[14px] font-medium transition-all ${
              isVisited
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <Check className="h-4 w-4" />
            {isVisited ? 'Visited' : 'Been Here'}
          </button>
        )}

        {/* Parent Destination */}
        {parentDestination && (
          <button
            onClick={() => onOpenRelated(parentDestination)}
            className="w-full flex items-center gap-3 mt-5 py-3 border-t border-b border-gray-100 dark:border-white/10 text-left"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              {parentDestination.image ? (
                <Image src={parentDestination.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-gray-400" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Located inside</p>
              <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{parentDestination.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        )}

        {/* Description */}
        {(destination.micro_description || destination.description) && (
          <p className="mt-5 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
            {destination.micro_description || destination.description}
          </p>
        )}

        {/* Nested Destinations */}
        {nestedDestinations.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Venues Inside</p>
            <div className="space-y-1">
              {nestedDestinations.map((nested) => (
                <button
                  key={nested.slug}
                  onClick={() => onOpenRelated(nested)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {nested.image ? (
                      <Image src={nested.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{nested.name}</p>
                    <p className="text-[12px] text-gray-500">{nested.category && capitalizeCategory(nested.category)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Architecture */}
        {hasArchInfo && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Design & Architecture</p>
            <div className="space-y-1">
              {enrichedData?.architect_obj && (
                <Link href={`/architect/${enrichedData.architect_obj.slug}`} className="flex items-center gap-3 py-2 group">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {enrichedData.architect_obj.image_url ? (
                      <Image src={enrichedData.architect_obj.image_url} alt="" width={40} height={40} className="object-cover" />
                    ) : (
                      <span className="text-[14px] font-medium text-gray-500">{enrichedData.architect_obj.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Architect</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 truncate">
                      {enrichedData.architect_obj.name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>
              )}
              {!enrichedData?.architect_obj && destination.architect && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Architect</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{destination.architect}</p>
                  </div>
                </div>
              )}
              {enrichedData?.interior_designer_obj && (
                <Link href={`/architect/${enrichedData.interior_designer_obj.slug}`} className="flex items-center gap-3 py-2 group">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-[14px] font-medium text-gray-500">{enrichedData.interior_designer_obj.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Interior Designer</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white group-hover:text-blue-600 truncate">
                      {enrichedData.interior_designer_obj.name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>
              )}
              {enrichedData?.architectural_style && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-[12px] font-medium text-gray-500">S</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400">Style</p>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{enrichedData.architectural_style}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact & Hours */}
        {(todayHours || enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website) && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Contact & Hours</p>
            <div className="space-y-3">
              {todayHours && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[14px] text-gray-700 dark:text-gray-300">{todayHours}</span>
                </div>
              )}
              {enrichedData?.formatted_address && (
                <button onClick={handleDirections} className="flex items-start gap-3 text-left hover:opacity-70 transition-opacity">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[14px] text-gray-700 dark:text-gray-300">{enrichedData.formatted_address}</span>
                </button>
              )}
              {enrichedData?.international_phone_number && (
                <a href={`tel:${enrichedData.international_phone_number}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-[14px] text-gray-700 dark:text-gray-300">{enrichedData.international_phone_number}</span>
                </a>
              )}
              {enrichedData?.website && (
                <a href={enrichedData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                  <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-[14px] text-blue-600 dark:text-blue-400 truncate">
                    {(() => { try { return new URL(enrichedData.website).hostname.replace('www.', ''); } catch { return enrichedData.website; } })()}
                  </span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Map */}
        {destination.latitude && destination.longitude && (
          <div className="mt-6">
            <a
              href={destination.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative aspect-[2/1] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              <GoogleStaticMap
                center={{ lat: destination.latitude, lng: destination.longitude }}
                zoom={15}
                height="100%"
                className="w-full h-full"
              />
              <div className="absolute inset-0 flex items-center justify-center hover:bg-black/10 transition-colors">
                <span className="px-3 py-1.5 rounded-full bg-white/95 text-[12px] font-medium text-gray-800 shadow-sm">
                  Open in Maps
                </span>
              </div>
            </a>
          </div>
        )}

        {/* Add to Trip */}
        {activeTrip && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Add to {activeTrip.title}</p>
            <div className="flex gap-2 flex-wrap">
              {activeTrip.days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => handleAddToTrip(day.dayNumber)}
                  disabled={isAddingToTrip}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  {isAddingToTrip ? <Loader2 className="h-4 w-4 animate-spin" /> : `Day ${day.dayNumber}`}
                </button>
              ))}
              <button
                onClick={() => handleAddToTrip()}
                disabled={isAddingToTrip}
                className="px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-[13px] font-medium text-gray-500 hover:border-gray-400 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                New Day
              </button>
            </div>
          </div>
        )}

        {/* Similar Places */}
        {similarPlaces.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Similar Places</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {similarPlaces.map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="flex-shrink-0 w-28 text-left group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
                    {(dest.image || dest.image_thumbnail) && (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">{dest.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{capitalizeCategory(dest.category || '')}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* More in City */}
        {related.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">
              More in {capitalizeCity(destination.city || '')}
            </p>
            <div className="space-y-1">
              {related.slice(0, 4).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {dest.image ? (
                      <Image src={dest.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{dest.name}</p>
                    <p className="text-[12px] text-gray-500">{capitalizeCategory(dest.category || '')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Full Page */}
        <Link
          href={`/destination/${destination.slug}`}
          className="flex items-center justify-between w-full mt-6 py-4 border-t border-gray-100 dark:border-white/10 group"
        >
          <span className="text-[15px] font-medium text-gray-900 dark:text-white">View full page</span>
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        </Link>
      </div>
    </div>
  );
});

/**
 * Get today's hours string
 */
function getTodayHours(hours: string[]): string | null {
  if (!hours || hours.length === 0) return null;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];
  return hours.find(h => h.startsWith(today)) || null;
}

/**
 * Check if currently open
 */
function checkIfOpen(hours: string[]): boolean | null {
  if (!hours || hours.length === 0) return null;
  const todayHours = getTodayHours(hours);
  if (!todayHours) return null;
  if (todayHours.includes('Closed')) return false;
  return true;
}

export default DestinationContent;
