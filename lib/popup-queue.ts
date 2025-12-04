/**
 * Popup Queue Manager
 * Coordinates multiple popups to prevent visual clutter
 * Implements progressive disclosure pattern - shows one popup at a time
 */

// Event names for popup coordination
export const POPUP_EVENTS = {
  COOKIE_CONSENT_RESOLVED: 'popup:cookie-consent-resolved',
  NOTIFICATION_PROMPT_RESOLVED: 'popup:notification-prompt-resolved',
} as const;

// Priority order for popups (lower number = higher priority)
export const POPUP_PRIORITY = {
  COOKIE_CONSENT: 1,    // Legal requirement - must show first
  NOTIFICATION_PROMPT: 2,
  AI_ASSISTANT: 3,
} as const;

// Delay between popups (ms)
export const POPUP_DELAY_AFTER_PREVIOUS = 3000;

/**
 * Dispatch event when a popup is resolved (dismissed or acted upon)
 */
export function notifyPopupResolved(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

/**
 * Check if cookie consent has been resolved (user has made a choice)
 */
export function isCookieConsentResolved(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Check localStorage
    const stored = localStorage.getItem('cookie_consent');
    if (stored) return true;

    // Check cookie
    const cookieEntry = document.cookie
      .split('; ')
      .find(entry => entry.startsWith('cookie_consent='));
    if (cookieEntry) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Wait for a popup event to be dispatched
 * Returns a promise that resolves when the event fires or the timeout is reached
 */
export function waitForPopup(
  eventName: string,
  timeoutMs: number = 60000
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const handler = () => {
      window.removeEventListener(eventName, handler);
      resolve();
    };

    window.addEventListener(eventName, handler);

    // Also resolve after timeout to prevent indefinite waiting
    setTimeout(() => {
      window.removeEventListener(eventName, handler);
      resolve();
    }, timeoutMs);
  });
}
