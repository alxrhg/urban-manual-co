'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showNotification,
  isPWAInstalled,
  type NotificationPermissionState,
} from '@/lib/notifications';

interface UseNotificationsReturn {
  /** Whether notifications are supported in this browser */
  isSupported: boolean;
  /** Whether push notifications are supported */
  isPushSupported: boolean;
  /** Current permission state */
  permission: NotificationPermissionState;
  /** Whether the user has granted permission */
  isEnabled: boolean;
  /** Whether we're currently requesting permission */
  isRequesting: boolean;
  /** Whether the app is installed as a PWA */
  isPWA: boolean;
  /** Request permission from the user */
  requestPermission: () => Promise<NotificationPermissionState>;
  /** Subscribe to push notifications */
  subscribe: (vapidKey?: string) => Promise<PushSubscription | null>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Show a notification */
  notify: (title: string, options?: NotificationOptions) => Promise<void>;
}

const NOTIFICATION_PROMPT_DISMISSED_KEY = 'notification-prompt-dismissed';
const NOTIFICATION_PROMPT_DISMISSED_UNTIL_KEY = 'notification-prompt-dismissed-until';

/**
 * Hook for managing push notifications in the PWA
 */
export function useNotifications(): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPushSupported(isPushSupported());
    setPermission(getNotificationPermission());
    setIsPWA(isPWAInstalled());

    // Listen for permission changes
    if (isNotificationSupported() && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            setPermission(getNotificationPermission());
          };
        })
        .catch(() => {
          // Permissions API not fully supported
        });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) {
      return 'denied';
    }

    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      return result;
    } finally {
      setIsRequesting(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(
    async (vapidKey?: string): Promise<PushSubscription | null> => {
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          return null;
        }
      }
      return subscribeToPush(vapidKey);
    },
    [permission, requestPermission]
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    return unsubscribeFromPush();
  }, []);

  const notify = useCallback(
    async (title: string, options?: NotificationOptions): Promise<void> => {
      if (permission !== 'granted') {
        console.warn('Cannot show notification: permission not granted');
        return;
      }
      return showNotification(title, options);
    },
    [permission]
  );

  return {
    isSupported,
    isPushSupported: pushSupported,
    permission,
    isEnabled: permission === 'granted',
    isRequesting,
    isPWA,
    requestPermission,
    subscribe,
    unsubscribe,
    notify,
  };
}

/**
 * Check if the notification prompt should be shown
 */
export function shouldShowNotificationPrompt(): boolean {
  if (typeof window === 'undefined') return false;

  // Don't show if already granted or denied
  const permission = getNotificationPermission();
  if (permission !== 'default') return false;

  // Don't show if permanently dismissed
  const dismissed = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
  if (dismissed === 'true') return false;

  // Don't show if temporarily dismissed and time hasn't passed
  const dismissedUntil = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_UNTIL_KEY);
  if (dismissedUntil) {
    const dismissedUntilDate = new Date(dismissedUntil);
    if (dismissedUntilDate > new Date()) return false;
  }

  return true;
}

/**
 * Dismiss the notification prompt
 */
export function dismissNotificationPrompt(permanent = false): void {
  if (permanent) {
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, 'true');
  } else {
    // Dismiss for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_UNTIL_KEY, dismissUntil.toISOString());
  }
}
