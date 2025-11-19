'use client';

import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

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
  });

  useEffect(() => {
    // Only check consent once on mount
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

    // Listen for requests to open cookie settings
    const handleOpenSettings = () => {
      setIsVisible(true);
      setShowDetails(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    
    return () => {
      if (consentTimer) clearTimeout(consentTimer);
      if (visibilityTimer) clearTimeout(visibilityTimer);
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, [hasCheckedConsent]);

  const savePreferences = (prefs: CookiePreferences) => {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Cookie className="h-5 w-5 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">We value your privacy</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                  By clicking "Accept All", you consent to our use of cookies.
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
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          We use Google Analytics to understand how you use our site, including page views, navigation patterns, and user interactions. This helps us improve your experience and optimize our content.
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500">
                          When enabled, this may include: Google Signals data collection, User-ID tracking, granular location and device data, and ads personalization features. See our Privacy Policy for details.
                        </p>
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
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          Used to deliver personalized ads and track campaign performance.
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500">
                          When enabled, this activates ads cookie consent (ad_storage), ads measurement consent (ad_user_data), and ads personalization consent (ad_personalization) signals. See our Privacy Policy for details.
                        </p>
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!showDetails ? (
                  <>
                    <button
                      onClick={acceptAll}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={acceptNecessary}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-xs font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      Necessary Only
                    </button>
                    <button
                      onClick={() => setShowDetails(true)}
                      className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Customize
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveCustom}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
                    >
                      Save Preferences
                    </button>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-xs font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      Back
                    </button>
                  </>
                )}

                <a
                  href="/privacy"
                  className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-center"
                >
                  Privacy Policy
                </a>
              </div>
            </div>

            {/* Close button (mobile) */}
            <button
              onClick={acceptNecessary}
              className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors sm:hidden"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
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
