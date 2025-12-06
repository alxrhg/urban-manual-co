/**
 * Session Management Utilities
 *
 * Provides secure session handling including:
 * - Session timeout management
 * - Secure logout
 * - Session refresh
 */

import { createClient } from '@supabase/supabase-js';

// Session configuration
const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes of inactivity)
  TIMEOUT_MS: 30 * 60 * 1000,

  // Maximum session age (24 hours)
  MAX_AGE_MS: 24 * 60 * 60 * 1000,

  // Refresh threshold - refresh session when less than this time remains
  REFRESH_THRESHOLD_MS: 5 * 60 * 1000,

  // Key for storing last activity timestamp
  LAST_ACTIVITY_KEY: 'um_last_activity',

  // Key for storing session start time
  SESSION_START_KEY: 'um_session_start',
};

/**
 * Check if session should be refreshed based on activity
 */
export function shouldRefreshSession(): boolean {
  if (typeof window === 'undefined') return false;

  const lastActivity = localStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
  const sessionStart = localStorage.getItem(SESSION_CONFIG.SESSION_START_KEY);

  if (!lastActivity || !sessionStart) {
    // Initialize session tracking
    updateLastActivity();
    return true;
  }

  const now = Date.now();
  const lastActivityTime = parseInt(lastActivity, 10);
  const sessionStartTime = parseInt(sessionStart, 10);

  // Check if session has timed out due to inactivity
  if (now - lastActivityTime > SESSION_CONFIG.TIMEOUT_MS) {
    console.log('[Session] Session timed out due to inactivity');
    return false; // Session should be ended, not refreshed
  }

  // Check if session has exceeded maximum age
  if (now - sessionStartTime > SESSION_CONFIG.MAX_AGE_MS) {
    console.log('[Session] Session exceeded maximum age');
    return false; // Session should be ended, not refreshed
  }

  // Check if we're within the refresh threshold
  const timeUntilTimeout = SESSION_CONFIG.TIMEOUT_MS - (now - lastActivityTime);
  return timeUntilTimeout < SESSION_CONFIG.REFRESH_THRESHOLD_MS;
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now().toString();
  localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now);

  // Initialize session start if not set
  if (!localStorage.getItem(SESSION_CONFIG.SESSION_START_KEY)) {
    localStorage.setItem(SESSION_CONFIG.SESSION_START_KEY, now);
  }
}

/**
 * Check if session is still valid
 */
export function isSessionValid(): boolean {
  if (typeof window === 'undefined') return true;

  const lastActivity = localStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
  const sessionStart = localStorage.getItem(SESSION_CONFIG.SESSION_START_KEY);

  if (!lastActivity || !sessionStart) {
    return true; // No session tracking data, assume valid
  }

  const now = Date.now();
  const lastActivityTime = parseInt(lastActivity, 10);
  const sessionStartTime = parseInt(sessionStart, 10);

  // Check inactivity timeout
  if (now - lastActivityTime > SESSION_CONFIG.TIMEOUT_MS) {
    return false;
  }

  // Check maximum session age
  if (now - sessionStartTime > SESSION_CONFIG.MAX_AGE_MS) {
    return false;
  }

  return true;
}

/**
 * Clear all session data (for logout)
 */
export function clearSessionData(): void {
  if (typeof window === 'undefined') return;

  // Clear session tracking
  localStorage.removeItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
  localStorage.removeItem(SESSION_CONFIG.SESSION_START_KEY);

  // Clear any other session-related data
  const keysToRemove = [
    'um_chat_session',
    'um_user_preferences',
    'um_recent_searches',
    'sb-localhost-auth-token', // Supabase local auth token
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore errors
    }
  });

  // Clear session storage as well
  try {
    sessionStorage.clear();
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Perform secure logout
 *
 * This clears all session data and signs out from Supabase
 */
export async function secureLogout(
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear local session data first
    clearSessionData();

    // Sign out from Supabase if credentials provided
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[Session] Supabase signout error:', error.message);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Session] Logout error:', error);
    return { success: false, error: error.message || 'Logout failed' };
  }
}

/**
 * Get time until session expires
 * Returns milliseconds until session expires, or 0 if expired
 */
export function getTimeUntilExpiry(): number {
  if (typeof window === 'undefined') return SESSION_CONFIG.TIMEOUT_MS;

  const lastActivity = localStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);

  if (!lastActivity) {
    return SESSION_CONFIG.TIMEOUT_MS;
  }

  const now = Date.now();
  const lastActivityTime = parseInt(lastActivity, 10);
  const timeRemaining = SESSION_CONFIG.TIMEOUT_MS - (now - lastActivityTime);

  return Math.max(0, timeRemaining);
}

/**
 * Format remaining time as human-readable string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Session expired';

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Setup activity listeners to track user activity
 */
export function setupActivityTracking(): () => void {
  if (typeof window === 'undefined') return () => {};

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  const handleActivity = () => {
    updateLastActivity();
  };

  // Add listeners
  events.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Initialize last activity
  updateLastActivity();

  // Return cleanup function
  return () => {
    events.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
  };
}
