'use client';

import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

/**
 * Cookie Consent Banner
 * GDPR/CCPA compliant cookie consent
 * Follows Urban Manual design system
 */

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show banner after a small delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      ...prefs,
      timestamp: new Date().toISOString(),
    }));

    // Set cookies based on preferences
    if (prefs.analytics) {
      // Enable Google Analytics or other analytics
      // window.gtag(...);
    }

    if (prefs.marketing) {
      // Enable marketing cookies
      // ...
    }

    setIsVisible(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
    });
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-t sm:border border-white/20 dark:border-gray-700/30 sm:rounded-2xl shadow-2xl p-3 sm:p-6">
          <div className="flex items-start gap-2 sm:gap-4">
            {/* Icon - Hidden on mobile */}
            <div className="flex-shrink-0 hidden sm:block">
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full border border-white/30 dark:border-gray-700/30">
                <Cookie className="h-5 w-5 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2 sm:space-y-4">
              <div>
                <h3 className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">We value your privacy</h3>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed hidden sm:block">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                  By clicking "Accept All", you consent to our use of cookies.
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed sm:hidden">
                  We use cookies to enhance your experience.
                </p>
              </div>

              {/* Detailed Preferences (Toggle) */}
              {showDetails && (
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  {/* Necessary Cookies */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1">
                        Necessary Cookies
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Required for basic site functionality. Always enabled.
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                        Required
                      </div>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1">
                        Analytics Cookies
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Help us understand how you use our site to improve your experience.
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, analytics: !prev.analytics }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          preferences.analytics
                            ? 'bg-black dark:bg-white'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                            preferences.analytics ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-medium mb-1">
                        Marketing Cookies
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Used to deliver personalized ads and track campaign performance.
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, marketing: !prev.marketing }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          preferences.marketing
                            ? 'bg-black dark:bg-white'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                            preferences.marketing ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-row items-center gap-1.5 sm:gap-2">
                {!showDetails ? (
                  <>
                    <button
                      onClick={acceptAll}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
                    >
                      Accept
                    </button>
                    <button
                      onClick={acceptNecessary}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-200 dark:border-gray-800 text-[10px] sm:text-xs font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => setShowDetails(true)}
                      className="hidden sm:block px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Customize
                    </button>
                    <a
                      href="/privacy"
                      className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-center"
                    >
                      Privacy
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveCustom}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-200 dark:border-gray-800 text-[10px] sm:text-xs font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      Back
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if user has granted specific cookie consent
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConsent(parsed);
      } catch (e) {
        setConsent(null);
      }
    }
  }, []);

  return {
    hasConsent: !!consent,
    preferences: consent,
    canUseAnalytics: consent?.analytics || false,
    canUseMarketing: consent?.marketing || false,
  };
}
