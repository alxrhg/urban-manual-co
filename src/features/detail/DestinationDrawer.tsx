'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Tag, Heart, Check, Share2, Navigation, Sparkles, ChevronDown, Plus, Loader2, Clock, ExternalLink } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import VisitModal from '@/components/VisitModal';
import { trackEvent } from '@/lib/analytics/track';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import AppleMap to avoid SSR issues
const AppleMap = dynamic(() => import('@/components/AppleMap'), { 
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

interface List {
  id: string;
  name: string;
  is_public: boolean;
}

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
    const dayName = todayText?.split(':')[0];
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
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [checkAnimating, setCheckAnimating] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);

  // List management state
  const [showListsModal, setShowListsModal] = useState(false);
  const [userLists, setUserLists] = useState<List[]>([]);
  const [listsWithDestination, setListsWithDestination] = useState<Set<string>>(new Set());
  const [loadingLists, setLoadingLists] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListPublic, setNewListPublic] = useState(true);
  const [creatingList, setCreatingList] = useState(false);

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

  // Load enriched data and saved/visited status
  useEffect(() => {
    async function loadDestinationData() {
      if (!destination) {
        setEnrichedData(null);
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

      // Fetch enriched data from database
      try {
        const { data, error } = await supabase
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
            google_place_id
          `)
          .eq('slug', destination.slug)
          .single();
        
        if (!error && data) {
          // Parse JSON fields
          const enriched: any = { ...data };
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours = typeof data.opening_hours_json === 'string' 
                ? JSON.parse(data.opening_hours_json) 
                : data.opening_hours_json;
            } catch (e) {
              console.error('Error parsing opening_hours_json:', e);
            }
          }
          // current/secondary opening hours fields removed; rely on opening_hours_json only
          if (data.place_types_json) {
            try {
              enriched.place_types = typeof data.place_types_json === 'string'
                ? JSON.parse(data.place_types_json)
                : data.place_types_json;
            } catch (e) {
              console.error('Error parsing place_types_json:', e);
            }
          }
          if (data.reviews_json) {
            try {
              enriched.reviews = typeof data.reviews_json === 'string'
                ? JSON.parse(data.reviews_json)
                : data.reviews_json;
            } catch (e) {
              console.error('Error parsing reviews_json:', e);
            }
          }
          if (data.address_components_json) {
            try {
              enriched.address_components = typeof data.address_components_json === 'string'
                ? JSON.parse(data.address_components_json)
                : data.address_components_json;
            } catch (e) {
              console.error('Error parsing address_components_json:', e);
            }
          }
          setEnrichedData(enriched);
          console.log('Enriched data loaded:', enriched);
        } else if (error) {
          console.error('Error fetching enriched data:', error);
        }
      } catch (error) {
        console.error('Error loading enriched data:', error);
      }

      // Load saved and visited status
      if (!user) {
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

      const { data: savedData } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .single();

      setIsSaved(!!savedData);

      const { data: visitedData } = await supabase
        .from('visited_places')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .single();

      setIsVisited(!!visitedData);
    }

    loadDestinationData();
  }, [user, destination]);

  const handleSave = async () => {
    if (!user || !destination) return;

    setLoading(true);
    const previousState = isSaved;
    const newState = !isSaved;

    // Trigger animation
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 600);

    // Optimistic update
    setIsSaved(newState);
    onSaveToggle?.(destination.slug, newState);

    try {
      if (previousState) {
        await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);
      } else {
        await supabase
          .from('saved_places')
          .insert({
            user_id: user.id,
            destination_slug: destination.slug,
          });
        
        // Track save event
        trackEvent({
          event_type: 'save',
          destination_id: destination.id,
          destination_slug: destination.slug,
          metadata: {
            category: destination.category,
            city: destination.city,
            source: 'destination_drawer',
          },
        });
      }
    } catch (error) {
      // Revert on error
      setIsSaved(previousState);
      onSaveToggle?.(destination.slug, previousState);
      console.error('Error toggling save:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showVisitModal, setShowVisitModal] = useState(false);

  const handleVisit = async (rating: number | null = null, notes: string = '') => {
    if (!user || !destination) return;

    setLoading(true);
    const previousState = isVisited;
    const newState = !isVisited;

    // Trigger animation
    setCheckAnimating(true);
    setTimeout(() => setCheckAnimating(false), 600);

    // Optimistic update
    setIsVisited(newState);
    onVisitToggle?.(destination.slug, newState);

    try {
      if (previousState) {
        // Remove visit
        await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);
      } else {
        // Add visit with optional rating and notes
        await supabase
          .from('visited_places')
          .insert({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString(),
            rating: rating || null,
            notes: notes || null,
          });
        
        // Track visit event (similar to save, but for visits)
        trackEvent({
          event_type: 'save', // Visited is also a form of engagement
          destination_id: destination.id,
          destination_slug: destination.slug,
          metadata: {
            category: destination.category,
            city: destination.city,
            source: 'destination_drawer',
            action: 'visited',
            rating: rating || null,
          },
        });
      }
    } catch (error) {
      // Revert on error
      setIsVisited(previousState);
      onVisitToggle?.(destination.slug, previousState);
      console.error('Error toggling visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitClick = () => {
    if (isVisited) {
      // If already visited, toggle off immediately
      handleVisit();
    } else {
      // If not visited, show modal to add rating/notes
      setShowVisitModal(true);
    }
  };

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

  // Fetch user lists and check which ones contain this destination
  const fetchUserLists = async () => {
    if (!user || !destination) return;

    setLoadingLists(true);
    try {
      // Fetch user's lists
      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .select('id, name, is_public')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (listsError) throw listsError;
      setUserLists(lists || []);

      // Fetch which lists contain this destination
      const { data: listItems, error: itemsError } = await supabase
        .from('list_items')
        .select('list_id')
        .eq('destination_slug', destination.slug);

      if (itemsError) throw itemsError;
      const listIds = new Set((listItems || []).map(item => item.list_id));
      setListsWithDestination(listIds);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  // Toggle destination in a list
  const toggleDestinationInList = async (listId: string) => {
    if (!user || !destination) return;

    const isInList = listsWithDestination.has(listId);
    const newListsWithDestination = new Set(listsWithDestination);

    if (isInList) {
      // Remove from list
      newListsWithDestination.delete(listId);
      setListsWithDestination(newListsWithDestination);

      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('destination_slug', destination.slug);

      if (error) {
        // Revert on error
        setListsWithDestination(new Set([...newListsWithDestination, listId]));
        console.error('Error removing from list:', error);
      }
    } else {
      // Add to list
      newListsWithDestination.add(listId);
      setListsWithDestination(newListsWithDestination);

      const { error } = await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          destination_slug: destination.slug,
        });

      if (error) {
        // Revert on error
        newListsWithDestination.delete(listId);
        setListsWithDestination(newListsWithDestination);
        console.error('Error adding to list:', error);
      }
    }
  };

  // Create a new list and optionally add current destination
  const createNewList = async () => {
    if (!user || !newListName.trim()) return;

    setCreatingList(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .insert([{
          user_id: user.id,
          name: newListName.trim(),
          description: newListDescription.trim() || null,
          is_public: newListPublic,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add the new list to the state
      setUserLists([data, ...userLists]);

      // Add current destination to the new list
      if (destination) {
        await supabase.from('list_items').insert({
          list_id: data.id,
          destination_slug: destination.slug,
        });
        setListsWithDestination(new Set([...listsWithDestination, data.id]));
      }

      // Reset form and close create modal
      setNewListName('');
      setNewListDescription('');
      setNewListPublic(true);
      setShowCreateListModal(false);
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  // Open lists modal and fetch lists
  const openListsModal = () => {
    setShowListsModal(true);
    fetchUserLists();
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

        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(
            data.recommendations
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

  if (!destination) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Floating Window */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 w-[95vw] sm:w-[600px] max-h-[90vh] bg-white dark:bg-gray-950 z-50 rounded-2xl shadow-2xl transform transition-all duration-300 ease-out ${
          isOpen ? '-translate-y-1/2 opacity-100 scale-100' : '-translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        } overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-b from-white to-white/95 dark:from-gray-950 dark:to-gray-950/95 border-b border-gray-200 dark:border-gray-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Destination Details</h2>
          </div>
          <div className="flex items-center gap-1">
            {destination?.slug && (
              <a
                href={`/destination/${destination.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Open in new tab"
                aria-label="Open destination in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close window"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Image */}
          {destination.image && (
            <div className="relative aspect-[21/9] rounded-xl overflow-hidden mb-5 bg-gray-100 dark:bg-gray-800 shadow-lg">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 95vw, 600px"
                priority={false}
                quality={90}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          {/* Title */}
          <div className="mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">
              {destination.name}
            </h1>

            {/* Meta Info Cards */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{capitalizeCity(destination.city)}</span>
              </div>

              {destination.category && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <Tag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 capitalize">{destination.category}</span>
                </div>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{destination.michelin_stars} Michelin Star{destination.michelin_stars !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* AI-Generated Tags */}
            {destination.tags && destination.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {destination.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full border border-purple-200 dark:border-purple-800"
                  >
                    ✨ {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rating & Price Level */}
            {((enrichedData?.rating || enrichedData?.price_level) || (destination.rating || destination.price_level)) && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(enrichedData?.rating || destination.rating) && (
                  <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-bold text-lg">{(enrichedData?.rating || destination.rating).toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {enrichedData?.user_ratings_total ? `${enrichedData.user_ratings_total.toLocaleString()} reviews` : 'Rating'}
                    </span>
                  </div>
                )}
                {(enrichedData?.price_level || destination.price_level) && (
                  <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                      {'$'.repeat(enrichedData?.price_level || destination.price_level)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Price Level</span>
                  </div>
                )}
              </div>
            )}

            {/* Editorial Summary */}
            {enrichedData?.editorial_summary && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">From Google</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {stripHtmlTags(enrichedData.editorial_summary)}
                </p>
              </div>
            )}

            {/* Formatted Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity) && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Address</div>
                    {enrichedData?.formatted_address && (
                      <div className="text-sm text-gray-700 dark:text-gray-300">{enrichedData.formatted_address}</div>
                    )}
                    {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{enrichedData.vicinity}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Place Types */}
            {enrichedData?.place_types && Array.isArray(enrichedData.place_types) && enrichedData.place_types.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">Types</span>
                <div className="flex flex-wrap gap-2">
                  {enrichedData.place_types.slice(0, 5).map((type: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                    >
                      {type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Opening Hours */}
            {(() => {
              const hours = enrichedData?.current_opening_hours || enrichedData?.opening_hours || destination.opening_hours;
              // Only render if we have opening hours with weekday_text
              if (!hours || !hours.weekday_text || !Array.isArray(hours.weekday_text) || hours.weekday_text.length === 0) {
                // Debug: log why opening hours aren't showing
                if (hours && !hours.weekday_text) {
                  console.log('Opening hours data exists but missing weekday_text:', hours);
                }
                return null;
              }
              
              const openStatus = getOpenStatus(
                hours, 
                destination.city, 
                enrichedData?.timezone_id, 
                enrichedData?.utc_offset
              );
              
              // Calculate timezone for "today" highlighting using same logic as getOpenStatus
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
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${openStatus.isOpen ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <Clock className={`h-4 w-4 ${openStatus.isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {openStatus.todayHours && (
                          <span className={`text-sm font-bold ${openStatus.isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {openStatus.isOpen ? 'Open now' : 'Closed'}
                          </span>
                        )}
                        {openStatus.todayHours && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            · {openStatus.todayHours}
                          </span>
                        )}
                      </div>
                      {enrichedData?.timezone_id && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                          {enrichedData.timezone_id.replace('_', ' ')}
                        </div>
                      )}
                      {hours.weekday_text && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-medium">
                            View all hours
                          </summary>
                          <div className="mt-3 space-y-1.5">
                            {hours.weekday_text.map((day: string, index: number) => {
                              const [dayName, hoursText] = day.split(': ');
                              const dayOfWeek = now.getDay();
                              const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                              const isToday = index === googleDayIndex;

                              return (
                                <div key={index} className={`flex justify-between text-xs ${isToday ? 'font-bold text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
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
                </div>
              );
            })()}
          </div>

          {/* Action Buttons */}
          {user && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={handleSave}
                disabled={loading}
                className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  isSaved
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                } ${heartAnimating ? 'scale-95' : 'scale-100'}`}
              >
                <Heart className={`h-4 w-4 transition-all duration-300 ${isSaved ? 'fill-current scale-110' : 'scale-100'} ${heartAnimating ? 'animate-[heartBeat_0.6s_ease-in-out]' : ''}`} />
                <span className={`text-sm ${heartAnimating && isSaved ? 'animate-[fadeIn_0.3s_ease-in]' : ''}`}>
                  {isSaved ? 'Saved' : 'Save'}
                </span>
                {heartAnimating && isSaved && (
                  <style jsx>{`
                    @keyframes heartBeat {
                      0%, 100% { transform: scale(1); }
                      15% { transform: scale(1.3); }
                      30% { transform: scale(1.1); }
                      45% { transform: scale(1.25); }
                      60% { transform: scale(1.05); }
                    }
                    @keyframes fadeIn {
                      from { opacity: 0; }
                      to { opacity: 1; }
                    }
                  `}</style>
                )}
              </button>

              <button
                onClick={handleVisitClick}
                disabled={loading}
                className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  isVisited
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                } ${checkAnimating ? 'scale-95' : 'scale-100'}`}
              >
                <Check className={`h-4 w-4 transition-all duration-300 ${isVisited ? 'scale-110' : 'scale-100'} ${checkAnimating ? 'animate-[checkPop_0.6s_ease-in-out]' : ''}`} />
                <span className={`text-sm ${checkAnimating && isVisited ? 'animate-[fadeIn_0.3s_ease-in]' : ''}`}>
                  {isVisited ? 'Visited' : 'Visited'}
                </span>
                {checkAnimating && isVisited && (
                  <style jsx>{`
                    @keyframes checkPop {
                      0%, 100% { transform: scale(1) rotate(0deg); }
                      25% { transform: scale(1.3) rotate(-10deg); }
                      50% { transform: scale(1.1) rotate(5deg); }
                      75% { transform: scale(1.2) rotate(-5deg); }
                    }
                    @keyframes fadeIn {
                      from { opacity: 0; }
                      to { opacity: 1; }
                    }
                  `}</style>
                )}
              </button>

              <button
                onClick={openListsModal}
                disabled={loading}
                className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add to List</span>
              </button>
            </div>
          )}

          {/* Sign in prompt */}
          {!user && (
            <div className="mb-5 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <a href="/auth/login" className="font-bold text-purple-600 dark:text-purple-400 hover:opacity-70 transition-opacity">Sign in</a> to save destinations and track your visits
              </span>
            </div>
          )}

          {/* Description */}
          {destination.content && (
            <div className="mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  About
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {stripHtmlTags(destination.content)}
                </div>
              </div>
            </div>
          )}

          {/* Contact & Links Section */}
          {(enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url || destination.google_maps_url) && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Quick Actions</h3>
              <style jsx>{`
                .pill-button {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 8px 14px;
                  background: rgba(0, 0, 0, 0.7);
                  backdrop-filter: blur(10px);
                  color: white;
                  font-size: 13px;
                  font-weight: 500;
                  border-radius: 12px;
                  border: 1px solid rgba(255, 255, 255, 0.15);
                  cursor: pointer;
                  transition: all 0.2s ease;
                  text-decoration: none;
                }
                .pill-button:hover {
                  background: rgba(0, 0, 0, 0.85);
                  transform: translateY(-1px);
                }
                .pill-separator {
                  color: rgba(255, 255, 255, 0.5);
                }
              `}</style>
              <div className="flex flex-wrap gap-2">
                {destination.google_maps_url && (
                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ', ' + destination.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-button"
                  >
                    <span>📍</span>
                    <span className="pill-separator">•</span>
                    <span>Apple Maps</span>
                  </a>
                )}
                {(enrichedData?.website || destination.website) && (
                  <a
                    href={(enrichedData?.website || destination.website).startsWith('http') ? (enrichedData?.website || destination.website) : `https://${enrichedData?.website || destination.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-button"
                  >
                    <span>🌐</span>
                    <span className="pill-separator">•</span>
                    <span>Website</span>
                  </a>
                )}
                {(enrichedData?.international_phone_number || destination.phone_number) && (
                  <a
                    href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                    className="pill-button"
                  >
                    <span>📞</span>
                    <span className="pill-separator">•</span>
                    <span>{enrichedData?.international_phone_number || destination.phone_number}</span>
                  </a>
                )}
                {destination.instagram_url && (
                  <a
                    href={destination.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-button"
                  >
                    <span>📷</span>
                    <span className="pill-separator">•</span>
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reviews */}
          {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Top Reviews</h3>
              <div className="space-y-2">
                {enrichedData.reviews.slice(0, 2).map((review: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm block truncate">{review.author_name}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-yellow-500 text-sm">⭐</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{review.rating}</span>
                          {review.relative_time_description && (
                            <span className="text-xs text-gray-500 dark:text-gray-500">· {review.relative_time_description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {review.text && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

          {/* Map Section (Apple Maps) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Location</h3>
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + destination.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <Navigation className="h-3 w-3" />
                <span>Directions</span>
              </a>
            </div>
            <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shadow-md">
              <AppleMap
                query={`${destination.name}, ${destination.city}`}
                height="192px"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

          {/* AI Recommendations */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  You might also like
                </h3>
              </div>

              {loadingRecommendations ? (
                <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-shrink-0 w-32">
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl mb-2 animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide">
                  {recommendations.map(rec => (
                    <button
                      key={rec.slug}
                      onClick={() => {
                        // Navigate to recommended destination
                        window.location.href = `/destination/${rec.slug}`;
                      }}
                      className="flex-shrink-0 w-32 group text-left"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2 shadow-sm border border-gray-200 dark:border-gray-700">
                        {rec.image ? (
                          <img
                            src={rec.image}
                            alt={rec.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Silently handle broken images
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent && !parent.querySelector('.fallback-placeholder')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-placeholder w-full h-full flex items-center justify-center';
                                fallback.innerHTML = '<svg class="h-6 w-6 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-6 w-6 opacity-20" />
                          </div>
                        )}
                        {rec.michelin_stars && rec.michelin_stars > 0 && (
                          <div className="absolute bottom-1.5 left-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-0.5 border border-red-200 dark:border-red-800">
                            <img
                              src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                              alt="Michelin star"
                              className="h-2.5 w-2.5"
                            />
                            <span className="text-red-700 dark:text-red-300">{rec.michelin_stars}</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-[11px] leading-tight line-clamp-2 mb-0.5">
                        {rec.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {capitalizeCity(rec.city)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

          {/* Share Button */}
          <div className="flex justify-center pb-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-100 text-white dark:text-black hover:from-black hover:to-gray-800 dark:hover:from-gray-100 dark:hover:to-white transition-all rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-sm">{copied ? 'Link Copied!' : 'Share Destination'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lists Modal */}
      {showListsModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowListsModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Add to List</h2>
              <button
                onClick={() => setShowListsModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingLists ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : userLists.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-gray-500 mb-4">You don't have any lists yet</span>
                <button
                  onClick={() => {
                    setShowListsModal(false);
                    setShowCreateListModal(true);
                  }}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
                >
                  Create Your First List
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {userLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => toggleDestinationInList(list.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="font-medium">{list.name}</span>
                      {listsWithDestination.has(list.id) && (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowListsModal(false);
                    setShowCreateListModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create New List</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create List Modal */}
      {showCreateListModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowCreateListModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Create New List</h2>
              <button
                onClick={() => setShowCreateListModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">List Name *</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="new-list-public"
                  checked={newListPublic}
                  onChange={(e) => setNewListPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="new-list-public" className="text-sm">
                  Make this list public
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateListModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  disabled={creatingList}
                >
                  Cancel
                </button>
                <button
                  onClick={createNewList}
                  disabled={!newListName.trim() || creatingList}
                  className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {creatingList ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit Modal */}
      <VisitModal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        onConfirm={(rating, notes) => handleVisit(rating, notes)}
        destinationName={destination?.name || ''}
        isCurrentlyVisited={isVisited}
      />
    </>
  );
}
