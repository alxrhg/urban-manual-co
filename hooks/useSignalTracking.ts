/**
 * Signal Tracking Hook
 * Track user interactions with feed cards
 */

'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type SignalType =
  | 'view'
  | 'dwell'
  | 'hover'
  | 'click'
  | 'save'
  | 'skip'
  | 'visit_marked'
  | 'share'
  | 'zoom_image'
  | 'read_details';

interface TrackOptions {
  position_in_feed?: number;
  previous_card_id?: number;
  metadata?: Record<string, any>;
}

export function useSignalTracking() {
  const { user } = useAuth();
  const [sessionId] = useState(() =>
    typeof window !== 'undefined'
      ? sessionStorage.getItem('feed_session_id') || crypto.randomUUID()
      : null
  );
  const dwellTimers = useRef<Map<number, { start: number; timer?: NodeJS.Timeout }>>(new Map());

  // Store session ID
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      sessionStorage.setItem('feed_session_id', sessionId);
    }
  }, [sessionId]);

  const trackSignal = useCallback(
    async (destinationId: number, signalType: SignalType, options?: TrackOptions) => {
      if (!user || !sessionId) return;

      try {
        await fetch('/api/feed/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination_id: destinationId,
            signal_type: signalType,
            session_id: sessionId,
            position_in_feed: options?.position_in_feed,
            previous_card_id: options?.previous_card_id,
            metadata: options?.metadata,
          }),
        });
      } catch (error) {
        console.error('Error tracking signal:', error);
      }
    },
    [user, sessionId]
  );

  const trackView = useCallback(
    (destinationId: number, position?: number) => {
      trackSignal(destinationId, 'view', { position_in_feed: position });
    },
    [trackSignal]
  );

  const startDwellTimer = useCallback((destinationId: number, position?: number) => {
    const existing = dwellTimers.current.get(destinationId);
    if (existing) return; // Already tracking

    const start = Date.now();
    dwellTimers.current.set(destinationId, { start });

    // Track dwell after 2s, 5s, 10s
    const timer = setTimeout(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      trackSignal(destinationId, 'dwell', {
        position_in_feed: position,
        metadata: { dwell_seconds: elapsed },
      });
    }, 2000); // Initial track after 2s

    dwellTimers.current.set(destinationId, { start, timer });
  }, [trackSignal]);

  const stopDwellTimer = useCallback((destinationId: number, position?: number) => {
    const timer = dwellTimers.current.get(destinationId);
    if (!timer) return;

    if (timer.timer) {
      clearTimeout(timer.timer);
    }

    const elapsed = Math.floor((Date.now() - timer.start) / 1000);

    // Only track if dwelled for at least 1 second
    if (elapsed >= 1) {
      trackSignal(destinationId, 'dwell', {
        position_in_feed: position,
        metadata: { dwell_seconds: elapsed },
      });
    }

    dwellTimers.current.delete(destinationId);
  }, [trackSignal]);

  const trackHover = useCallback(
    (destinationId: number, position?: number) => {
      trackSignal(destinationId, 'hover', { position_in_feed: position });
    },
    [trackSignal]
  );

  const trackClick = useCallback(
    (destinationId: number, position?: number) => {
      trackSignal(destinationId, 'click', { position_in_feed: position });
    },
    [trackSignal]
  );

  const trackSave = useCallback(
    (destinationId: number, position?: number) => {
      trackSignal(destinationId, 'save', { position_in_feed: position });
    },
    [trackSignal]
  );

  const trackSkip = useCallback(
    (destinationId: number, position?: number) => {
      trackSignal(destinationId, 'skip', { position_in_feed: position });
    },
    [trackSignal]
  );

  const trackShare = useCallback(
    (destinationId: number, position?: number) => {
      trackSignal(destinationId, 'share', { position_in_feed: position });
    },
    [trackSignal]
  );

  return {
    trackView,
    startDwellTimer,
    stopDwellTimer,
    trackHover,
    trackClick,
    trackSave,
    trackSkip,
    trackShare,
    sessionId,
  };
}
