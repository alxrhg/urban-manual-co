'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from './LovablyDestinationCard';
import { Sparkles, Filter, MapPin, Star, DollarSign, Tag } from 'lucide-react';

interface Destination {
  id: number;
  name: string;
  slug?: string;
  city?: string;
  category?: string;
  description?: string;
  image?: string;
  michelin_stars?: number;
  is_open_now?: boolean;
  price_level?: number;
  rating?: number;
  tags?: string[];
}

interface FilterStep {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  filterFn: (dest: Destination) => boolean;
  duration: number; // ms to show this step
}

interface ProgressiveFilteringGridProps {
  allDestinations: Destination[]; // All available destinations (e.g., 500+)
  filterSteps: FilterStep[];
  finalResults: Destination[];
  onComplete: () => void;
  onCardClick: (destination: Destination) => void;
}

export function ProgressiveFilteringGrid({
  allDestinations,
  filterSteps,
  finalResults,
  onComplete,
  onCardClick,
}: ProgressiveFilteringGridProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visibleDestinations, setVisibleDestinations] = useState<Destination[]>(allDestinations);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (currentStepIndex >= filterSteps.length) {
      // All steps complete, show final results
      setVisibleDestinations(finalResults);
      setTimeout(onComplete, 300);
      return;
    }

    const currentStep = filterSteps[currentStepIndex];

    // Apply filter after a brief delay to show the step
    const filterTimer = setTimeout(() => {
      const filtered = visibleDestinations.filter(currentStep.filterFn);
      setVisibleDestinations(filtered);
      setCompletedSteps(prev => [...prev, currentStep.label]);
    }, 400);

    // Move to next step
    const nextStepTimer = setTimeout(() => {
      setCurrentStepIndex(prev => prev + 1);
    }, currentStep.duration);

    return () => {
      clearTimeout(filterTimer);
      clearTimeout(nextStepTimer);
    };
  }, [currentStepIndex, filterSteps, visibleDestinations, finalResults, onComplete]);

  const currentStep = filterSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / (filterSteps.length + 1)) * 100;

  return (
    <div className="relative">
      {/* Progress Timeline */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 px-6 mb-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Current Step */}
        {currentStep && (
          <motion.div
            key={currentStep.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <currentStep.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {currentStep.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentStep.description}
              </p>
            </div>
            <div className="flex-shrink-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 text-purple-500" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Completed Steps Pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {completedSteps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium flex items-center gap-1"
            >
              <span>✓</span>
              <span>{step}</span>
            </motion.div>
          ))}
        </div>

        {/* Count Indicator */}
        <motion.div
          key={visibleDestinations.length}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-3 text-center"
        >
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {visibleDestinations.length}
          </span>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {visibleDestinations.length === 1 ? 'place' : 'places'}
          </span>
        </motion.div>
      </div>

      {/* Animated Grid */}
      <div className="px-6">
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {visibleDestinations.map((destination, idx) => (
              <motion.div
                key={destination.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  filter: 'blur(4px)',
                  transition: { duration: 0.2 }
                }}
                transition={{
                  duration: 0.3,
                  delay: idx * 0.01, // Stagger animation
                }}
              >
                <LovablyDestinationCard
                  destination={destination as any}
                  borderColor={LOVABLY_BORDER_COLORS[idx % LOVABLY_BORDER_COLORS.length]}
                  onClick={() => onCardClick(destination)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Hook to generate filter steps from AI intent analysis
 */
export function useFilterSteps(
  query: string,
  intent?: {
    city?: string | null;
    category?: string | null;
    priceLevel?: number | null;
    rating?: number | null;
    tags?: string[];
    michelin?: boolean;
  }
): FilterStep[] {
  return [
    {
      label: 'Analyzing your query',
      description: `Understanding "${query}"...`,
      icon: Sparkles,
      filterFn: () => true, // Keep all
      duration: 800,
    },
    ...(intent?.city ? [{
      label: `Filtering by location`,
      description: `Showing places in ${intent.city}`,
      icon: MapPin,
      filterFn: (d: Destination) =>
        d.city?.toLowerCase().includes(intent.city?.toLowerCase() || ''),
      duration: 600,
    }] : []),
    ...(intent?.category ? [{
      label: `Filtering by category`,
      description: `Finding ${intent.category} spots`,
      icon: Filter,
      filterFn: (d: Destination) =>
        d.category?.toLowerCase() === intent.category?.toLowerCase(),
      duration: 600,
    }] : []),
    ...(intent?.michelin ? [{
      label: 'Filtering Michelin-starred',
      description: 'Only showing Michelin restaurants',
      icon: Star,
      filterFn: (d: Destination) => (d.michelin_stars || 0) > 0,
      duration: 600,
    }] : []),
    ...(intent?.priceLevel ? [{
      label: 'Filtering by price',
      description: `Max price level: ${intent.priceLevel}`,
      icon: DollarSign,
      filterFn: (d: Destination) => (d.price_level || 0) <= (intent.priceLevel || 5),
      duration: 600,
    }] : []),
    ...(intent?.rating ? [{
      label: 'Filtering by rating',
      description: `Rating ${intent.rating}+ stars`,
      icon: Star,
      filterFn: (d: Destination) => (d.rating || 0) >= (intent.rating || 0),
      duration: 600,
    }] : []),
    ...(intent?.tags && intent.tags.length > 0 ? [{
      label: 'Filtering by vibe',
      description: `Looking for ${intent.tags.join(', ')}`,
      icon: Tag,
      filterFn: (d: Destination) =>
        intent.tags?.some(tag => d.tags?.includes(tag)) || false,
      duration: 600,
    }] : []),
    {
      label: 'Ranking results',
      description: 'Sorting by relevance and quality',
      icon: Star,
      filterFn: () => true, // Keep all at this stage
      duration: 500,
    },
  ];
}
