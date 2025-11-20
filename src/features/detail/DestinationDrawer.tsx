import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  MapPin,
  Star,
  Globe,
  Phone,
  Share2,
  Navigation,
  Heart,
  Check,
  Plus,
  Loader2,
  Tag,
  Crown,
  Instagram,
  Bookmark,
  ChevronDown,
  List,
  Map,
  Clock,
  Edit,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Drawer } from '@/components/ui/drawer';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { AddToTripModal } from '@/features/trips/AddToTripModal';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { RealtimeReportForm } from '@/components/RealtimeReportForm';
import { NestedDestinations } from '@/components/NestedDestinations';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { POIDrawer } from '@/components/admin/POIDrawer';
import dynamic from 'next/next';

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600" />
    </div>
  ),
});

import {
  Destination,
  EnrichedDestinationData,
  Review,
  OpeningHours,
  NestedDestination
} from '@/types/destination';
import { capitalizeCity } from '@/utils/format';

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, isSaved: boolean) => void;
  onVisitToggle?: (slug: string, isVisited: boolean) => void;
}

// Helper to format highlight tags
const formatHighlightTag = (tag: string) => {
  return tag
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to strip HTML tags
const stripHtmlTags = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

// Helper to extract domain from URL
const extractDomain = (url: string) => {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return domain.replace('www.', '');
  } catch {
    return url;
  }
};

// Helper to get open status
const getOpenStatus = (
  openingHours: OpeningHours | undefined,
  city: string,
  timezoneId?: string,
  utcOffset?: number
): { isOpen: boolean; closingSoon: boolean; nextChange: Date | null; todayHours: string | null } => {
  if (!openingHours?.periods) {
    return { isOpen: false, closingSoon: false, nextChange: null, todayHours: null };
  }

  // Get current time in the destination's timezone
  let now: Date;
  if (timezoneId) {
    now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
  } else if (CITY_TIMEZONES[city]) {
    now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
  } else if (utcOffset !== undefined && utcOffset !== null) {
    // Use UTC offset if available
    const utcNow = new Date();
    const localTime = utcNow.getTime() + (utcNow.getTimezoneOffset() * 60000) + (utcOffset * 60000);
    now = new Date(localTime);
  } else {
    // Fallback to local time (might be inaccurate)
    now = new Date();
  }

  const day = now.getDay();
  const time = now.getHours() * 100 + now.getMinutes();

  // Find today's hours for display
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[day];
  const todayHoursText = openingHours.weekday_text?.find(t => t.startsWith(todayName))?.split(': ')[1] || null;

  // Check open status
  // This is a simplified check - a robust implementation would check periods
  const isOpen = openingHours.open_now ?? false;

  return {
    isOpen,
    closingSoon: false, // TODO: Implement closing soon logic
    nextChange: null,
    todayHours: todayHoursText
  };
};

// City timezones map
const CITY_TIMEZONES: Record<string, string> = {
  'paris': 'Europe/Paris',
  'london': 'Europe/London',
  'new-york': 'America/New_York',
  'tokyo': 'Asia/Tokyo',
  'dubai': 'Asia/Dubai',
  'singapore': 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  'milan': 'Europe/Rome',
  'barcelona': 'Europe/Madrid',
  'rome': 'Europe/Rome',
  'amsterdam': 'Europe/Amsterdam',
  'berlin': 'Europe/Berlin',
  'copenhagen': 'Europe/Copenhagen',
  'stockholm': 'Europe/Stockholm',
  'oslo': 'Europe/Oslo',
  'helsinki': 'Europe/Helsinki',
  'vienna': 'Europe/Vienna',
  'zurich': 'Europe/Zurich',
  'geneva': 'Europe/Zurich',
  'los-angeles': 'America/Los_Angeles',
  'san-francisco': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'miami': 'America/New_York',
  'toronto': 'America/Toronto',
  'vancouver': 'America/Vancouver',
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'seoul': 'Asia/Seoul',
  'bangkok': 'Asia/Bangkok',
  'istanbul': 'Europe/Istanbul',
  'mexico-city': 'America/Mexico_City',
  'sao-paulo': 'America/Sao_Paulo',
  'buenos-aires': 'America/Argentina/Buenos_Aires',
  'cape-town': 'Africa/Johannesburg',
  'marrakech': 'Africa/Casablanca',
  'tel-aviv': 'Asia/Jerusalem',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'shanghai': 'Asia/Shanghai',
  'beijing': 'Asia/Shanghai',
  'kyoto': 'Asia/Tokyo',
  'osaka': 'Asia/Tokyo',
  'lisbon': 'Europe/Lisbon',
  'madrid': 'Europe/Madrid',
  'athens': 'Europe/Athens',
  'prague': 'Europe/Prague',
  'budapest': 'Europe/Budapest',
  'warsaw': 'Europe/Warsaw',
  'dublin': 'Europe/Dublin',
  'edinburgh': 'Europe/London',
  'brussels': 'Europe/Brussels',
  'munich': 'Europe/Berlin',
  'hamburg': 'Europe/Berlin',
  'frankfurt': 'Europe/Berlin',
};

// Component for the "Located in" badge
function LocatedInBadge({ parent, onClick }: { parent: NestedDestination, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
    >
      <MapPin className="h-3 w-3" />
      Inside {parent.name}
    </button>
  );
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
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedDestinationData | null>(null);
  const [loadingEnriched, setLoadingEnriched] = useState(false);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);
  const [nestedDestinations, setNestedDestinations] = useState<NestedDestination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [parentDestination, setParentDestination] = useState<NestedDestination | null>(null);
  const [enhancedDestination, setEnhancedDestination] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (data?.role === 'admin') {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isOpen && destination) {
      // Check if saved
      if (user) {
        const checkSaved = async () => {
          const supabaseClient = createClient();
          if (!supabaseClient) return;
          const { data } = await supabaseClient
            .from('saved_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .single();
          setIsSaved(!!data);
        };
        checkSaved();

        // Check if visited
        const checkVisited = async () => {
          const supabaseClient = createClient();
          if (!supabaseClient) return;
          const { data } = await supabaseClient
            .from('visited_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .single();
          setIsVisited(!!data);
        };
        checkVisited();

        // Check if added to trip
        // This is a bit more complex as we need to check all trips
        // For now, we'll just check if it's in any active trip
        const checkTrip = async () => {
          const supabaseClient = createClient();
          if (!supabaseClient) return;
          // This query is simplified - in a real app we'd need a better way to check
          const { data } = await supabaseClient
            .from('trip_destinations')
            .select('trip_id')
            .eq('destination_slug', destination.slug)
            .limit(1);
          setIsAddedToTrip(!!data && data.length > 0);
        };
        checkTrip();
      } else {
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false);
      }

      // Load enriched data
      const loadEnrichedData = async () => {
        setLoadingEnriched(true);
        try {
          // Fetch enriched data from our API
          const response = await fetch(`/api/destination/${destination.slug}/enrich`);
          if (response.ok) {
            const data = await response.json();
            setEnrichedData(data);

            // Also set enhanced destination for ArchitectDesignInfo
            if (data.architectural_style || data.designer || data.year_built || data.materials) {
              setEnhancedDestination({
                ...destination,
                architectural_style: data.architectural_style,
                designer: data.designer,
                year_built: data.year_built,
                materials: data.materials,
                significance: data.significance,
                sustainability_rating: data.sustainability_rating
              });
            }

            // Generate review summary if we have reviews
            if (data.reviews && data.reviews.length > 0) {
              generateReviewSummary(data.reviews);
            }
          }
        } catch (error) {
          console.error('Error loading enriched data:', error);
        } finally {
          setLoadingEnriched(false);
        }
      };
      loadEnrichedData();

      // Load nested destinations (if this is a parent like a hotel or mall)
      const loadNestedDestinations = async () => {
        setLoadingNested(true);
        try {
          const response = await fetch(`/api/destinations/nested?parent_slug=${destination.slug}`);
          if (response.ok) {
            const data = await response.json();
            setNestedDestinations(data.children || []);
            setParentDestination(data.parent || null);
          }
        } catch (error) {
          console.error('Error loading nested destinations:', error);
        } finally {
          setLoadingNested(false);
        }
      };
      loadNestedDestinations();
    }
  }, [destination, isOpen, user]);

  const generateReviewSummary = async (reviews: Review[]) => {
    setLoadingReviewSummary(true);
    try {
      // In a real implementation, this would call an AI endpoint
      // For now, we'll simulate it or use a simple heuristic
      // If we have the summary in the DB, use it (it might be in enrichedData)
      if (enrichedData?.ai_summary) {
        setReviewSummary(enrichedData.ai_summary);
        setLoadingReviewSummary(false);
        return;
      }

      // Otherwise call API
      const response = await fetch('/api/ai/summarize-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviews.slice(0, 10), destinationName: destination?.name })
      });

      if (response.ok) {
        const data = await response.json();
        setReviewSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating review summary:', error);
    } finally {
      setLoadingReviewSummary(false);
    }
  };

  const handleShare = async () => {
    if (!destination) return;
    const url = `${window.location.origin}/destination/${destination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: destination.name,
          text: `Check out ${destination.name} on Urban Manual`,
          url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVisitToggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (isVisited) {
      // If already visited, show modal to edit details or remove
      setShowVisitedDropdown(true);
      return;
    }

    // Optimistic update
    setIsVisited(true);
    if (onVisitToggle && destination) onVisitToggle(destination.slug, true);

    try {
      const supabaseClient = createClient();
      if (supabaseClient && destination) {
        // Check if already exists first to avoid duplicate key errors
        const { data: existingVisit } = await supabaseClient
          .from('visited_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .maybeSingle();

        let saved = false;
        let savedData = null;

        if (existingVisit) {
          // Already exists, just update the timestamp
          console.log('Visit already exists, updating timestamp...');
          const { data, error } = await supabaseClient
            .from('visited_places')
            .update({ visited_at: new Date().toISOString() })
            .eq('id', existingVisit.id)
            .select()
            .single();

          if (!error && data) {
            saved = true;
            savedData = data;
          } else {
            throw error;
          }
        } else {
          // Insert new visit
          const visitedAt = new Date().toISOString();

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

  // Get rating for display
  const rating = enrichedData?.rating || destination.rating;
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
    <div className="flex items-center justify-end w-full px-2">
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Close drawer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="520px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        keepStateOnClose={true}
        headerContent={headerContent}
      >
        <div className="px-8 pb-12">
          {/* Image - Square Aspect Ratio */}
          {destination.image && (
            <div className="aspect-square w-full relative mb-10 bg-gray-100 dark:bg-gray-900 overflow-hidden rounded-lg">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                sizes="(max-width: 640px) 100vw, 520px"
                className="object-cover"
                quality={90}
                priority
              />
            </div>
          )}

          {/* Title & Meta */}
          <div className="mb-10">
            <h1 className="text-3xl font-light tracking-tight text-gray-900 dark:text-white mb-3">
              {destination.name}
            </h1>

            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium flex-wrap">
              {destination.city && (
                <>
                  <span>{capitalizeCity(destination.city)}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                </>
              )}
              {destination.category && (
                <span>{destination.category}</span>
              )}

              {destination.michelin_stars && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <div className="flex items-center gap-1 text-red-500">
                    <div className="flex">
                      {[...Array(destination.michelin_stars)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs uppercase tracking-wider">Michelin</span>
                  </div>
                </>
              )}

              {destination.crown && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <div className="flex items-center gap-1 text-amber-500">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs uppercase tracking-wider">Gem</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons - Minimal */}
          <div className="flex items-center gap-6 mb-12 border-b border-gray-100 dark:border-gray-900 pb-12 overflow-x-auto no-scrollbar">
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
              className={`flex items-center gap-2 px-0 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isSaved
                  ? 'text-red-500'
                  : 'text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </button>

            <button
              onClick={handleVisitToggle}
              className={`flex items-center gap-2 px-0 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isVisited
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            >
              <Check className="w-4 h-4" />
              {isVisited ? 'Visited' : 'Mark Visited'}
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
              className={`flex items-center gap-2 px-0 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isAddedToTrip
                  ? 'text-green-600 dark:text-green-500 cursor-default'
                  : 'text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              disabled={isAddedToTrip}
            >
              {isAddedToTrip ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAddedToTrip ? 'Added to Trip' : 'Add to Trip'}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-0 py-2 text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied' : 'Share'}
            </button>

            {destination.website && (
              <a
                href={destination.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-0 py-2 text-sm font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-auto whitespace-nowrap"
              >
                <span>Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Description */}
          {(destination.description || destination.content || destination.micro_description) && (
            <div className="mb-12 prose prose-gray dark:prose-invert max-w-none">
              <div className="text-base leading-relaxed text-gray-600 dark:text-gray-300 font-light">
                {destination.content || destination.description || destination.micro_description}
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 mb-12">
            {/* Address */}
            {enrichedData?.formatted_address && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                  Address
                </h3>
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {enrichedData.formatted_address}
                </p>
                <a
                  href={directionsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    destination.name + ' ' + destination.city
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-0.5 hover:border-gray-900 dark:hover:border-white transition-colors"
                >
                  Get Directions
                </a>
              </div>
            )}

            {/* Hours */}
            {enrichedData?.opening_hours && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                  Hours
                </h3>
                <div className="space-y-1.5">
                  {enrichedData.opening_hours.weekday_text?.map((text: string, i: number) => {
                    const [day, hours] = text.split(': ');
                    const isToday = new Date().getDay() === (i + 1) % 7;

                    return (
                      <div key={i} className={`flex justify-between text-sm ${isToday ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        <span className="w-24">{day}</span>
                        <span>{hours}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          {destination.latitude && destination.longitude && (
            <div className="mb-12">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                Location
              </h3>
              <div className="h-64 w-full bg-gray-100 dark:bg-gray-900 grayscale hover:grayscale-0 transition-all duration-500 rounded-lg overflow-hidden">
                <MapView
                  destinations={[destination]}
                  center={{ lat: destination.latitude, lng: destination.longitude }}
                  zoom={15}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
                You Might Also Like
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {recommendations.map((rec) => (
                  <Link
                    key={rec.slug}
                    href={`/destination/${rec.slug}`}
                    className="group block"
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-900 mb-3 overflow-hidden rounded-lg">
                      {rec.image && (
                        <Image
                          src={rec.image}
                          alt={rec.name}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      {rec.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {capitalizeCity(rec.city)} • {rec.category}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Admin Edit Button */}
          {isAdmin && destination && (
            <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setIsEditDrawerOpen(true)}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
              >
                <Edit className="h-4 w-4" />
                Edit destination
              </button>
            </div>
          )}
        </div>
      </Drawer>

      {/* Save Destination Modal */}
      {destination && (
        <SaveDestinationModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={(listId) => {
            setIsSaved(true);
            setShowSaveModal(false);
            if (onSaveToggle) onSaveToggle(destination.slug, true);

            // Also save to saved_places for simple save functionality
            try {
              const supabaseClient = createClient();
              if (supabaseClient) {
                supabaseClient
                  .from('saved_places')
                  .upsert({
                    user_id: user.id,
                    destination_slug: destination.slug,
                  })
                  .then(({ error }) => {
                    if (!error) {
                      setIsSaved(true);
                      if (onSaveToggle) onSaveToggle(destination.slug, true);
                    } else {
                      console.error('Error saving to saved_places:', error);
                    }
                  });
              }
            } catch (error) {
              console.error('Error saving to saved_places:', error);
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
