'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { Sparkles, MapPin, Filter, Star } from 'lucide-react';

interface Destination {
  id: number;
  name: string;
  slug?: string;
  city?: string;
  category?: string;
  image?: string;
  michelin_stars?: number;
  price_level?: number;
  rating?: number;
}

interface SmartLoadingGridProps {
  query: string;
  intent?: {
    city?: string | null;
    category?: string | null;
  };
  // All destinations from DB (we'll show a subset)
  allDestinations?: Destination[];
  onCardClick: (destination: Destination) => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'complete';
}

/**
 * Shows a loading grid that progressively filters down
 * Much clearer than a spinner - users see the AI "thinking"
 */
export function SmartLoadingGrid({
  query,
  intent,
  allDestinations = [],
  onCardClick,
}: SmartLoadingGridProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'analyze', label: 'Analyzing your query', icon: Sparkles, status: 'active' },
    { id: 'location', label: intent?.city ? `Finding places in ${intent.city}` : 'Detecting location', icon: MapPin, status: 'pending' },
    { id: 'filter', label: intent?.category ? `Filtering ${intent.category}` : 'Applying filters', icon: Filter, status: 'pending' },
    { id: 'rank', label: 'Ranking by relevance', icon: Star, status: 'pending' },
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displayCount, setDisplayCount] = useState(100); // Start with 100 items

  useEffect(() => {
    // Progress through steps every 600ms
    const timer = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(timer);
          return prev;
        }

        // Update step statuses
        setSteps(prevSteps => prevSteps.map((step, idx) => ({
          ...step,
          status: idx < prev ? 'complete' : idx === prev + 1 ? 'active' : 'pending',
        })));

        // Reduce displayed items at each step
        const reductionSteps = [100, 50, 25, 15];
        if (reductionSteps[prev + 1]) {
          setDisplayCount(reductionSteps[prev + 1]);
        }

        return prev + 1;
      });
    }, 700);

    return () => clearInterval(timer);
  }, [steps.length]);

  // Show a subset of all destinations (faded out ones that will be filtered)
  const displayedDestinations = allDestinations.slice(0, displayCount);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="relative min-h-screen pb-20">
      {/* Sticky Progress Header */}
      <div className="sticky top-0 z-30 bg-white/98 dark:bg-gray-900/98 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-5">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Processing your search
              </span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    step.status === 'active'
                      ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                      : step.status === 'complete'
                      ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      step.status === 'active'
                        ? 'bg-purple-500'
                        : step.status === 'complete'
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    {step.status === 'complete' ? (
                      <motion.svg
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </motion.svg>
                    ) : step.status === 'active' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <StepIcon className="w-4 h-4 text-white" />
                      </motion.div>
                    ) : (
                      <StepIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step.status === 'active'
                        ? 'text-purple-900 dark:text-purple-100'
                        : step.status === 'complete'
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.status === 'active' && (
                    <motion.div
                      className="ml-auto flex gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Live Count */}
          <motion.div
            key={displayCount}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 text-center py-2 px-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {displayCount}
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              places found
            </span>
          </motion.div>
        </div>
      </div>

      {/* Grid with Fading Items */}
      <div className="px-6 pt-6">
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6"
        >
          {displayedDestinations.map((destination, idx) => {
            // Items beyond current count fade out
            const isFiltered = idx >= displayCount;

            return (
              <motion.div
                key={destination.id}
                layout
                initial={{ opacity: 0.3, scale: 0.95 }}
                animate={{
                  opacity: isFiltered ? 0.2 : 1,
                  scale: isFiltered ? 0.9 : 1,
                  filter: isFiltered ? 'grayscale(100%)' : 'grayscale(0%)',
                }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  transition: { duration: 0.2 }
                }}
                transition={{
                  duration: 0.4,
                  delay: idx * 0.005, // Subtle stagger
                }}
              >
                <button
                  onClick={() => !isFiltered && onCardClick(destination)}
                  className={`${CARD_WRAPPER} text-left w-full`}
                  disabled={isFiltered}
                >
                  <div className={`${CARD_MEDIA} mb-2`}>
                    {destination.image ? (
                      <Image
                        src={destination.image}
                        alt={destination.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                        <MapPin className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    {destination.michelin_stars && destination.michelin_stars > 0 && (
                      <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                        <img
                          src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                          alt="Michelin star"
                          className="h-3 w-3"
                        />
                        <span>{destination.michelin_stars}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className={CARD_TITLE}>{destination.name}</h3>
                    <div className={CARD_META}>
                      {destination.city && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {destination.city}
                        </span>
                      )}
                      {destination.category && (
                        <>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                            {destination.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Helpful tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="px-6 py-3 bg-gray-900/90 dark:bg-gray-100/90 backdrop-blur-lg rounded-full text-white dark:text-gray-900 text-sm font-medium shadow-lg">
          Watch the grid filter down as AI processes your search 👀
        </div>
      </motion.div>
    </div>
  );
}
