/**
 * Onboarding Component
 *
 * Guides new users through key features of the app.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  MapPin,
  Heart,
  Bookmark,
  Plane,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
}

const defaultSteps: OnboardingStep[] = [
  {
    icon: <MapPin className="w-8 h-8" />,
    title: 'Discover Destinations',
    description:
      'Explore curated travel destinations from around the world. Filter by city, category, or use our smart search to find your next adventure.',
  },
  {
    icon: <Bookmark className="w-8 h-8" />,
    title: 'Save Your Favorites',
    description:
      'Bookmark places you want to visit later. Build your personal collection of must-see destinations.',
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: 'Track Your Travels',
    description:
      'Mark places as visited to build your travel history. See how much of the world you have explored.',
  },
  {
    icon: <Plane className="w-8 h-8" />,
    title: 'Plan Your Trips',
    description:
      'Create trips and organize your itinerary. Add flights, hotels, and destinations all in one place.',
  },
];

interface OnboardingProps {
  /** Custom steps (defaults to app onboarding) */
  steps?: OnboardingStep[];
  /** Callback when onboarding is completed */
  onComplete: () => void;
  /** Callback when onboarding is skipped */
  onSkip?: () => void;
  /** Whether to show the onboarding */
  isOpen: boolean;
}

export function Onboarding({
  steps = defaultSteps,
  onComplete,
  onSkip,
  isOpen,
}: OnboardingProps) {
  const [currentStep, setCurrentStep] = React.useState(0);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl',
          'w-full max-w-lg mx-4 overflow-hidden'
        )}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentStep
                    ? 'w-8 bg-black dark:bg-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Step content with animation */}
          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {step.icon}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8">
          <div className="flex gap-3">
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className={cn(isFirstStep && 'w-full', 'flex-1')}>
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage onboarding state
 */
export function useOnboarding(key = 'urban-manual-onboarding-complete') {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const completed = localStorage.getItem(key);
    setHasCompletedOnboarding(completed === 'true');
  }, [key]);

  const completeOnboarding = React.useCallback(() => {
    localStorage.setItem(key, 'true');
    setHasCompletedOnboarding(true);
  }, [key]);

  const resetOnboarding = React.useCallback(() => {
    localStorage.removeItem(key);
    setHasCompletedOnboarding(false);
  }, [key]);

  return {
    hasCompletedOnboarding,
    showOnboarding: hasCompletedOnboarding === false,
    completeOnboarding,
    resetOnboarding,
  };
}

/**
 * Feature tooltip for inline onboarding
 */
interface FeatureTooltipProps {
  /** Tooltip content */
  content: string;
  /** Whether tooltip is visible */
  isVisible: boolean;
  /** Callback to dismiss tooltip */
  onDismiss: () => void;
  /** Position relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Children (target element) */
  children: React.ReactNode;
}

export function FeatureTooltip({
  content,
  isVisible,
  onDismiss,
  position = 'bottom',
  children,
}: FeatureTooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      {children}

      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm',
            'bg-gray-900 dark:bg-white text-white dark:text-gray-900',
            'rounded-xl shadow-lg whitespace-nowrap',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionClasses[position]
          )}
        >
          {content}
          <button
            onClick={onDismiss}
            className="ml-2 text-gray-400 hover:text-white dark:hover:text-gray-900"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3 inline" />
          </button>
        </div>
      )}
    </div>
  );
}
