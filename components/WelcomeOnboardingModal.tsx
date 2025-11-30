'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Heart, Plane, Sparkles, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

const TRAVEL_STYLES = [
  { id: 'Luxury', label: 'Luxury', icon: '✨', description: 'Five-star experiences' },
  { id: 'Budget', label: 'Budget', icon: '💰', description: 'Best value finds' },
  { id: 'Adventure', label: 'Adventure', icon: '🏔️', description: 'Off the beaten path' },
  { id: 'Relaxation', label: 'Relaxation', icon: '🧘', description: 'Peaceful retreats' },
  { id: 'Balanced', label: 'Balanced', icon: '⚖️', description: 'Mix of everything' },
];

const INTERESTS = [
  { id: 'Michelin Stars', label: 'Michelin Dining', icon: '⭐' },
  { id: 'Rooftop Bars', label: 'Rooftop Bars', icon: '🍸' },
  { id: 'Boutique Hotels', label: 'Boutique Hotels', icon: '🏨' },
  { id: 'Street Food', label: 'Street Food', icon: '🍜' },
  { id: 'Architecture', label: 'Architecture', icon: '🏛️' },
  { id: 'Art Galleries', label: 'Art & Museums', icon: '🎨' },
  { id: 'Shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'Nightlife', label: 'Nightlife', icon: '🌙' },
  { id: 'Spas', label: 'Wellness & Spas', icon: '💆' },
  { id: 'Nature', label: 'Nature & Parks', icon: '🌿' },
];

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'style', title: 'Travel Style' },
  { id: 'interests', title: 'Interests' },
  { id: 'complete', title: 'Ready' },
];

interface WelcomeOnboardingModalProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function WelcomeOnboardingModal({ onComplete, forceShow = false }: WelcomeOnboardingModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<string>('Balanced');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check if we should show the onboarding modal
    async function checkOnboarding() {
      if (forceShow) {
        setIsOpen(true);
        return;
      }

      if (!user) return;

      // Check localStorage first for quick check
      const hasSeenOnboarding = localStorage.getItem('um_onboarding_complete');
      if (hasSeenOnboarding) return;

      // Check if user has a profile with preferences set
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('travel_style, interests, onboarding_completed')
          .eq('user_id', user.id)
          .single();

        // Show onboarding if no profile or onboarding not completed
        if (!profile || !profile.onboarding_completed) {
          // Check if this is a new user (created within last 24 hours)
          const createdAt = new Date(user.created_at || Date.now());
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceCreation < 24 || !profile?.travel_style) {
            setIsOpen(true);
          }
        } else {
          // Mark as complete in localStorage to avoid future checks
          localStorage.setItem('um_onboarding_complete', 'true');
        }
      } catch (error) {
        // If error, don't show modal
        console.error('Error checking onboarding status:', error);
      }
    }

    checkOnboarding();
  }, [user, forceShow]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('um_onboarding_complete', 'true');
    onComplete?.();
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    if (!user) {
      handleClose();
      return;
    }

    setSaving(true);
    try {
      // Save preferences to user profile
      await supabase.from('user_profiles').upsert(
        {
          user_id: user.id,
          travel_style: selectedStyle,
          interests: selectedInterests,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

      localStorage.setItem('um_onboarding_complete', 'true');
      setIsOpen(false);
      onComplete?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Still close the modal
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="absolute top-4 left-4 right-16 flex gap-1">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= step
                  ? 'bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="pt-12 pb-6 px-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Welcome to Urban Manual
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Your curated guide to the world&apos;s best destinations.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Let&apos;s personalize your experience in just 2 quick steps.
              </p>

              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span>900+ Destinations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-blue-500" />
                  <span>50+ Cities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Travel Style */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                What&apos;s your travel style?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This helps us recommend the right places for you.
              </p>

              <div className="space-y-3">
                {TRAVEL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{style.icon}</span>
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {style.label}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {style.description}
                      </div>
                    </div>
                    {selectedStyle === style.id && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                What interests you most?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Select as many as you like. You can change these later.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      selectedInterests.includes(interest.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{interest.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {interest.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                You&apos;re all set!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                We&apos;ll personalize your recommendations based on your preferences.
              </p>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-left">
                <div className="mb-3">
                  <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Travel Style
                  </span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {TRAVEL_STYLES.find((s) => s.id === selectedStyle)?.icon}{' '}
                    {selectedStyle}
                  </div>
                </div>
                {selectedInterests.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Interests
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedInterests.map((interest) => {
                        const interestData = INTERESTS.find((i) => i.id === interest);
                        return (
                          <span
                            key={interest}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 rounded-lg text-sm"
                          >
                            {interestData?.icon} {interestData?.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-4">
          {step > 0 && step < 3 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step < 3 && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? (
                'Saving...'
              ) : step === 3 ? (
                'Start Exploring'
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
