'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'cookie_consent';
const CONSENT_COOKIE_NAME = 'cookie_consent';
const CONSENT_UPDATED_EVENT = 'cookie-consent-updated';

type StoredCookieConsent = CookiePreferences & { timestamp?: string };

function parseConsent(rawValue: string | null): CookiePreferences | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as StoredCookieConsent;
    return {
      necessary: parsed.necessary ?? true,
      analytics: parsed.analytics ?? false,
      marketing: parsed.marketing ?? false,
      personalization: parsed.personalization ?? false,
    };
  } catch (error) {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookieEntry = document.cookie
    .split('; ')
    .find(entry => entry.startsWith(`${name}=`));

  if (!cookieEntry) return null;

  return decodeURIComponent(cookieEntry.split('=').slice(1).join('='));
}

function getStoredConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    // Check localStorage first (primary storage)
    const stored = parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
    if (stored) return stored;

    // Fallback to cookie (secondary storage)
    const cookieConsent = parseConsent(readCookie(CONSENT_COOKIE_NAME));
    if (cookieConsent) {
      // Sync to localStorage for consistency
      try {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
          ...cookieConsent,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        // Ignore localStorage errors (e.g., quota exceeded)
      }
      return cookieConsent;
    }

    return null;
  } catch (error) {
    // If there's any error reading consent, assume no consent
    console.warn('[CookieConsent] Error reading stored consent:', error);
    return null;
  }
}

function persistConsent(prefs: CookiePreferences) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const payload = JSON.stringify({
      ...prefs,
      timestamp: new Date().toISOString(),
    });

    // Store in both localStorage and cookie for redundancy
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, payload);
    } catch (e) {
      // If localStorage fails (e.g., quota exceeded), still try cookie
      console.warn('[CookieConsent] Failed to save to localStorage:', e);
    }

    // Also store in cookie (more reliable across subdomains and sessions)
    const secureFlag = window.location.protocol === 'https:' ? ' Secure;' : '';
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; path=/; max-age=${maxAge}; SameSite=Lax;${secureFlag}`;

    // Dispatch event to notify other components
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  } catch (error) {
    console.error('[CookieConsent] Failed to persist consent:', error);
  }
}

/**
 * Cookie Consent Banner
 * GDPR/CCPA compliant cookie consent
 * Follows Urban Manual design system
 */

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization?: boolean;
}

// Function to open cookie settings (can be called from anywhere)
export function openCookieSettings() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-cookie-settings'));
  }
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    personalization: false,
  });

  // Check consent on mount (only once)
  useEffect(() => {
    if (hasCheckedConsent) return;

    let consentTimer: NodeJS.Timeout | null = null;
    let visibilityTimer: NodeJS.Timeout | null = null;

    // Wait for client-side hydration to complete
    const checkConsent = () => {
      const consent = getStoredConsent();

      if (consent) {
        setPreferences(prev => ({ ...prev, ...consent }));
        // Don't show banner if consent exists
        setIsVisible(false);
        setHasCheckedConsent(true);
      } else {
        // Show banner if no consent is stored (with delay for better UX)
        visibilityTimer = setTimeout(() => {
          setIsVisible(true);
          setHasCheckedConsent(true);
        }, 1000);
      }
    };

    // Small delay to ensure localStorage/cookies are accessible
    consentTimer = setTimeout(checkConsent, 100);
    
    return () => {
      if (consentTimer) clearTimeout(consentTimer);
      if (visibilityTimer) clearTimeout(visibilityTimer);
    };
  }, [hasCheckedConsent]);

  // Always listen for requests to open cookie settings (separate effect)
  useEffect(() => {
    const handleOpenSettings = () => {
      setIsVisible(true);
      setShowDetails(true);
      setHasCheckedConsent(true); // Prevent banner from showing
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    
    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, []); // Empty deps - always active

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    persistConsent(prefs);

    // Update Google Analytics consent signals
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        // Behavioral analytics consent signals
        analytics_storage: prefs.analytics ? 'granted' : 'denied',

        // Advertising consent signals
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        ad_user_data: prefs.marketing ? 'granted' : 'denied',
        ad_personalization: prefs.marketing ? 'granted' : 'denied',
      });

      // Initialize or update Google Analytics config if analytics is enabled
      if (prefs.analytics) {
        window.gtag('config', 'G-ZLGK6QXD88', {
          page_path: window.location.pathname,
        });
      }
    }

    // Hide banner and mark consent as checked to prevent reappearance
    setIsVisible(false);
    setHasCheckedConsent(true);
    setShowDetails(false);
  }, []);

  const acceptAll = useCallback(() => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    });
  }, [savePreferences]);

  const acceptNecessary = useCallback(() => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    });
  }, [savePreferences]);

  const saveCustom = useCallback(() => {
    savePreferences(preferences);
  }, [savePreferences, preferences]);

  // Memoized handlers for toggle buttons
  const toggleAnalytics = useCallback(() => {
    setPreferences(prev => ({ ...prev, analytics: !prev.analytics }));
  }, []);

  const toggleMarketing = useCallback(() => {
    setPreferences(prev => ({ ...prev, marketing: !prev.marketing }));
  }, []);

  const togglePersonalization = useCallback(() => {
    setPreferences(prev => ({ ...prev, personalization: !prev.personalization }));
  }, []);

  const openSettings = useCallback(() => {
    setIsVisible(true);
    setShowDetails(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowDetails(false);
    if (getStoredConsent() !== null) setIsVisible(false);
  }, []);

  // Show minimal bottom-left banner if no consent
  const hasConsent = getStoredConsent() !== null;
  const showMinimalBanner = !hasConsent && isVisible && !showDetails;

  return (
    <>
      {/* Minimal bottom-left cookie banner - shown when no consent */}
      {showMinimalBanner && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-[calc(100vw-2rem)]">
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-lg whitespace-nowrap"
          >
            🍪 Accept cookies
          </button>
          <button
            onClick={openSettings}
            className="px-4 py-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-lg whitespace-nowrap"
          >
            Settings
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cookie Settings</h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  By clicking "Accept All Cookies", you agree to the storing of cookies on your device to enhance site navigation, analyze site usage and assist in our marketing efforts.{' '}
                  <a href="/privacy" className="underline hover:text-gray-900 dark:hover:text-white transition-colors">
                    More info
                  </a>
                </p>
              </div>

              {/* Cookie Preferences */}
              <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1 text-gray-900 dark:text-white">
                      Strictly Necessary (Always Active)
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Cookies required to enable basic website functionality.
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1 text-gray-900 dark:text-white">
                      Analytics
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Cookies helping understand how this website performs, how visitors interact with the site, and whether there may be technical issues.
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={toggleAnalytics}
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
                    <div className="text-sm font-medium mb-1 text-gray-900 dark:text-white">
                      Marketing
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Cookies used to deliver advertising that is more relevant to you and your interests.
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={toggleMarketing}
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

                {/* Personalization Cookies */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1 text-gray-900 dark:text-white">
                      Personalization
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Cookies allowing the website to remember choices you make (such as your user name, language, or the region you are in).
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={togglePersonalization}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        preferences.personalization
                          ? 'bg-black dark:bg-white'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                          preferences.personalization ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
                >
                  Accept All Cookies
                </button>
                <button
                  onClick={saveCustom}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-sm font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook to check if user has granted specific cookie consent
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const updateConsent = () => {
      setConsent(getStoredConsent());
    };

    const handleStorage = () => updateConsent();
    const handleCustomEvent = () => updateConsent();

    updateConsent();

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CONSENT_UPDATED_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleCustomEvent);
    };
  }, []);

  return {
    hasConsent: !!consent,
    preferences: consent,
    canUseAnalytics: consent?.analytics || false,
    canUseMarketing: consent?.marketing || false,
  };
}
