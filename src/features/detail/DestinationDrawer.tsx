'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, MapPin, Tag, Bookmark, Share2, Navigation, ChevronDown, Plus, Loader2, Clock, ExternalLink, Check, List, Map, Heart, Edit, Crown, Star, Instagram, Phone, Globe, Building2, Cloud, Calendar, Image as ImageIcon, TrendingUp, DollarSign, Users, Calendar as CalendarIcon } from 'lucide-react';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    // Remove protocol if present
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove path and query params
    cleanUrl = cleanUrl.split('/')[0].split('?')[0];
    return cleanUrl;
  } catch {
    // If parsing fails, return original or a cleaned version
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import { useToast } from '@/hooks/useToast';

// Dynamically import POIDrawer to avoid SSR issues
const POIDrawer = dynamic(() => import('@/components/POIDrawer').then(mod => ({ default: mod.POIDrawer })), {
  ssr: false,
});

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
        <span className="text-xs text-gray-600">Loading map...</span>
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
  // Add more as needed
};

function getOpenStatus(openingHours: any, city: string, timezoneId?: string | null, utcOffset?: number | null): { isOpen: boolean; currentDay?: string; todayHours?: string } {
  if (!openingHours || !openingHours.weekday_text) {
    return { isOpen: false };
  }

  try {
    // Use timezone_id from Google Places API if available (handles DST automatically)
    // Otherwise fallback to city mapping, then UTC offset calculation, then UTC
    let now: Date;
    
    if (timezoneId) {
      // Best: Use timezone_id - automatically handles DST
      now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
    } else if (CITY_TIMEZONES[city]) {
      // Good: Use city timezone mapping
      now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
    } else if (utcOffset !== null && utcOffset !== undefined) {
      // Okay: Use UTC offset (static, doesn't handle DST)
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
    } else {
      // Fallback: UTC
      now = new Date();
    }
    
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Google Places API weekday_text starts with Monday (index 0)
    // We need to convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const todayText = openingHours.weekday_text[googleDayIndex];
    const dayName = todayText?.split(':')?.[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText) {
      return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    }

    // Check if closed
    if (hoursText.toLowerCase().includes('closed')) {
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    }

    // Check if 24 hours
    if (hoursText.toLowerCase().includes('24 hours') || hoursText.toLowerCase().includes('open 24 hours')) {
      return { isOpen: true, currentDay: dayName, todayHours: 'Open 24 hours' };
    }

    // Parse time ranges (e.g., "10:00 AM – 9:00 PM" or "10:00 AM – 2:00 PM, 5:00 PM – 9:00 PM")
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
  const toast = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);
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
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Generate AI summary of reviews
  const generateReviewSummary = async (reviews: any[], destinationName: string) => {
    if (!reviews || reviews.length === 0) return;
    
    setLoadingReviewSummary(true);
    try {
      const response = await fetch('/api/reviews/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviews,
          destinationName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate review summary');
      }

      const data = await response.json();
      if (data.summary) {
        setReviewSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating review summary:', error);
    } finally {
      setLoadingReviewSummary(false);
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Update enhanced destination when destination prop changes
  useEffect(() => {
    setEnhancedDestination(destination);
  }, [destination]);

  // Load enriched data and saved/visited status
  useEffect(() => {
    async function loadDestinationData() {
      if (!destination) {
        setEnrichedData(null);
        setEnhancedDestination(null);
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false); // Reset immediately
        setReviewSummary(null);
        return;
      }

      // Reset isAddedToTrip immediately when destination changes to prevent showing "Added" for all places
      setIsAddedToTrip(false);

      // Fetch enriched data from database
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('Supabase client not available');
          return;
        }

        // Check if destination has a valid slug
        if (!destination?.slug) {
          console.warn('Destination missing slug, skipping enriched data fetch');
          return;
        }

        // First, fetch the destination data with IDs only (to avoid relationship ambiguity)
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
            plus_code,
            adr_address,
            address_components_json,
            icon_url,
            icon_background_color,
            icon_mask_base_uri,
            google_place_id,
            architect,
            architectural_style,
            design_period,
            designer_name,
            architect_info_json,
            web_content_json,
            architect_id,
            design_firm_id,
            interior_designer_id,
            movement_id,
            architectural_significance,
            design_story,
            construction_year,
            photos_json,
            primary_photo_url,
            photo_count,
            current_weather_json,
            weather_forecast_json,
            weather_updated_at,
            best_visit_months,
            nearby_events_json,
            upcoming_event_count,
            walking_time_from_center_minutes,
            driving_time_from_center_minutes,
            transit_time_from_center_minutes,
            distance_from_center_meters,
            static_map_url,
            currency_code,
            price_range_local,
            opentable_url,
            resy_url,
            booking_url,
            reservation_phone,
            instagram_url,
            instagram_handle,
            michelin_stars,
            crown,
            brand,
            neighborhood,
            country,
            micro_description,
            description,
            content
          `)
          .eq('slug', destination.slug)
          .single();
        
        if (!error && data) {
          // Parse JSON fields
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
          // current/secondary opening hours fields removed; rely on opening_hours_json only
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
              
              // Generate AI summary of reviews
              if (Array.isArray(enriched.reviews) && enriched.reviews.length > 0) {
                generateReviewSummary(enriched.reviews, destination.name);
              }
            } catch (e) {
              console.error('Error parsing reviews_json:', e);
            }
          }
          if (dataObj.address_components_json) {
            try {
              enriched.address_components = typeof dataObj.address_components_json === 'string'
                ? JSON.parse(dataObj.address_components_json)
                : dataObj.address_components_json;
            } catch (e) {
              console.error('Error parsing address_components_json:', e);
            }
          }
          // Parse weather data
          if (dataObj.current_weather_json) {
            try {
              enriched.current_weather = typeof dataObj.current_weather_json === 'string'
                ? JSON.parse(dataObj.current_weather_json)
                : dataObj.current_weather_json;
            } catch (e) {
              console.error('Error parsing current_weather_json:', e);
            }
          }
          if (dataObj.weather_forecast_json) {
            try {
              enriched.weather_forecast = typeof dataObj.weather_forecast_json === 'string'
                ? JSON.parse(dataObj.weather_forecast_json)
                : dataObj.weather_forecast_json;
            } catch (e) {
              console.error('Error parsing weather_forecast_json:', e);
            }
          }
          // Parse photos
          if (dataObj.photos_json) {
            try {
              enriched.photos = typeof dataObj.photos_json === 'string'
                ? JSON.parse(dataObj.photos_json)
                : dataObj.photos_json;
            } catch (e) {
              console.error('Error parsing photos_json:', e);
            }
          }
          // Parse nearby events
          if (dataObj.nearby_events_json) {
            try {
              enriched.nearby_events = typeof dataObj.nearby_events_json === 'string'
                ? JSON.parse(dataObj.nearby_events_json)
                : dataObj.nearby_events_json;
            } catch (e) {
              console.error('Error parsing nearby_events_json:', e);
            }
          }
          
          // Merge architect data into destination for ArchitectDesignInfo component
          // Use separately fetched objects to avoid relationship ambiguity
          let updatedDestination: Destination & {
            architect_obj?: any;
            design_firm_obj?: any;
            interior_designer_obj?: any;
            movement_obj?: any;
          } = { ...destination };
          
          // Handle architect object from separately fetched data
          if (enriched.architect_obj) {
            const architectObj = enriched.architect_obj;
            updatedDestination = {
              ...updatedDestination,
              architect_id: architectObj.id,
              architect_obj: architectObj,
              architect: updatedDestination.architect || architectObj.name,
            };
          }
          
          // Handle design firm object from separately fetched data
          if (enriched.design_firm_obj) {
            const firmObj = enriched.design_firm_obj;
            updatedDestination = {
              ...updatedDestination,
              design_firm_id: firmObj.id,
              design_firm_obj: firmObj,
              design_firm: firmObj.name,
            };
          }
          
          // Handle interior designer object from separately fetched data
          if (enriched.interior_designer_obj) {
            const interiorDesignerObj = enriched.interior_designer_obj;
            updatedDestination = {
              ...updatedDestination,
              interior_designer_id: interiorDesignerObj.id,
              interior_designer_obj: interiorDesignerObj,
              interior_designer: updatedDestination.interior_designer || interiorDesignerObj.name,
            };
          }
          
          // Handle movement object from separately fetched data
          if (enriched.movement_obj) {
            const movementObj = enriched.movement_obj;
            updatedDestination = {
              ...updatedDestination,
              movement_id: movementObj.id,
              movement_obj: movementObj,
              movement: movementObj.name,
            };
          }
          
          // Merge architectural fields
          if (dataObj.architectural_significance) {
            updatedDestination = { ...updatedDestination, architectural_significance: dataObj.architectural_significance };
          }
          if (dataObj.design_story) {
            updatedDestination = { ...updatedDestination, design_story: dataObj.design_story };
          }
          if (dataObj.construction_year) {
            updatedDestination = { ...updatedDestination, construction_year: dataObj.construction_year };
          }
          
          setEnhancedDestination(updatedDestination);
          
          setEnrichedData(enriched);
          console.log('Enriched data loaded:', enriched);
        } else if (error) {
          console.error('Error fetching enriched data:', error);
          // Set enriched data to null on error to prevent rendering issues
          setEnrichedData(null);
        } else {
          // No error but no data - destination might not exist
          setEnrichedData(null);
        }
      } catch (error) {
        console.error('Error loading enriched data:', error);
        // Set enriched data to null on error to prevent rendering issues
        setEnrichedData(null);
      }

      // Load saved and visited status
      if (!user) {
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false);
        return;
      }

      const supabaseClient = createClient();
      if (supabaseClient) {
        if (destination.slug) {
          const { data: savedData } = await supabaseClient
        .from('saved_places')
            .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
            .maybeSingle();

      setIsSaved(!!savedData);
        }

        const { data: visitedData, error: visitedError } = await supabaseClient
        .from('visited_places')
          .select('id, visited_at')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
          .maybeSingle();

      if (visitedError && visitedError.code !== 'PGRST116') {
        console.error('Error loading visited status:', visitedError);
      }

      setIsVisited(!!visitedData);
      if (visitedData) {
        console.log('Visited status loaded:', visitedData);
      }

      // Check if destination is in any of user's trips
      if (destination.slug) {
        // First get all user's trips
        const { data: userTrips } = await supabaseClient
          .from('trips')
          .select('id')
          .eq('user_id', user.id);

        if (userTrips && userTrips.length > 0) {
          const tripIds = userTrips.map(t => t.id);
          // Check if destination is in any of these trips
          const { data: tripItems } = await supabaseClient
            .from('itinerary_items')
            .select('id')
            .eq('destination_slug', destination.slug)
            .in('trip_id', tripIds)
            .limit(1);

          setIsAddedToTrip(!!tripItems && tripItems.length > 0);
        } else {
          setIsAddedToTrip(false);
        }
      } else {
        setIsAddedToTrip(false);
      }
      } else {
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false);
      }

      // Check if user is admin - fetch fresh session to get latest metadata
      if (user) {
        try {
          const supabaseClient = createClient();
          const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
          
          if (!sessionError && session) {
            const role = (session.user.app_metadata as Record<string, any> | null)?.role;
            const isUserAdmin = role === 'admin';
            setIsAdmin(isUserAdmin);
            // Debug log (remove in production)
            if (process.env.NODE_ENV === 'development') {
              console.log('[DestinationDrawer] Admin check:', { 
                role, 
                isUserAdmin, 
                userId: session.user.id,
                hasDestination: !!destination,
                hasSession: !!session
              });
            }
          } else {
            // Fallback to user from context if session fetch fails
            const role = (user.app_metadata as Record<string, any> | null)?.role;
            const isUserAdmin = role === 'admin';
            setIsAdmin(isUserAdmin);
            if (process.env.NODE_ENV === 'development') {
              console.log('[DestinationDrawer] Admin check (fallback):', { 
                role, 
                isUserAdmin, 
                userId: user.id,
                sessionError: sessionError?.message
              });
            }
          }
        } catch (error) {
          console.error('[DestinationDrawer] Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    }

    loadDestinationData();
  }, [user, destination]);

  // Load parent and nested destinations
  useEffect(() => {
    async function loadNestedData() {
      if (!destination || !isOpen) {
        setParentDestination(null);
        setNestedDestinations([]);
        return;
      }

      setLoadingNested(true);
      const supabaseClient = createClient();
      if (!supabaseClient) {
        setLoadingNested(false);
        return;
      }

      try {
        // Load parent if this is a nested destination
        if (destination.parent_destination_id) {
          const parent = await getParentDestination(supabaseClient, destination.id!);
          setParentDestination(parent);
      } else {
          setParentDestination(null);
        }

        // Load nested destinations if this is a parent
        if (destination.id) {
          const nested = await getNestedDestinations(supabaseClient, destination.id, false);
          setNestedDestinations(nested);
      } else {
          setNestedDestinations([]);
      }
    } catch (error) {
        console.warn('[DestinationDrawer] Error loading nested data:', error);
    } finally {
        setLoadingNested(false);
    }
    }

    loadNestedData();
  }, [destination, isOpen]);


  const handleShare = async () => {
    if (!destination) return;

    const url = `${window.location.origin}/destination/${destination.slug}`;
    const title = destination.name || 'Check out this place';
    const text = `Visit ${destination.name} in ${capitalizeCity(destination.city)}`;

    // Use native Web Share API if available (iOS Safari, Android Chrome, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err: any) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback to clipboard
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } else {
      // Fallback to clipboard for browsers without native share
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  const handleVisitToggle = async () => {
    if (!user || !destination) {
      if (!user) {
        router.push('/auth/login');
      }
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }

      if (isVisited) {
        // Remove visit
        const { error } = await supabaseClient
          .from('visited_places')
        .delete()
          .eq('user_id', user.id)
        .eq('destination_slug', destination.slug);

      if (error) {
          console.error('Error removing visit:', error);
          throw error;
      }

        setIsVisited(false);
        if (onVisitToggle) onVisitToggle(destination.slug, false);
    } else {
        // Add visit with current date (no modal needed - just mark as visited)
        if (!destination.slug) {
          alert('Invalid destination. Please try again.');
          return;
        }

        const visitedAt = new Date().toISOString();
        let saved = false;
        let savedData = null;

        // Try upsert first
        const { data: upsertData, error: upsertError } = await supabaseClient
          .from('visited_places')
          .upsert({
            user_id: user.id,
          destination_slug: destination.slug,
            visited_at: visitedAt,
          }, {
            onConflict: 'user_id,destination_slug',
          })
          .select()
          .single();

        if (!upsertError && upsertData) {
          console.log('Visit saved via upsert:', upsertData);
          saved = true;
          savedData = upsertData;
        } else if (upsertError) {
          // Check if error is related to activity_feed RLS policy (from trigger)
          if (upsertError.message && upsertError.message.includes('activity_feed') && upsertError.message.includes('row-level security')) {
            // Visit was saved but activity_feed insert failed - verify the visit exists
            console.warn('Visit saved via upsert but activity_feed insert failed due to RLS policy. Verifying visit...');
            const { data: verifyData } = await supabaseClient
              .from('visited_places')
              .select('*')
              .eq('user_id', user.id)
              .eq('destination_slug', destination.slug)
              .maybeSingle();
            
            if (verifyData) {
              console.log('Visit verified after RLS error:', verifyData);
              saved = true;
              savedData = verifyData;
            } else {
              // If verification fails, continue to fallback logic
              console.error('Upsert error (RLS) but visit not found, trying fallback:', upsertError);
            }
          } else {
            console.error('Upsert error:', upsertError);
          }
        }
        
        // If upsert failed (and not handled by RLS check above), try insert as fallback
        if (!saved) {
          // If upsert fails, try insert
          const { data: insertData, error: insertError } = await supabaseClient
            .from('visited_places')
            .insert({
              user_id: user.id,
              destination_slug: destination.slug,
              visited_at: visitedAt,
            })
            .select()
            .single();

          if (!insertError && insertData) {
            console.log('Visit saved via insert:', insertData);
            saved = true;
            savedData = insertData;
          } else if (insertError) {
            // If insert fails due to conflict, try update
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              console.log('Visit already exists, updating instead...');
              const { data: updateData, error: updateError } = await supabaseClient
                .from('visited_places')
                .update({
                  visited_at: visitedAt,
                })
                .eq('user_id', user.id)
                .eq('destination_slug', destination.slug)
                .select()
                .single();

              if (!updateError && updateData) {
                console.log('Visit saved via update:', updateData);
                saved = true;
                savedData = updateData;
              } else if (updateError) {
                console.error('Error updating visit:', updateError);
                // Check if error is related to activity_feed RLS policy
                if (updateError.message && updateError.message.includes('activity_feed') && updateError.message.includes('row-level security')) {
                  // Visit was updated but activity_feed insert failed - verify the visit exists
                  console.warn('Visit updated but activity_feed insert failed due to RLS policy. Verifying visit...');
                  // Verify the visit was actually saved
                  const { data: verifyData } = await supabaseClient
                    .from('visited_places')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug)
                    .maybeSingle();
                  
                  if (verifyData) {
                    console.log('Visit verified after RLS error:', verifyData);
                    saved = true;
                    savedData = verifyData;
                  } else {
                    throw updateError;
                  }
                } else {
                  throw updateError;
                }
              }
            } else {
              console.error('Error adding visit:', insertError);
              // Check if error is related to activity_feed RLS policy
              if (insertError.message && insertError.message.includes('activity_feed') && insertError.message.includes('row-level security')) {
                // Visit was created but activity_feed insert failed - verify the visit exists
                console.warn('Visit created but activity_feed insert failed due to RLS policy. Verifying visit...');
                // Verify the visit was actually saved
                const { data: verifyData } = await supabaseClient
                  .from('visited_places')
                  .select('*')
                  .eq('user_id', user.id)
                  .eq('destination_slug', destination.slug)
                  .maybeSingle();
                
                if (verifyData) {
                  console.log('Visit verified after RLS error:', verifyData);
                  saved = true;
                  savedData = verifyData;
                } else {
                  throw insertError;
                }
              } else {
                throw insertError;
              }
            }
          }
        }

        // Verify the data was actually saved before updating UI
        if (saved && savedData) {
          // Double-check by querying the database
          const { data: verifyData, error: verifyError } = await supabaseClient
            .from('visited_places')
            .select('*')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .maybeSingle();

          if (verifyError && verifyError.code !== 'PGRST116') {
            console.error('Verification error:', verifyError);
            throw new Error('Failed to verify visit was saved');
          }

          if (verifyData) {
            console.log('Visit verified in database:', verifyData);
            setIsVisited(true);
            if (onVisitToggle) onVisitToggle(destination.slug, true);
          } else {
            throw new Error('Visit was not found in database after save');
          }
        } else {
          throw new Error('Failed to save visit');
        }
      }
    } catch (error: any) {
      console.error('Error toggling visit:', error);
      const errorMessage = error?.message || 'Failed to update visit status. Please try again.';
      alert(errorMessage);
    }
  };

  const handleVisitedModalUpdate = async () => {
    // Reload visited status after modal updates
    if (!user || !destination) return;

      const supabaseClient = createClient();
      if (!supabaseClient) {
        setIsVisited(false);
        return;
      }

      const { data: visitedData } = await supabaseClient
        .from('visited_places')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .single();

    setIsVisited(!!visitedData);
    if (onVisitToggle && visitedData) onVisitToggle(destination.slug, true);
  };


  // Load AI recommendations
  useEffect(() => {
    async function loadRecommendations() {
      if (!destination || !isOpen) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);

      try {
        const response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
        
        // If unauthorized, skip recommendations (user not signed in)
        if (response.status === 401 || response.status === 403) {
          setRecommendations([]);
          setLoadingRecommendations(false);
          return;
        }
        
        if (!response.ok) {
          // Try fallback to related destinations
          try {
            const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
            if (relatedResponse.ok) {
              const relatedData = await relatedResponse.json();
              if (relatedData.related) {
                setRecommendations(
                  relatedData.related.map((dest: any) => ({
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
              }
            }
          } catch {
            // Silently fail - recommendations are optional
          }
          setLoadingRecommendations(false);
          return;
        }
        
        const data = await response.json();

        const dataObj2 = data as any;
        if (dataObj2.recommendations && Array.isArray(dataObj2.recommendations)) {
          setRecommendations(
            dataObj2.recommendations
              .map((rec: any) => rec.destination || rec)
              .filter(Boolean)
          );
        } else {
          setRecommendations([]);
        }
      } catch (error) {
        // Silently fail - recommendations are optional
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    loadRecommendations();
  }, [destination, isOpen]);

  // Always render drawer when open, even if destination is null (show loading state)
  if (!isOpen) return null;

  // Only show loading state if destination is completely null/undefined
  // Allow rendering even if some fields are missing (they'll have fallbacks)
  if (!destination) {
    // Show loading state if destination is null
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Details</h2>
          </div>
        }
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading destination...</p>
          </div>
        </div>
      </Drawer>
    );
  }

  // Get rating and price level for display
  const rating = enrichedData?.rating || destination.rating;
  const priceLevel = enrichedData?.price_level || destination.price_level;
  const highlightTags: string[] = (
    Array.isArray(destination.tags) && destination.tags.length > 0
      ? destination.tags
      : Array.isArray(enrichedData?.place_types)
        ? enrichedData.place_types
        : []
  )
    .map((tag: unknown) => (typeof tag === 'string' ? formatHighlightTag(tag) : ''))
    .filter((tag: unknown): tag is string => Boolean(tag))
    .slice(0, 8);

  const defaultMapsQuery = `${destination.name || 'Destination'}, ${destination.city ? capitalizeCity(destination.city) : ''}`;
  const googleMapsDirectionsUrl = destination.google_maps_url
    || (destination.latitude && destination.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
      : null);
  const appleMapsDirectionsUrl = `https://maps.apple.com/?q=${encodeURIComponent(defaultMapsQuery)}`;
  const directionsUrl = googleMapsDirectionsUrl || appleMapsDirectionsUrl;

  // Create custom header content - Place Drawer spec
  const headerContent = (
    <div className="flex items-center justify-between w-full gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {destination.name || 'Destination'}
        </h2>
      </div>
      {user && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bookmark Action */}
          <button
            onClick={async () => {
              if (!user) {
                router.push('/auth/login');
                return;
              }
              if (!isSaved) {
                setShowSaveModal(true);
              } else {
                try {
                  const supabaseClient = createClient();
                  if (!supabaseClient) return;
                  const { error } = await supabaseClient
                    .from('saved_places')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug);
                  if (!error) {
                    setIsSaved(false);
                    if (onSaveToggle) onSaveToggle(destination.slug, false);
                  }
                } catch (error) {
                  console.error('Error unsaving:', error);
                }
              }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isSaved ? 'Remove from saved' : 'Save destination'}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} strokeWidth={1.5} />
          </button>
          {/* Trip Action */}
          <button
            onClick={() => {
              if (!user) {
                router.push('/auth/login');
                return;
              }
              if (isAddedToTrip) return;
              setShowAddToTripModal(true);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Add to trip"
            disabled={isAddedToTrip}
          >
            {isAddedToTrip ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Create mobile footer content
  const mobileFooterContent = (
    <div className="px-6 py-4">
      <div className="flex gap-3">
        {destination.slug && (
          <Link
            href={`/destination/${destination.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-1 rounded-2xl bg-gray-900 py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
          >
            View Full Details
          </Link>
        )}

        <button
          onClick={() => {
            if (!user) {
              router.push('/auth/login');
              return;
            }
            if (isAddedToTrip) return;
            setShowAddToTripModal(true);
          }}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors ${
            isAddedToTrip
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100'
          }`}
          disabled={isAddedToTrip}
        >
          {isAddedToTrip ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Plan trip
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Create desktop footer content
  const desktopFooterContent = (
    <div className="px-6 py-4">
      <div className="flex gap-3">
        {destination.slug && (
          <Link
            href={`/destination/${destination.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-1 bg-black dark:bg-white text-white dark:text-black text-center py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
          >
            View Full Details
          </Link>
        )}
        
        <button
          onClick={() => {
            if (!user) {
              router.push('/auth/login');
              return;
            }
            if (isAddedToTrip) return;
            setShowAddToTripModal(true);
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            isAddedToTrip
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          disabled={isAddedToTrip}
        >
          {isAddedToTrip ? (
            <>
              <Check className="h-4 w-4" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Add to Trip</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        keepStateOnClose={true}
        headerContent={headerContent}
        footerContent={
          <>
            {/* Mobile Footer */}
            <div className="md:hidden">{mobileFooterContent}</div>
            {/* Desktop Footer */}
            <div className="hidden md:block">{desktopFooterContent}</div>
          </>
        }
      >
        <div className="p-6">
          {/* Mobile Content */}
          <div className="md:hidden space-y-6">
          {/* Hero Image */}
          {destination.image && (
            <div className="mt-0 -mx-6 mb-6 rounded-none overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-gray-800">
              <div className="relative w-full h-full">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 420px"
                  priority={false}
                  quality={90}
                />
              </div>
            </div>
          )}

          {/* Identity Block */}
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white mb-3">
                {destination.name || 'Destination'}
              </h1>

            {/* Location */}
            {(destination.neighborhood || destination.city || destination.country) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {destination.neighborhood && (
                    <div className="font-semibold text-gray-900 dark:text-white mb-0.5">
                      {destination.neighborhood}
                    </div>
                  )}
                  <div className="text-gray-600 dark:text-gray-400">
                    {destination.city && capitalizeCity(destination.city)}
                    {destination.city && destination.country && ', '}
                    {destination.country && destination.country}
                  </div>
                </div>
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
                {destination.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
                    <Tag className="h-3.5 w-3.5" />
                    {destination.category}
                  </span>
                )}
                {destination.brand && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900">
                    <Building2 className="h-3.5 w-3.5" />
                    {destination.brand}
                  </span>
                )}
                {destination.crown && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <Crown className="h-3.5 w-3.5" />
                    Crown
                  </span>
                )}
                {rating && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-900 dark:text-gray-100">
                    <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
                    {rating.toFixed(1)}
                    {(enrichedData?.user_ratings_total || (destination as any).user_ratings_total) && (
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] ml-0.5">
                        ({(enrichedData?.user_ratings_total || (destination as any).user_ratings_total).toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
                {priceLevel && priceLevel > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-900 dark:text-gray-100">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {'$'.repeat(priceLevel)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {destination.micro_description && (
              <div className="pt-2">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {destination.micro_description}
                </p>
              </div>
            )}

            {highlightTags.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                  Highlights
                </p>
                <div className="flex flex-wrap gap-2">
                  {highlightTags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-2.5">
                {user && (
                  <button
                    onClick={async () => {
                      if (!user) {
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved) {
                        setShowSaveModal(true);
                      } else {
                        try {
                          const supabaseClient = createClient();
                          if (!supabaseClient) {
                            alert('Failed to connect to database. Please try again.');
                            return;
                          }
                          const { error } = await supabaseClient
                            .from('saved_places')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('destination_slug', destination.slug);
                          if (!error) {
                            setIsSaved(false);
                            if (onSaveToggle) onSaveToggle(destination.slug, false);
                          }
                        } catch (error) {
                          console.error('Error unsaving:', error);
                        }
                      }
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                      isSaved
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
                    }`}
                    aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                )}

                {user && (
                  <button
                    onClick={handleVisitToggle}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                      isVisited
                        ? 'border-green-500 bg-green-500 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {isVisited ? 'Visited' : 'Mark Visited'}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                >
                  <Share2 className="h-4 w-4" />
                  {copied ? 'Copied!' : 'Share'}
                </button>

                <a
                  href={directionsUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                    directionsUrl
                      ? 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    if (!directionsUrl) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Navigation className="h-4 w-4" />
                  Directions
                </a>

                {/* Website Quick Action */}
                {destination.website && (
                  <a
                    href={destination.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}

                {/* Call Quick Action */}
                {destination.phone_number && (
                  <a
                    href={`tel:${destination.phone_number}`}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}

                {isAdmin && destination && (
                  <button
                    onClick={() => setIsEditDrawerOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 col-span-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit destination
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sign in prompt */}
          {!user && (
            <div className="px-6 pb-4">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Sign in to save and track visits
              </button>
            </div>
          )}
          </div>

          {/* Desktop Content */}
          <div className="hidden md:block space-y-6">
            {/* Hero Image */}
            {destination.image && (
              <div className="mt-0 -mx-6 mb-0 rounded-none overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-gray-800">
                <div className="relative w-full h-full">
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 420px"
                    priority={false}
                    quality={90}
                  />
                </div>
              </div>
            )}

            {/* Identity Block */}
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white mb-3">
                  {destination.name || 'Destination'}
                </h1>
              </div>

              {/* Location */}
              {(destination.neighborhood || destination.city || destination.country) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {destination.neighborhood && (
                      <div className="font-semibold text-gray-900 dark:text-white mb-0.5">
                        {destination.neighborhood}
                      </div>
                    )}
                    <div className="text-gray-600 dark:text-gray-400">
                      {destination.city && capitalizeCity(destination.city)}
                      {destination.city && destination.country && ', '}
                      {destination.country && destination.country}
                    </div>
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {destination.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
                    <Tag className="h-3.5 w-3.5" />
                    {destination.category}
                  </span>
                )}
                {destination.brand && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900">
                    <Building2 className="h-3.5 w-3.5" />
                    {destination.brand}
                  </span>
                )}
                {destination.crown && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <Crown className="h-3.5 w-3.5" />
                    Crown
                  </span>
                )}
                {rating && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-900 dark:text-gray-100">
                    <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
                    {rating.toFixed(1)}
                    {(enrichedData?.user_ratings_total || (destination as any).user_ratings_total) && (
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] ml-0.5">
                        ({(enrichedData?.user_ratings_total || (destination as any).user_ratings_total).toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
                {priceLevel && priceLevel > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-900 dark:text-gray-100">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {'$'.repeat(priceLevel)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {destination.micro_description && (
              <div className="pt-2">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {destination.micro_description}
                </p>
              </div>
            )}

            {/* Instagram Handle */}
            {(destination.instagram_handle || destination.instagram_url) && (() => {
                const instagramHandle = destination.instagram_handle || 
                  (destination.instagram_url 
                    ? destination.instagram_url.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '')
                    : null);
                const instagramUrl = destination.instagram_url || 
                  (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/` : null);
                
                if (!instagramHandle || !instagramUrl) return null;
                
                return (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-3 w-3" />
                    @{instagramHandle.replace('@', '')}
                  </a>
                );
              })()}
              </div>
            </div>

            {/* Action Row - Pill Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {/* Save Button with Dropdown */}
              <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved) {
                        // Quick save without opening dropdown
                        e.preventDefault();
                        setShowSaveModal(true);
                        setShowSaveDropdown(false);
                      }
                    }}
                  >
                    <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                    {isSaved && <ChevronDown className="h-3 w-3 ml-0.5" />}
                  </button>
                </DropdownMenuTrigger>
                {isSaved && (
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => {
                      setShowSaveModal(true);
                      setShowSaveDropdown(false);
                    }}>
                      <List className="h-3 w-3 mr-2" />
                      Save to List
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      router.push('/trips');
                      setShowSaveDropdown(false);
                    }}>
                      <Map className="h-3 w-3 mr-2" />
                      Save to Trip
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      router.push('/account?tab=collections');
                      setShowSaveDropdown(false);
                    }}>
                      <Plus className="h-3 w-3 mr-2" />
                      Create a List
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                      // Unsave from saved_places
                      if (destination?.slug && user) {
                        try {
                          const supabaseClient = createClient();
                          if (supabaseClient) {
                            const { error } = await supabaseClient
                              .from('saved_places')
                              .delete()
                              .eq('user_id', user.id)
                              .eq('destination_slug', destination.slug);
                            if (!error) {
                              setIsSaved(false);
                              if (onSaveToggle) onSaveToggle(destination.slug, false);
                            }
                          }
                        } catch (error) {
                          console.error('Error unsaving:', error);
                          toast.error('Failed to unsave. Please try again.');
                        }
                      }
                      setShowSaveDropdown(false);
                    }}>
                      <X className="h-3 w-3 mr-2" />
                      Remove from Saved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>

              <button
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                onClick={handleShare}
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>

              {/* Visited Button with Dropdown */}
              {user && (
                <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs transition-colors flex items-center gap-1.5 ${
                        isVisited
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={(e) => {
                        if (!isVisited) {
                          e.preventDefault();
                          handleVisitToggle();
                        }
                        // If already visited, let the dropdown handle the click
                      }}
                    >
                      <Check className={`h-3 w-3 ${isVisited ? 'stroke-[3]' : ''}`} />
                      {isVisited ? 'Visited' : 'Mark Visited'}
                      {isVisited && <ChevronDown className="h-3 w-3 ml-0.5" />}
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
              )}

              {destination.slug && destination.slug.trim() ? (
                <Link
                  href={`/destination/${destination.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Page
                </Link>
              ) : null}
            </div>

          {/* Sign in prompt */}
          {!user && (
            <div className="mt-6">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Sign in to save and track visits
              </button>
            </div>
          )}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

            {/* Meta & Info Section */}
            <div className="space-y-6">
            {/* Parent destination context */}
            {parentDestination && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <LocatedInBadge
                    parent={parentDestination}
                    onClick={() => {
                      if (parentDestination.slug && parentDestination.slug.trim()) {
                        router.push(`/destination/${parentDestination.slug}`);
                        onClose();
                      }
                    }}
                  />
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/80 dark:bg-dark-blue-900/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Located inside</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{parentDestination.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {parentDestination.category && parentDestination.city
                        ? `${parentDestination.category} · ${capitalizeCity(parentDestination.city)}`
                        : parentDestination.category || capitalizeCity(parentDestination.city || '')}
                    </p>
                  </div>

                  <button
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => {
                      if (parentDestination.slug && parentDestination.slug.trim()) {
                        router.push(`/destination/${parentDestination.slug}`);
                        onClose();
                      }
                    }}
                  >
                    View {parentDestination.name}
                  </button>
                </div>
              </div>
            )}

            {/* AI-Generated Tags */}
            {destination.tags && destination.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                {destination.tags.map((tag, index) => (
                    <span
                    key={index}
                    className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400"
                    >
                    {tag}
                    </span>
                  ))}
                </div>
            )}

            {/* Real-Time Status */}
            {destination.id && (
              <div className="space-y-4">
                <RealtimeStatusBadge
                  destinationId={destination.id}
                  compact={false}
                  showWaitTime={true}
                  showAvailability={true}
                />
                <RealtimeReportForm
                  destinationId={destination.id}
                  destinationName={destination.name}
                />
              </div>
            )}

            {/* Opening Hours */}
            {(() => {
              const hours = enrichedData?.current_opening_hours || enrichedData?.opening_hours || (destination as any).opening_hours_json;
              if (!hours || !hours.weekday_text || !Array.isArray(hours.weekday_text) || hours.weekday_text.length === 0) {
                return null;
              }
              
              const openStatus = getOpenStatus(
                hours, 
                destination.city, 
                enrichedData?.timezone_id, 
                enrichedData?.utc_offset
              );
              
              let now: Date;
              if (enrichedData?.timezone_id) {
                now = new Date(new Date().toLocaleString('en-US', { timeZone: enrichedData.timezone_id }));
              } else if (CITY_TIMEZONES[destination.city]) {
                now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[destination.city] }));
              } else if (enrichedData?.utc_offset !== null && enrichedData?.utc_offset !== undefined) {
                const utcNow = new Date();
                now = new Date(utcNow.getTime() + (enrichedData.utc_offset * 60 * 1000));
              } else {
                now = new Date();
              }
              
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {openStatus.todayHours && (
                      <>
                        <span className="text-sm font-medium text-black dark:text-white">
                        {openStatus.isOpen ? 'Open now' : 'Closed'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        · {openStatus.todayHours}
                      </span>
                      </>
                    )}
                  </div>
                  {hours.weekday_text && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        View all hours
                      </summary>
                      <div className="mt-2 space-y-1 pl-6">
                        {hours.weekday_text.map((day: string, index: number) => {
                          const [dayName, hoursText] = day.split(': ');
                          const dayOfWeek = now.getDay();
                          const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          const isToday = index === googleDayIndex;

                          return (
                            <div key={index} className={`flex justify-between ${isToday ? 'font-medium text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                              <span>{dayName}</span>
                              <span>{hoursText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}

            {/* Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity || destination.neighborhood || destination.city || destination.country) && (
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black dark:text-white mb-2">Location</div>
                    {/* Neighborhood, City, Country - Better organized */}
                    {(destination.neighborhood || destination.city || destination.country) && (
                      <div className="space-y-1 mb-2">
                        {destination.neighborhood && (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {destination.neighborhood}
                          </div>
                        )}
                        {(destination.city || destination.country) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {destination.city && capitalizeCity(destination.city)}
                            {destination.city && destination.country && ', '}
                            {destination.country && destination.country}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Full Address */}
                    {enrichedData?.formatted_address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{enrichedData.formatted_address}</div>
                    )}
                    {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">{enrichedData.vicinity}</div>
                    )}
              </div>
              </div>
            </div>
          )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + destination.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Navigation className="h-3 w-3" />
                Directions
              </a>
              <button
                onClick={handleShare}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>

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

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

            {/* Description */}
            {destination.description && (
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(destination.description)}
              </div>
            </div>
          )}

          {/* Editorial Summary */}
          {enrichedData?.editorial_summary && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {/* Architecture & Design */}
          {enhancedDestination && <ArchitectDesignInfo destination={enhancedDestination} />}

          {/* Contact & Links */}
          {(enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url || destination.opentable_url || destination.resy_url || destination.booking_url) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Contact & Booking</h3>
              <div className="flex flex-wrap gap-2">
                {(enrichedData?.website || destination.website) && (() => {
                  const websiteUrl = (enrichedData?.website || destination.website) || '';
                  const fullUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                  const domain = extractDomain(websiteUrl);
                  return (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span>{domain}</span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </a>
                  );
                })()}
                {(enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone) && (
                  <a
                    href={`tel:${enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone}`}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone}
                  </a>
                )}
                {destination.instagram_url && (
                  <a
                    href={destination.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {destination.opentable_url && (
                  <a
                    href={destination.opentable_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    OpenTable
                  </a>
                )}
                {destination.resy_url && (
                  <a
                    href={destination.resy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Resy
                  </a>
                )}
                {destination.booking_url && (
                  <a
                    href={destination.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Book Now
                  </a>
                )}
              </div>
              </div>
            )}

            {/* AI Review Summary */}
            {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">What Reviewers Say</h3>
                {loadingReviewSummary ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                    <span>Summarizing reviews...</span>
                  </div>
                ) : reviewSummary ? (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/50">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewSummary}</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Weather Section */}
            {enrichedData?.current_weather && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Cloud className="h-3.5 w-3.5" />
                  Current Weather
                </h3>
                <div className="flex items-center gap-4">
                  {enrichedData.current_weather.temperature && (
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(enrichedData.current_weather.temperature)}°
                    </div>
                  )}
                  {enrichedData.current_weather.weatherDescription && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {enrichedData.current_weather.weatherDescription}
                    </div>
                  )}
                </div>
                {enrichedData.best_visit_months && Array.isArray(enrichedData.best_visit_months) && enrichedData.best_visit_months.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    Best months to visit: {enrichedData.best_visit_months.map((m: number) => {
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return monthNames[m - 1];
                    }).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Distance from Center */}
            {(enrichedData?.distance_from_center_meters || enrichedData?.walking_time_from_center_minutes || enrichedData?.driving_time_from_center_minutes || enrichedData?.transit_time_from_center_minutes) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Navigation className="h-3.5 w-3.5" />
                  Distance from City Center
                </h3>
                <div className="space-y-2 text-sm">
                  {enrichedData.distance_from_center_meters && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Distance</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(enrichedData.distance_from_center_meters / 1000).toFixed(1)} km
                        {enrichedData.distance_from_center_meters < 1000 && ` (${enrichedData.distance_from_center_meters} m)`}
                      </span>
                    </div>
                  )}
                  {enrichedData.walking_time_from_center_minutes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Walking</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {enrichedData.walking_time_from_center_minutes} min
                      </span>
                    </div>
                  )}
                  {enrichedData.driving_time_from_center_minutes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Driving</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {enrichedData.driving_time_from_center_minutes} min
                      </span>
                    </div>
                  )}
                  {enrichedData.transit_time_from_center_minutes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Transit</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {enrichedData.transit_time_from_center_minutes} min
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photos Section */}
            {(enrichedData?.photos || enrichedData?.primary_photo_url || enrichedData?.photo_count) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photos
                  {enrichedData.photo_count && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      ({enrichedData.photo_count})
                    </span>
                  )}
                </h3>
                {enrichedData.primary_photo_url && (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 mb-3">
                    <Image
                      src={enrichedData.primary_photo_url}
                      alt={`${destination.name} - Photo`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 420px"
                      quality={85}
                    />
                  </div>
                )}
                {enrichedData.photos && Array.isArray(enrichedData.photos) && enrichedData.photos.length > 1 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {enrichedData.photos.length} photos available
                  </div>
                )}
              </div>
            )}

            {/* Nearby Events */}
            {enrichedData?.nearby_events && Array.isArray(enrichedData.nearby_events) && enrichedData.nearby_events.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Nearby Events
                  {enrichedData.upcoming_event_count && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      ({enrichedData.upcoming_event_count})
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {enrichedData.nearby_events.slice(0, 3).map((event: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                      {event.name || event.title}
                      {event.date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Currency & Pricing */}
            {(enrichedData?.currency_code || enrichedData?.price_range_local) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5" />
                  Pricing
                </h3>
                <div className="space-y-2 text-sm">
                  {enrichedData.currency_code && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Currency</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {enrichedData.currency_code}
                      </span>
                    </div>
                  )}
                  {enrichedData.price_range_local && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Price Range</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {enrichedData.price_range_local}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Section */}
            {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
                <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                  <MapView
                    destinations={[{
                      ...destination,
                      latitude: destination.latitude || enrichedData?.latitude,
                      longitude: destination.longitude || enrichedData?.longitude,
                    }].filter(d => d.latitude && d.longitude) as Destination[]}
                    center={{
                      lat: destination.latitude || enrichedData?.latitude || 0,
                      lng: destination.longitude || enrichedData?.longitude || 0,
                    }}
                    zoom={15}
                    isDark={false}
                  />
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {(loadingRecommendations || recommendations.length > 0) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    You might also like
                  </h3>
                </div>

                {loadingRecommendations ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-shrink-0 w-32">
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 animate-pulse" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
                  {recommendations.map(rec => (
                    <button
                      key={rec.slug}
                      onClick={() => {
                        if (rec.slug && rec.slug.trim()) {
                        router.push(`/destination/${rec.slug}`);
                        }
                      }}
                      className="group text-left flex-shrink-0 w-32 flex flex-col"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-800">
                        {rec.image ? (
                          <Image
                            src={rec.image}
                            alt={rec.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 200px"
                            className="object-cover group-hover:opacity-90 transition-opacity"
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-8 w-8 opacity-20" />
                          </div>
                        )}
                        {rec.michelin_stars && rec.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1">
                            <img
                              src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                              alt="Michelin star"
                              className="h-3 w-3"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback to local file if external URL fails
                                const target = e.currentTarget;
                                if (target.src !== '/michelin-star.svg') {
                                  target.src = '/michelin-star.svg';
                                }
                              }}
                            />
                            <span>{rec.michelin_stars}</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1 text-black dark:text-white">
                        {rec.name}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {capitalizeCity(rec.city)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
      </Drawer>

      {/* Save Destination Modal */}
      {destination && destination.id && destination.slug && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={async () => {
            setShowSaveModal(false);
            // Reload saved status after modal closes
            if (user && destination?.slug) {
              try {
                const supabaseClient = createClient();
                if (supabaseClient) {
                  const { data } = await supabaseClient
                    .from('saved_places')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug)
                    .single();
                  setIsSaved(!!data);
                } else {
                  setIsSaved(false);
                }
              } catch {
                setIsSaved(false);
              }
            }
          }}
          onSave={async (collectionId) => {
            if (!destination) return;
            // If collectionId is null, user unsaved - remove from saved_places
            if (collectionId === null && destination.slug && user) {
              try {
                const supabaseClient = createClient();
                if (supabaseClient) {
                  const { error } = await supabaseClient
                    .from('saved_places')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug);
                  if (!error) {
                    setIsSaved(false);
                    if (onSaveToggle) onSaveToggle(destination.slug, false);
                  }
                }
              } catch (error) {
                console.error('Error removing from saved_places:', error);
              }
            } else if (collectionId !== null && destination.slug && user) {
              // Also save to saved_places for simple save functionality
              try {
                const supabaseClient = createClient();
                if (supabaseClient) {
                  const { error } = await supabaseClient
                    .from('saved_places')
                    .upsert({
                      user_id: user.id,
                      destination_slug: destination.slug,
                    });
                  if (!error) {
                    setIsSaved(true);
                    if (onSaveToggle) onSaveToggle(destination.slug, true);
                  }
                }
              } catch (error) {
                console.error('Error saving to saved_places:', error);
              }
            }
          }}
        />
      )}

      {/* Visited Modal */}
      {destination && (
        <VisitedModal
          destinationSlug={destination.slug || ''}
          destinationName={destination.name || ''}
          isOpen={showVisitedModal}
          onClose={() => setShowVisitedModal(false)}
          onUpdate={handleVisitedModalUpdate}
        />
      )}

      {/* Add to Trip Modal */}
      {destination && (
        <AddToTripModal
          destinationSlug={destination.slug || ''}
          destinationName={destination.name || ''}
          isOpen={showAddToTripModal}
          onClose={() => setShowAddToTripModal(false)}
          onAdd={(tripId) => {
            setIsAddedToTrip(true);
            setShowAddToTripModal(false);
            console.log(`Added ${destination?.name || 'destination'} to trip ${tripId}`);
          }}
        />
      )}
      <POIDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        destination={destination}
        onSave={() => {
          setIsEditDrawerOpen(false);
          // Optionally refresh destination data here if needed
        }}
      />
    </>
  );
}
