'use client';

import { useState, useEffect, useId } from 'react';
import { X, Cookie, ChevronDown } from 'lucide-react';

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

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [initialPreferences, setInitialPreferences] =
    useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [preferences, setPreferences] = useState<CookiePreferences>(
    DEFAULT_PREFERENCES,
  );
  const headingId = useId();
  const descriptionId = useId();
  const panelId = useId();

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        const merged = { ...DEFAULT_PREFERENCES, ...parsed };
        setPreferences(merged);
        setInitialPreferences(merged);
        return; // A decision has been made previously, keep banner hidden
      } catch (error) {
        // If parsing fails, fall through to showing the banner again
      }
    }

    const timeout = window.setTimeout(() => setIsVisible(true), 600);

    return () => window.clearTimeout(timeout);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      ...prefs,
      timestamp: new Date().toISOString(),
    }));

    const next = { ...prefs };
    setInitialPreferences(next);
    setPreferences(next);
    setShowDetails(false);

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

  const handleCancel = () => {
    setPreferences({ ...initialPreferences });
    setShowDetails(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="mx-auto w-full max-w-4xl">
        <section
          className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.45)] backdrop-blur-sm transition dark:border-gray-800 dark:bg-gray-950/95 sm:p-6"
          role="dialog"
          aria-live="polite"
          aria-labelledby={headingId}
          aria-describedby={descriptionId}
          aria-label="Cookie consent"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex items-center gap-3 sm:flex-col sm:items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                <Cookie className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <h3
                  id={headingId}
                  className="text-base font-semibold text-gray-900 dark:text-white"
                >
                  We value your privacy
                </h3>
                <p
                  id={descriptionId}
                  className="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                >
                  We use cookies to tailor content, measure site performance, and deliver a better travel planning experience. Choose how Urban Manual uses cookies below.
                </p>
              </div>

              <div
                className={`space-y-4 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-4 dark:border-gray-800/80 dark:bg-gray-900/60 ${
                  showDetails ? 'block' : 'hidden sm:block'
                }`}
                id={panelId}
              >
                <PreferenceRow
                  title="Strictly necessary"
                  description="Required for core features like secure login and itinerary saving."
                  statusLabel="Always on"
                  disabled
                  value
                  onToggle={() => undefined}
                />

                <PreferenceRow
                  title="Analytics"
                  description="Help us understand feature usage so we can improve the guide."
                  value={preferences.analytics}
                  onToggle={() =>
                    setPreferences(prev => ({
                      ...prev,
                      analytics: !prev.analytics,
                    }))
                  }
                />

                <PreferenceRow
                  title="Marketing"
                  description="Allow personalized recommendations and partner offers."
                  value={preferences.marketing}
                  onToggle={() =>
                    setPreferences(prev => ({
                      ...prev,
                      marketing: !prev.marketing,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                  >
                    Accept all
                  </button>
                  <button
                    type="button"
                    onClick={acceptNecessary}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                  >
                    Reject non-essential
                  </button>
                  <button
                    type="button"
                    onClick={saveCustom}
                    className={`${
                      showDetails ? 'inline-flex' : 'hidden sm:inline-flex'
                    } items-center justify-center rounded-full border border-transparent bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:bg-white dark:text-black`}
                  >
                    Save preferences
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`${
                      showDetails ? 'inline-flex sm:hidden' : 'hidden'
                    } items-center justify-center rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferences({ ...initialPreferences });
                      setShowDetails(true);
                    }}
                    className={`${
                      showDetails ? 'hidden' : 'inline-flex sm:hidden'
                    } items-center justify-center gap-1 rounded-full px-5 py-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-400 dark:hover:text-white`}
                    aria-controls={panelId}
                    aria-expanded={showDetails}
                  >
                    Manage options
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <a
                  href="/privacy"
                  className="inline-flex items-center justify-center text-sm font-medium text-gray-600 underline-offset-4 transition hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
                >
                  Privacy policy
                </a>
              </div>
            </div>

            <button
              onClick={acceptNecessary}
              className="absolute right-3 top-3 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white sm:right-4 sm:top-4"
              aria-label="Close cookie banner"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface PreferenceRowProps {
  title: string;
  description: string;
  value?: boolean;
  onToggle: () => void;
  statusLabel?: string;
  disabled?: boolean;
}

function PreferenceRow({
  title,
  description,
  value = false,
  onToggle,
  statusLabel,
  disabled,
}: PreferenceRowProps) {
  const descriptionId = useId();

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {statusLabel && (
          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {statusLabel}
          </span>
        )}

        {disabled ? null : (
          <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={value}
            aria-describedby={descriptionId}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value
                ? 'bg-gray-900 dark:bg-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform dark:bg-gray-900 ${
                value ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
            <span className="sr-only">Toggle {title} cookies</span>
          </button>
        )}
        {!disabled && (
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {value ? 'On' : 'Off'}
          </span>
        )}
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
