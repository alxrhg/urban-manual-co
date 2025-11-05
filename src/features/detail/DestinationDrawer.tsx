'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Tag, Bookmark, Share2, Navigation, Sparkles, ChevronDown, Plus, Loader2, Clock, ExternalLink, Check } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);


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

      if (destination.id) {
        const { data: savedData } = await supabase
          .from('saved_destinations')
          .select('*')
          .eq('user_id', user.id)
          .eq('destination_id', destination.id)
          .single();

        setIsSaved(!!savedData);
      }

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
    if (!user || !destination) return;

    try {
      if (isVisited) {
        // Remove visit
        const { error } = await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);

        if (error) throw error;

        setIsVisited(false);
        if (onVisitToggle) onVisitToggle(destination.slug, false);
      } else {
        // Add visit with current date
        const { error } = await supabase
          .from('visited_places')
          .insert({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString(),
          });

        if (error) throw error;

        setIsVisited(true);
        if (onVisitToggle) onVisitToggle(destination.slug, true);
      }
    } catch (error) {
      console.error('Error toggling visit:', error);
      alert('Failed to update visit status. Please try again.');
    }
  };

  const handleVisitedModalUpdate = async () => {
    // Reload visited status after modal updates
    if (!user || !destination) return;

    const { data: visitedData } = await supabase
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
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slideover Card */}
      <div
        className={`fixed right-4 top-4 bottom-4 w-full sm:w-[440px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-950 z-50 shadow-2xl ring-1 ring-black/5 rounded-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
        } overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-end">
          <div className="flex items-center gap-2">
            {destination?.slug && (
              <a
                href={`/destination/${destination.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                title="Open in new tab"
                aria-label="Open destination in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Image */}
          {destination.image && (
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-8 bg-gray-100 dark:bg-gray-800">
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
          )}

          {/* Title */}
          <div className="mb-8 space-y-3">
            {/* Location - above title */}
            <div className="flex items-center gap-2">
              <a
                href={`/city/${destination.city}`}
                className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/city/${destination.city}`);
                }}
              >
                <MapPin className="h-3 w-3" />
                {destination.country ? `${capitalizeCity(destination.city)}, ${destination.country}` : capitalizeCity(destination.city)}
              </a>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-light leading-tight">
              {destination.name}
            </h1>

            {/* Meta badges and action buttons - below title */}
            <div className="flex flex-wrap gap-2 text-xs">
              {destination.category && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 capitalize">
                  {destination.category}
                </span>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  {destination.michelin_stars} Michelin
                </span>
              )}

              {destination.crown && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400">
                  Crown
                </span>
              )}

              {/* Google Rating */}
              {(enrichedData?.rating || destination.rating) && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                </span>
              )}

              {/* Directions Button */}
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + destination.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-1.5"
              >
                <Navigation className="h-3 w-3" />
                Directions
              </a>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>

            {/* AI-Generated Tags */}
            {destination.tags && destination.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {destination.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs"
                  >
                    ✨ {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rating & Price Level */}
            {((enrichedData?.rating || enrichedData?.price_level) || (destination.rating || destination.price_level)) && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                {(enrichedData?.rating || destination.rating) && (
                  <div className="flex items-center gap-1.5">
                    <span>⭐</span>
                    <span className="font-semibold">{(enrichedData?.rating || destination.rating).toFixed(1)}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {enrichedData?.user_ratings_total ? `(${enrichedData.user_ratings_total.toLocaleString()})` : ''}
                    </span>
                  </div>
                )}
                {(enrichedData?.price_level || destination.price_level) && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">
                      {'$'.repeat(enrichedData?.price_level || destination.price_level)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Editorial Summary */}
            {enrichedData?.editorial_summary && (
              <div className="mt-4">
                <h3 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">From Google</h3>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {stripHtmlTags(enrichedData.editorial_summary)}
                </span>
              </div>
            )}

            {/* Formatted Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity) && (
              <div className="mt-4">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Address</div>
                    {enrichedData?.formatted_address && (
                      <div className="text-gray-700 dark:text-gray-300">{enrichedData.formatted_address}</div>
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
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Types</span>
                <div className="flex flex-wrap gap-2">
                  {enrichedData.place_types.slice(0, 5).map((type: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs"
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
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {openStatus.todayHours && (
                      <span className="text-sm font-semibold">
                        {openStatus.isOpen ? 'Open now' : 'Closed'}
                      </span>
                    )}
                    {openStatus.todayHours && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        · {openStatus.todayHours}
                      </span>
                    )}
                    {enrichedData?.timezone_id && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                        ({enrichedData.timezone_id.replace('_', ' ')})
                      </span>
                    )}
                  </div>
                  {hours.weekday_text && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-xs">
                        View all hours
                      </summary>
                      <div className="mt-2 space-y-1">
                        {hours.weekday_text.map((day: string, index: number) => {
                          const [dayName, hoursText] = day.split(': ');
                          const dayOfWeek = now.getDay();
                          const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          const isToday = index === googleDayIndex;

                          return (
                            <div key={index} className={`flex justify-between text-xs ${isToday ? 'font-semibold text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
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
          </div>

          {/* Action Buttons */}
          {user && destination?.id && (
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setShowSaveModal(true)}
                className={`flex-1 px-4 py-3 border rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isSaved
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleVisitToggle}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (isVisited) setShowVisitedModal(true);
                }}
                className={`flex-1 px-4 py-3 border rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isVisited
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                <Check className={`h-4 w-4 ${isVisited ? 'stroke-[3]' : ''}`} />
                {isVisited ? 'Visited' : 'Mark as Visited'}
              </button>
              {isVisited && (
                <button
                  onClick={() => setShowVisitedModal(true)}
                  className="px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  title="Add visit details"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Sign in prompt */}
          {!user && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <a href="/auth/login" className="font-semibold hover:opacity-70 transition-opacity">Sign in</a> to save and track visits
              </span>
            </div>
          )}

          {/* Description */}
          {destination.description && (
            <div className="mb-8">
              <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {stripHtmlTags(destination.description)}
              </div>
            </div>
          )}

          {/* Contact & Links Section */}
          {(enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url || destination.google_maps_url) && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase mb-2 text-gray-500 dark:text-gray-400">Quick Actions</h3>
              <style jsx>{`
                .pill-button {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 6px 12px;
                  background: rgba(0, 0, 0, 0.75);
                  backdrop-filter: blur(10px);
                  color: white;
                  font-size: 13px;
                  font-weight: 500;
                  border-radius: 9999px;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  cursor: pointer;
                  transition: all 0.2s ease;
                  text-decoration: none;
                }
                .pill-button:hover {
                  background: rgba(0, 0, 0, 0.85);
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
            <div className="mb-8">
              <h3 className="text-xs font-medium mb-4 text-gray-500 dark:text-gray-400">Reviews</h3>
              <div className="space-y-4">
                {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm">{review.author_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span>⭐</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{review.rating}</span>
                          {review.relative_time_description && (
                            <span className="text-xs text-gray-500 dark:text-gray-500">· {review.relative_time_description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {review.text && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{review.text}</p>
                    )}
                    {review.relative_time_description && (
                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-1 block">{review.relative_time_description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-4" />

          {/* Map Section (Apple Maps) */}
          <div className="mb-8">
            <h3 className="text-xs font-medium mb-4 text-gray-500 dark:text-gray-400">Location</h3>
            <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
              <AppleMap
                query={`${destination.name}, ${destination.city}`}
                height="192px"
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-4" />

          {/* AI Recommendations */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2 border border-gray-200 dark:border-gray-700">
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
                          <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
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

        </div>
      </div>

      {/* Save Destination Modal */}
      {destination?.id && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={(collectionId) => {
            setIsSaved(true);
            if (onSaveToggle) onSaveToggle(destination.slug, true);
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
