'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  ChevronDown,
  ChevronUp,
  Navigation,
  ExternalLink,
  Building2,
  Instagram,
  Bookmark,
  Share2,
  Check,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { NestedDestinations } from '@/components/NestedDestinations';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';

const GoogleStaticMap = dynamic(() => import('@/components/maps/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  ),
});

// City timezone mapping
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

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractDomain(url: string): string {
  try {
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    cleanUrl = cleanUrl.split('/')[0].split('?')[0];
    return cleanUrl;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
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

function getOpenStatus(
  openingHours: any,
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): { isOpen: boolean; currentDay?: string; todayHours?: string; closingTime?: string; openingTime?: string } {
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
      let nextOpeningTime = '';
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (googleDayIndex + i) % 7;
        const nextDayText = openingHours.weekday_text[nextDayIndex];
        const nextHoursText = nextDayText?.substring(nextDayText.indexOf(':') + 1).trim();
        if (nextHoursText && !nextHoursText.toLowerCase().includes('closed')) {
          const times = nextHoursText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
          if (times && times.length > 0) {
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            nextOpeningTime = `${dayNames[nextDayIndex]} ${times[0]}`;
            break;
          }
        }
      }
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed', openingTime: nextOpeningTime };
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
          return { isOpen: true, currentDay: dayName, todayHours: hoursText, closingTime: times[1] };
        }
      }
    }

    let nextOpeningTime = '';
    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        if (currentTime < openTime) {
          nextOpeningTime = times[0];
          break;
        }
      }
    }

    return { isOpen: false, currentDay: dayName, todayHours: hoursText, openingTime: nextOpeningTime };
  } catch (error) {
    console.error('Error parsing opening hours:', error);
    return { isOpen: false };
  }
}

interface PlaceDetailContentDesktopProps {
  destination: Destination;
  enrichedData: any;
  onDestinationClick?: (slug: string) => void;
  recommendations?: Array<{
    slug: string;
    name: string;
    city: string;
    category: string;
    image: string | null;
    michelin_stars: number | null;
    crown: boolean;
  }>;
  loadingRecommendations?: boolean;
  parentDestination?: Destination | null;
  nestedDestinations?: Destination[];
  loadingNested?: boolean;
  enhancedDestination?: any;
  reviewSummary?: string | null;
  loadingReviewSummary?: boolean;
  // Action handlers
  isSaved?: boolean;
  isVisited?: boolean;
  onSaveClick?: () => void;
  onVisitClick?: () => void;
  onShareClick?: () => void;
  copied?: boolean;
  showSaveDropdown?: boolean;
  setShowSaveDropdown?: (show: boolean) => void;
  showVisitedDropdown?: boolean;
  setShowVisitedDropdown?: (show: boolean) => void;
  onSaveToList?: () => void;
  onSaveToTrip?: () => void;
  onCreateList?: () => void;
  onRemoveSave?: () => void;
  onAddVisitDetails?: () => void;
  onRemoveVisit?: () => void;
}

export function PlaceDetailContentDesktop({
  destination,
  enrichedData,
  onDestinationClick,
  recommendations = [],
  loadingRecommendations = false,
  parentDestination,
  nestedDestinations = [],
  loadingNested = false,
  enhancedDestination,
  reviewSummary,
  loadingReviewSummary = false,
  isSaved = false,
  isVisited = false,
  onSaveClick,
  onVisitClick,
  onShareClick,
  copied = false,
  showSaveDropdown = false,
  setShowSaveDropdown,
  showVisitedDropdown = false,
  setShowVisitedDropdown,
  onSaveToList,
  onSaveToTrip,
  onCreateList,
  onRemoveSave,
  onAddVisitDetails,
  onRemoveVisit,
}: PlaceDetailContentDesktopProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isHoursExpanded, setIsHoursExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Images array
  const images = destination.image ? [destination.image] : [];

  // Get open status
  const hours = enrichedData?.current_opening_hours || enrichedData?.opening_hours;
  const openStatus = hours
    ? getOpenStatus(hours, destination.city, enrichedData?.timezone_id, enrichedData?.utc_offset)
    : null;

  // Price level display
  const priceLevel = enrichedData?.price_level ?? destination.price_level;
  const priceLevelDisplay = priceLevel ? '$'.repeat(priceLevel) : null;
  const priceLevelLabel =
    priceLevel === 1 ? 'Budget' : priceLevel === 2 ? 'Moderate' : priceLevel === 3 ? 'Expensive' : priceLevel === 4 ? 'Very Expensive' : null;

  // Rating
  const rating = enrichedData?.rating ?? destination.rating;

  // Phone
  const phone = enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone;

  // Website
  const website = enrichedData?.website || destination.website;
  const websiteDisplay = website ? extractDomain(website) : null;

  // Address
  const address = enrichedData?.formatted_address || enrichedData?.vicinity;

  // Directions URL
  const directionsUrl =
    destination.latitude && destination.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`
      : `https://maps.apple.com/?q=${encodeURIComponent(`${destination.name}, ${destination.city}`)}`;

  // Description
  const description = destination.description ? stripHtmlTags(destination.description) : null;
  const isDescriptionLong = description && description.length > 200;

  // Instagram
  const instagramHandle = destination.instagram_handle ||
    (destination.instagram_url
      ? destination.instagram_url.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '')
      : null);
  const instagramUrl = destination.instagram_url ||
    (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/` : null);

  return (
    <div className="space-y-0">
      {/* Hero Image with Michelin Badge */}
      {images.length > 0 && (
        <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden -mx-6 -mt-6" style={{ width: 'calc(100% + 48px)' }}>
          <Image
            src={images[currentImageIndex]}
            alt={destination.name}
            fill
            className="object-cover"
            sizes="420px"
            priority
          />

          {/* Michelin Badge */}
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-900 rounded-lg shadow-md">
              <img
                src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                alt="Michelin"
                className="h-4 w-4"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== '/michelin-star.svg') {
                    target.src = '/michelin-star.svg';
                  }
                }}
              />
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {destination.michelin_stars}
              </span>
            </div>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs rounded-full">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* Place Info */}
      <section className="pt-5 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {destination.name}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {destination.category && <span className="capitalize">{destination.category}</span>}
          {destination.category && destination.city && ' · '}
          <Link
            href={`/city/${destination.city}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {capitalizeCity(destination.city)}
          </Link>
          {destination.country && `, ${destination.country}`}
        </p>

        {/* Info Pills Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Rating Pill */}
          {rating && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Open/Closed Status Pill */}
          {openStatus && openStatus.todayHours && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                openStatus.isOpen
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  openStatus.isOpen ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  openStatus.isOpen
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {openStatus.isOpen ? 'Open' : 'Closed'}
              </span>
              {openStatus.isOpen && openStatus.closingTime && (
                <span className="text-xs text-green-600 dark:text-green-500">
                  until {openStatus.closingTime}
                </span>
              )}
              {!openStatus.isOpen && openStatus.openingTime && (
                <span className="text-xs text-red-600 dark:text-red-500">
                  Opens {openStatus.openingTime}
                </span>
              )}
            </div>
          )}

          {/* Price Level Pill */}
          {priceLevelDisplay && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {priceLevelDisplay}
              </span>
              {priceLevelLabel && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{priceLevelLabel}</span>
              )}
            </div>
          )}

          {/* Brand Pill */}
          {destination.brand && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Building2 className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{destination.brand}</span>
            </div>
          )}

          {/* Crown Badge */}
          {destination.crown && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Crown</span>
            </div>
          )}

          {/* Instagram */}
          {instagramHandle && instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">@{instagramHandle.replace('@', '')}</span>
            </a>
          )}
        </div>

        {/* Micro Description */}
        {destination.micro_description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            {destination.micro_description}
          </p>
        )}

        {/* Action Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save Button with Dropdown */}
          <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
            <DropdownMenuTrigger asChild>
              <button
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    router.push('/auth/login');
                    return;
                  }
                  if (!isSaved) {
                    e.preventDefault();
                    onSaveClick?.();
                  }
                }}
              >
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
                {isSaved && <ChevronDown className="h-3 w-3 ml-0.5" />}
              </button>
            </DropdownMenuTrigger>
            {isSaved && (
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={onSaveToList}>
                  <Plus className="h-3 w-3 mr-2" />
                  Save to List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveToTrip}>
                  <MapPin className="h-3 w-3 mr-2" />
                  Save to Trip
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateList}>
                  <Plus className="h-3 w-3 mr-2" />
                  Create a List
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRemoveSave}>
                  <X className="h-3 w-3 mr-2" />
                  Remove from Saved
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>

          {/* Share Button */}
          <button
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            onClick={onShareClick}
          >
            <Share2 className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Share'}
          </button>

          {/* Visited Button with Dropdown */}
          {user && (
            <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                    isVisited
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={(e) => {
                    if (!isVisited) {
                      e.preventDefault();
                      onVisitClick?.();
                    }
                  }}
                >
                  <Check className={`h-3.5 w-3.5 ${isVisited ? 'stroke-[3]' : ''}`} />
                  {isVisited ? 'Visited' : 'Mark Visited'}
                  {isVisited && <ChevronDown className="h-3 w-3 ml-0.5" />}
                </button>
              </DropdownMenuTrigger>
              {isVisited && (
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={onAddVisitDetails}>
                    <Plus className="h-3 w-3 mr-2" />
                    Add Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRemoveVisit}>
                    <X className="h-3 w-3 mr-2" />
                    Remove Visit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          )}

          {/* View Full Page */}
          {destination.slug && destination.slug.trim() && (
            <Link
              href={`/destination/${destination.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Full Page
            </Link>
          )}
        </div>

        {/* Sign in prompt */}
        {!user && (
          <div className="mt-4">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Sign in to save and track visits
            </button>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

      {/* Parent Destination */}
      {parentDestination && (
        <section className="py-4">
          <button
            onClick={() => {
              if (parentDestination.slug && onDestinationClick) {
                onDestinationClick(parentDestination.slug);
              }
            }}
            className="w-full flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group text-left"
          >
            <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
              {parentDestination.image ? (
                <Image
                  src={parentDestination.image}
                  alt={parentDestination.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Located inside</p>
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate group-hover:underline">{parentDestination.name}</p>
              {parentDestination.category && (
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{parentDestination.category}</p>
              )}
            </div>
          </button>
        </section>
      )}

      {/* AI-Generated Tags */}
      {destination.tags && destination.tags.length > 0 && (
        <section className="py-3">
          <div className="flex flex-wrap gap-1.5">
            {destination.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-md text-xs text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Real-Time Status */}
      {destination.id && (
        <section className="py-3">
          <RealtimeStatusBadge
            destinationId={destination.id}
            compact={false}
            showWaitTime={true}
            showAvailability={true}
          />
        </section>
      )}

      {/* Hours Accordion */}
      {hours && hours.weekday_text && hours.weekday_text.length > 0 && (
        <section className="border-t border-b border-gray-100 dark:border-gray-800 -mx-6 px-6 my-2">
          <button
            onClick={() => setIsHoursExpanded(!isHoursExpanded)}
            className="w-full flex items-center gap-3 py-4"
          >
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Hours</span>
            <span className="flex-1 text-right text-sm text-gray-500 dark:text-gray-400">
              {openStatus?.isOpen
                ? `Open until ${openStatus.closingTime || 'late'}`
                : openStatus?.openingTime ? `Opens ${openStatus.openingTime}` : 'Closed'}
            </span>
            {isHoursExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {isHoursExpanded && (
            <div className="pb-4 space-y-2">
              {hours.weekday_text.map((day: string, index: number) => {
                const [dayName, hoursText] = day.split(': ');
                const now = new Date();
                const dayOfWeek = now.getDay();
                const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const isToday = index === googleDayIndex;

                return (
                  <div
                    key={index}
                    className={`flex justify-between text-sm ${
                      isToday ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span>{dayName}</span>
                    <span>{hoursText}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Location Card */}
      {(address || destination.neighborhood || destination.city) && (
        <section className="py-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="text-lg">📍</div>
            <div className="flex-1 min-w-0">
              {destination.neighborhood && !parentDestination && (
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">{destination.neighborhood}</p>
              )}
              {address && (
                <p className="text-sm text-gray-700 dark:text-gray-300">{address}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {capitalizeCity(destination.city)}
                {destination.country && `, ${destination.country}`}
              </p>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </a>
          </div>
        </section>
      )}

      {/* Nested Destinations */}
      {(loadingNested || nestedDestinations.length > 0) && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          {loadingNested ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading venues located here…
            </div>
          ) : (
            <NestedDestinations
              destinations={nestedDestinations}
              parentName={destination.name}
              onDestinationClick={(nested) => {
                if (nested.slug && onDestinationClick) {
                  onDestinationClick(nested.slug);
                }
              }}
            />
          )}
        </section>
      )}

      {/* Description */}
      {description && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <p
            className={`text-sm text-gray-600 dark:text-gray-300 leading-relaxed ${
              !isDescriptionExpanded && isDescriptionLong ? 'line-clamp-4' : ''
            }`}
          >
            {description}
          </p>
          {isDescriptionLong && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2 hover:underline"
            >
              {isDescriptionExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </section>
      )}

      {/* Editorial Summary */}
      {enrichedData?.editorial_summary && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase mb-2 text-gray-500 dark:text-gray-400">From Google</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {stripHtmlTags(enrichedData.editorial_summary)}
          </p>
        </section>
      )}

      {/* Architecture & Design */}
      {enhancedDestination && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <ArchitectDesignInfo destination={enhancedDestination} />
        </section>
      )}

      {/* Contact & Booking */}
      {(website || phone || destination.instagram_url || destination.opentable_url || destination.resy_url || destination.booking_url) && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase mb-3 text-gray-500 dark:text-gray-400">Contact & Booking</h3>
          <div className="flex flex-wrap gap-2">
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Globe className="h-4 w-4" />
                {websiteDisplay}
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            )}
            {destination.instagram_url && (
              <a
                href={destination.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </a>
            )}
            {destination.opentable_url && (
              <a
                href={destination.opentable_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                OpenTable
              </a>
            )}
            {destination.resy_url && (
              <a
                href={destination.resy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Resy
              </a>
            )}
            {destination.booking_url && (
              <a
                href={destination.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-blue-600 dark:bg-blue-500 rounded-lg text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Book Now
              </a>
            )}
          </div>
        </section>
      )}

      {/* AI Review Summary */}
      {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase mb-3 text-gray-500 dark:text-gray-400">What Reviewers Say</h3>
          {loadingReviewSummary ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Summarizing reviews...</span>
            </div>
          ) : reviewSummary ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewSummary}</p>
            </div>
          ) : null}
        </section>
      )}

      {/* Map Section */}
      {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
          <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            <GoogleStaticMap
              center={{
                lat: destination.latitude || enrichedData?.latitude || 0,
                lng: destination.longitude || enrichedData?.longitude || 0,
              }}
              zoom={15}
              height="192px"
              className="rounded-xl"
              showPin={true}
            />
          </div>
        </section>
      )}

      {/* Similar Places */}
      {(loadingRecommendations || recommendations.length > 0) && (
        <section className="py-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase mb-3 text-gray-500 dark:text-gray-400">
            You might also like
          </h3>

          {loadingRecommendations ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-28">
                  <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {recommendations.map(rec => (
                <button
                  key={rec.slug}
                  onClick={() => {
                    if (rec.slug && onDestinationClick) {
                      onDestinationClick(rec.slug);
                    } else if (rec.slug) {
                      router.push(`/destination/${rec.slug}`);
                    }
                  }}
                  className="flex-shrink-0 w-28 text-left group"
                >
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                    {rec.image ? (
                      <Image
                        src={rec.image}
                        alt={rec.name}
                        fill
                        sizes="112px"
                        className="object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    {rec.michelin_stars && rec.michelin_stars > 0 && (
                      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-white/90 dark:bg-gray-900/90 rounded text-xs font-medium">
                        <img
                          src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                          alt="Michelin"
                          className="h-3 w-3"
                          onError={(e) => {
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
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {rec.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {capitalizeCity(rec.city)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
