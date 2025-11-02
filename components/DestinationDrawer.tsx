'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, Tag, Heart, Check, Share2, Navigation, Sparkles, Clock } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import VisitModal from './VisitModal';
import Image from 'next/image';

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
  if (!openingHours?.weekday_text) return { isOpen: false };

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
    const dayName = todayText?.split(':')[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText || hoursText.toLowerCase().includes('closed')) {
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    }

    if (hoursText.toLowerCase().includes('24 hours')) {
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
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => { document.documentElement.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    async function loadData() {
      if (!destination) {
        setEnrichedData(null);
        setIsSaved(false);
        setIsVisited(false);
        return;
      }

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
            business_status,
            editorial_summary,
            google_name,
            place_types_json,
            utc_offset,
            vicinity,
            reviews_json,
            timezone_id,
            latitude,
            longitude,
            address_components_json
          `)
          .eq('slug', destination.slug)
          .single();
        
        if (error) {
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            const { data: basicData } = await supabase
              .from('destinations')
              .select('rating, price_level, website, opening_hours_json')
              .eq('slug', destination.slug)
              .single();
            if (basicData) setEnrichedData(basicData);
          }
          return;
        }
        
        if (data) {
          const enriched: any = { ...data };
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours = typeof data.opening_hours_json === 'string' 
                ? JSON.parse(data.opening_hours_json) 
                : data.opening_hours_json;
            } catch (e) {}
          }
          if (data.place_types_json) {
            try {
              enriched.place_types = typeof data.place_types_json === 'string'
                ? JSON.parse(data.place_types_json)
                : data.place_types_json;
            } catch (e) {}
          }
          if (data.reviews_json) {
            try {
              enriched.reviews = typeof data.reviews_json === 'string'
                ? JSON.parse(data.reviews_json)
                : data.reviews_json;
            } catch (e) {}
          }
          setEnrichedData(enriched);
        }
      } catch (error) {
        console.log('Error loading enriched data:', error);
      }

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

    loadData();
  }, [destination, user]);

  useEffect(() => {
    async function loadRecommendations() {
      if (!destination || !isOpen) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);
      try {
        const response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
        if (!response.ok && response.status === 404) {
          setRecommendations([]);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
      } catch (error) {
        console.log('Recommendations not available:', error);
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    loadRecommendations();
  }, [destination, isOpen]);

  const handleSave = async () => {
    if (!user || !destination) return;
    const newSaved = !isSaved;
    setIsSaved(newSaved);

    if (newSaved) {
      await supabase.from('saved_places').insert({ user_id: user.id, destination_slug: destination.slug });
    } else {
      await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
    }

    onSaveToggle?.(destination.slug, newSaved);
  };

  const handleVisit = async (rating?: number | null, notes?: string) => {
    if (!user || !destination) return;
    const newVisited = !isVisited;
    setIsVisited(newVisited);

    if (newVisited) {
      await supabase.from('visited_places').insert({
        user_id: user.id,
        destination_slug: destination.slug,
        rating: rating || null,
        notes: notes || null,
      });
    } else {
      await supabase.from('visited_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
    }

    onVisitToggle?.(destination.slug, newVisited);
    setShowVisitModal(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/destination/${destination?.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: destination?.name, url });
      } catch (error) {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!destination) return null;

  const openingHours = enrichedData?.opening_hours;
  const openStatus = openingHours ? getOpenStatus(openingHours, destination.city, enrichedData?.timezone_id, enrichedData?.utc_offset) : null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Destination</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {destination.image && (
            <div className="aspect-[16/10] rounded-lg overflow-hidden mb-6 bg-gray-100 dark:bg-gray-800 relative">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover"
                quality={80}
                loading="lazy"
              />
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <h1 className="text-3xl font-bold flex-1">{destination.name}</h1>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{capitalizeCity(destination.city)}</span>
                {destination.country && <span className="text-gray-400">• {destination.country}</span>}
              </div>
              {destination.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="capitalize">{destination.category}</span>
                </div>
              )}
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  <span>{destination.michelin_stars} Michelin Star{destination.michelin_stars !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {(destination.tags && destination.tags.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {destination.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full border border-purple-200 dark:border-purple-800"
                  >
                    ✨ {tag}
                  </span>
                ))}
              </div>
            )}

            {((enrichedData?.rating || destination.rating) || (enrichedData?.price_level || destination.price_level)) && (
              <div className="flex items-center gap-4 text-sm mb-4">
                {(enrichedData?.rating || destination.rating) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-semibold">{(enrichedData?.rating || destination.rating).toFixed(1)}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {enrichedData?.user_ratings_total ? ` (${enrichedData.user_ratings_total.toLocaleString()} reviews)` : ''}
                    </span>
                  </div>
                )}
                {(enrichedData?.price_level || destination.price_level) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {'$'.repeat(enrichedData?.price_level || destination.price_level)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              {user && (
                <>
                  <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isSaved
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    <span className="text-sm">{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => setShowVisitModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isVisited
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Check className={`h-4 w-4 ${isVisited ? 'fill-current' : ''}`} />
                    <span className="text-sm">{isVisited ? 'Visited' : 'Mark Visited'}</span>
                  </button>
                </>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-sm">{copied ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>

          {enrichedData?.editorial_summary && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-2 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {destination.content && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-2 text-gray-500 dark:text-gray-400">About</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(destination.content)}
              </p>
            </div>
          )}

          {openStatus && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-2 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Opening Hours
              </h3>
              <div className={`p-3 rounded-lg ${openStatus.isOpen ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}>
                <div className="text-sm font-medium">{openStatus.currentDay || 'Today'}</div>
                <div className={`text-sm ${openStatus.isOpen ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {openStatus.todayHours || 'Hours not available'}
                </div>
              </div>
              {openingHours.weekday_text && (
                <div className="mt-3 space-y-1">
                  {openingHours.weekday_text.slice(0, 7).map((day: string, idx: number) => (
                    <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                      <span>{day.split(':')[0]}</span>
                      <span>{day.split(':')[1]?.trim() || 'Closed'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(enrichedData?.formatted_address || enrichedData?.vicinity) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-2 text-gray-500 dark:text-gray-400">Address</h3>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {enrichedData?.formatted_address && (
                    <div className="text-sm text-gray-900 dark:text-white">{enrichedData.formatted_address}</div>
                  )}
                  {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{enrichedData.vicinity}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(enrichedData?.place_types && Array.isArray(enrichedData.place_types) && enrichedData.place_types.length > 0) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-2 text-gray-500 dark:text-gray-400">Types</h3>
              <div className="flex flex-wrap gap-2">
                {enrichedData.place_types.slice(0, 8).map((type: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded capitalize"
                  >
                    {type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(destination.google_maps_url || enrichedData?.website || destination.website || enrichedData?.international_phone_number || destination.phone_number || destination.instagram_url) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Links</h3>
              <div className="flex flex-wrap gap-2">
                {destination.google_maps_url && (
                  <a
                    href={destination.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Google Maps</span>
                  </a>
                )}
                {(enrichedData?.website || destination.website) && (
                  <a
                    href={(enrichedData?.website || destination.website)?.startsWith('http') ? (enrichedData?.website || destination.website) : `https://${enrichedData?.website || destination.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <span>🌐</span>
                    <span>Website</span>
                  </a>
                )}
                {(enrichedData?.international_phone_number || destination.phone_number) && (
                  <a
                    href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <span>📞</span>
                    <span>{enrichedData?.international_phone_number || destination.phone_number}</span>
                  </a>
                )}
                {destination.instagram_url && (
                  <a
                    href={destination.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <span>📷</span>
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {destination.google_maps_url && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''}&q=${encodeURIComponent(destination.name + ', ' + destination.city)}&zoom=15`}
                  title={`Map showing location of ${destination.name}`}
                />
              </div>
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + destination.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors rounded-lg"
              >
                <Navigation className="h-4 w-4" />
                <span>Get Directions</span>
              </a>
            </div>
          )}


          {recommendations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">You might also like</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
                {recommendations.map(rec => (
                  <button
                    key={rec.slug}
                    onClick={() => window.location.href = `/destination/${rec.slug}`}
                    className="flex-shrink-0 w-40 group text-left"
                  >
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                      {rec.image ? (
                        <Image
                          src={rec.image}
                          alt={rec.name}
                          fill
                          sizes="160px"
                          className="object-cover group-hover:opacity-90 transition-opacity"
                          quality={75}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                      {rec.michelin_stars && rec.michelin_stars > 0 && (
                        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-0.5">
                          <span>⭐</span>
                          <span>{rec.michelin_stars}</span>
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1">{rec.name}</h4>
                    <span className="text-xs text-gray-500">{capitalizeCity(rec.city)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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