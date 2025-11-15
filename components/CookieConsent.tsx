'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Cookie,
  CheckCircle2,
  ShieldCheck,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';

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

  const stored = parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  if (stored) return stored;

  return parseConsent(readCookie(CONSENT_COOKIE_NAME));
}

function persistConsent(prefs: CookiePreferences) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const payload = JSON.stringify({
    ...prefs,
    timestamp: new Date().toISOString(),
  });

  localStorage.setItem(CONSENT_STORAGE_KEY, payload);

  const secureFlag = window.location.protocol === 'https:' ? ' Secure;' : '';
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax;${secureFlag}`;

  window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
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

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = getStoredConsent();

    if (consent) {
      setPreferences(prev => ({ ...prev, ...consent }));
      return;
    }

    // Show banner after a small delay for better UX when no consent is stored
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    persistConsent(prefs);

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
    <div className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="relative bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6">
          {/* Close button (mobile) */}
          <button
            onClick={acceptNecessary}
            className="absolute top-4 right-4 flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors sm:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col gap-4 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full inline-flex">
                <Cookie className="h-5 w-5 text-gray-900 dark:text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
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
              <div className="space-y-3">
                {!showDetails ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={acceptAll}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-90 transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept All
                    </button>
                    <button
                      onClick={acceptNecessary}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 border border-gray-200 dark:border-gray-800 text-xs font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Necessary Only
                    </button>
                    <button
                      onClick={() => setShowDetails(true)}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl transition"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Customize
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={saveCustom}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-90 transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Save Preferences
                    </button>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="flex flex-col items-center justify-center gap-1 px-4 py-3 border border-gray-200 dark:border-gray-800 text-xs font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                    >
                      <X className="h-4 w-4" />
                      Back
                    </button>
                  </div>
                )}

                <a
                  href="/privacy"
                  className="flex flex-col items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Privacy Policy
                </a>
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
