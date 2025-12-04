'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  shouldShowNotificationPrompt,
  dismissNotificationPrompt,
} from '@/hooks/useNotifications';

interface NotificationPromptProps {
  /** Delay before showing the prompt (in ms) */
  delay?: number;
}

/**
 * A non-intrusive prompt to request notification permissions
 * Shows after a delay and can be dismissed temporarily or permanently
 */
export function NotificationPrompt({ delay = 10000 }: NotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { isSupported, permission, isRequesting, requestPermission } = useNotifications();

  useEffect(() => {
    // Only show on client side
    if (typeof window === 'undefined') return;

    // Don't show if not supported or already decided
    if (!isSupported || permission !== 'default') return;

    // Check if should show based on dismiss state
    if (!shouldShowNotificationPrompt()) return;

    // Show after delay
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => setIsVisible(true), 50);
    }, delay);

    return () => clearTimeout(timer);
  }, [isSupported, permission, delay]);

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      // Show a welcome notification
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Notifications enabled!', {
            body: "You'll receive updates about your saved places and trips.",
            icon: '/icon-192.png',
          });
        }
      }, 500);
    }
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDismiss = (permanent = false) => {
    dismissNotificationPrompt(permanent);
    handleClose();
  };

  if (!isAnimating) return null;

  return (
    <div
      className={`
        fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50
        bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
      role="dialog"
      aria-labelledby="notification-prompt-title"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="notification-prompt-title"
              className="text-sm font-semibold text-gray-900 dark:text-white"
            >
              Stay updated
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Get notified about new destinations, trip updates, and personalized recommendations.
            </p>
          </div>
          <button
            onClick={() => handleDismiss(false)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={handleEnable}
            disabled={isRequesting}
            size="sm"
            className="flex-1"
          >
            {isRequesting ? 'Enabling...' : 'Enable notifications'}
          </Button>
          <Button
            onClick={() => handleDismiss(true)}
            variant="ghost"
            size="sm"
            className="text-gray-500"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
