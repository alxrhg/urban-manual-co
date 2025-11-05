'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

export function OnboardingWelcome() {
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [destinations, setDestinations] = useState<any[]>([]);

  useEffect(() => {
    const onboardingComplete = searchParams.get('onboarding_complete');

    if (onboardingComplete === 'true') {
      setIsVisible(true);

      // Fetch personalized first recommendations
      fetch('/api/onboarding/first-recommendations')
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            setWelcomeMessage(data.message);
          }
          if (data.destinations) {
            setDestinations(data.destinations);
          }
        })
        .catch(err => {
          console.error('Failed to fetch first recommendations:', err);
          setWelcomeMessage('Welcome! Start exploring personalized places just for you.');
        });

      // Remove query param from URL without refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('onboarding_complete');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-0 right-0 z-40 px-6 md:px-10"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-black dark:bg-white text-white dark:text-black rounded-2xl p-6 shadow-xl border-2 border-black dark:border-white">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2">
                    🎉 You're all set!
                  </h3>
                  <p className="text-sm mb-4 opacity-90">
                    {welcomeMessage || 'Welcome! Start exploring personalized places just for you.'}
                  </p>

                  {destinations.length > 0 && (
                    <div className="text-xs opacity-80">
                      <p className="mb-2">We've found {destinations.length} perfect places to start your journey.</p>
                      <p>Scroll down to explore your personalized recommendations.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-2 hover:opacity-70 transition-opacity rounded-lg"
                  aria-label="Dismiss"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
