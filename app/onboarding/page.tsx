'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Coffee, UtensilsCrossed, Palette, Music, ShoppingBag, TreePine, Landmark, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// City options with hero images
const CITIES = [
  { id: 'new-york', name: 'New York', country: 'USA', emoji: '🗽' },
  { id: 'paris', name: 'Paris', country: 'France', emoji: '🗼' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', emoji: '🗾' },
  { id: 'london', name: 'London', country: 'UK', emoji: '👑' },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', emoji: '🏖️' },
  { id: 'rome', name: 'Rome', country: 'Italy', emoji: '🏛️' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', emoji: '🏙️' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', emoji: '🦁' },
];

// Interest categories with icons
const INTERESTS = [
  { id: 'food', label: 'Food & Dining', icon: UtensilsCrossed, description: 'Restaurants, cafes, food markets' },
  { id: 'coffee', label: 'Coffee & Cafes', icon: Coffee, description: 'Specialty coffee, cozy cafes' },
  { id: 'culture', label: 'Museums & Culture', icon: Palette, description: 'Art galleries, exhibitions' },
  { id: 'nightlife', label: 'Nightlife & Bars', icon: Music, description: 'Bars, clubs, live music' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, description: 'Boutiques, markets, stores' },
  { id: 'nature', label: 'Parks & Nature', icon: TreePine, description: 'Gardens, parks, outdoor spaces' },
  { id: 'history', label: 'History & Architecture', icon: Landmark, description: 'Historic sites, landmarks' },
  { id: 'photography', label: 'Photo Spots', icon: Camera, description: 'Scenic views, Instagram-worthy' },
];

// Travel style options
const TRAVEL_STYLES = [
  {
    id: 'local_expert',
    label: 'Local Expert',
    description: 'Hidden gems and insider spots',
    emoji: '🗺️'
  },
  {
    id: 'foodie',
    label: 'Foodie',
    description: 'Best restaurants and culinary experiences',
    emoji: '🍽️'
  },
  {
    id: 'culture_seeker',
    label: 'Culture Seeker',
    description: 'Museums, galleries, and cultural sites',
    emoji: '🎨'
  },
  {
    id: 'luxury_traveler',
    label: 'Luxury Traveler',
    description: 'High-end experiences and fine dining',
    emoji: '✨'
  },
  {
    id: 'budget_explorer',
    label: 'Budget Explorer',
    description: 'Great value and affordable finds',
    emoji: '💰'
  },
  {
    id: 'balanced',
    label: 'Balanced Mix',
    description: 'A bit of everything',
    emoji: '🌟'
  },
];

// Price preference options
const PRICE_LEVELS = [
  { id: 1, label: '$', description: 'Budget-friendly (under $20)' },
  { id: 2, label: '$$', description: 'Moderate ($20-50)' },
  { id: 3, label: '$$$', description: 'Upscale ($50-100)' },
  { id: 4, label: '$$$$', description: 'Luxury ($100+)' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<string>('');
  const [pricePreference, setPricePreference] = useState<number>(2); // Default to $$

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/onboarding');
    }
  }, [user, router]);

  const handleCityToggle = (cityId: string) => {
    setSelectedCities(prev =>
      prev.includes(cityId)
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return selectedCities.length > 0;
      case 2:
        return selectedInterests.length >= 3;
      case 3:
        return travelStyle !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Save preferences
      const response = await fetch('/api/account/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favoriteCities: selectedCities,
          favoriteCategories: selectedInterests,
          travelStyle,
          pricePreference,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Mark onboarding as completed
      const onboardingResponse = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });

      if (!onboardingResponse.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Get personalized first recommendations
      const recsResponse = await fetch('/api/onboarding/first-recommendations');

      if (recsResponse.ok) {
        const { destinations } = await recsResponse.json();
        // Redirect to home with first recommendations
        router.push('/?onboarding_complete=true');
      } else {
        // Still redirect even if recommendations fail
        router.push('/');
      }
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-900 z-50">
        <motion.div
          className="h-full bg-black dark:bg-white"
          initial={{ width: '0%' }}
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="px-6 md:px-10 py-12 md:py-20 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: City Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-light mb-4">
                  Let's start your journey
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  Which cities are you interested in exploring? Select all that apply.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                {CITIES.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleCityToggle(city.id)}
                    className={`
                      p-6 rounded-2xl border-2 transition-all text-left
                      ${selectedCities.includes(city.id)
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }
                    `}
                  >
                    <div className="text-3xl mb-3">{city.emoji}</div>
                    <div className="font-medium text-sm mb-1">{city.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {city.country}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500 mb-8">
                Selected: {selectedCities.length} {selectedCities.length === 1 ? 'city' : 'cities'}
              </div>
            </motion.div>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-light mb-4">
                  What brings you joy?
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  Choose at least 3 interests so we can personalize your recommendations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8">
                {INTERESTS.map((interest) => {
                  const Icon = interest.icon;
                  return (
                    <button
                      key={interest.id}
                      onClick={() => handleInterestToggle(interest.id)}
                      className={`
                        p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4
                        ${selectedInterests.includes(interest.id)
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        }
                      `}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-medium text-sm mb-1">{interest.label}</div>
                        <div className={`text-xs ${
                          selectedInterests.includes(interest.id)
                            ? 'text-gray-300 dark:text-gray-600'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {interest.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500 mb-8">
                Selected: {selectedInterests.length} / 3 minimum
              </div>
            </motion.div>
          )}

          {/* Step 3: Travel Style */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-light mb-4">
                  Your travel style
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  How do you like to explore? Choose the style that resonates most with you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8">
                {TRAVEL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setTravelStyle(style.id)}
                    className={`
                      p-6 rounded-2xl border-2 transition-all text-left
                      ${travelStyle === style.id
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }
                    `}
                  >
                    <div className="text-3xl mb-3">{style.emoji}</div>
                    <div className="font-medium text-sm mb-1">{style.label}</div>
                    <div className={`text-xs ${
                      travelStyle === style.id
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Price Preference */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-light mb-4">
                  Your budget preference
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                  Help us show you places that match your typical spending comfort.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-12">
                {PRICE_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setPricePreference(level.id)}
                    className={`
                      p-6 rounded-2xl border-2 transition-all text-left
                      ${pricePreference === level.id
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }
                    `}
                  >
                    <div className="text-2xl font-medium mb-2">{level.label}</div>
                    <div className={`text-xs ${
                      pricePreference === level.id
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {level.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  You're all set! We'll use your preferences to show you the best places.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Don't worry—you can always update these in your account settings.
                </p>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-4 mt-12">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-6 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Back
            </button>
          )}

          <button
            onClick={step === 4 ? handleComplete : handleNext}
            disabled={!canContinue() || loading}
            className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : step === 4 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-8 bg-black dark:bg-white'
                  : s < step
                    ? 'w-2 bg-black dark:bg-white opacity-30'
                    : 'w-2 bg-gray-200 dark:bg-gray-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
