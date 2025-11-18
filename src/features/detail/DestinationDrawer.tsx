'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, MapPin, Tag, Bookmark, Share2, Navigation, ChevronDown, Plus, Loader2, Clock, ExternalLink, Check, List, Map, Heart, Edit, Crown, Star, Instagram, Phone, Globe } from 'lucide-react';
import { useDestinationData } from './useDestinationData';
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
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { Drawer } from '@/components/ui/Drawer';
import { createClient } from '@/lib/supabase/client';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';

function extractDomain(url: string): string {
  try {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0] || url;
  } catch {
    return url;
  }
}

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
  const [isMounted, setIsMounted] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    enrichedData,
    setEnrichedData,
    enhancedDestination,
    setEnhancedDestination,
    parentDestination,
    setParentDestination,
    nestedDestinations,
    setNestedDestinations,
    loadingNested,
    setLoadingNested,
    reviewSummary,
    loadingReviewSummary,
    setLoadingReviewSummary,
    setReviewSummary,
    isSaved,
    setIsSaved,
    isVisited,
    setIsVisited,
    isAddedToTrip,
    setIsAddedToTrip,
    isAdmin,
    setIsAdmin,
    recommendations,
    setRecommendations,
    loadingRecommendations,
    setLoadingRecommendations,
  } = useDestinationData(destination, isOpen);

  // Ensure component only renders on client-side to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  // useEffect(() => {
  //   if (typeof document === 'undefined') return;
  //   if (isOpen) {
  //     document.documentElement.style.overflow = 'hidden';
  //   } else {
  //     document.documentElement.style.overflow = '';
  //   }
  //   return () => {
  //     if (typeof document !== 'undefined') {
  //       document.documentElement.style.overflow = '';
  //     }
  //   };
  // }, [isOpen]);

  // Close on escape key
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   const handleEscape = (e: KeyboardEvent) => {
  //     if (e.key === 'Escape' && isOpen) {
  //       onClose();
  //     }
  //   };

  //   window.addEventListener('keydown', handleEscape);
  //   return () => window.removeEventListener('keydown', handleEscape);
  // }, [isOpen, onClose]);

  // Update enhanced destination when destination prop changes
  useEffect(() => {
    setEnhancedDestination(destination);
    setImageError(false);
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
            architect:architects(id, name, slug, bio, birth_year, death_year, nationality, design_philosophy, image_url),
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
          // Log error details safely without causing rendering issues
          console.error('Error fetching enriched data:', {
            message: error?.message || 'Unknown error',
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
          });
          // Set enriched data to null on error to prevent rendering issues
          setEnrichedData(null);
        } else {
          // No error but no data - destination might not exist
          setEnrichedData(null);
        }
      } catch (error) {
        // Log error safely without causing rendering issues
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error loading enriched data:', errorMessage);
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

  // Prevent rendering until mounted on client-side to avoid hydration issues
  if (!isMounted) {
    return null;
  }

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
        desktopWidth="440px"
        position="right"
        style="solid"
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

  const drawerImage =
    destination?.image_thumbnail ||
    destination?.image ||
    destination?.image_original ||
    enrichedData?.image ||
    null;

  // Get rating for display (safely handle null/undefined)
  const rating = enrichedData?.rating ?? destination?.rating ?? null;
  const highlightTags: string[] = (
    Array.isArray(destination?.tags) && destination.tags.length > 0
      ? destination.tags
      : Array.isArray(enrichedData?.place_types)
        ? enrichedData.place_types
        : []
  )
    .map((tag: unknown) => (typeof tag === 'string' ? formatHighlightTag(tag) : ''))
    .filter((tag: unknown): tag is string => Boolean(tag))
    .slice(0, 8);

  const defaultMapsQuery = `${destination?.name || 'Destination'}, ${destination?.city ? capitalizeCity(destination.city) : ''}`;
  const googleMapsDirectionsUrl = destination?.google_maps_url
    || (destination?.latitude && destination?.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
      : null);
  const appleMapsDirectionsUrl = `https://maps.apple.com/?q=${encodeURIComponent(defaultMapsQuery)}`;
  const directionsUrl = googleMapsDirectionsUrl || appleMapsDirectionsUrl;

  // Create custom header content - Place Drawer spec
  const headerContent = (
    <div className="flex items-center justify-between w-full relative">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">
        {destination?.name || 'Destination'}
      </h2>
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
                if (!destination?.slug) return;
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
    </div>
  );

  // Create mobile footer content
  const mobileFooterContent = (
    <div className="px-6 py-4">
      <div className="flex gap-3">
        {destination?.slug && (
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
        {destination?.slug && (
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

  // Get subtitle for header
  const drawerSubtitle = destination?.city 
    ? `${capitalizeCity(destination.city)}${destination.category ? ` · ${destination.category}` : ''}`
    : undefined;

  // Render footer with action buttons (Tier 3 style)
  const renderFooter = () => (
    <div className="flex gap-2.5" style={{ gap: '10px' }}>
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
              if (!supabaseClient || !destination?.slug) return;
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
        className="flex-1 flex items-center justify-center gap-2 transition-all"
        style={{
          height: '48px',
          borderRadius: '24px',
          fontSize: '15px',
          fontWeight: 500,
          backgroundColor: isSaved ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.08)',
          color: isSaved ? '#000' : '#fff',
        }}
      >
        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save'}
      </button>
      <button
        onClick={() => {
          if (!user) {
            router.push('/auth/login');
            return;
          }
          if (isAddedToTrip) return;
          setShowAddToTripModal(true);
        }}
        disabled={isAddedToTrip}
        className="flex-1 flex items-center justify-center gap-2 transition-all"
        style={{
          height: '48px',
          borderRadius: '24px',
          fontSize: '15px',
          fontWeight: 600,
          backgroundColor: isAddedToTrip ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.92)',
          color: isAddedToTrip ? 'rgba(34,197,94,1)' : '#000',
          opacity: isAddedToTrip ? 0.8 : 1,
        }}
      >
        {isAddedToTrip ? (
          <>
            <Check className="w-4 h-4" />
            Added
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Add to Trip
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={destination?.name || 'Destination'}
        subtitle={drawerSubtitle}
        mobileVariant="bottom"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="0"
        keepStateOnClose={true}
        zIndex={1200}
        tier="tier3"
        noOverlay={true}
        footerContent={destination ? renderFooter() : undefined}
        customBorderRadius={{ topLeft: '0', topRight: '0', bottomLeft: '24px', bottomRight: '0' }}
        customBackground="rgba(10,10,10,0.92)"
        customShadow="0 0 32px rgba(0,0,0,0.5)"
        customBlur="12px"
      >
        <div style={{ padding: '28px', maxWidth: '360px', margin: '0 auto' }}>
          {/* Image Gallery */}
          <div className="mb-6 rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 dark:bg-gray-800 border border-white/5">
            {drawerImage && !imageError ? (
              <div className="relative w-full h-full">
                <Image
                  src={drawerImage}
                  alt={destination?.name || 'Destination'}
                  fill
                  className="object-cover"
                  sizes="360px"
                  priority={false}
                  quality={85}
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                <MapPin className="h-10 w-10 opacity-40" />
              </div>
            )}
          </div>

          {/* Info Block: Rating, Category, Tags */}
          <div className="mb-6 space-y-3">
            {/* Rating and Category Row */}
            <div className="flex flex-wrap items-center gap-2">
              {rating && (
                <div className="flex items-center gap-1.5" style={{
                  padding: '6px 14px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                }}>
                  <Star className="w-3.5 h-3.5 fill-current text-yellow-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              {destination.category && (
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                }}>
                  {destination.category}
                </div>
              )}
              {destination.crown && (
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                }}>
                  <Crown className="w-3.5 h-3.5 inline mr-1" />
                  Crown
                </div>
              )}
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                }}>
                  ⭐ {destination.michelin_stars}
                </div>
              )}
            </div>

            {/* Action Row - Pill Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {/* Save Button with Dropdown */}
              {isMounted && (
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
                  {isSaved && isMounted && (
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
                          alert('Failed to unsave. Please try again.');
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
              )}

              <button
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                onClick={handleShare}
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>

              {/* Visited Button with Dropdown */}
              {user && isMounted && (
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
                  {isVisited && isMounted && (
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

            {/* Highlight Tags */}
            {highlightTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlightTags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '24px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Text Block: Description */}
          {(destination.micro_description || destination.description) && (
            <div className="mb-6">
              <p style={{
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.85)',
              }}>
                {destination.micro_description || (destination.description ? stripHtmlTags(destination.description) : '')}
              </p>
            </div>
          )}

          {/* Divider */}
          <div style={{ 
            height: '1px', 
            backgroundColor: 'rgba(255,255,255,0.12)', 
            margin: '16px 0' 
          }} />

          {/* Action Row */}
          <div className="mb-6 flex gap-2.5" style={{ gap: '10px' }}>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 transition-all"
              style={{
                height: '42px',
                borderRadius: '22px',
                paddingLeft: '18px',
                paddingRight: '18px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.9)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 transition-all"
                style={{
                  height: '42px',
                  borderRadius: '22px',
                  paddingLeft: '18px',
                  paddingRight: '18px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <Navigation className="w-4 h-4" />
                <span>Directions</span>
              </a>
            )}
          </div>

          {/* Divider */}
          <div style={{ 
            height: '1px', 
            backgroundColor: 'rgba(255,255,255,0.12)', 
            margin: '16px 0' 
          }} />

          {/* Metadata Rows */}
          <div className="space-y-5" style={{ gap: '20px' }}>
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
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                  <div className="flex-1">
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.6)',
                      marginBottom: '4px',
                    }}>
                      Hours
                    </div>
                    {openStatus.todayHours && (
                      <div style={{
                        fontSize: '14px',
                        color: '#fff',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontWeight: 500 }}>
                          {openStatus.isOpen ? 'Open now' : 'Closed'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>
                          {openStatus.todayHours}
                        </span>
                      </div>
                    )}
                    {hours.weekday_text && (
                      <details className="cursor-pointer">
                        <summary style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.6)',
                        }}>
                          View all hours
                        </summary>
                        <div className="mt-2 space-y-1" style={{ paddingLeft: '16px' }}>
                          {hours.weekday_text.map((day: string, index: number) => {
                            const [dayName, hoursText] = day.split(': ');
                            const dayOfWeek = now.getDay();
                            const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                            const isToday = index === googleDayIndex;

                            return (
                              <div key={index} style={{
                                fontSize: '13px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: isToday ? 500 : 400,
                                color: isToday ? '#fff' : 'rgba(255,255,255,0.6)',
                              }}>
                                <span>{dayName}</span>
                                <span>{hoursText}</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity) && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                <div className="flex-1">
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}>
                    Address
                  </div>
                  {enrichedData?.formatted_address && (
                    <div style={{
                      fontSize: '14px',
                      color: '#fff',
                    }}>
                      {enrichedData.formatted_address}
                    </div>
                  )}
                  {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.6)',
                      marginTop: '4px',
                    }}>
                      {enrichedData.vicinity}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info */}
            {(enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url) && (
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                <div className="flex-1 space-y-2">
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}>
                    Contact
                  </div>
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
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.9)',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                          }}
                        >
                          {domain}
                        </a>
                      );
                    })()}
                    {(enrichedData?.international_phone_number || destination.phone_number) && (
                      <a
                        href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.9)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        <Phone className="w-3 h-3 inline mr-1" />
                        {enrichedData?.international_phone_number || destination.phone_number}
                      </a>
                    )}
                    {destination.instagram_url && (
                      <a
                        href={destination.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.9)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        <Instagram className="w-3 h-3 inline mr-1" />
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ 
            height: '1px', 
            backgroundColor: 'rgba(255,255,255,0.12)', 
            margin: '28px 0' 
          }} />

          {/* Map Section */}
          {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
            <div className="mb-6">
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '12px',
              }}>
                Location
              </div>
              <div className="w-full rounded-2xl overflow-hidden border" style={{
                height: '200px',
                borderColor: 'rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}>
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
                  isDark={true}
                />
              </div>
            </div>
          )}

          {/* Divider */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div style={{ 
              height: '1px', 
              backgroundColor: 'rgba(255,255,255,0.12)', 
              margin: '28px 0' 
            }} />
          )}

          {/* Recommendations Section */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '12px',
              }}>
                You might also like
              </div>

              {loadingRecommendations ? (
                <div className="flex gap-4 overflow-x-auto pb-2" style={{ paddingBottom: '8px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-shrink-0" style={{ width: '120px' }}>
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 animate-pulse" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ 
                  paddingBottom: '8px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}>
                  {recommendations.map(rec => (
                    <button
                      key={rec.slug}
                      onClick={() => {
                        if (rec.slug && rec.slug.trim()) {
                          onClose();
                          setTimeout(() => router.push(`/destination/${rec.slug}`), 100);
                        }
                      }}
                      className="group text-left flex-shrink-0 flex flex-col"
                      style={{ width: '120px' }}
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden mb-2 border" style={{
                        borderColor: 'rgba(255,255,255,0.12)',
                      }}>
                        {rec.image ? (
                          <Image
                            src={rec.image}
                            alt={rec.name}
                            fill
                            sizes="120px"
                            className="object-cover group-hover:opacity-90 transition-opacity"
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-8 w-8 opacity-20" />
                          </div>
                        )}
                        {rec.michelin_stars && rec.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-xl text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1" style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}>
                            ⭐ {rec.michelin_stars}
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1" style={{
                        color: 'rgba(255,255,255,0.88)',
                      }}>
                        {rec.name}
                      </h4>
                      <span className="text-xs" style={{
                        color: 'rgba(255,255,255,0.55)',
                      }}>
                        {capitalizeCity(rec.city)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Additional Info Sections */}
          <div className="space-y-6" style={{ marginTop: '28px', gap: '24px' }}>
            {/* Editorial Summary */}
            {enrichedData?.editorial_summary && (
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '8px',
                }}>
                  From Google
                </div>
                <p style={{
                  fontSize: '15px',
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.85)',
                }}>
                  {stripHtmlTags(enrichedData.editorial_summary)}
                </p>
              </div>
            )}

            {/* Architecture & Design */}
            {enhancedDestination && <ArchitectDesignInfo destination={enhancedDestination} />}

            {/* Review Summary */}
            {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '8px',
                }}>
                  What Reviewers Say
                </div>
                {loadingReviewSummary ? (
                  <div className="flex items-center gap-2" style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.6)',
                  }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Summarizing reviews...</span>
                  </div>
                ) : reviewSummary ? (
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <p style={{
                      fontSize: '15px',
                      lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.85)',
                    }}>
                      {reviewSummary}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Nested Destinations */}
            {(loadingNested || (nestedDestinations && nestedDestinations.length > 0)) && (
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '12px',
                }}>
                  Venues located here
                </div>
                {loadingNested ? (
                  <div className="flex items-center gap-2" style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.6)',
                  }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading venues…
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

            {/* Real-Time Status */}
            {destination.id && (
              <div>
                <RealtimeStatusBadge
                  destinationId={destination.id}
                  compact={false}
                  showWaitTime={true}
                  showAvailability={true}
                />
                <div className="mt-3">
                  <RealtimeReportForm
                    destinationId={destination.id}
                    destinationName={destination.name}
                  />
                </div>
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

      {/* Add to Trip Modal */}
      {destination && (
        <AddToTripModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showAddToTripModal}
          onClose={() => setShowAddToTripModal(false)}
          onAdd={(tripId) => {
            setIsAddedToTrip(true);
            setShowAddToTripModal(false);
            console.log(`Added ${destination.name} to trip ${tripId}`);
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
