'use client';

import { useState, useEffect, useCallback, useMemo, ReactNode, createContext, useContext, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Destination } from '@/types/destination';
import { createClient } from '@/lib/supabase/client';
import { useItemsPerPage } from '@/hooks/useGridColumns';

/**
 * Homepage Data Provider with Full Features
 *
 * Provides:
 * - Data loading with fallback (Supabase -> Static JSON)
 * - Pagination (page-based, 4 rows per page)
 * - City/Category filtering
 * - Search functionality
 * - View mode (grid/map)
 * - Destination drawer state
 */

interface HomepageDataContextType {
  // Data
  destinations: Destination[];
  filteredDestinations: Destination[];
  displayedDestinations: Destination[];
  cities: string[];
  categories: string[];

  // State
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  selectedCity: string;
  selectedCategory: string;
  searchTerm: string;
  viewMode: 'grid' | 'map';

  // Drawer state
  selectedDestination: Destination | null;
  isDrawerOpen: boolean;

  // AI Chat state
  isAIChatOpen: boolean;

  // Advanced filters
  michelinOnly: boolean;
  crownOnly: boolean;

  // Actions
  setCurrentPage: (page: number) => void;
  setSelectedCity: (city: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchTerm: (term: string) => void;
  setViewMode: (mode: 'grid' | 'map') => void;
  clearFilters: () => void;
  openDestination: (destination: Destination) => void;
  closeDrawer: () => void;
  openAIChat: () => void;
  closeAIChat: () => void;
  setMichelinOnly: (value: boolean) => void;
  setCrownOnly: (value: boolean) => void;
}

const HomepageDataContext = createContext<HomepageDataContextType | null>(null);

export function useHomepageData() {
  const context = useContext(HomepageDataContext);
  if (!context) {
    throw new Error('useHomepageData must be used within HomepageDataProvider');
  }
  return context;
}

interface HomepageDataProviderProps {
  children: ReactNode;
  serverDestinations: Destination[];
  serverCities: string[];
  serverCategories: string[];
}

/**
 * Extract unique cities and categories from destinations
 */
function extractFilters(destinations: Destination[]): { cities: string[]; categories: string[] } {
  const citySet = new Set<string>();
  const categorySet = new Set<string>();

  destinations.forEach((dest) => {
    const city = (dest.city ?? '').toString().trim();
    const category = (dest.category ?? '').toString().trim();
    if (city) citySet.add(city);
    if (category) categorySet.add(category);
  });

  return {
    cities: Array.from(citySet).sort(),
    categories: Array.from(categorySet).sort(),
  };
}

function HomepageDataProviderInner({
  children,
  serverDestinations,
  serverCities,
  serverCategories,
}: HomepageDataProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core data state
  const [destinations, setDestinations] = useState<Destination[]>(serverDestinations);
  const [cities, setCities] = useState<string[]>(serverCities);
  const [categories, setCategories] = useState<string[]>(serverCategories);
  const [isLoading, setIsLoading] = useState(serverDestinations.length === 0);

  // Filter state
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useItemsPerPage(4); // 4 rows

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Drawer state
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // AI Chat state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Advanced filters
  const [michelinOnly, setMichelinOnly] = useState(false);
  const [crownOnly, setCrownOnly] = useState(false);

  // Initialize view mode from URL
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'map') setViewMode('map');
    else if (viewParam === 'grid') setViewMode('grid');
  }, [searchParams]);

  // Client-side fallback fetch when server data is empty
  useEffect(() => {
    if (serverDestinations.length > 0) {
      setIsLoading(false);
      return;
    }

    async function fetchClientData() {
      try {
        // Try Supabase first
        const supabase = createClient();
        const { data, error } = await supabase
          .from('destinations')
          .select(`
            id, slug, name, city, country, neighborhood, category,
            micro_description, description, image, image_thumbnail,
            michelin_stars, crown, rating, price_level, tags,
            latitude, longitude
          `)
          .order('rating', { ascending: false, nullsFirst: false })
          .limit(500);

        if (!error && data && data.length > 0) {
          setDestinations(data as Destination[]);
          const filters = extractFilters(data as Destination[]);
          setCities(filters.cities);
          setCategories(filters.categories);
          setIsLoading(false);
          return;
        }

        // Fallback to static JSON
        console.log('[Client] Trying /destinations.json fallback');
        const response = await fetch('/destinations.json');
        if (response.ok) {
          const jsonData = await response.json();
          const fallbackData = (Array.isArray(jsonData) ? jsonData : jsonData.destinations || []) as Destination[];
          if (fallbackData.length > 0) {
            setDestinations(fallbackData);
            const filters = extractFilters(fallbackData);
            setCities(filters.cities);
            setCategories(filters.categories);
          }
        }
      } catch (error) {
        console.error('[Client] Error fetching data:', error);
        // Try static JSON as last resort
        try {
          const response = await fetch('/destinations.json');
          if (response.ok) {
            const jsonData = await response.json();
            const fallbackData = (Array.isArray(jsonData) ? jsonData : jsonData.destinations || []) as Destination[];
            if (fallbackData.length > 0) {
              setDestinations(fallbackData);
              const filters = extractFilters(fallbackData);
              setCities(filters.cities);
              setCategories(filters.categories);
            }
          }
        } catch {
          // Silent fail
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientData();
  }, [serverDestinations]);

  // Filter destinations based on selected filters
  const filteredDestinations = useMemo(() => {
    let filtered = [...destinations];

    // Filter by city
    if (selectedCity) {
      filtered = filtered.filter(d =>
        d.city?.toLowerCase() === selectedCity.toLowerCase()
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(d =>
        d.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search term (local search)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(term) ||
        d.city?.toLowerCase().includes(term) ||
        d.category?.toLowerCase().includes(term) ||
        d.neighborhood?.toLowerCase().includes(term) ||
        d.micro_description?.toLowerCase().includes(term)
      );
    }

    // Filter by Michelin stars
    if (michelinOnly) {
      filtered = filtered.filter(d =>
        d.michelin_stars && d.michelin_stars > 0
      );
    }

    // Filter by Crown (Editor's Pick)
    if (crownOnly) {
      filtered = filtered.filter(d => d.crown === true);
    }

    return filtered;
  }, [destinations, selectedCity, selectedCategory, searchTerm, michelinOnly, crownOnly]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  // Get current page of destinations
  const displayedDestinations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDestinations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDestinations, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedCategory, searchTerm, michelinOnly, crownOnly]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedCity('');
    setSelectedCategory('');
    setSearchTerm('');
    setMichelinOnly(false);
    setCrownOnly(false);
    setCurrentPage(1);
  }, []);

  // Update URL when view mode changes
  const handleSetViewMode = useCallback((mode: 'grid' | 'map') => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode);
    router.push(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Open destination in drawer
  const openDestination = useCallback((destination: Destination) => {
    setSelectedDestination(destination);
    setIsDrawerOpen(true);
  }, []);

  // Close drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing destination to allow close animation
    setTimeout(() => setSelectedDestination(null), 300);
  }, []);

  // Open AI chat
  const openAIChat = useCallback(() => {
    setIsAIChatOpen(true);
  }, []);

  // Close AI chat
  const closeAIChat = useCallback(() => {
    setIsAIChatOpen(false);
  }, []);

  const contextValue: HomepageDataContextType = {
    destinations,
    filteredDestinations,
    displayedDestinations,
    cities,
    categories,
    isLoading,
    currentPage,
    totalPages,
    selectedCity,
    selectedCategory,
    searchTerm,
    viewMode,
    selectedDestination,
    isDrawerOpen,
    isAIChatOpen,
    michelinOnly,
    crownOnly,
    setCurrentPage,
    setSelectedCity,
    setSelectedCategory,
    setSearchTerm,
    setViewMode: handleSetViewMode,
    clearFilters,
    openDestination,
    closeDrawer,
    openAIChat,
    closeAIChat,
    setMichelinOnly,
    setCrownOnly,
  };

  return (
    <HomepageDataContext.Provider value={contextValue}>
      {children}
    </HomepageDataContext.Provider>
  );
}

// Wrap with Suspense for useSearchParams
export function HomepageDataProvider(props: HomepageDataProviderProps) {
  return (
    <Suspense fallback={null}>
      <HomepageDataProviderInner {...props} />
    </Suspense>
  );
}

export default HomepageDataProvider;
