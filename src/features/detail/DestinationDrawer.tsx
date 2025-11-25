'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, X, MapPin, Tag, Bookmark, Share2, Navigation, ChevronDown, Plus, Loader2, Clock, ExternalLink, Check, List, Map, Heart, Edit, Crown, Star, Instagram, Phone, Globe, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

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
import type { ItineraryItemNotes } from '@/types/trip';
import { useAuth } from '@/contexts/AuthContext';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { trackEvent } from '@/lib/analytics/track';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { createClient } from '@/lib/supabase/client';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { Drawer } from '@/components/ui/Drawer';
import { architectNameToSlug } from '@/lib/architect-utils';
import { DestinationCard } from '@/components/DestinationCard';


// Dynamically import GoogleStaticMap for small map in drawer
const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
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
  onDestinationClick?: (slug: string) => void;
  onEdit?: (destination: Destination) => void; // Callback for editing destination
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

export function DestinationDrawer({ destination, isOpen, onClose, onSaveToggle, onVisitToggle, onDestinationClick, onEdit }: DestinationDrawerProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isReviewersExpanded, setIsReviewersExpanded] = useState(false);
  const [isContactExpanded, setIsContactExpanded] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [addToTripError, setAddToTripError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

  const handleAddSuccess = (tripTitle: string, day?: number) => {
    setIsAddedToTrip(true);
    setShowAddToTripModal(false);
    const daySuffix = day ? ` · Day ${day}` : '';
    toast.success(`Added to ${tripTitle}${daySuffix}`);
  };

  // Function to add destination to trip directly
  async function addDestinationToTrip(tripId: string) {
    if (!destination?.slug || !user) return;

    setAddToTripError(null);
    setActionError(null);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Verify trip exists and belongs to user
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('id, title')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        throw new Error('Trip not found or you do not have permission');
      }

      // Get the next day and order_index for this trip
      let nextDay = 1;
      let nextOrder = 0;

      try {
        const { data: orderData, error: functionError } = await supabaseClient
          .rpc('get_next_itinerary_order', { p_trip_id: tripId });

        if (!functionError && orderData) {
          const result = Array.isArray(orderData) ? orderData[0] : orderData;
          if (result && typeof result === 'object') {
            nextDay = result.next_day ?? 1;
            nextOrder = result.next_order ?? 0;
          }
        }
        
        if (functionError || !orderData || (Array.isArray(orderData) && orderData.length === 0)) {
          const { data: existingItems, error: queryError } = await supabaseClient
            .from('itinerary_items')
            .select('day, order_index')
            .eq('trip_id', tripId)
            .order('day', { ascending: false })
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!queryError && existingItems) {
            nextDay = existingItems.day ?? 1;
            nextOrder = (existingItems.order_index ?? -1) + 1;
          }
        }
      } catch (queryErr: any) {
        console.warn('Error getting next order, using defaults:', queryErr);
        nextDay = 1;
        nextOrder = 0;
      }

      // Prepare notes data
      const notesData: ItineraryItemNotes = {
        raw: '',
      };

      // Add destination to itinerary
      const { data: insertedItem, error: insertError } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destination.slug,
          day: nextDay,
          order_index: nextOrder,
          title: destination.name,
          description: null,
          notes: JSON.stringify(notesData),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to add destination to trip');
      }

      if (insertedItem) {
        handleAddSuccess(trip?.title || 'Trip', nextDay);
      }
    } catch (error: any) {
      console.error('Error adding to trip:', error);
      const message = error?.message || 'Failed to add destination to trip. Please try again.';
      setAddToTripError(message);
      toast.error(message);
      // Fallback to showing modal
      setShowAddToTripModal(true);
    }
  }

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
            architect:architects!architect_id(id, name, slug, bio, birth_year, death_year, nationality, design_philosophy, image_url),
            design_firm:design_firms(id, name, slug, description, founded_year, image_url),
            interior_designer:architects!interior_designer_id(id, name, slug, bio, birth_year, death_year, nationality, image_url),
            movement:design_movements(id, name, slug, description, period_start, period_end)
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
          
          // Merge architect data into destination for ArchitectDesignInfo component
          // Handle architect object (from join) - could be array or single object
          let updatedDestination: Destination & {
            architect_obj?: any;
            design_firm_obj?: any;
            interior_designer_obj?: any;
            movement_obj?: any;
          } = { ...destination };
          
          if (dataObj.architect) {
            const architectObj = Array.isArray(dataObj.architect) && dataObj.architect.length > 0
              ? dataObj.architect[0]
              : dataObj.architect;
            if (architectObj && architectObj.name) {
              // Update destination with architect object
              updatedDestination = {
                ...updatedDestination,
                architect_id: architectObj.id,
                architect_obj: architectObj,
                // Keep legacy text field for backward compatibility
                architect: updatedDestination.architect || architectObj.name,
              };
            }
          }
          
          // Handle design firm object (note: Supabase join returns it as 'design_firm' object, not text)
          // Check if design_firm is an object (from join) vs string (legacy field)
          if (dataObj.design_firm && typeof dataObj.design_firm === 'object' && !Array.isArray(dataObj.design_firm) && dataObj.design_firm.name) {
            // This is the joined object
            const firmObj = dataObj.design_firm;
            updatedDestination = {
              ...updatedDestination,
              design_firm_id: firmObj.id,
              design_firm_obj: firmObj,
              design_firm: firmObj.name,
            };
          } else if (dataObj.design_firm && Array.isArray(dataObj.design_firm) && dataObj.design_firm.length > 0) {
            // Handle array case (shouldn't happen but just in case)
            const firmObj = dataObj.design_firm[0];
            if (firmObj && firmObj.name) {
              updatedDestination = {
                ...updatedDestination,
                design_firm_id: firmObj.id,
                design_firm_obj: firmObj,
                design_firm: firmObj.name,
              };
            }
          }
          
          // Handle interior designer object
          if (dataObj.interior_designer) {
            const interiorDesignerObj = Array.isArray(dataObj.interior_designer) && dataObj.interior_designer.length > 0
              ? dataObj.interior_designer[0]
              : dataObj.interior_designer;
            if (interiorDesignerObj && interiorDesignerObj.name) {
              updatedDestination = {
                ...updatedDestination,
                interior_designer_id: interiorDesignerObj.id,
                interior_designer_obj: interiorDesignerObj,
                interior_designer: updatedDestination.interior_designer || interiorDesignerObj.name,
              };
            }
          }
          
          // Handle movement object
          if (dataObj.movement) {
            const movementObj = Array.isArray(dataObj.movement) && dataObj.movement.length > 0
              ? dataObj.movement[0]
              : dataObj.movement;
            if (movementObj && movementObj.name) {
              updatedDestination = {
                ...updatedDestination,
                movement_id: movementObj.id,
                movement_obj: movementObj,
              };
            }
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

    setActionError(null);

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
          const message = 'Invalid destination. Please try again.';
          setActionError(message);
          toast.error(message);
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
      setActionError(errorMessage);
      toast.error(errorMessage);
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
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4 text-gray-900 dark:text-white" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {destination.name || 'Destination'}
        </h2>
      </div>
      {user && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Admin Edit Button */}
          {isAdmin && destination && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) {
                  onClose(); // Close the destination drawer
                  onEdit(destination);
                } else {
                  // Fallback to admin page if no onEdit callback
                  onClose();
                  router.push(`/admin?slug=${destination.slug}`);
                }
              }}
              className="p-2 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Edit destination"
              title="Edit destination (Admin)"
            >
              <Edit className="h-4 w-4 text-gray-900 dark:text-white/90" strokeWidth={1.5} />
            </button>
          )}
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
            onClick={async () => {
              if (!user) {
                router.push('/auth/login');
                return;
              }
              if (isAddedToTrip) return;
              
              // Try to add directly to most recent trip, or show modal if multiple trips
              try {
                const supabaseClient = createClient();
                if (!supabaseClient) return;
                
                const { data: trips, error } = await supabaseClient
                  .from('trips')
                  .select('id')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false })
                  .limit(2);
                
                if (error) throw error;
                
                if (trips && trips.length === 1) {
                  // Only one trip - add directly
                  const tripId = trips[0].id;
                  await addDestinationToTrip(tripId);
                } else if (trips && trips.length > 1) {
                  // Multiple trips - show modal to select
                  setShowAddToTripModal(true);
                } else {
                  // No trips - show modal to create a new trip
                  setShowAddToTripModal(true);
                }
              } catch (error) {
                console.error('Error checking trips:', error);
                // Fallback to showing modal
                setShowAddToTripModal(true);
              }
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
          onClick={async () => {
            if (!user) {
              router.push('/auth/login');
              return;
            }
            if (isAddedToTrip) return;
            
            // Try to add directly to most recent trip, or show modal if multiple trips
            try {
              const supabaseClient = createClient();
              if (!supabaseClient) return;
              
              const { data: trips, error } = await supabaseClient
                .from('trips')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(2);
              
              if (error) throw error;
              
              if (trips && trips.length === 1) {
                // Only one trip - add directly
                const tripId = trips[0].id;
                await addDestinationToTrip(tripId);
              } else if (trips && trips.length > 1) {
                // Multiple trips - show modal to select
                setShowAddToTripModal(true);
              } else {
                // No trips - open trip planner with this destination pre-filled
                onClose();
                router.push(`/trips?prefill=${encodeURIComponent(destination?.slug || '')}`);
              }
            } catch (error) {
              console.error('Error checking trips:', error);
              // Fallback to showing modal
              setShowAddToTripModal(true);
            }
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
        zIndex={9999}
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
          {(addToTripError || actionError) && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 flex gap-2 text-xs text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="space-y-0.5">
                {addToTripError && <p className="font-medium">{addToTripError}</p>}
                {actionError && <p className="font-medium">{actionError}</p>}
                <p className="text-[11px] text-red-700/80 dark:text-red-200/80">You can retry without closing the drawer.</p>
              </div>
            </div>
          )}
          {/* Mobile Content - Same as Desktop */}
          <div className="md:hidden">
          {/* Hero Image - Full width rounded */}
          {destination.image && (
            <div className="mt-[18px] rounded-2xl overflow-hidden aspect-[4/3]">
              <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 420px"
                priority={false}
                quality={85}
              />
              </div>
            </div>
          )}

          {/* Primary Info Block */}
          <div className="space-y-4 mt-6">
            {/* City Link - Pill style */}
            <div>
              <a
                href={`/city/${destination.city}`}
                className="inline-flex items-center px-3 h-[28px] rounded-lg border border-neutral-200 dark:border-white/20 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-[#1A1C1F] cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/city/${destination.city}`);
                }}
              >
                {destination.country ? `${capitalizeCity(destination.city)}, ${destination.country}` : capitalizeCity(destination.city)}
              </a>
            </div>

          {/* Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-medium leading-tight text-black dark:text-white">
                {destination.name}
              </h1>

              {/* Category - Subtle caps */}
              {destination.category && (
                <div className="text-xs uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 font-medium">
                  {destination.category}
                </div>
              )}

              {/* Rating - Bold rating */}
              {(enrichedData?.rating || destination.rating) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {(enrichedData?.rating || destination.rating).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Tags - Small pills */}
              {destination.tags && Array.isArray(destination.tags) && destination.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {destination.tags.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] text-gray-600 dark:text-gray-400">
                      {formatHighlightTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              {/* Other Pills: Brand, Crown, Michelin */}
              <div className="flex flex-wrap gap-2">

                {destination.brand && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    <Building2 className="h-3.5 w-3.5" />
                    {destination.brand}
                  </span>
                )}

                {destination.crown && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400">
                    Crown
                </span>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
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
                  {destination.michelin_stars} Michelin star{destination.michelin_stars > 1 ? 's' : ''}
                  </span>
            )}

                {(enrichedData?.rating || destination.rating) && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                    </span>
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

              {destination.micro_description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {destination.micro_description}
                </p>
                )}
              </div>

            {/* Action Row - Pill Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {/* Save Button with Dropdown */}
              <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    onClick={async (e) => {
                      if (!user) {
                        e.preventDefault();
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved && destination?.slug) {
                        // Quick save to saved_places immediately
                        e.preventDefault();
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
                              // Also open modal to optionally save to collection
                              setShowSaveModal(true);
                            } else {
                              console.error('Error saving place:', error);
                              const message = 'Failed to save. Please try again.';
                              setActionError(message);
                              toast.error(message);
                            }
                          }
                        } catch (error) {
                          console.error('Error saving place:', error);
                          const message = 'Failed to save. Please try again.';
                          setActionError(message);
                          toast.error(message);
                        }
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
                          const message = 'Failed to unsave. Please try again.';
                          setActionError(message);
                          toast.error(message);
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

          {/* Meta & Info Section - Same as Desktop */}
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

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Located inside</p>
                  <div className="max-w-xs">
                    <DestinationCard
                      destination={parentDestination}
                      onClick={() => {
                        if (parentDestination.slug && parentDestination.slug.trim()) {
                          onClose();
                          setTimeout(() => router.push(`/destination/${parentDestination.slug}`), 100);
                        }
                      }}
                      showBadges={true}
                    />
                  </div>
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
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {openStatus.todayHours && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 h-6 rounded-lg text-xs font-medium ${
                            openStatus.isOpen 
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800' 
                              : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                          }`}>
                            {openStatus.isOpen ? 'Open now' : 'Closed'}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {openStatus.todayHours}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {hours.weekday_text && (
                    <details className="group">
                      <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        View all hours
                      </summary>
                      <div className="mt-3 space-y-2 pl-5">
                        {hours.weekday_text.map((day: string, index: number) => {
                          const [dayName, hoursText] = day.split(': ');
                          const dayOfWeek = now.getDay();
                          const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          const isToday = index === googleDayIndex;

                          return (
                            <div key={index} className={`flex justify-between items-center text-sm ${
                              isToday 
                                ? 'font-medium text-black dark:text-white' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              <span className={isToday ? 'text-black dark:text-white' : ''}>{dayName}</span>
                              <span className={isToday ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}>{hoursText}</span>
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

          {/* Map Section - Small static map */}
          {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <GoogleStaticMap
                  center={{
                    lat: destination.latitude || enrichedData?.latitude || 0,
                    lng: destination.longitude || enrichedData?.longitude || 0,
                  }}
                  zoom={15}
                  height="192px"
                  className="rounded-2xl"
                  showPin={true}
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
                          if (onDestinationClick) {
                            onDestinationClick(rec.slug);
                          } else {
                            router.push(`/destination/${rec.slug}`);
                          }
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
          </div>

          {/* Desktop Content */}
          <div className="hidden md:block">
          {/* Image */}
          {destination.image && (
            <div className="mt-[18px] rounded-[8px] overflow-hidden aspect-[4/3]">
              <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 420px"
                priority={false}
                quality={85}
              />
              </div>
            </div>
          )}

          {/* Identity Block */}
          <div className="space-y-4 mt-6">
            {/* Location Badge */}
            <div>
              <a
                href={`/city/${destination.city}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/city/${destination.city}`);
                }}
              >
                <MapPin className="h-3 w-3" />
                {destination.country ? `${capitalizeCity(destination.city)}, ${destination.country}` : capitalizeCity(destination.city)}
              </a>
            </div>

          {/* Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-medium leading-tight text-black dark:text-white">
                {destination.name}
              </h1>

              {/* Pills: Category, Brand, Crown, Michelin, Google Rating */}
              <div className="flex flex-wrap gap-2">
              {destination.category && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {destination.category}
                    </span>
                )}

                {destination.brand && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    <Building2 className="h-3.5 w-3.5" />
                    {destination.brand}
                  </span>
                )}

                {destination.crown && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400">
                    Crown
                </span>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
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
                  {destination.michelin_stars} Michelin star{destination.michelin_stars > 1 ? 's' : ''}
                  </span>
            )}

                {(enrichedData?.rating || destination.rating) && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                    </span>
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

              {destination.micro_description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {destination.micro_description}
                </p>
                )}
              </div>

            {/* Action Row - Pill Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {/* Save Button with Dropdown */}
              <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    onClick={async (e) => {
                      if (!user) {
                        e.preventDefault();
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved && destination?.slug) {
                        // Quick save to saved_places immediately
                        e.preventDefault();
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
                              // Also open modal to optionally save to collection
                              setShowSaveModal(true);
                            } else {
                              console.error('Error saving place:', error);
                              const message = 'Failed to save. Please try again.';
                              setActionError(message);
                              toast.error(message);
                            }
                          }
                        } catch (error) {
                          console.error('Error saving place:', error);
                          const message = 'Failed to save. Please try again.';
                          setActionError(message);
                          toast.error(message);
                        }
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
                          const message = 'Failed to unsave. Please try again.';
                          setActionError(message);
                          toast.error(message);
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

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Located inside</p>
                  <div className="max-w-xs">
                    <DestinationCard
                      destination={parentDestination}
                      onClick={() => {
                        if (parentDestination.slug && parentDestination.slug.trim()) {
                          onClose();
                          setTimeout(() => router.push(`/destination/${parentDestination.slug}`), 100);
                        }
                      }}
                      showBadges={true}
                    />
                  </div>
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
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {openStatus.todayHours && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 h-6 rounded-lg text-xs font-medium ${
                            openStatus.isOpen 
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800' 
                              : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                          }`}>
                            {openStatus.isOpen ? 'Open now' : 'Closed'}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {openStatus.todayHours}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {hours.weekday_text && (
                    <details className="group">
                      <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        View all hours
                      </summary>
                      <div className="mt-3 space-y-2 pl-5">
                        {hours.weekday_text.map((day: string, index: number) => {
                          const [dayName, hoursText] = day.split(': ');
                          const dayOfWeek = now.getDay();
                          const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          const isToday = index === googleDayIndex;

                          return (
                            <div key={index} className={`flex justify-between items-center text-sm ${
                              isToday 
                                ? 'font-medium text-black dark:text-white' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              <span className={isToday ? 'text-black dark:text-white' : ''}>{dayName}</span>
                              <span className={isToday ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}>{hoursText}</span>
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

          {/* Map Section - Small static map */}
          {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <GoogleStaticMap
                  center={{
                    lat: destination.latitude || enrichedData?.latitude || 0,
                    lng: destination.longitude || enrichedData?.longitude || 0,
                  }}
                  zoom={15}
                  height="192px"
                  className="rounded-2xl"
                  showPin={true}
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
                          if (onDestinationClick) {
                            onDestinationClick(rec.slug);
                          } else {
                            router.push(`/destination/${rec.slug}`);
                          }
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
        </div>
      </Drawer>

      {/* Save Destination Modal */}
      {destination?.id && (
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
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showVisitedModal}
          onClose={() => setShowVisitedModal(false)}
          onUpdate={handleVisitedModalUpdate}
        />
      )}

    </>
  );
}
