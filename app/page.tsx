'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import {
  MapPin, Map, LayoutGrid, Plus
} from 'lucide-react';
// Lazy load drawer (only when opened)
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { 
    ssr: false,
    loading: () => null
  }
);
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackSearch,
  trackFilterChange,
  getSessionId,
} from '@/lib/tracking';
import GreetingHero from '@/src/features/search/GreetingHero';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { TrendingSection } from '@/components/TrendingSection';
import { SearchFiltersComponent, type SearchFilters } from '@/src/features/search/SearchFilters';
import { MultiplexAd } from '@/components/GoogleAd';
import { DistanceBadge } from '@/components/DistanceBadge';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import { SessionResume } from '@/components/SessionResume';
import { ContextCards } from '@/components/ContextCards';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { RefinementChips, type RefinementTag } from '@/components/RefinementChips';
import { DestinationBadges } from '@/components/DestinationBadges';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { ScreenReaderAnnouncements } from '@/components/ScreenReaderAnnouncements';
import { type ExtractedIntent } from '@/app/api/intent/schema';
import { isOpenNow } from '@/lib/utils/opening-hours';
import { DestinationCard } from '@/components/DestinationCard';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { TripPlanner } from '@/components/TripPlanner';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// Category icons using Untitled UI icons
function getCategoryIcon(category: string): React.ComponentType<{ className?: string; size?: number | string }> | null {
  return getCategoryIconComponent(category);
}

const FEATURED_CITY_SLUGS = ['taipei', 'tokyo', 'new-york', 'london'] as const;
const FEATURED_CITY_SET = new Set<string>(FEATURED_CITY_SLUGS);

function slugify(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value).trim();
  }
  return '';
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getFirstArrayItem(value: unknown): unknown {
  return Array.isArray(value) && value.length > 0 ? value[0] : undefined;
}

function pickString(...sources: Array<unknown | (() => unknown)>): string {
  for (const source of sources) {
    const candidate = typeof source === 'function' ? (source as () => unknown)() : source;
    const text = toTrimmedString(candidate);
    if (text) {
      return text;
    }
  }
  return '';
}

const naturalLanguageTriggers = [
  'what ',
  'where ',
  'when ',
  'how ',
  'why ',
  'best ',
  'recommend',
  'suggest',
  'show me',
  'find me',
  'looking for',
  'plan',
  'help',
  'ideas',
  'can you',
  'could you',
  'should i',
  'tell me',
  'give me',
  'any ',
  'list ',
  'create',
  'itinerary',
  'write',
  'explain',
  'compare',
  'versus',
  'vs ',
];

function deterministicRandomFromString(value: string): number {
  if (!value) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return normalized;
}

function isLikelyNaturalLanguageQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;

  if (trimmed.endsWith('?') || trimmed.includes('?')) {
    return true;
  }

  if (/[.!]\s/.test(trimmed) || lower.includes(' please ')) {
    return true;
  }

  if (wordCount >= 8) {
    return true;
  }

  return naturalLanguageTriggers.some((phrase) => lower.startsWith(phrase) || lower.includes(` ${phrase}`));
}

function normalizeDiscoveryEngineRecord(recordInput: unknown): Destination | null {
  if (!isRecord(recordInput)) {
    return null;
  }

  const record = recordInput as Record<string, unknown>;

  const name = pickString(record.name, record.title);
  const city = pickString(
    record.city,
    () => (isRecord(record.location) ? record.location.city : undefined),
    () => (isRecord(record.metadata) ? record.metadata.city : undefined),
    () => (isRecord(record.structData) ? record.structData.city : undefined),
    () => {
      const firstLocation = getFirstArrayItem(record.locations);
      return isRecord(firstLocation) ? firstLocation.city : firstLocation;
    }
  );
  const category = pickString(
    record.category,
    record.category_name,
    () => (isRecord(record.metadata) ? record.metadata.category : undefined),
    () => (isRecord(record.structData) ? record.structData.category : undefined),
    () => {
      const firstCategory = getFirstArrayItem(record.categories);
      return isRecord(firstCategory) ? firstCategory.category : firstCategory;
    }
  );

  const slugSource = pickString(record.slug, record.id, name);
  const slug = slugify(slugSource || name);

  if (!slug || !name || !city || !category) {
    return null;
  }

  const description = pickString(record.description, record.summary, record.snippet) || undefined;
  const content = pickString(record.content, record.longDescription, record.body) || undefined;

  const imageCandidate = pickString(
    record.image,
    record.imageUrl,
    record.image_url,
    record.primaryImage,
    record.primary_image,
    record.mainImage,
    record.main_image,
    () => {
      const firstImage = getFirstArrayItem(record.images);
      if (isRecord(firstImage)) {
        return firstImage.url;
      }
      return firstImage;
    },
    () => {
      const media = record.media;
      if (isRecord(media)) {
        const firstMediaImage = getFirstArrayItem(media.images);
        if (isRecord(firstMediaImage)) {
          return firstMediaImage.url;
        }
        return firstMediaImage;
      }
      return undefined;
    }
  );

  let tags: string[] | undefined;
  const rawTags = record.tags;
  if (Array.isArray(rawTags)) {
    tags = rawTags
      .map((tag) => toTrimmedString(tag))
      .filter((tag): tag is string => Boolean(tag));
  } else {
    const tagText = toTrimmedString(rawTags);
    if (tagText) {
      tags = tagText.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  }

  const ratingValue =
    toNumberOrNull(record.rating) ??
    toNumberOrNull(record.ratingValue) ??
    toNumberOrNull(record.averageRating) ??
    toNumberOrNull(record.average_rating) ??
    toNumberOrNull(record.rating_score);

  const priceLevel =
    toNumberOrNull(record.priceLevel) ??
    toNumberOrNull(record.price_level) ??
    toNumberOrNull(record.priceLevelValue);

  const michelin =
    toNumberOrNull(record.michelin_stars) ??
    toNumberOrNull(record.michelinStars) ??
    toNumberOrNull(record.michelin) ??
    undefined;

  const badges = record.badges;
  let crown: boolean | undefined;
  if (typeof record.crown === 'boolean') {
    crown = record.crown;
  } else if (Array.isArray(badges)) {
    crown = badges.some((badge) => toTrimmedString(badge).toLowerCase() === 'crown');
  }

  return {
    slug,
    name,
    city,
    category,
    description,
    content,
    image: imageCandidate || undefined,
    michelin_stars: michelin ?? undefined,
    crown,
    tags,
    rating: ratingValue,
    price_level: priceLevel,
  };
}

// Generate context-aware loading message based on query, intent, and user context
function getContextAwareLoadingMessage(
  query: string,
  intent?: {
    city?: string;
    category?: string;
    modifiers?: string[];
    temporalContext?: { timeframe?: string; timeOfDay?: string };
    primaryIntent?: string;
  } | null,
  seasonalContext?: { season?: string; weather?: string } | null,
  userContext?: { preferences?: any; visitedCities?: string[] } | null
): string {
  const queryLower = query.toLowerCase();
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  // Time-specific messages
  if (intent?.temporalContext?.timeframe === 'now') {
    const cityPart = intent.city ? ` in ${intent.city}` : '';
    return `Finding places open right now${cityPart}...`;
  }

  // Intent-specific messages
  if (intent?.primaryIntent === 'compare') {
    return 'Comparing options for you...';
  }
  if (intent?.primaryIntent === 'plan') {
    return 'Planning your perfect itinerary...';
  }

  // Category + City combinations
  if (intent?.category && intent?.city) {
    const category = intent.category.toLowerCase();
    const city = intent.city;
    
    const categoryCityMessages: Record<string, string[]> = {
      restaurant: [
        `Discovering ${city}'s finest dining...`,
        `Curating the best restaurants in ${city}...`,
        `Finding ${city}'s culinary gems...`,
        `Exploring ${city}'s food scene...`,
      ],
      cafe: [
        `Locating ${city}'s best cafes...`,
        `Finding cozy spots in ${city}...`,
        `Discovering ${city}'s coffee culture...`,
      ],
      bar: [
        `Exploring ${city}'s nightlife...`,
        `Finding the best bars in ${city}...`,
        `Discovering ${city}'s cocktail scene...`,
      ],
      hotel: [
        `Curating ${city}'s best stays...`,
        `Finding perfect accommodations in ${city}...`,
        `Discovering ${city}'s top hotels...`,
      ],
      shopping: [
        `Exploring ${city}'s shopping scene...`,
        `Finding the best stores in ${city}...`,
        `Discovering ${city}'s retail gems...`,
      ],
    };

    const messages = categoryCityMessages[category];
    if (messages) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }

  // Modifier-specific messages
  if (intent?.modifiers && intent.modifiers.length > 0) {
    const modifier = intent.modifiers[0].toLowerCase();
    if (modifier.includes('romantic')) {
      return 'Finding intimate spots perfect for two...';
    }
    if (modifier.includes('cozy') || modifier.includes('comfortable')) {
      return 'Seeking warm, welcoming spaces...';
    }
    if (modifier.includes('luxury') || modifier.includes('upscale')) {
      return 'Curating premium experiences...';
    }
    if (modifier.includes('budget') || modifier.includes('cheap')) {
      return 'Finding great value options...';
    }
    if (modifier.includes('hidden') || modifier.includes('secret')) {
      return 'Uncovering hidden gems...';
    }
    if (modifier.includes('trendy') || modifier.includes('popular')) {
      return "Spotting what's hot right now...";
    }
  }

  // Seasonal context
  if (seasonalContext?.season) {
    const season = seasonalContext.season.toLowerCase();
    if (season === 'spring') {
      return 'Finding perfect spring destinations...';
    }
    if (season === 'summer') {
      return 'Discovering summer hotspots...';
    }
    if (season === 'fall' || season === 'autumn') {
      return 'Curating autumn experiences...';
    }
    if (season === 'winter') {
      return 'Finding cozy winter spots...';
    }
  }

  // Category-specific messages
  if (intent?.category) {
    const category = intent.category.toLowerCase();
    const categoryMessages: Record<string, string[]> = {
      restaurant: [
        'Exploring culinary destinations...',
        'Finding the perfect dining spots...',
        'Curating restaurant recommendations...',
        'Discovering amazing food experiences...',
      ],
      cafe: [
        'Locating cozy cafes...',
        'Finding the best coffee spots...',
        'Discovering perfect study/work spaces...',
      ],
      bar: [
        'Exploring nightlife options...',
        'Finding great cocktail bars...',
        'Discovering vibrant social scenes...',
      ],
      hotel: [
        'Curating accommodation options...',
        'Finding perfect stays...',
        'Discovering unique lodgings...',
      ],
      shopping: [
        'Exploring shopping destinations...',
        'Finding the best retail spots...',
        'Discovering unique boutiques...',
      ],
      attraction: [
        'Discovering must-see attractions...',
        'Finding cultural landmarks...',
        'Exploring iconic destinations...',
      ],
    };

    const messages = categoryMessages[category];
    if (messages) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }

  // City-specific messages
  if (intent?.city) {
    return `Exploring ${intent.city}'s best spots...`;
  }

  // Time-of-day specific messages
  if (timeOfDay === 'morning') {
    return 'Starting your day with perfect recommendations...';
  }
  if (timeOfDay === 'afternoon') {
    return 'Finding your perfect afternoon escape...';
  }
  if (timeOfDay === 'evening') {
    return 'Discovering evening destinations...';
  }

  // Query-based fallback (simple pattern matching)
  if (queryLower.match(/restaurant|dining|food|eat/)) {
    return 'Finding the perfect dining experience...';
  }
  if (queryLower.match(/coffee|cafe|caf[eé]/)) {
    return 'Locating cozy coffee spots...';
  }
  if (queryLower.match(/bar|cocktail|drink|nightlife/)) {
    return 'Exploring nightlife options...';
  }
  if (queryLower.match(/hotel|stay|accommodation/)) {
    return 'Curating accommodation options...';
  }

  // Generic fallback with personality
  const fallbackMessages = [
    'Finding the perfect spots...',
    'Searching for amazing places...',
    'Discovering hidden gems...',
    'Curating the best destinations...',
    'Exploring top recommendations...',
    'Finding your next adventure...',
    'Locating must-visit places...',
    'Selecting the finest spots...',
  ];

  return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  
  // AI is enabled - backend handles fallback gracefully if OpenAI unavailable
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const initialVisitedSlugsRef = useRef<Set<string> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const skipNextSearchRef = useRef(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Removed loading state - page renders immediately, data loads in background
  const [searching, setSearching] = useState(false);
  const [discoveryEngineLoading, setDiscoveryEngineLoading] = useState(false);
  const [searchTier, setSearchTier] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showTripSidebar, setShowTripSidebar] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Calculate items per page based on 4 full rows × current grid columns
  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});
  // Near Me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);
  const displayDestinations = useMemo(() => {
    if (advancedFilters.nearMe && nearbyDestinations.length > 0) {
      return nearbyDestinations;
    }
    return filteredDestinations;
  }, [advancedFilters.nearMe, filteredDestinations, nearbyDestinations]);
  const displayDestinationsCount = displayDestinations.length;
  const resultsCount = filteredDestinations.length;

  const handleNavigationFiltersClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-search-filters'));
    }
  }, []);

  const handleNavigationStartTrip = useCallback(() => {
    setShowTripPlanner(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-trip-planner'));
    }
  }, []);

  const handleCitySelect = useCallback(
    (city: string | null) => {
      const normalizedCity = city?.trim() || '';
      const nextCity = normalizedCity === selectedCity ? '' : normalizedCity;
      setSelectedCity(nextCity);
      setAdvancedFilters(prev => {
        const updated = { ...prev };
        if (nextCity) {
          updated.city = nextCity;
        } else {
          delete updated.city;
        }
        return updated;
      });
      setCurrentPage(1);
      trackFilterChange({ filterType: 'city', value: nextCity || 'all' });
    },
    [selectedCity, setAdvancedFilters, setCurrentPage]
  );

  const handleCategorySelect = useCallback(
    (category: string | null, options?: { michelin?: boolean }) => {
      setCurrentPage(1);
      if (options?.michelin) {
        const newValue = !advancedFilters.michelin;
        setSelectedCategory('');
        setAdvancedFilters(prev => ({ ...prev, category: undefined, michelin: newValue || undefined }));
        trackFilterChange({ filterType: 'michelin', value: newValue });
        return;
      }

      if (!category) {
        setSelectedCategory('');
        setAdvancedFilters(prev => ({ ...prev, category: undefined, michelin: undefined }));
        trackFilterChange({ filterType: 'category', value: 'all' });
        return;
      }

      const newCategory = category === selectedCategory ? '' : category;
      setSelectedCategory(newCategory);
      setAdvancedFilters(prev => ({ ...prev, category: newCategory || undefined, michelin: undefined }));
      trackFilterChange({ filterType: 'category', value: newCategory || 'all' });
    },
    [advancedFilters.michelin, selectedCategory, setAdvancedFilters, setCurrentPage]
  );
  
  // AI-powered chat using the chat API endpoint - only website content
  const [chatResponse, setChatResponse] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string, destinations?: Destination[]}>>([]);
  const [searchIntent, setSearchIntent] = useState<ExtractedIntent | null>(null); // Store enhanced intent data
  const [seasonalContext, setSeasonalContext] = useState<any>(null);

  // Session and context state
  const [lastSession, setLastSession] = useState<any>(null);
  const [userContext, setUserContext] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSessionResume, setShowSessionResume] = useState(false);
  // Phase 2 & 3: Enriched greeting context
  const [enrichedGreetingContext, setEnrichedGreetingContext] = useState<any>(null);

  // Track submitted query for chat display
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [screenReaderMessage, setScreenReaderMessage] = useState('');
  const [screenReaderPriority, setScreenReaderPriority] = useState<'polite' | 'assertive'>('polite');

  useEffect(() => {
    const handleOpenTripPlanner = () => setShowTripPlanner(true);

    window.addEventListener('open-trip-planner', handleOpenTripPlanner);
    return () => {
      window.removeEventListener('open-trip-planner', handleOpenTripPlanner);
    };
  }, []);

  // Track visual chat messages for display
  const [chatMessages, setChatMessages] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    contextPrompt?: string;
  }>>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fallbackDestinationsRef = useRef<Destination[] | null>(null);
  const discoveryBootstrapRef = useRef<Destination[] | null>(null);
  const discoveryBootstrapPromiseRef = useRef<Promise<Destination[]> | null>(null);
  
  // Loading text variants
  const loadingTextVariants = [
    'Finding the perfect spots...',
    'Searching for amazing places...',
    'Discovering hidden gems...',
    'Curating the best destinations...',
    'Exploring top recommendations...',
    'Finding your next adventure...',
    'Locating must-visit places...',
    'Selecting the finest spots...',
  ];
  const [currentLoadingText, setCurrentLoadingText] = useState(loadingTextVariants[0]);
  const [inferredTags, setInferredTags] = useState<{
    neighborhoods?: string[];
    styleTags?: string[];
    priceLevel?: string;
    modifiers?: string[];
  } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const extractFilterOptions = (rows: Array<{ city?: string | null; category?: string | null }>) => {
    const citySet = new Set<string>();
    const categorySet = new Set<string>();

    rows.forEach(row => {
      const city = (row.city ?? '').toString().trim();
      const category = (row.category ?? '').toString().trim();

      if (city) {
        citySet.add(city);
      }
      if (category) {
        categorySet.add(category);
      }
    });

    const sortedCategories = Array.from(categorySet).sort();
    const promotedCategories = (() => {
      if (sortedCategories.length === 0) return sortedCategories;
      const isShopping = (value: string) => value.trim().toLowerCase() === 'shopping';
      const isOther = (value: string) => value.trim().toLowerCase() === 'other';
      const shopping = sortedCategories.filter(isShopping);
      const others = sortedCategories.filter((category) => !isShopping(category) && !isOther(category));
      const otherBucket = sortedCategories.filter(isOther);
      return [...shopping, ...others, ...otherBucket];
    })();

    return {
      cities: Array.from(citySet).sort(),
      categories: promotedCategories,
    };
  };

  const loadFallbackDestinations = async () => {
    if (fallbackDestinationsRef.current) {
      return fallbackDestinationsRef.current;
    }

    try {
      const response = await fetch('/destinations.json');
      if (!response.ok) {
        throw new Error(`Failed to load fallback destinations: ${response.status}`);
      }

      const raw = await response.json();
      const normalized: Destination[] = (Array.isArray(raw) ? raw : [])
        .map((item: any) => {
          const slug = slugify(item.slug || item.name || '');

          const tags = Array.isArray(item.tags)
            ? item.tags
            : typeof item.cardTags === 'string'
              ? item.cardTags
                  .split(',')
                  .map((tag: string) => tag.trim())
                  .filter(Boolean)
              : undefined;

          return {
            slug,
            name: (item.name || slug || 'Unknown destination').toString(),
            city: (item.city || '').toString().trim(),
            category: (item.category || '').toString().trim(),
            description: item.description || item.subline || undefined,
            content: item.content || undefined,
            image: item.image || item.mainImage || undefined,
            michelin_stars: item.michelin_stars ?? item.michelinStars ?? undefined,
            crown: item.crown ?? undefined,
            tags: tags && tags.length > 0 ? tags : undefined,
          } as Destination;
        })
        .filter((destination: Destination) => Boolean(destination.slug && destination.city && destination.category));

      fallbackDestinationsRef.current = normalized;
      return normalized;
    } catch (error) {
      console.warn('[Fallback] Unable to load static destinations:', error);
      fallbackDestinationsRef.current = [];
      return [];
    }
  };

  const applyFallbackData = async (options: { updateDestinations?: boolean; ensureFilters?: boolean } = {}) => {
    const { updateDestinations = false, ensureFilters = true } = options;
    const fallback = await loadFallbackDestinations();

    if (!fallback.length) {
      return;
    }

    if (updateDestinations) {
      setDestinations(fallback);
      // Show immediately, filter later (non-blocking)
      setFilteredDestinations(fallback);
      // Apply filtering after display
      requestAnimationFrame(() => {
        const filtered = filterDestinationsWithData(
          fallback,
          '', {}, '', '', user, visitedSlugs
        );
        if (filtered.length !== fallback.length || filtered.some((d, i) => d.slug !== fallback[i]?.slug)) {
          setFilteredDestinations(filtered);
        }
      });
    }

    if (ensureFilters) {
      const { cities: fallbackCities, categories: fallbackCategories } = extractFilterOptions(fallback);
      if (fallbackCities.length) {
        setCities(prev => (fallbackCities.length > prev.length ? fallbackCities : prev));
      }
      if (fallbackCategories.length) {
        setCategories(prev => (fallbackCategories.length > prev.length ? fallbackCategories : prev));
      }
    }
  };

  // Helper function to apply Discovery Engine data (reduces code duplication)
  const applyDiscoveryEngineData = async (
    discoveryBaseline: Destination[],
    options: {
      updateDestinations?: boolean;
      updateFilters?: boolean;
      compareWithExisting?: { cities: string[]; categories: string[] };
    } = {}
  ) => {
    const {
      updateDestinations = false,
      updateFilters = true,
      compareWithExisting,
    } = options;

    if (!discoveryBaseline.length) {
      return false;
    }

    if (updateFilters) {
      const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
      
      if (compareWithExisting) {
        // Only update if Discovery Engine has more options
        if (discoveryCities.length > compareWithExisting.cities.length) {
          setCities(discoveryCities);
        }
        if (discoveryCategories.length > compareWithExisting.categories.length) {
          setCategories(discoveryCategories);
        }
      } else {
        // Always update if no comparison
        setCities(discoveryCities);
        setCategories(discoveryCategories);
      }
    }

    if (updateDestinations) {
      setDestinations(discoveryBaseline);
      // Show immediately, filter later (non-blocking)
      setFilteredDestinations(discoveryBaseline);
      // Apply filtering after display
      requestAnimationFrame(() => {
        const filtered = filterDestinationsWithData(
          discoveryBaseline,
          '', {}, '', '', user, visitedSlugs
        );
        if (filtered.length !== discoveryBaseline.length || filtered.some((d, i) => d.slug !== discoveryBaseline[i]?.slug)) {
          setFilteredDestinations(filtered);
        }
      });
    }

    return true;
  };

  const fetchDiscoveryBootstrap = async (): Promise<Destination[]> => {
    if (discoveryBootstrapRef.current !== null) {
      console.log('[Discovery Engine] Using cached bootstrap data');
      return discoveryBootstrapRef.current;
    }

    if (discoveryBootstrapPromiseRef.current) {
      console.log('[Discovery Engine] Waiting for existing bootstrap request');
      return discoveryBootstrapPromiseRef.current;
    }

    const promise = (async () => {
      const startTime = Date.now();
      try {
        console.log('[Discovery Engine] Starting bootstrap request...');
        const response = await fetch('/api/search/discovery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'top destinations',
            pageSize: 200,
            userId: user?.id,
            filters: {},
          }),
        });

        const elapsed = Date.now() - startTime;
        console.log(`[Discovery Engine] Response received (${elapsed}ms):`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          if (response.status === 503) {
            // 503 is expected when Discovery Engine is not configured - use debug log instead of warn
            console.debug('[Discovery Engine] Service unavailable (503) - Discovery Engine not configured, using Supabase fallback');
          } else {
            let errorDetails: Record<string, unknown> | null = null;
            try {
              errorDetails = (await response.json()) as Record<string, unknown>;
            } catch {
              // Ignore parse errors and fall back to status text
            }
            const detailMessage =
              (typeof errorDetails?.error === 'string' && errorDetails.error) ||
              (typeof errorDetails?.details === 'string' && errorDetails.details) ||
              response.statusText;
            console.warn('[Discovery Engine] Bootstrap request failed:', {
              status: response.status,
              message: detailMessage,
            });
            console.debug('[Discovery Engine] Falling back to Supabase only');
          }

          discoveryBootstrapRef.current = null;
          return [];
        }

        const payload: { results?: unknown; source?: string; fallback?: boolean } = await response
          .json()
          .catch(() => ({ results: [] as unknown[] }));

        const normalized = Array.isArray(payload.results)
          ? payload.results
              .map(normalizeDiscoveryEngineRecord)
              .filter((item): item is Destination => Boolean(item))
          : [];

        discoveryBootstrapRef.current = normalized;

        if (normalized.length > 0) {
          console.log(`[Discovery Engine] Successfully bootstrapped ${normalized.length} destinations`, {
            source: payload.source || 'unknown',
            fallback: payload.fallback || false,
            elapsed: `${Date.now() - startTime}ms`,
          });
        } else {
          console.warn('[Discovery Engine] Bootstrap returned no destinations', {
            source: payload.source || 'unknown',
            fallback: payload.fallback || false,
          });
        }

        return normalized;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // Only warn if it's not a 503/configuration error
        if (!message.includes('503') && !message.includes('not configured')) {
          console.warn('[Discovery Engine] Bootstrap failed:', message, {
            elapsed: `${Date.now() - startTime}ms`,
          });
        } else {
          console.debug('[Discovery Engine] Bootstrap failed (expected):', message);
        }
        console.debug('[Discovery Engine] Falling back to Supabase only');
        discoveryBootstrapRef.current = null;
        return [];
      } finally {
        discoveryBootstrapPromiseRef.current = null;
      }
    })();

    discoveryBootstrapPromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    // Initialize session tracking
    initializeSession();

    // Track homepage view
    trackPageView({ pageType: 'home' });

    // Fire-and-forget: Load data in background, don't block render
    // Page renders immediately, data loads asynchronously
    // Prioritize fetchDestinations first (it also sets cities), then fetchFilterData for enhancement
    void fetchDestinations();
    // fetchFilterData will enhance cities if it has more, but won't block initial display
    void fetchFilterData();
  }, []);

  useEffect(() => {
    if (user) {
      // Priority: Fetch visited places FIRST (needed for filtering)
      // Then fetch profile and session in parallel
      fetchVisitedPlaces().then(() => {
        // After visited places are loaded, re-filter destinations if they're already loaded
        // Use requestAnimationFrame to ensure this doesn't block rendering
        if (destinations.length > 0) {
          requestAnimationFrame(() => {
            filterDestinations();
          });
        }
      });
      fetchLastSession();
      fetchUserProfile();
    }
  }, [user]);

  // Phase 2 & 3: Fetch enriched greeting context when user profile is loaded
  useEffect(() => {
    if (user && userProfile) {
      fetchEnrichedGreetingContext();
    }
  }, [user, userProfile]);

  // Fetch last conversation session
  async function fetchLastSession() {
    if (!user) return;

    try {
      const response = await fetch(`/api/conversation/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.session_id && data.messages && data.messages.length > 0) {
          setLastSession({
            id: data.session_id,
            last_activity: data.last_activity || new Date().toISOString(),
            context_summary: data.context,
            message_count: data.messages.length,
          });
          // Show session resume if session is less than 24 hours old
          const lastActivity = new Date(data.last_activity || Date.now());
          const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            setShowSessionResume(true);
          }
        }
      }
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user) {
        console.warn('Error fetching last session:', error);
      }
    }
  }

  // Fetch user profile for context
  async function fetchUserProfile() {
    if (!user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) {
        return;
      }
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching user profile:', error);
        return;
      }

      if (!data) {
        setUserProfile(null);
        setUserContext(null);
        return;
      }

      // Store full profile for greeting context
      setUserProfile(data);
      // Also store simplified version for other components
      const profileData = data as any;
      setUserContext({
        favoriteCities: profileData.favorite_cities || [],
        favoriteCategories: profileData.favorite_categories || [],
        travelStyle: profileData.travel_style,
      });
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user) {
        console.warn('Error fetching user profile:', error);
      }
    }
  }

  // Phase 2 & 3: Fetch enriched greeting context (journey, achievements, weather, trending)
  async function fetchEnrichedGreetingContext() {
    if (!user || !userProfile) return;

    try {
      const favoriteCity = userProfile.favorite_cities?.[0];
      const params = new URLSearchParams({
        userId: user.id,
      });
      if (favoriteCity) {
        params.append('favoriteCity', favoriteCity);
      }

      const response = await fetch(`/api/greeting/context?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.context) {
          setEnrichedGreetingContext(data.context);
        }
      }
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user && userProfile) {
        console.warn('Error fetching enriched greeting context:', error);
      }
    }
  }

  function handleResumeSession(sessionId: string) {
    // Load the session
    setShowSessionResume(false);
    // The session is already loaded from fetchLastSession
    // Just scroll to the chat area or show a confirmation
  }

  // CHAT MODE with auto-trigger: Auto-trigger on typing (debounced) + explicit Enter submit
  // Works like chat but with convenience of auto-trigger
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Separate useEffect for filters (only when NO search term)
  // Fetch destinations lazily when filters are applied
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Only fetch destinations if we haven't already
      if (destinations.length === 0) {
        fetchDestinations();
      } else {
        // If destinations are already loaded, just re-filter (don't re-fetch)
        // This prevents unnecessary re-fetching when visitedSlugs changes after login
        // Note: filterDestinationsWithData is defined later, but it's a useCallback so it's stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
      filterDestinations();
      }
    }
    // Don't reset displayed count here - let the search effect handle it
  }, [selectedCity, selectedCategory, advancedFilters, visitedSlugs, destinations]); // Filters only apply when no search

  // Sync advancedFilters with selectedCity/selectedCategory for backward compatibility
  useEffect(() => {
    setAdvancedFilters(prev => ({
      ...prev,
      city: selectedCity && selectedCity.trim() ? selectedCity : undefined,
      category: selectedCategory && selectedCategory.trim() ? selectedCategory : undefined,
    }));
  }, [selectedCity, selectedCategory]);

  // Rebuild pagination logic - clean and reliable
  const totalDestinations = displayDestinations.length;
  const totalPages = useMemo(() => {
    if (itemsPerPage <= 0 || totalDestinations === 0) return 1;
    return Math.max(1, Math.ceil(totalDestinations / itemsPerPage));
  }, [totalDestinations, itemsPerPage]);

  // Sync searchTerm to filter's searchQuery (but don't create circular dependency)
  useEffect(() => {
    setAdvancedFilters(prev => {
      const currentQuery = prev.searchQuery || '';
      const newQuery = searchTerm.trim();
      
      if (currentQuery !== newQuery) {
        if (newQuery) {
          return { ...prev, searchQuery: newQuery };
        } else {
          const { searchQuery, ...rest } = prev;
          return rest;
        }
      }
      return prev;
    });
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedCategory, advancedFilters, searchTerm]);

  // Clamp currentPage to valid range when destinations change
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Scroll to top of grid when page changes
  useEffect(() => {
    if (currentPage > 1 && viewMode === 'grid' && totalDestinations > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const gridElement = document.querySelector('[data-name="destination-grid"]');
        if (gridElement) {
          gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }, [currentPage, viewMode, totalDestinations]);

  // Fetch filter data (cities and categories) first for faster initial display
  // OPTIMIZED: Call Discovery Engine once at start, reuse result throughout
  const fetchFilterData = async () => {
    // OPTIMIZATION: Call Discovery Engine once at the start (cached by ref)
    const discoveryBaselinePromise = fetchDiscoveryBootstrap();
    
    try {
      console.log('[Filter Data] Starting fetch...');
      
      const supabaseClient = createClient();
      if (!supabaseClient) {
        console.warn('[Filter Data] Supabase client not available');
        // Use the already-started Discovery Engine call
        const discoveryBaseline = await discoveryBaselinePromise;
        if (discoveryBaseline.length) {
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          // OPTIMIZATION: Batch state updates
          React.startTransition(() => {
            setCities(discoveryCities);
            setCategories(discoveryCategories);
          });
          if (destinations.length === 0) {
            setDestinations(discoveryBaseline);
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            setFilteredDestinations(filtered);
          }
        } else {
          await applyFallbackData({ updateDestinations: destinations.length === 0 });
        }
        return;
      }
      
      // Optimize query: only get distinct city/category pairs, limit to speed up
      let data, error;
      try {
        const queryPromise = supabaseClient
        .from('destinations')
          .select('city, category')
          .is('parent_destination_id', null) // Only top-level destinations for filters
          .limit(1000) // Limit to speed up initial query
          .order('city');
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 30000)
        );
        
        const result = await Promise.race([queryPromise, timeoutPromise]);
        data = result.data;
        error = result.error;
      } catch (networkError: any) {
        // Handle network errors (connection lost, timeout, etc.)
        console.warn('[Filter Data] Network error:', networkError?.message || networkError);
        error = networkError;
        data = null;
      }

      // OPTIMIZATION: Use helper function for error checking
      if (error || !data) {
        if (error && !isIgnorableSupabaseError(error)) {
          // Don't log network errors as warnings - they're expected in poor connectivity
          if (!error.message?.includes('Network') && !error.message?.includes('timeout')) {
            console.warn('[Filter Data] Error:', error.message || error);
          }
        }

        // OPTIMIZATION: Reuse the already-started Discovery Engine call
        const discoveryBaseline = await discoveryBaselinePromise;
        if (discoveryBaseline.length) {
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          // OPTIMIZATION: Batch state updates
          React.startTransition(() => {
            setCities(discoveryCities);
            setCategories(discoveryCategories);
          });
          if (destinations.length === 0) {
            setDestinations(discoveryBaseline);
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            setFilteredDestinations(filtered);
          }
        } else {
          await applyFallbackData({ updateDestinations: destinations.length === 0 });
        }
        return;
      }

      const { cities: uniqueCities, categories: uniqueCategories } = extractFilterOptions((data || []) as any[]);

      // OPTIMIZATION: Batch state updates
      React.startTransition(() => {
        setCities(uniqueCities);
        setCategories(uniqueCategories);
      });

      // OPTIMIZATION: Reuse the already-started Discovery Engine call
      const discoveryBaseline = await discoveryBaselinePromise;
      if (discoveryBaseline.length) {
        const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
        // OPTIMIZATION: Batch state updates - only update if Discovery Engine has more
        const updates: { cities?: string[]; categories?: string[] } = {};
        if (discoveryCities.length > uniqueCities.length) {
          updates.cities = discoveryCities;
        }
        if (discoveryCategories.length > uniqueCategories.length) {
          updates.categories = discoveryCategories;
        }
        if (Object.keys(updates).length > 0) {
          React.startTransition(() => {
            if (updates.cities) setCities(updates.cities);
            if (updates.categories) setCategories(updates.categories);
          });
        }
        if (destinations.length === 0) {
          setDestinations(discoveryBaseline);
          const filtered = filterDestinationsWithData(discoveryBaseline);
          setFilteredDestinations(filtered);
        }
      }

      console.log('[Filter Data] State updated:', {
        cities: uniqueCities.length,
        categories: uniqueCategories.length,
        sampleCities: uniqueCities.slice(0, 5)
      });
    } catch (error: any) {
      // OPTIMIZATION: Use helper function for error checking
      if (!isIgnorableSupabaseError(error)) {
        console.warn('[Filter Data] Exception:', error?.message || error);
      }

      // OPTIMIZATION: Reuse Discovery Engine call (already started)
      try {
        const discoveryBaseline = await discoveryBaselinePromise;
        if (discoveryBaseline.length) {
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          // OPTIMIZATION: Batch state updates
          React.startTransition(() => {
            setCities(discoveryCities);
            setCategories(discoveryCategories);
          });
          if (destinations.length === 0) {
            setDestinations(discoveryBaseline);
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            setFilteredDestinations(filtered);
          }
        } else {
          await applyFallbackData({ updateDestinations: destinations.length === 0 });
        }
      } catch (fallbackError) {
        console.warn('[Filter Data] Fallback also failed:', fallbackError);
        // OPTIMIZATION: Batch state updates
        React.startTransition(() => {
          setCities([]);
      setCategories([]);
        });
      }
    }
  };

  const filterDestinationsWithData = useCallback((
    dataToFilter: Destination[],
    currentSearchTerm: string = searchTerm,
    currentAdvancedFilters: typeof advancedFilters = advancedFilters,
    currentSelectedCity: string = selectedCity,
    currentSelectedCategory: string = selectedCategory,
    currentUser: typeof user = user,
    currentVisitedSlugs: Set<string> = visitedSlugs
  ) => {
    let filtered = dataToFilter;
    const visitedSortingSet = initialVisitedSlugsRef.current ?? currentVisitedSlugs;

    // Apply filters only when there's NO search term (AI chat handles all search)
    if (!currentSearchTerm) {
      // City filter (from advancedFilters or selectedCity)
      const cityFilter = currentAdvancedFilters.city || currentSelectedCity;
      if (cityFilter) {
        filtered = filtered.filter(d => d.city === cityFilter);
      }

      // Category filter (from advancedFilters or selectedCategory) - enhanced with tags
      const categoryFilter = currentAdvancedFilters.category || currentSelectedCategory;
      if (categoryFilter) {
        filtered = filtered.filter(d => {
          const categoryMatch = d.category && d.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim();
          
          // If category matches, include it
          if (categoryMatch) return true;
          
          // Also check tags for category-related matches
          const tags = d.tags || [];
          const categoryLower = categoryFilter.toLowerCase().trim();
          
          // Map categories to relevant tag patterns
          const categoryTagMap: Record<string, string[]> = {
            'dining': ['restaurant', 'dining', 'fine-dining', 'italian_restaurant', 'mexican_restaurant', 'japanese_restaurant', 'french_restaurant', 'chinese_restaurant', 'thai_restaurant', 'indian_restaurant', 'seafood_restaurant', 'steak_house', 'pizza', 'food'],
            'cafe': ['cafe', 'coffee_shop', 'coffee', 'bakery', 'pastry'],
            'bar': ['bar', 'pub', 'cocktail_bar', 'wine_bar', 'beer', 'nightclub', 'lounge'],
            'hotel': ['hotel', 'lodging', 'resort', 'inn', 'hostel'],
            'shopping': ['store', 'shopping', 'mall', 'market', 'boutique'],
            'attraction': ['tourist_attraction', 'museum', 'park', 'landmark', 'monument'],
            'nightlife': ['nightclub', 'bar', 'pub', 'lounge', 'entertainment'],
          };
          
          // Get relevant tags for this category
          const relevantTags = categoryTagMap[categoryLower] || [];
          
          // Check if any tags match
          const tagMatch = tags.some(tag => {
            const tagLower = tag.toLowerCase();
            return relevantTags.some(relevantTag => 
              tagLower.includes(relevantTag) || relevantTag.includes(tagLower)
            );
          });
          
          return tagMatch;
        });
      }

      // Michelin filter
      if (currentAdvancedFilters.michelin) {
        filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
      }

      // Crown filter
      if (currentAdvancedFilters.crown) {
        filtered = filtered.filter(d => d.crown === true);
      }

      // Price filter
      if (currentAdvancedFilters.minPrice !== undefined) {
        filtered = filtered.filter(d => 
          d.price_level != null && d.price_level >= currentAdvancedFilters.minPrice!
        );
      }
      if (currentAdvancedFilters.maxPrice !== undefined) {
        filtered = filtered.filter(d => 
          d.price_level != null && d.price_level <= currentAdvancedFilters.maxPrice!
        );
      }

      // Rating filter
      if (currentAdvancedFilters.minRating !== undefined) {
        filtered = filtered.filter(d => 
          d.rating != null && d.rating >= currentAdvancedFilters.minRating!
        );
      }

      // Open Now filter - uses timezone_id, utc_offset, or city mapping
      if (currentAdvancedFilters.openNow) {
        filtered = filtered.filter(d => {
          // Try opening_hours_json first (from database), then opening_hours (normalized)
          const hours = (d as any).opening_hours_json || d.opening_hours;
          if (!hours) return false;
          
          return isOpenNow(
            hours,
            d.city,
            (d as any).timezone_id || undefined,
            (d as any).utc_offset || undefined
          );
        });
      }
    }
    // When searchTerm exists, AI chat handles all filtering - don't apply text search here

    // Pinterest-style recommendation sorting
    // Only apply smart sorting when no search term (natural discovery)
    if (!currentSearchTerm) {
      filtered = filtered
        .map((dest, index) => ({
          ...dest,
          _score: getRecommendationScore(dest, index)
        }))
        .sort((a, b) => b._score - a._score);
    }

    // When user is signed in: separate visited & unvisited, move visited to bottom
    if (currentUser && visitedSortingSet.size > 0) {
      const unvisited = filtered.filter(d => !visitedSortingSet.has(d.slug));
      const visited = filtered.filter(d => visitedSortingSet.has(d.slug));
      filtered = [...unvisited, ...visited];
    }

    return filtered;
  }, [searchTerm, advancedFilters, selectedCity, selectedCategory, user, visitedSlugs]);
  const fetchDestinations = useCallback(async () => {
    // Step 1: Run Supabase query directly (no waiting)
    try {
      // Select only essential columns to avoid issues with missing columns
      const supabaseClient = createClient();
      if (!supabaseClient) {
        console.warn('[Destinations] Supabase client not available');
        // Fallback to Discovery Engine if Supabase not available
        const discoveryBaseline = await fetchDiscoveryBootstrap().catch(() => []);
        if (discoveryBaseline.length) {
          setDestinations(discoveryBaseline);
          // Show immediately, filter later
          setFilteredDestinations(discoveryBaseline);
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          // OPTIMIZATION: Batch state updates
          React.startTransition(() => {
            if (discoveryCities.length) setCities(discoveryCities);
            if (discoveryCategories.length) setCategories(discoveryCategories);
          });
          // Apply filtering after display
          requestAnimationFrame(() => {
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            if (filtered.length !== discoveryBaseline.length || filtered.some((d, i) => d.slug !== discoveryBaseline[i]?.slug)) {
              setFilteredDestinations(filtered);
            }
          });
        } else {
          await applyFallbackData({ updateDestinations: true });
        }
        return;
      }
      
      // Optimize query: limit initial results for faster load
      // Exclude nested destinations (only show top-level destinations)
      let data, error;
      try {
        const queryPromise = supabaseClient
          .from('destinations')
          .select('slug, name, city, neighborhood, category, micro_description, description, content, image, michelin_stars, crown, tags, parent_destination_id, opening_hours_json, timezone_id, utc_offset')
          .is('parent_destination_id', null) // Only top-level destinations
          .limit(500) // Limit initial query for faster load
          .order('name');
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 30000)
        );
        
        const result = await Promise.race([queryPromise, timeoutPromise]);
        data = result.data;
        error = result.error;
      } catch (networkError: any) {
        // Handle network errors (connection lost, timeout, etc.)
        console.warn('[Destinations] Network error:', networkError?.message || networkError);
        error = networkError;
        data = null;
      }

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        // OPTIMIZATION: Use helper function for error checking
        if (error && !isIgnorableSupabaseError(error)) {
          // Don't log network errors as warnings - they're expected in poor connectivity
          if (!error.message?.includes('Network') && !error.message?.includes('timeout')) {
            console.warn('Error fetching destinations:', error.message || error);
          }
        }

        // Fallback to Discovery Engine if Supabase fails
        const discoveryBaseline = await fetchDiscoveryBootstrap().catch(() => []);
        if (discoveryBaseline.length) {
          setDestinations(discoveryBaseline);
          // Show immediately, filter later
          setFilteredDestinations(discoveryBaseline);
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          // OPTIMIZATION: Batch state updates
          React.startTransition(() => {
            if (discoveryCities.length) setCities(discoveryCities);
            if (discoveryCategories.length) setCategories(discoveryCategories);
          });
          // Apply filtering after display
          requestAnimationFrame(() => {
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            if (filtered.length !== discoveryBaseline.length || filtered.some((d, i) => d.slug !== discoveryBaseline[i]?.slug)) {
              setFilteredDestinations(filtered);
            }
          });
        } else {
          await applyFallbackData({ updateDestinations: true });
        }
        return;
      }

      // Step 2: Show Supabase results immediately - DON'T WAIT FOR FILTERING
      setDestinations(data as Destination[]);
      
      // CRITICAL: Show destinations immediately without filtering to prevent blocking
      // Filtering will happen after visitedSlugs are loaded
      setFilteredDestinations(data as Destination[]);

      // Extract unique cities and categories from full data
      // IMPORTANT: Set cities/categories immediately (synchronously) to prevent empty filter flash
      const { cities: uniqueCities, categories: uniqueCategories } = extractFilterOptions(data as any[]);

      // Set cities and categories immediately (no batching) to prevent empty filter flash
      if (uniqueCities.length) {
        setCities(uniqueCities);
      }
      if (uniqueCategories.length) {
        setCategories(uniqueCategories);
      }
      
      // Apply filtering AFTER initial display (non-blocking)
      // This ensures grid shows immediately, then filters down
      requestAnimationFrame(() => {
        const filtered = filterDestinationsWithData(
          data as Destination[],
          '', // no search term
          {}, // no advanced filters
          '', // no selected city
          '', // no selected category
          user, // current user
          visitedSlugs // current visited slugs
        );
        // Only update if different to avoid unnecessary re-renders
        if (filtered.length !== data.length || filtered.some((d, i) => d.slug !== data[i]?.slug)) {
          setFilteredDestinations(filtered);
        }
      });

      // Step 3: Run Discovery Engine AFTER Supabase completes (as enhancement/filter)
      // This runs in background and can enhance the results
      setDiscoveryEngineLoading(true);
      fetchDiscoveryBootstrap()
        .then((discoveryBaseline) => {
          if (discoveryBaseline.length > 0) {
            // Merge Discovery Engine results with Supabase results
            // Discovery Engine can provide better ranking/personalization
            const merged = [...(data as Destination[]), ...discoveryBaseline];
            const uniqueMerged = merged.filter((dest, index, self) => 
              index === self.findIndex(d => d.slug === dest.slug)
            );
            
            // Only update if Discovery Engine provides additional value
            if (uniqueMerged.length > data.length) {
              setDestinations(uniqueMerged);
              // Show immediately, filter later (non-blocking)
              setFilteredDestinations(uniqueMerged);
              // Apply filtering after display
              requestAnimationFrame(() => {
                const filtered = filterDestinationsWithData(
                  uniqueMerged,
                  '', {}, '', '', user, visitedSlugs
                );
                if (filtered.length !== uniqueMerged.length || filtered.some((d, i) => d.slug !== uniqueMerged[i]?.slug)) {
                  setFilteredDestinations(filtered);
                }
              });
              
              // OPTIMIZATION: Batch state updates - only update if Discovery Engine has more
              const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
              const updates: { cities?: string[]; categories?: string[] } = {};
              if (discoveryCities.length > uniqueCities.length) {
                updates.cities = discoveryCities;
              }
              if (discoveryCategories.length > uniqueCategories.length) {
                updates.categories = discoveryCategories;
              }
              if (Object.keys(updates).length > 0) {
                React.startTransition(() => {
                  if (updates.cities) setCities(updates.cities);
                  if (updates.categories) setCategories(updates.categories);
                });
              }
            }
          }
        })
        .catch(() => {
          // Discovery Engine failed - that's fine, we already have Supabase data
        })
        .finally(() => {
          setDiscoveryEngineLoading(false);
        });
    } catch (error: any) {
      // OPTIMIZATION: Use helper function for error checking
      if (!isIgnorableSupabaseError(error)) {
        console.warn('Error fetching destinations:', error?.message || error);
      }

      // Fallback to Discovery Engine if Supabase fails
      const discoveryBaseline = await fetchDiscoveryBootstrap().catch(() => []);
      if (!discoveryBaseline.length) {
        await applyFallbackData({ updateDestinations: true });
      }
    }
  }, [user, visitedSlugs, filterDestinationsWithData]);

  const fetchVisitedPlaces = async (): Promise<void> => {
    if (!user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) {
        return;
      }
      const { data, error } = await supabaseClient
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      // Handle missing table or RLS errors gracefully
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST301')) {
        // Table doesn't exist or RLS blocking - that's fine, just continue
        return;
      }

      if (error) throw error;

      const slugs = new Set((data as any[])?.map((v: any) => v.destination_slug) || []);
      if (initialVisitedSlugsRef.current === null) {
        initialVisitedSlugsRef.current = new Set(slugs);
      }
      setVisitedSlugs(slugs);
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user) {
        console.warn('Error fetching visited places:', error);
      }
    }
  };

  // AI Chat-only search - EXACTLY like chat component
  // Accept ANY query (like chat component), API will validate
  const performSemanticSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      try {
        setSearching(true);
        setSearchTier('semantic');
        setSubmittedQuery(trimmed);
        setCurrentPage(1);
        setCurrentLoadingText('Searching curated destinations...');

        const params = new URLSearchParams({ q: trimmed });
        const effectiveCity = advancedFilters.city || selectedCity;
        const effectiveCategory = advancedFilters.category || selectedCategory;
        if (effectiveCity) params.set('city', effectiveCity);
        if (effectiveCategory) params.set('category', effectiveCategory);
        if (advancedFilters.openNow) params.set('open_now', 'true');

        const response = await fetch(`/api/search/intelligent?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Semantic search failed with status ${response.status}`);
        }

        const data = await response.json();
        const results: Destination[] = data.results || [];

        setFilteredDestinations(results);
        setSearchIntent(data.intent || null);
        const contextResponseText = typeof data.contextResponse === 'string' ? data.contextResponse : String(data.contextResponse || '');
        setChatResponse(contextResponseText);
        setCurrentLoadingText(
          contextResponseText ||
            (results.length > 0
              ? `Found ${results.length} ${results.length === 1 ? 'place' : 'places'}.`
              : 'No matching places found.')
        );
        setSearchIntent(data.intent || null);
        setInferredTags(null);
        setSeasonalContext(null);
        setChatMessages([]);
        setConversationHistory([]);
      } catch (error) {
        console.error('Semantic search error:', error);
        setChatResponse('');
        setSearchIntent(null);
        setCurrentLoadingText('We had trouble searching. Try a different phrase.');
      } finally {
        setSearching(false);
      }
    },
    [advancedFilters, selectedCity, selectedCategory]
  );

  const performAISearch = useCallback(async (query: string) => {
    setSubmittedQuery(query); // Store the submitted query
    // Match chat component: only check if empty or loading
    if (!query.trim() || searching) {
      return;
    }

    // Set initial loading text (will be updated with context-aware message after intent is parsed)
    setCurrentLoadingText('Finding the perfect spots...');

    setSearching(true);
    setSearchTier('ai-enhanced');
    setSearchIntent(null);

    try {
      // Match chat component exactly - build history from existing conversation
      // Chat component maps messages array (which doesn't include current query yet due to async state)
      const historyForAPI = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // ALL queries go through AI chat - no exceptions
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userId: user?.id,
          conversationHistory: historyForAPI, // History WITHOUT current query (matches chat component)
        }),
      });

      if (!response.ok) {
        throw new Error('AI chat failed');
      }

      const data = await response.json();

      // Update search tier
      setSearchTier(data.searchTier || 'ai-chat');

      // Update conversation history for API context (not displayed)
      const userMessage = { role: 'user' as const, content: query };
      const assistantMessage = { role: 'assistant' as const, content: data.content || '', destinations: data.destinations };
      
      const newHistory = [
        ...conversationHistory,
        userMessage,
        assistantMessage
      ];
      setConversationHistory(newHistory.slice(-10)); // Keep last 10 messages for context

      // Store enhanced intent data for intelligent feedback
      if (data.intent) {
        setSearchIntent(data.intent);
        
        // Store inferred tags for refinement chips
        if (data.inferredTags) {
          setInferredTags(data.inferredTags);
        } else {
          setInferredTags(null);
        }
        
        // Fetch seasonal context if city is detected
        let seasonData = null;
        if (data.intent.city) {
          try {
            const seasonResponse = await fetch(`/api/seasonality?city=${encodeURIComponent(data.intent.city)}`);
            if (seasonResponse.ok) {
              seasonData = await seasonResponse.json();
              setSeasonalContext(seasonData);
            }
          } catch (error) {
            // Silently fail - seasonal context is optional
          }
        } else {
          setSeasonalContext(null);
        }

        // Update loading text with context-aware message based on intent
        const contextAwareText = getContextAwareLoadingMessage(
          query,
          data.intent,
          seasonData,
          userContext
        );
        setCurrentLoadingText(typeof contextAwareText === 'string' ? contextAwareText : String(contextAwareText || 'Loading...'));
      } else {
        // Fallback to context-aware message even without intent
        const contextAwareText = getContextAwareLoadingMessage(query, null, seasonalContext, userContext);
        setCurrentLoadingText(typeof contextAwareText === 'string' ? contextAwareText : String(contextAwareText || 'Loading...'));
      }

      // ONLY show the latest AI response (simple text)
      // Ensure content is always a string
      const contentText = typeof data.content === 'string' ? data.content : String(data.content || '');
      setChatResponse(contentText);
      
      // ALWAYS set destinations array
      const destinations = data.destinations || [];
      setFilteredDestinations(destinations);

      // Add messages to visual chat history
      const contextPrompt = getContextAwareLoadingMessage(query);
      const contextPromptText = typeof contextPrompt === 'string' ? contextPrompt : String(contextPrompt || '');
      setChatMessages(prev => [
        ...prev,
        { type: 'user', content: query },
        { type: 'assistant', content: contentText, contextPrompt: destinations.length > 0 ? contextPromptText : undefined }
      ]);
    } catch (error) {
      console.error('AI chat error:', error);
      setChatResponse('Sorry, I encountered an error. Please try again.');
      setFilteredDestinations([]);
      setSearchIntent(null);
      setSeasonalContext(null);

      // Add error message to chat
      setChatMessages(prev => [
        ...prev,
        { type: 'user', content: query },
        { type: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setSearching(false);
    }
  }, [user, searching, conversationHistory]);

  const runSearch = useCallback(
    (query: string, options: { forceAi?: boolean; forceSemantic?: boolean } = {}) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      if (options.forceAi) {
        return performAISearch(trimmed);
      }

      if (options.forceSemantic) {
        return performSemanticSearch(trimmed);
      }

      if (isLikelyNaturalLanguageQuery(trimmed)) {
        return performAISearch(trimmed);
      }

      return performSemanticSearch(trimmed);
    },
    [performAISearch, performSemanticSearch]
  );

  // Convert inferredTags to RefinementTag array
  const convertInferredTagsToRefinementTags = useCallback((
    tags: { neighborhoods?: string[]; styleTags?: string[]; priceLevel?: string; modifiers?: string[] },
    activeFilters: Set<string>,
    activeOnly: boolean
  ): RefinementTag[] => {
    const result: RefinementTag[] = [];
    
    if (tags.neighborhoods) {
      tags.neighborhoods.forEach((neighborhood) => {
        const key = `neighborhood-${neighborhood}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({
            type: 'neighborhood',
            value: neighborhood,
            label: neighborhood,
          });
        }
      });
    }
    
    if (tags.styleTags) {
      tags.styleTags.forEach((style) => {
        const key = `style-${style}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({
            type: 'style',
            value: style,
            label: style,
          });
        }
      });
    }
    
    if (tags.priceLevel) {
      const key = `price-${tags.priceLevel}`;
      const isActive = activeFilters.has(key);
      if (activeOnly ? isActive : !isActive) {
        result.push({
          type: 'price',
          value: tags.priceLevel,
          label: tags.priceLevel,
        });
      }
    }
    
    if (tags.modifiers) {
      tags.modifiers.forEach((modifier) => {
        const key = `modifier-${modifier}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({
            type: 'modifier',
            value: modifier,
            label: modifier,
          });
        }
      });
    }
    
    return result;
  }, []);

  // Handle chip click - add filter and rebuild search
  const handleChipClick = useCallback((tag: RefinementTag) => {
    const key = `${tag.type}-${tag.value}`;
    const newActiveFilters = new Set(activeFilters);
    
    if (newActiveFilters.has(key)) {
      newActiveFilters.delete(key);
            } else {
      newActiveFilters.add(key);
    }
    
    setActiveFilters(newActiveFilters);
    
    // Rebuild search query with active filters
    if (submittedQuery) {
      const filterParts: string[] = [];
      newActiveFilters.forEach((filterKey) => {
        const [type, value] = filterKey.split('-', 2);
        filterParts.push(value);
      });
      
      const enhancedQuery = filterParts.length > 0
        ? `${submittedQuery} ${filterParts.join(' ')}`
        : submittedQuery;

      runSearch(enhancedQuery, { forceSemantic: true });
    }
  }, [activeFilters, submittedQuery, runSearch]);

  // Handle chip remove - remove filter and rebuild search
  const handleChipRemove = useCallback((tag: RefinementTag) => {
    const key = `${tag.type}-${tag.value}`;
    const newActiveFilters = new Set(activeFilters);
    newActiveFilters.delete(key);
    setActiveFilters(newActiveFilters);
    
    // Rebuild search query without removed filter
    if (submittedQuery) {
      const filterParts: string[] = [];
      newActiveFilters.forEach((filterKey) => {
        const [type, value] = filterKey.split('-', 2);
        filterParts.push(value);
      });
      
      const enhancedQuery = filterParts.length > 0
        ? `${submittedQuery} ${filterParts.join(' ')}`
        : submittedQuery;

      runSearch(enhancedQuery, { forceSemantic: true });
    }
  }, [activeFilters, submittedQuery, runSearch]);

  // Handle location changes from Near Me filter
  const handleLocationChange = async (lat: number | null, lng: number | null, radius: number) => {
    if (!lat || !lng) {
      setUserLocation(null);
      setNearbyDestinations([]);
      return;
    }

    setUserLocation({ lat, lng });

    try {
      console.log(`[Near Me] Fetching destinations within ${radius}km of ${lat}, ${lng}`);
      const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`);
      const data = await response.json();

      if (data.error) {
        console.error('[Near Me] API error:', data.error, data.details);
        setNearbyDestinations([]);
        return;
      }

      console.log(`[Near Me] Found ${data.count} destinations`, data.usesFallback ? '(using fallback)' : '(using database function)');

      if (data.destinations) {
        setNearbyDestinations(data.destinations);
      } else {
        setNearbyDestinations([]);
      }
    } catch (error) {
      console.error('[Near Me] Error fetching nearby destinations:', error);
      setNearbyDestinations([]);
    }
  };

  // Pinterest-like recommendation algorithm
const getRecommendationScore = (dest: Destination, index: number): number => {
    let score = 0;

    // Priority signals (like Pinterest's quality score)
    if (dest.crown) score += 20; // Crown badge = featured (reduced from 50)
    if (dest.image) score += 10; // Images get boost
    // Michelin stars are displayed but don't affect ranking

    // Category diversity bonus (ensures mixed content like Pinterest)
    const categoryBonus = (index % 7) * 5; // Rotate through categories (increased from 2)
    score += categoryBonus;

  // Random discovery factor (increased for more serendipity) - deterministic per destination
  const randomKey = dest.slug || dest.id?.toString() || `idx-${index}`;
  score += deterministicRandomFromString(randomKey) * 30;

    return score;
  };

  // Helper function to check if Supabase error should be ignored (common pattern)
  const isIgnorableSupabaseError = useCallback((error: any): boolean => {
    if (!error) return false;
    const message = error.message || String(error);
    return message.includes('hostname') || 
           message.includes('Failed to fetch') || 
           message.includes('invalid.supabase') ||
           message.includes('timeout') ||
           message.includes('Network') ||
           message.includes('connection') ||
           message.includes('Connection lost') ||
           message.includes('network connection was lost');
  }, []);

  // Memoized filter function to avoid recreating on every render
  // Helper function to filter destinations with explicit data (avoids stale state)
  // Accepts current filter values to avoid closure issues
  // MOVED BEFORE fetchDestinations to fix "used before declaration" error

  // OPTIMIZATION: Memoize filtered destinations to avoid recalculating on every render
  const filteredDestinationsMemo = useMemo(() => {
    return filterDestinationsWithData(destinations);
  }, [destinations, filterDestinationsWithData]);

  // Update filtered destinations when memoized value changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDestinations(filteredDestinationsMemo);
    }
  }, [filteredDestinationsMemo, searchTerm]);

  const filterDestinations = useCallback(() => {
    const filtered = filterDestinationsWithData(destinations);
    setFilteredDestinations(filtered);
  }, [destinations, filterDestinationsWithData]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    // Prevent infinite loops: only auto-search if not already searching and not already submitted
    if (trimmed.length > 0 && !searching && !submittedQuery) {
      const timer = setTimeout(() => {
        // Double-check we're still not searching/submitted before running
        if (!searching && !submittedQuery) {
          runSearch(trimmed);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Only clear search-related state if we're transitioning FROM a search TO no search
    // Don't clear filteredDestinations on initial load - let fetchDestinations handle it
    if (trimmed.length === 0 && !searching && submittedQuery) {
      // User cleared the search - restore to browse mode
      // Don't clear filteredDestinations here - let the filter logic handle it
      // filteredDestinations will be updated by the useEffect that watches filteredDestinationsMemo
      setChatResponse('');
      setConversationHistory([]);
      setSearching(false);
      setSubmittedQuery('');
      setChatMessages([]);
      setSearchTier(null);
      setSearchIntent(null);
      setSeasonalContext(null);
      setInferredTags(null);
      setCurrentLoadingText(loadingTextVariants[0]);
      filterDestinations();
      setCurrentPage(1);
    }
  }, [searchTerm, runSearch, filterDestinations, searching, submittedQuery]);

  useEffect(() => {
    if (!submittedQuery) {
      if (!searching) {
        setScreenReaderMessage('');
      }
      return;
    }

    if (searching) {
      setScreenReaderPriority('assertive');
      setScreenReaderMessage(`Searching for ${submittedQuery}...`);
      return;
    }

    const resultText =
      resultsCount === 0
        ? `No destinations found for ${submittedQuery}.`
        : `${resultsCount} ${resultsCount === 1 ? 'destination' : 'destinations'} found for ${submittedQuery}.`;
    setScreenReaderPriority('polite');
    setScreenReaderMessage(resultText);
  }, [resultsCount, searching, submittedQuery]);

  // Use cities from state (loaded from fetchFilterData or fetchDestinations)
  // Limit to 2 rows of cities (approximately 10-12 cities per row on desktop)
  const MAX_INLINE_CATEGORY_COUNT = 12;
  const inlineCityButtons = FEATURED_CITY_SLUGS.filter((city) =>
    cities.some((availableCity) => availableCity.toLowerCase() === city)
  );
  const overflowCityButtons = cities.filter(
    (city) => !FEATURED_CITY_SET.has(city.toLowerCase())
  );
  const inlineCategoryButtons = categories.slice(0, MAX_INLINE_CATEGORY_COUNT);
  const overflowCategoryButtons = categories.slice(MAX_INLINE_CATEGORY_COUNT);
  const showBrowseLists = !submittedQuery && searchTerm.trim().length === 0;

  return (
    <ErrorBoundary>
      <ScreenReaderAnnouncements message={screenReaderMessage} priority={screenReaderPriority} />
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://www.urbanmanual.co/#organization',
                name: 'The Urban Manual',
                url: 'https://www.urbanmanual.co',
                description: 'Curated guide to world\'s best hotels, restaurants & travel destinations',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.urbanmanual.co/logo.png',
                },
              },
              {
                '@type': 'WebSite',
                '@id': 'https://www.urbanmanual.co/#website',
                url: 'https://www.urbanmanual.co',
                name: 'The Urban Manual',
                publisher: {
                  '@id': 'https://www.urbanmanual.co/#organization',
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://www.urbanmanual.co/search?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }),
        }}
      />
      <main id="main-content" className="relative min-h-screen dark:text-white" role="main">
        {/* SEO H1 - Visually hidden but accessible to search engines */}
        <h1 className="sr-only">Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual</h1>
        {/* Hero Section - Separate section, never overlaps with grid */}
        <section className="min-h-[65vh] flex flex-col px-6 md:px-10 lg:px-12 py-16 md:py-24 pb-8 md:pb-12">
          <div className="w-full flex md:justify-start flex-1">
            <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col">
              {/* Greeting - Always at the top */}
              <div className="w-full">
                {/* Show GreetingHero first - Always at top */}
                {!submittedQuery && (
                  <>
                    {/* Session Resume - Show if there's a recent session */}
                    {showSessionResume && lastSession && (
                      <div className="mb-6">
                        <SessionResume
                          session={lastSession}
                          onResume={handleResumeSession}
                          onDismiss={() => setShowSessionResume(false)}
                        />
                      </div>
                    )}

                    {/* Context Cards - Show user's saved preferences */}
                    {userContext && user && !searchTerm && (
                      <div className="mb-6">
                        <ContextCards context={userContext} />
                      </div>
                    )}
                  </>
                )}

                <GreetingHero
                  searchQuery={searchTerm}
                  onSearchChange={(value) => {
                    setSearchTerm(value);
                    // Clear conversation history only if search is cleared
                    if (!value.trim()) {
                      setConversationHistory([]);
                      setSearchIntent(null);
                      setSeasonalContext(null);
                      setSearchTier(null);
                      setChatResponse('');
                      setFilteredDestinations([]);
                      setSubmittedQuery('');
                    }
                  }}
                  onSubmit={(query) => {
                    if (query.trim() && !searching) {
                      runSearch(query);
                    }
                  }}
                  userName={(function () {
                    const raw = ((user?.user_metadata as any)?.name || (user?.email ? user.email.split('@')[0] : undefined)) as string | undefined;
                    if (!raw) return undefined;
                    return raw
                      .split(/[\s._-]+/)
                      .filter(Boolean)
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ');
                  })()}
                  userProfile={userProfile}
                  lastSession={lastSession}
                  enrichedContext={enrichedGreetingContext}
                  isAIEnabled={isAIEnabled}
                  isSearching={searching}
                  filters={advancedFilters}
                  onFiltersChange={(newFilters) => {
                    setAdvancedFilters(newFilters);
                    // Sync with legacy state for backward compatibility
                    if (newFilters.city !== undefined) {
                      setSelectedCity(newFilters.city || '');
                    }
                    if (newFilters.category !== undefined) {
                      setSelectedCategory(newFilters.category || '');
                    }
                    // Track filter changes
                    Object.entries(newFilters).forEach(([key, value]) => {
                      if (value !== undefined && value !== null && value !== '') {
                        trackFilterChange({ filterType: key, value });
                      }
                    });
                  }}
                  availableCities={cities}
                  availableCategories={categories}
                />

                {/* Chat messages below greeting - Keep greeting at top */}
                {submittedQuery && (
                  <div className="mt-6">
                      {/* Loading State - Show when searching */}
                      {searching && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left mb-4">
                          <div className="flex items-center gap-2">
                            {discoveryEngineLoading && (
                              <div className="flex gap-1">
                                <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}>.</span>
                              </div>
                            )}
                            <span>{typeof currentLoadingText === 'string' ? currentLoadingText : String(currentLoadingText || 'Loading...')}</span>
                          </div>
                        </div>
                      )}

                      {/* Scrollable chat history - Fixed height for about 2 message pairs */}
                      {(chatMessages.length > 0 || chatResponse) && (
                        <div
                          ref={chatContainerRef}
                          className="max-h-[300px] overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
                        >
                          {chatMessages.map((message, index) => (
                            <div key={index} className="space-y-2">
                              {message.type === 'user' ? (
                                <div className="text-left text-xs uppercase tracking-[2px] font-medium text-black dark:text-white">
                                  {typeof message.content === 'string' ? message.content : String(message.content || '')}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {message.content && typeof message.content === 'string' && (
                                    <MarkdownRenderer
                                      content={message.content}
                                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left"
                                    />
                                  )}
                                  {message.contextPrompt && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed text-left italic">
                                      {typeof message.contextPrompt === 'string' ? message.contextPrompt : String(message.contextPrompt || '')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Show chatResponse if no messages yet but response exists */}
                          {chatMessages.length === 0 && chatResponse && !searching && typeof chatResponse === 'string' && (
                            <div className="space-y-4">
                              <MarkdownRenderer
                                content={chatResponse}
                                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Refinement Chips - Active Filters */}
                      {inferredTags && !searching && (() => {
                        const activeTags = convertInferredTagsToRefinementTags(inferredTags, activeFilters, true);
                        if (activeTags.length === 0) return null;
                        return (
                          <div className="mb-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Filtered by:</div>
                            <RefinementChips
                              tags={activeTags}
                              onChipClick={(tag) => handleChipClick(tag)}
                              onChipRemove={(tag) => handleChipRemove(tag)}
                              activeTags={activeFilters}
                            />
                          </div>
                        );
                      })()}

                      {/* Refinement Chips - Suggestions */}
                      {inferredTags && !searching && (() => {
                        const suggestionTags = convertInferredTagsToRefinementTags(inferredTags, activeFilters, false);
                        if (suggestionTags.length === 0) return null;
                        return (
                          <div className="mb-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions:</div>
                            <RefinementChips
                              tags={suggestionTags}
                              onChipClick={(tag) => handleChipClick(tag)}
                              activeTags={activeFilters}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Follow-up input field - Chat style - Only show when there's a submitted query */}
                  {submittedQuery && !searching && chatMessages.length > 0 && (
                    <div className="relative mt-6">
                      <input
                        placeholder="Refine your search or ask a follow-up..."
                        aria-label="Refine your search or ask a follow-up"
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && followUpInput.trim()) {
                            e.preventDefault();
                            const query = followUpInput.trim();
                            skipNextSearchRef.current = true;
                            setSearchTerm(query);
                            setFollowUpInput('');
                            runSearch(query, { forceAi: true });
                          }
                        }}
                        className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60"
                      />
                    </div>
                  )}

                  {/* Intent Confirmation Chips - Always under text input */}
                  {submittedQuery && searchIntent && !searching && (
                    <div className="mt-4">
                      <IntentConfirmationChips
                        intent={searchIntent}
                        onChipRemove={(chipType, value) => {
                          // Modify the search based on what was removed
                          setSearchTerm('');
                          setSubmittedQuery('');
                          setSearchIntent(null);
                          setInferredTags(null);
                          setActiveFilters(new Set());
                        }}
                        editable={true}
                      />
                    </div>
                  )}
                      
                      {/* City and Category Lists - Full width, positioned under greeting */}
                      {showBrowseLists && (
                        <div className="w-full mt-10 space-y-10">
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500">Cities</div>
                <div className="flex flex-wrap gap-x-4 md:gap-x-5 gap-y-3 text-xs">
                  <button
                    onClick={() => handleCitySelect(null)}
                    className={`transition-all duration-200 ease-out ${
                      !selectedCity
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    All Cities
                  </button>
                  {inlineCityButtons.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={`transition-all duration-200 ease-out ${
                        selectedCity === city
                          ? 'font-medium text-black dark:text-white'
                          : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                      }`}
                    >
                      {capitalizeCity(city)}
                    </button>
                  ))}
                </div>
                {overflowCityButtons.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <button
                      onClick={() => setShowAllCities(prev => !prev)}
                      className="text-xs font-medium text-black/40 transition-colors duration-200 ease-out hover:text-black/70 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showAllCities
                        ? '− Hide additional cities'
                        : `+ More cities (${overflowCityButtons.length})`}
                    </button>
                    {showAllCities && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-wrap gap-x-4 gap-y-3 text-xs">
                          {overflowCityButtons.map((city) => (
                            <button
                              key={city}
                              onClick={() => handleCitySelect(city)}
                              className={`transition-all duration-200 ease-out ${
                                selectedCity === city
                                  ? 'font-medium text-black dark:text-white'
                                  : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                              }`}
                            >
                              {capitalizeCity(city)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500">Categories</div>
                <div className="flex flex-wrap gap-x-4 md:gap-x-5 gap-y-3 text-xs">
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`transition-all duration-200 ease-out ${
                      !selectedCategory && !advancedFilters.michelin
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    All Categories
                  </button>
                  <button
                    onClick={() => handleCategorySelect(null, { michelin: true })}
                    className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                      advancedFilters.michelin
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    <img
                      src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                      alt="Michelin star"
                      className="h-3 w-3"
                    />
                    Michelin
                  </button>
                  {inlineCategoryButtons.map((category) => {
                    const IconComponent = getCategoryIcon(category);
                    return (
                      <button
                        key={category}
                        onClick={() => handleCategorySelect(category)}
                        className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                          selectedCategory === category && !advancedFilters.michelin
                            ? 'font-medium text-black dark:text-white'
                            : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                        }`}
                      >
                        {IconComponent && <IconComponent className="h-3 w-3" size={12} />}
                        {capitalizeCategory(category)}
                      </button>
                    );
                  })}
                </div>
                {overflowCategoryButtons.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <button
                      onClick={() => setShowAllCategories(prev => !prev)}
                      className="text-xs font-medium text-black/40 transition-colors duration-200 ease-out hover:text-black/70 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showAllCategories
                        ? '− Hide additional categories'
                        : `+ More categories (${overflowCategoryButtons.length})`}
                    </button>
                    {showAllCategories && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-wrap gap-x-4 gap-y-3 text-xs">
                          {overflowCategoryButtons.map((category) => {
                            const IconComponent = getCategoryIcon(category);
                            return (
                              <button
                                key={category}
                                onClick={() => handleCategorySelect(category)}
                                className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                                  selectedCategory === category && !advancedFilters.michelin
                                    ? 'font-medium text-black dark:text-white'
                                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                                }`}
                              >
                                {IconComponent && <IconComponent className="h-3 w-3" size={12} />}
                                {capitalizeCategory(category)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
                        </div>
                      )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Section - Grid directly below hero */}
        <div className="w-full px-5 md:px-10 lg:px-12 pb-24 md:pb-32">
                <div className="max-w-[1800px] mx-auto">
                {/* Filter, Start Trip, and View Toggle */}
                <div className="flex justify-end items-center gap-2 mb-6 md:mb-10 flex-wrap">
                  <SearchFiltersComponent
                    filters={advancedFilters}
                    onFiltersChange={(newFilters) => {
                      setAdvancedFilters(newFilters);
                      if (newFilters.city !== undefined) {
                        setSelectedCity(newFilters.city || '');
                      }
                      if (newFilters.category !== undefined) {
                        setSelectedCategory(newFilters.category || '');
                      }
                      // Connect filter search query to homepage search term
                      if (newFilters.searchQuery !== undefined) {
                        setSearchTerm(newFilters.searchQuery || '');
                      }
                      Object.entries(newFilters).forEach(([key, value]) => {
                        if (value !== undefined && value !== null && value !== '') {
                          trackFilterChange({ filterType: key, value });
                        }
                      });
                    }}
                    availableCities={cities}
                    availableCategories={categories}
                    onLocationChange={handleLocationChange}
                    triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                    activeTriggerClassName="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                    iconClassName="h-4 w-4"
                    label="Filters"
                  />
                  <button
                    onClick={() => setShowTripPlanner(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                    aria-label="Start a trip"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Start a Trip</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                        viewMode === 'grid'
                          ? 'border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-900/60'
                      }`}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span>Grid</span>
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                        viewMode === 'map'
                          ? 'border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-900/60'
                      }`}
                      aria-label="Map view"
                    >
                      <Map className="h-4 w-4" />
                      <span>Map</span>
                    </button>
                  </div>
                </div>
            
            {/* Browse lists rendered within the hero above */}
            {user && !submittedQuery && !selectedCity && !selectedCategory && (
              <div className="mb-12 md:mb-16">
                <SmartRecommendations
                onCardClick={(destination) => {
                  setSelectedDestination(destination);
                  setIsDrawerOpen(true);

                  // Track destination click
                  trackDestinationClick({
                    destinationSlug: destination.slug,
                    position: 0,
                    source: 'smart_recommendations',
                  });

                  // Also track with new analytics system
                  if (destination.id) {
                    import('@/lib/analytics/track').then(({ trackEvent }) => {
                      trackEvent({
                        event_type: 'click',
                        destination_id: destination.id,
                        destination_slug: destination.slug,
                        metadata: {
                          category: destination.category,
                          city: destination.city,
                          source: 'smart_recommendations',
                        },
                      });
                    });
                  }

                  // Track click event to Discovery Engine for personalization
                  if (user?.id) {
                    fetch('/api/discovery/track-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user.id,
                        eventType: 'click',
                        documentId: destination.slug,
                        source: 'smart_recommendations',
                      }),
                    }).catch((error) => {
                      console.warn('Failed to track Discovery Engine event:', error);
                    });
                  }
                }}
              />
              </div>
            )}
            
            {/* Trending Section - Show when no active search */}
            {!submittedQuery && (
              <div className="mb-12 md:mb-16">
              <TrendingSection />
              </div>
            )}

            {/* Near Me - No Results Message */}
            {advancedFilters.nearMe && userLocation && nearbyDestinations.length === 0 && (
              <div className="text-center py-12 px-4">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No destinations found nearby
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                  We couldn't find any destinations within {advancedFilters.nearMeRadius || 5}km of your location.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                  This feature requires destination coordinates to be populated.
                  <br />
                  See <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/DEPLOYMENT_GUIDE.md</code> for setup instructions.
                </p>
              </div>
            )}

            {/* Destination Grid - Original design */}
                {(() => {
              // Always render the grid structure, even if empty (for instant page load)
              // Show empty state if no destinations
              if (displayDestinations.length === 0 && !advancedFilters.nearMe) {
                return (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Loading destinations...
                    </p>
                  </div>
                );
              }
              
              if (displayDestinations.length === 0 && advancedFilters.nearMe) {
                return null; // Message shown above
              }

              if (viewMode !== 'grid') {
                return null;
              }

              // Pagination calculation - use memoized totalPages
              const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
              const endIndex = Math.min(startIndex + itemsPerPage, totalDestinations);
              const paginatedDestinations = displayDestinations.slice(startIndex, endIndex);

              return (
                <>
                  <div className="mt-16 grid grid-cols-2 gap-5 items-start sm:grid-cols-3 md:grid-cols-4 md:gap-7 lg:grid-cols-5 lg:gap-8 xl:grid-cols-6 2xl:grid-cols-7" data-name="destination-grid">
                    {paginatedDestinations.map((destination, index) => {
                      const isVisited = !!(user && visitedSlugs.has(destination.slug));
                      const globalIndex = startIndex + index;

                      return (
                        <DestinationCard
                          key={destination.slug}
                          destination={destination}
                          onClick={() => {
                            setSelectedDestination(destination);
                            setIsDrawerOpen(true);

                            // Track destination click
                            trackDestinationClick({
                              destinationSlug: destination.slug,
                              position: globalIndex,
                              source: 'grid',
                            });

                            // Also track with new analytics system
                            if (destination.id) {
                              import('@/lib/analytics/track').then(({ trackEvent }) => {
                                trackEvent({
                                  event_type: 'click',
                                  destination_id: destination.id,
                                  destination_slug: destination.slug,
                                  metadata: {
                                    category: destination.category,
                                    city: destination.city,
                                    source: 'homepage_grid',
                                    position: globalIndex,
                                  },
                                });
                              });
                            }

                            // Track click event to Discovery Engine for personalization
                            if (user?.id) {
                              fetch('/api/discovery/track-event', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: user.id,
                                  eventType: 'click',
                                  documentId: destination.slug,
                                }),
                              }).catch((error) => {
                                console.warn('Failed to track click event:', error);
                              });
                            }
                          }}
                          index={globalIndex}
                          isVisited={isVisited}
                          showBadges={true}
                        />
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 w-full flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 sm:px-5 py-2.5 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 sm:px-3.5 py-2.5 text-xs rounded-2xl transition-all duration-200 ease-out ${
                                currentPage === pageNum
                                  ? 'bg-black dark:bg-white text-white dark:text-black font-medium shadow-sm'
                                  : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm font-medium'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 sm:px-5 py-2.5 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>

                      <span className="hidden sm:inline-block ml-4 text-xs text-gray-500 dark:text-gray-400">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
                </div>
          </div>

          {/* Map Mode Overlay */}
          {viewMode === 'map' && (
            <div className="fixed inset-0 z-[70] flex flex-col bg-black/80">
              <div className="relative flex-1 bg-black">
                <MapView
                  destinations={displayDestinations}
                  onMarkerClick={(dest) => {
                    setSelectedDestination(dest);
                    setIsDrawerOpen(true);
                  }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3">
                  <div className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-gray-900 shadow-sm backdrop-blur dark:bg-gray-900/80 dark:text-white">
                    Map mode
                  </div>
                  <button
                    onClick={() => setViewMode('grid')}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-gray-900 shadow-md transition hover:bg-white dark:bg-gray-900/80 dark:text-white"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Back to list
                  </button>
                </div>
              </div>
              <div className="relative w-full max-w-3xl mx-auto rounded-t-[32px] border border-gray-200/90 bg-white px-6 py-6 pb-safe-area shadow-[0_-28px_60px_rgba(15,23,42,0.35)] dark:border-gray-800/80 dark:bg-gray-950">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Explore on the map</h3>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Pan, zoom, and tap a pin to open its details without leaving map mode.
                    </p>
                  </div>
                  <button
                    onClick={() => setViewMode('grid')}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    View grid
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Destination Drawer */}
          <DestinationDrawer
            destination={selectedDestination}
            isOpen={isDrawerOpen}
            onClose={() => {
              // Sort visited items to the back when closing
            const visitedSortingSet = initialVisitedSlugsRef.current ?? visitedSlugs;
              setFilteredDestinations(prev => {
                const sorted = [...prev].sort((a, b) => {
                const aVisited = user && visitedSortingSet.has(a.slug);
                const bVisited = user && visitedSortingSet.has(b.slug);
                  if (aVisited && !bVisited) return 1;
                  if (!aVisited && bVisited) return -1;
                  return 0;
                });
                return sorted;
              });
              setIsDrawerOpen(false);
              setTimeout(() => setSelectedDestination(null), 300);
            }}
            onVisitToggle={(slug, visited) => {
              // Update visited slugs
              setVisitedSlugs(prev => {
                const newSet = new Set(prev);
                if (visited) {
                  newSet.add(slug);
                  if (!initialVisitedSlugsRef.current) {
                    initialVisitedSlugsRef.current = new Set(newSet);
                  } else {
                    initialVisitedSlugsRef.current = new Set(initialVisitedSlugsRef.current);
                    initialVisitedSlugsRef.current.add(slug);
                  }
                } else {
                  newSet.delete(slug);
                  if (initialVisitedSlugsRef.current) {
                    initialVisitedSlugsRef.current = new Set(initialVisitedSlugsRef.current);
                    initialVisitedSlugsRef.current.delete(slug);
                  }
                }
                return newSet;
              });
            }}
          />

          {/* Trip Planner Modal */}
          <TripPlanner
            isOpen={showTripPlanner}
            onClose={() => setShowTripPlanner(false)}
          />
      </main>
    </ErrorBoundary>
  );
}
