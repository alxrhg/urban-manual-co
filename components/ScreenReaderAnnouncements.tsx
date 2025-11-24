/**
 * Screen reader announcements for dynamic content
 */

'use client';

import { useEffect, useRef } from 'react';

interface ScreenReaderAnnouncementsProps {
  message: string;
  priority?: 'polite' | 'assertive';
  id?: string;
}

/**
 * Component for announcing dynamic content changes to screen readers
 */
export function ScreenReaderAnnouncements({
  message,
  priority = 'polite',
  id = 'sr-announcements',
}: ScreenReaderAnnouncementsProps) {
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcementRef.current) {
      // Force screen reader to read the announcement
      announcementRef.current.textContent = message;
      // Clear after a short delay to allow re-announcement of the same message
      const timer = setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      id={id}
      ref={announcementRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  );
}

/**
 * Hook for announcing messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.getElementById('sr-announcements');
    if (announcement) {
      announcement.setAttribute('aria-live', priority);
      announcement.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        announcement.textContent = '';
      }, 1000);
    }
  };

  return { announce };
}

