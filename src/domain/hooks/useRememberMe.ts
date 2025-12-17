/**
 * Remember Me Hook
 *
 * Provides persistent login functionality with:
 * - Secure token storage
 * - Session extension
 * - Device remembering
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const REMEMBER_ME_KEY = 'urban-manual-remember-me';
const DEVICE_ID_KEY = 'urban-manual-device-id';
const SESSION_EXTENDED_KEY = 'urban-manual-session-extended';

interface RememberMeState {
  /** Whether remember me is enabled */
  enabled: boolean;
  /** Device identifier for this browser */
  deviceId: string | null;
  /** When the preference was last updated */
  lastUpdated: number | null;
}

interface UseRememberMeResult {
  /** Current remember me state */
  state: RememberMeState;
  /** Whether remember me is loading */
  isLoading: boolean;
  /** Enable remember me */
  enable: () => void;
  /** Disable remember me */
  disable: () => void;
  /** Toggle remember me */
  toggle: () => void;
  /** Get device ID (creates if doesn't exist) */
  getDeviceId: () => string;
  /** Check if session should be extended */
  shouldExtendSession: () => boolean;
  /** Mark session as extended */
  markSessionExtended: () => void;
  /** Clear all remember me data */
  clear: () => void;
}

/**
 * Generate a unique device identifier
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 11);
  return `device_${timestamp}_${random}`;
}

/**
 * Hook for managing remember me functionality
 *
 * @example
 * ```tsx
 * const { state, toggle, shouldExtendSession } = useRememberMe();
 *
 * // In login form
 * <input
 *   type="checkbox"
 *   checked={state.enabled}
 *   onChange={toggle}
 * />
 *
 * // In auth flow
 * if (shouldExtendSession()) {
 *   // Extend session duration
 * }
 * ```
 */
export function useRememberMe(): UseRememberMeResult {
  const [state, setState] = useState<RememberMeState>({
    enabled: false,
    deviceId: null,
    lastUpdated: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(REMEMBER_ME_KEY);
      const deviceId = localStorage.getItem(DEVICE_ID_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);
        setState({
          enabled: parsed.enabled ?? false,
          deviceId: deviceId || null,
          lastUpdated: parsed.lastUpdated ?? null,
        });
      } else {
        setState((prev) => ({ ...prev, deviceId: deviceId || null }));
      }
    } catch (error) {
      console.error('Failed to load remember me state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save state to localStorage
  const saveState = useCallback((newState: Partial<RememberMeState>) => {
    setState((prev) => {
      const updated = {
        ...prev,
        ...newState,
        lastUpdated: Date.now(),
      };

      try {
        localStorage.setItem(
          REMEMBER_ME_KEY,
          JSON.stringify({
            enabled: updated.enabled,
            lastUpdated: updated.lastUpdated,
          })
        );
      } catch (error) {
        console.error('Failed to save remember me state:', error);
      }

      return updated;
    });
  }, []);

  const enable = useCallback(() => {
    saveState({ enabled: true });
  }, [saveState]);

  const disable = useCallback(() => {
    saveState({ enabled: false });
    // Clear session extension when disabling
    try {
      localStorage.removeItem(SESSION_EXTENDED_KEY);
    } catch {
      // Ignore errors
    }
  }, [saveState]);

  const toggle = useCallback(() => {
    saveState({ enabled: !state.enabled });
  }, [saveState, state.enabled]);

  const getDeviceId = useCallback((): string => {
    if (state.deviceId) {
      return state.deviceId;
    }

    const newDeviceId = generateDeviceId();
    try {
      localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
      setState((prev) => ({ ...prev, deviceId: newDeviceId }));
    } catch (error) {
      console.error('Failed to save device ID:', error);
    }
    return newDeviceId;
  }, [state.deviceId]);

  const shouldExtendSession = useCallback((): boolean => {
    if (!state.enabled) return false;

    try {
      const lastExtended = localStorage.getItem(SESSION_EXTENDED_KEY);
      if (!lastExtended) return true;

      // Extend if last extension was more than 6 hours ago
      const sixHours = 6 * 60 * 60 * 1000;
      return Date.now() - parseInt(lastExtended, 10) > sixHours;
    } catch {
      return false;
    }
  }, [state.enabled]);

  const markSessionExtended = useCallback(() => {
    try {
      localStorage.setItem(SESSION_EXTENDED_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to mark session extended:', error);
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(SESSION_EXTENDED_KEY);
    } catch (error) {
      console.error('Failed to clear remember me data:', error);
    }
    setState({
      enabled: false,
      deviceId: null,
      lastUpdated: null,
    });
  }, []);

  return {
    state,
    isLoading,
    enable,
    disable,
    toggle,
    getDeviceId,
    shouldExtendSession,
    markSessionExtended,
    clear,
  };
}

/**
 * Hook for remember me checkbox in login form
 */
export function useRememberMeCheckbox() {
  const { state, toggle, isLoading } = useRememberMe();

  return {
    checked: state.enabled,
    onChange: toggle,
    disabled: isLoading,
    id: 'remember-me',
    name: 'remember-me',
  };
}
