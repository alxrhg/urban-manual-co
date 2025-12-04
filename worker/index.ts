/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

/**
 * Custom service worker extensions for Urban Manual PWA
 * Handles push notifications and notification click events
 */

// Extended notification options for service worker
interface ExtendedNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// Handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();

    const options: ExtendedNotificationOptions = {
      body: data.body || 'New update from Urban Manual',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'urban-manual-notification',
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || '/',
        ...data.data,
      },
    };

    // Add image if provided
    if (data.image) {
      options.image = data.image;
    }

    // Add actions if provided
    if (data.actions) {
      options.actions = data.actions;
    }

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Urban Manual',
        options as NotificationOptions
      )
    );
  } catch (error) {
    console.error('Error handling push event:', error);

    // Fallback for plain text push
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Urban Manual', {
        body: text,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const notificationData = event.notification.data as { url?: string } | undefined;
  const urlToOpen = notificationData?.url || '/';

  // Handle action button clicks
  if (event.action) {
    switch (event.action) {
      case 'view':
        // Default action - open the URL
        break;
      case 'dismiss':
        // Just close the notification
        return;
      default:
        // Custom actions can be handled here
        break;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with this URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no existing window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  // Analytics or cleanup can be done here
  console.log('Notification closed:', event.notification.tag);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');

  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
      })
      .then((subscription) => {
        console.log('Re-subscribed to push notifications');
        return subscription;
      })
      .catch((error) => {
        console.error('Failed to re-subscribe:', error);
      })
  );
});

export {};
