'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Tag, Bookmark, Share2, Navigation, Clock, ExternalLink, Check, Heart, Edit, Crown, Star, Instagram, Phone, Globe, Building2, Calendar, Image as ImageIcon, TrendingUp, DollarSign, Users, Loader2, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { AddToTripModal } from '@/components/AddToTripModal';
import { trackEvent } from '@/lib/analytics/track';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { RealtimeReportForm } from '@/components/RealtimeReportForm';
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { createClient } from '@/lib/supabase/client';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { Drawer } from '@/components/ui/Drawer';

// Dynamically import POIDrawer to avoid SSR issues
const POIDrawer = dynamic(() => import('@/components/POIDrawer').then(mod => ({ default: mod.POIDrawer })), {
  ssr: false,
});

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  )
});

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatHighlightTag(tag: string): string {
  return tag
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// City timezone mapping (fallback if timezone_id not available)
const CITY_TIMEZONES: Record<string, string> = {
  'tokyo': 'Asia/Tokyo',
  'new-york': 'America/New_York',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  'singapore': 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'bangkok': 'Asia/Bangkok',
};

function getOpenStatus(openingHours: any, city: string, timezoneId?: string | null, utcOffset?: number | null): { isOpen: boolean; currentDay?: string; todayHours?: string } {
  if (!openingHours || !openingHours.weekday_text) {
    return { isOpen: false };
  }

  try {
    let now: Date;
    
    if (timezoneId) {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
    } else if (CITY_TIMEZONES[city]) {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
    } else if (utcOffset !== null && utcOffset !== undefined) {
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
    } else {
      now = new Date();
    }
    
    const dayOfWeek = now.getDay();
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const todayText = openingHours.weekday_text[googleDayIndex];
    const dayName = todayText?.split(':')?.[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText) {
      return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    }

    if (hoursText.toLowerCase().includes('closed')) {
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    }

    if (hoursText.toLowerCase().includes('24 hours') || hoursText.toLowerCase().includes('open 24 hours')) {
      return { isOpen: true, currentDay: dayName, todayHours: 'Open 24 hours' };
    }

    const timeRanges = hoursText.split(',').map((range: string) => range.trim());
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        const closeTime = parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return { isOpen: true, currentDay: dayName, todayHours: hoursText };
        }
      }
    }

    return { isOpen: false, currentDay: dayName, todayHours: hoursText };
  } catch (error) {
    console.error('Error parsing opening hours:', error);
    return { isOpen: false };
  }
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function DestinationDrawer({ destination, isOpen, onClose, onSaveToggle, onVisitToggle }: DestinationDrawerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enhancedDestination, setEnhancedDestination] = useState<Destination | null>(destination);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load enriched data and saved/visited status
  useEffect(() => {
    async function loadDestinationData() {
      if (!destination) {
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
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('Supabase client not available');
          return;
        }

        if (!destination?.slug) {
          console.warn('Destination missing slug, skipping enriched data fetch');
          return;
        }

        // Check admin status
        if (user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
          setIsAdmin(profile?.is_admin || false);
        }

        // Check saved/visited status
        if (user) {
          const [savedRes, visitedRes] = await Promise.all([
            supabaseClient
              .from('saved_places')
              .select('id')
              .eq('user_id', user.id)
              .eq('destination_slug', destination.slug)
              .single(),
            supabaseClient
              .from('visited_places')
              .select('id')
              .eq('user_id', user.id)
              .eq('destination_slug', destination.slug)
              .single(),
          ]);
          setIsSaved(!!savedRes.data);
          setIsVisited(!!visitedRes.data);
        }

        // Fetch enriched data
        const { data, error } = await supabaseClient
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
            place_types_json,
            utc_offset,
            vicinity,
            reviews_json,
            timezone_id,
            latitude,
            longitude,
            michelin_stars,
            crown,
            brand,
            neighborhood,
            country,
            micro_description,
            description,
            content,
            architect:architects(id, name, slug, bio, birth_year, death_year, nationality, design_philosophy, image_url),
            design_firm:design_firms(id, name, slug, description, founded_year, image_url),
            movement:design_movements(id, name, slug, description, period_start, period_end)
          `)
          .eq('slug', destination.slug)
          .single();
        
        if (!error && data) {
          const dataObj = data as any;
          const enriched: any = { ...(dataObj as Record<string, any>) };
          
          if (dataObj.opening_hours_json) {
            try {
              enriched.opening_hours = typeof dataObj.opening_hours_json === 'string' 
                ? JSON.parse(dataObj.opening_hours_json) 
                : dataObj.opening_hours_json;
            } catch (e) {
              console.error('Error parsing opening_hours_json:', e);
            }
          }
          
          if (dataObj.place_types_json) {
            try {
              enriched.place_types = typeof dataObj.place_types_json === 'string'
                ? JSON.parse(dataObj.place_types_json)
                : dataObj.place_types_json;
            } catch (e) {
              console.error('Error parsing place_types_json:', e);
            }
          }
          
          if (dataObj.reviews_json) {
            try {
              enriched.reviews = typeof dataObj.reviews_json === 'string'
                ? JSON.parse(dataObj.reviews_json)
                : dataObj.reviews_json;
            } catch (e) {
              console.error('Error parsing reviews_json:', e);
            }
          }
          
          let updatedDestination: Destination & {
            architect_obj?: any;
            design_firm_obj?: any;
            movement_obj?: any;
          } = { ...destination };
          
          if (dataObj.architect) {
            const architectObj = Array.isArray(dataObj.architect) && dataObj.architect.length > 0
              ? dataObj.architect[0]
              : dataObj.architect;
            if (architectObj && architectObj.name) {
              updatedDestination = {
                ...updatedDestination,
                architect_id: architectObj.id,
                architect_obj: architectObj,
                architect: updatedDestination.architect || architectObj.name,
              };
            }
          }
          
          if (dataObj.design_firm) {
            const firmObj = Array.isArray(dataObj.design_firm) && dataObj.design_firm.length > 0
              ? dataObj.design_firm[0]
              : dataObj.design_firm;
            if (firmObj && firmObj.name) {
              updatedDestination.design_firm_obj = firmObj;
            }
          }
          
          if (dataObj.movement) {
            const movementObj = Array.isArray(dataObj.movement) && dataObj.movement.length > 0
              ? dataObj.movement[0]
              : dataObj.movement;
            if (movementObj && movementObj.name) {
              updatedDestination.movement_obj = movementObj;
            }
          }
          
          setEnrichedData(enriched);
          setEnhancedDestination(updatedDestination);
        }

        // Load parent destination
        if (destination.id && typeof destination.id === 'number' && supabaseClient) {
          const parent = await getParentDestination(supabaseClient, destination.id);
          setParentDestination(parent);
        }

        // Load nested destinations
        if (destination.id && typeof destination.id === 'number' && supabaseClient) {
          setLoadingNested(true);
          try {
            const nested = await getNestedDestinations(supabaseClient, destination.id);
            setNestedDestinations(nested || []);
          } catch (error) {
            console.error('Error loading nested destinations:', error);
          } finally {
            setLoadingNested(false);
          }
        }

        // Load recommendations
        if (destination.slug) {
          setLoadingRecommendations(true);
          try {
            const { data: recData } = await supabaseClient
              .from('destinations')
              .select('slug, name, city, category, image, michelin_stars, crown')
              .eq('city', destination.city)
              .neq('slug', destination.slug)
              .limit(6);
            
            if (recData) {
              setRecommendations(recData as Recommendation[]);
            }
          } catch (error) {
            console.error('Error loading recommendations:', error);
          } finally {
            setLoadingRecommendations(false);
          }
        }
      } catch (error) {
        console.error('Error loading destination data:', error);
      }
    }

    loadDestinationData();
  }, [destination, user]);

  // Update enhanced destination when destination prop changes
  useEffect(() => {
    setEnhancedDestination(destination);
  }, [destination]);

  if (!destination) return null;

  const openStatus = enrichedData?.opening_hours 
    ? getOpenStatus(enrichedData.opening_hours, destination.city || '', enrichedData.timezone_id, enrichedData.utc_offset)
    : { isOpen: false };

  const handleSave = async () => {
    if (!user) {
      setShowSaveModal(true);
      return;
    }

    const supabaseClient = createClient();
    if (!supabaseClient) return;

    const newState = !isSaved;
    
    if (newState) {
      await supabaseClient.from('saved_places').insert({
        user_id: user.id,
        destination_slug: destination.slug,
      });
    } else {
      await supabaseClient
        .from('saved_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug);
    }

    setIsSaved(newState);
    onSaveToggle?.(destination.slug, newState);
    trackEvent({ event_type: 'save', destination_slug: destination.slug });
  };

  const handleVisit = async () => {
    if (!user) {
      setShowVisitedModal(true);
      return;
    }

    const supabaseClient = createClient();
    if (!supabaseClient) return;

    const newState = !isVisited;
    
    if (newState) {
      await supabaseClient.from('visited_places').insert({
        user_id: user.id,
        destination_slug: destination.slug,
      });
    } else {
      await supabaseClient
        .from('visited_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug);
    }

    setIsVisited(newState);
    onVisitToggle?.(destination.slug, newState);
    trackEvent({ event_type: 'click', destination_slug: destination.slug });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent({ event_type: 'click', destination_slug: destination.slug, metadata: { action: 'share' } });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleAddToTrip = () => {
    if (!user) {
      setShowAddToTripModal(true);
      return;
    }
    setShowAddToTripModal(true);
  };

  const handleDirections = () => {
    if (enrichedData?.latitude && enrichedData?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${enrichedData.latitude},${enrichedData.longitude}`;
      window.open(url, '_blank');
      trackEvent({ event_type: 'click', destination_slug: destination.slug, metadata: { action: 'directions' } });
    }
  };

  // Custom header with destination name and actions
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {destination.slug && (
          <Link
            href={`/destination/${destination.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {destination.name}
          </h2>
          {(destination.city || destination.category) && (
            <div className="flex items-center gap-2 mt-0.5">
              {destination.city && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {capitalizeCity(destination.city)}
                </span>
              )}
              {destination.city && destination.category && (
                <span className="text-xs text-gray-400">•</span>
              )}
              {destination.category && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {destination.category}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Footer with action buttons
  const footerContent = (
    <div className="p-4 space-y-3">
      {/* Primary actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            isSaved
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={handleVisit}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            isVisited
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Check className={`h-4 w-4 ${isVisited ? 'fill-current' : ''}`} />
          {isVisited ? 'Visited' : 'Visit'}
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
        >
          <Share2 className="h-4 w-4" />
          {copied ? 'Copied!' : 'Share'}
        </button>
        {enrichedData?.latitude && enrichedData?.longitude && (
          <button
            onClick={handleDirections}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            <Navigation className="h-4 w-4" />
            Directions
          </button>
        )}
        {user && (
          <button
            onClick={handleAddToTrip}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            <Calendar className="h-4 w-4" />
            Trip
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        headerContent={headerContent}
        footerContent={footerContent}
        desktopWidth="480px"
        mobileVariant="bottom"
        style="glassy"
        position="right"
        zIndex={50}
      >
        <div className="p-6 space-y-6">
          {/* Hero Image */}
          {destination.image && (
            <div className="relative w-full h-64 rounded-xl overflow-hidden -mt-6 -mx-6">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover"
                priority
              />
              {/* Badges overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {destination.crown && (
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-xs font-medium text-gray-900 dark:text-white">Crown</span>
                  </div>
                )}
                {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-red-600 fill-current" />
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {destination.michelin_stars} {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Info Bar */}
          <div className="flex items-center gap-4 text-sm">
            {enrichedData?.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="font-medium">{enrichedData.rating.toFixed(1)}</span>
                {enrichedData.user_ratings_total && (
                  <span className="text-gray-500 dark:text-gray-400">
                    ({enrichedData.user_ratings_total.toLocaleString()})
                  </span>
                )}
              </div>
            )}
            {enrichedData?.price_level !== null && enrichedData?.price_level !== undefined && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {'$'.repeat(enrichedData.price_level)}
                </span>
              </div>
            )}
            {openStatus.isOpen !== undefined && (
              <div className={`flex items-center gap-1.5 ${openStatus.isOpen ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {openStatus.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            )}
          </div>

          {/* Opening Hours */}
          {openStatus.todayHours && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {openStatus.currentDay}
                  </span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {openStatus.todayHours}
                </span>
              </div>
            </div>
          )}

          {/* Address & Contact */}
          {(enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website) && (
            <div className="space-y-2">
              {enrichedData.formatted_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {enrichedData.formatted_address}
                  </span>
                </div>
              )}
              {enrichedData.international_phone_number && (
                <a
                  href={`tel:${enrichedData.international_phone_number}`}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {enrichedData.international_phone_number}
                </a>
              )}
              {enrichedData.website && (
                <a
                  href={enrichedData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {enrichedData.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}
                </a>
              )}
              {destination.instagram_handle && (
                <a
                  href={`https://instagram.com/${destination.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  @{destination.instagram_handle.replace('@', '')}
                </a>
              )}
            </div>
          )}

          {/* Parent/Located In */}
          {parentDestination && (
            <div onClick={() => {
              onClose();
              setTimeout(() => router.push(`/destination/${parentDestination.slug}`), 100);
            }}>
              <LocatedInBadge parent={parentDestination} />
            </div>
          )}

          {/* Nested Destinations */}
          {(loadingNested || (nestedDestinations && nestedDestinations.length > 0)) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              {loadingNested ? (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading venues located here…
                </div>
              ) : (
                nestedDestinations && nestedDestinations.length > 0 && (
                  <NestedDestinations
                    destinations={nestedDestinations}
                    parentName={destination.name}
                    onDestinationClick={(nested) => {
                      if (nested.slug) {
                        onClose();
                        setTimeout(() => router.push(`/destination/${nested.slug}`), 100);
                      }
                    }}
                  />
                )
              )}
            </div>
          )}

          {/* Description */}
          {destination.description && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(destination.description)}
              </div>
            </div>
          )}

          {/* Editorial Summary */}
          {enrichedData?.editorial_summary && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {/* Architecture & Design */}
          {enhancedDestination && (
            <ArchitectDesignInfo
              destination={enhancedDestination}
              onArchitectClick={(architect) => {
                if (architect.slug) {
                  onClose();
                  setTimeout(() => router.push(`/architect/${architect.slug}`), 100);
                }
              }}
            />
          )}

          {/* Map */}
          {enrichedData?.latitude && enrichedData?.longitude && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <MapView
                latitude={enrichedData.latitude}
                longitude={enrichedData.longitude}
                destinationName={destination.name}
                height={200}
              />
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                More in {capitalizeCity(destination.city || '')}
              </h3>
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec) => (
                  <button
                    key={rec.slug}
                    onClick={() => {
                      onClose();
                      setTimeout(() => router.push(`/destination/${rec.slug}`), 100);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    {rec.image && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={rec.image}
                          alt={rec.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {rec.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {rec.category}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Realtime Status */}
          {destination.slug && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <RealtimeStatusBadge destinationSlug={destination.slug} />
              <div className="mt-4">
                <RealtimeReportForm destinationSlug={destination.slug} />
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Modals */}
      {showSaveModal && (
        <SaveDestinationModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          destinationSlug={destination.slug}
          onSave={() => {
            setShowSaveModal(false);
            handleSave();
          }}
        />
      )}

      {showVisitedModal && (
        <VisitedModal
          isOpen={showVisitedModal}
          onClose={() => setShowVisitedModal(false)}
          destinationSlug={destination.slug}
          onVisit={() => {
            setShowVisitedModal(false);
            handleVisit();
          }}
        />
      )}

      {showAddToTripModal && (
        <AddToTripModal
          isOpen={showAddToTripModal}
          onClose={() => setShowAddToTripModal(false)}
          destinationSlug={destination.slug}
          destinationName={destination.name}
          onAdd={() => {
            setIsAddedToTrip(true);
            setShowAddToTripModal(false);
          }}
        />
      )}
    </>
  );
}
