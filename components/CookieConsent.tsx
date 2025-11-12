'use client';

import { useState, useEffect, useId } from 'react';
import { X, Cookie } from 'lucide-react';

/**
 * Cookie Consent Banner
 * GDPR/CCPA compliant cookie consent
 * Minimal footprint for mobile and desktop
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
  const [isExpanded, setIsExpanded] = useState(false);
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
        return; // Existing consent, do not show banner again
      } catch (error) {
        // If parsing fails, fall through to showing the banner again
      }
    }

    const timeout = window.setTimeout(() => setIsVisible(true), 400);

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
    setIsExpanded(false);
    setIsVisible(false);

    if (prefs.analytics) {
      // Enable analytics cookies (e.g. Google Analytics)
    }

    if (prefs.marketing) {
      // Enable marketing cookies
    }
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
    setIsExpanded(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-auto sm:bottom-6 sm:right-6">
      <section
        className="relative max-w-[360px] rounded-2xl border border-gray-200 bg-white/95 p-4 text-sm shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-950/95"
        role="dialog"
        aria-live="polite"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        aria-label="Cookie consent"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
            <Cookie className="h-4 w-4" aria-hidden="true" />
          </span>

          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h2
                id={headingId}
                className="text-sm font-semibold text-gray-900 dark:text-white"
              >
                Cookies on Urban Manual
              </h2>
              <p
                id={descriptionId}
                className="text-xs leading-relaxed text-gray-600 dark:text-gray-400"
              >
                We run essential cookies and use optional ones to measure usage and improve the travel guide.
              </p>
            </div>

            {isExpanded && (
              <div
                id={panelId}
                className="space-y-3 rounded-xl border border-gray-200/70 bg-gray-50/80 p-3 text-xs dark:border-gray-800/70 dark:bg-gray-900/70"
              >
                <PreferenceRow
                  title="Strictly necessary"
                  description="Required for secure logins and itinerary saving."
                  statusLabel="Always on"
                  disabled
                  value
                  onToggle={() => undefined}
                />
                <PreferenceRow
                  title="Analytics"
                  description="Helps us understand which features matter most."
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
                  description="Allows tailored partner offers and recommendations."
                  value={preferences.marketing}
                  onToggle={() =>
                    setPreferences(prev => ({
                      ...prev,
                      marketing: !prev.marketing,
                    }))
                  }
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
              >
                Accept all
              </button>

              {isExpanded ? (
                <>
                  <button
                    type="button"
                    onClick={saveCustom}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                  >
                    Save choices
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPreferences({ ...initialPreferences });
                    setIsExpanded(true);
                  }}
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                >
                  Manage choices
                </button>
              )}

              <button
                type="button"
                onClick={acceptNecessary}
                className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-400 dark:hover:text-white"
              >
                Essential only
              </button>
            </div>

            <a
              href="/privacy"
              className="block text-[11px] font-medium text-gray-500 underline-offset-2 transition hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
            >
              Read the privacy policy
            </a>
          </div>

          <button
            onClick={acceptNecessary}
            className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-500 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label="Dismiss cookie banner"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </section>
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
    <div className="grid gap-2">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-900 dark:text-white">{title}</p>
        <p id={descriptionId} className="text-[11px] leading-snug text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {statusLabel && (
          <span className="rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
              value
                ? 'bg-gray-900 dark:bg-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform dark:bg-gray-900 ${
                value ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
            <span className="sr-only">Toggle {title} cookies</span>
          </button>
        )}
        {!disabled && (
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
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
