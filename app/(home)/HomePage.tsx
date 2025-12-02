'use client';

import { useEffect, useCallback, useMemo, useState, memo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageStore, useViewMode, useFilters } from '@/lib/stores/homepage-store';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDestinations } from './hooks/useDestinations';
import { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelLayout } from '@/components/PanelMount';

// ============================================================================
// Lazy-loaded Components
// ============================================================================

const HeroSection = dynamic(() => import('./components/HeroSection'), {
  ssr: true,
  loading: () => <HeroSkeleton />,
});

const FilterBar = dynamic(() => import('./components/FilterBar'), {
  ssr: true,
  loading: () => <FilterBarSkeleton />,
});

const DestinationGrid = dynamic(() => import('./components/DestinationGrid'), {
  ssr: true,
  loading: () => <GridSkeleton />,
});

const DestinationMap = dynamic(() => import('./components/DestinationMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const DrawerManager = dynamic(() => import('@/components/drawers/DrawerManager'), {
  ssr: false,
});

// ============================================================================
// Types
// ============================================================================

export interface HomePageProps {
  initialDestinations?: Destination[];
  initialCities?: string[];
  initialCategories?: string[];
  initialTrending?: Destination[];
}

// ============================================================================
// Main HomePage Component
// ============================================================================

export const HomePage = memo(function HomePage({
  initialDestinations = [],
  initialCities = [],
  initialCategories = [],
  initialTrending = [],
}: HomePageProps) {
  // Auth
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || undefined;

  // Store state
  const { viewMode } = useViewMode();
  const { filters, activeCount } = useFilters();
  const cities = useHomepageStore((state) => state.cities);
  const categories = useHomepageStore((state) => state.categories);
  const isLoading = useHomepageStore((state) => state.isLoading);

  // Data fetching hook
  const {
    destinations,
    isSearching,
    searchDestinations,
    aiSearch,
    refresh,
  } = useDestinations({
    initialDestinations,
    initialCities,
    initialCategories,
    initialTrending,
  });

  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Search handler
  const handleSearch = useCallback((query: string) => {
    searchDestinations(query);
  }, [searchDestinations]);

  // AI search handler
  const handleAISearch = useCallback((query: string) => {
    aiSearch(query);
  }, [aiSearch]);

  // Render content based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'map':
        return (
          <div className="h-[calc(100vh-200px)] min-h-[500px]">
            <DestinationMap />
          </div>
        );

      case 'split':
        return (
          <div className="h-[calc(100vh-200px)] min-h-[500px]">
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <ResizablePanel defaultSize={50} minSize={30}>
                <ScrollArea className="h-full p-4">
                  <DestinationGrid showPagination={false} />
                </ScrollArea>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <DestinationMap showList={false} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        );

      case 'grid':
      default:
        return <DestinationGrid />;
    }
  };

  return (
    <PanelLayout defaultPanelSize={35} minPanelSize={25} maxPanelSize={50}>
      <div className="w-full min-h-screen bg-white dark:bg-gray-950" data-component="HomePage">
        {/* Main Content */}
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <section className="mb-8 md:mb-12">
            <HeroSection
              userName={userName}
              onSearch={handleSearch}
              onAISearch={handleAISearch}
              isAIEnabled={true}
              showGreeting={true}
            />
          </section>

          {/* Filter Bar */}
          <section className="mb-6">
            <FilterBar
              cities={cities.length > 0 ? cities : initialCities}
              categories={categories.length > 0 ? categories : initialCategories}
              showViewToggle={true}
            />
          </section>

          {/* Content Section */}
          <AnimatePresence mode="wait">
            <motion.section
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.section>
          </AnimatePresence>
        </main>

        {/* Drawer Manager - handles overlay mode on mobile */}
        <DrawerManager />
      </div>
    </PanelLayout>
  );
});

// ============================================================================
// Skeleton Components
// ============================================================================

function HeroSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-12" />
      <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="flex-1" />
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="aspect-video rounded-2xl bg-gray-200 dark:bg-gray-800 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="h-full w-full bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading map...</p>
      </div>
    </div>
  );
}

export default HomePage;
