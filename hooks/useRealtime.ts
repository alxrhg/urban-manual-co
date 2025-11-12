'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type PresenceState<TPresence> = Record<string, TPresence[]>;

interface UseRealtimeOptions<
  TPresence extends Record<string, unknown> = Record<string, unknown>,
  TBroadcast extends Record<string, unknown> | undefined = Record<string, unknown>,
> {
  channel?: string;
  enabled?: boolean;
  /**
   * Presence payload sent to Supabase presence tracking.
   * Must include a stable `userId` when collaborating.
   */
  presence?: TPresence & { userId: string };
  onPresenceUpdate?: (state: PresenceState<TPresence>) => void;
  onBroadcast?: (event: string, payload: TBroadcast) => void;
  onSystemEvent?: (event: string) => void;
}

interface UseRealtimeReturn<
  TPresence extends Record<string, unknown> = Record<string, unknown>,
  TBroadcast extends Record<string, unknown> | undefined = Record<string, unknown>,
> {
  broadcast: (event: string, payload: TBroadcast) => void;
  updatePresence: (payload?: Partial<TPresence>) => void;
  presenceState: PresenceState<TPresence>;
  status: 'idle' | 'connecting' | 'connected' | 'error';
}

function isClient() {
  return typeof window !== 'undefined';
}

/**
 * Lightweight wrapper around Supabase Realtime channels.
 * Provides presence tracking and broadcast helpers that are safe
 * for React Server Components by guarding for browser availability.
 */
export function useRealtime<
  TPresence extends Record<string, unknown> = Record<string, unknown>,
  TBroadcast extends Record<string, unknown> | undefined = Record<string, unknown>,
>({
  channel,
  enabled = true,
  presence,
  onPresenceUpdate,
  onBroadcast,
  onSystemEvent,
}: UseRealtimeOptions<TPresence, TBroadcast>): UseRealtimeReturn<TPresence, TBroadcast> {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presencePayload = useRef<(TPresence & { userId: string }) | undefined>(presence);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>(
    channel && enabled ? 'connecting' : 'idle',
  );
  const [presenceState, setPresenceState] = useState<PresenceState<TPresence>>({});

  useEffect(() => {
    presencePayload.current = presence;
  }, [presence]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!channel || !enabled || !isClient()) {
      return;
    }

    const supabase = createClient();
    const realtimeChannel = supabase.channel(channel, {
      config: {
        presence: {
          key: presence?.userId || crypto.randomUUID(),
        },
      },
    });

    channelRef.current = realtimeChannel;
    Promise.resolve().then(() => {
      if (mountedRef.current) {
        setStatus('connecting');
      }
    });

    const syncPresence = () => {
      const state = realtimeChannel.presenceState() as PresenceState<TPresence>;
      setPresenceState(state);
      onPresenceUpdate?.(state);
    };

    realtimeChannel.on('presence', { event: 'sync' }, syncPresence);
    realtimeChannel.on('presence', { event: 'join' }, syncPresence);
    realtimeChannel.on('presence', { event: 'leave' }, syncPresence);

    if (onBroadcast) {
      realtimeChannel.on('broadcast', { event: '*' }, payload => {
        try {
          onBroadcast(payload.event, payload.payload as TBroadcast);
        } catch (error) {
          console.error('[Realtime] Broadcast handler failed', error);
        }
      });
    }

    realtimeChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        setStatus('connected');
        if (presencePayload.current) {
          realtimeChannel.track(presencePayload.current);
        }
        onSystemEvent?.('subscribed');
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setStatus('error');
        onSystemEvent?.(status.toLowerCase());
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      Promise.resolve().then(() => {
        if (mountedRef.current) {
          setStatus('idle');
          setPresenceState({});
        }
      });
    };
  }, [channel, enabled, onBroadcast, onPresenceUpdate, onSystemEvent, presence?.userId]);

  const broadcast = useCallback<UseRealtimeReturn<TPresence, TBroadcast>['broadcast']>((event, payload) => {
    if (!channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event, payload });
  }, []);

  const updatePresence = useCallback<UseRealtimeReturn<TPresence, TBroadcast>['updatePresence']>((payload) => {
    if (!channelRef.current) return;
    const current = presencePayload.current;
    if (!current) return;
    const merged = { ...current, ...payload };
    presencePayload.current = merged;
    channelRef.current.track(merged as TPresence & { userId: string });
  }, []);

  return useMemo(
    () => ({
      broadcast,
      updatePresence,
      presenceState,
      status,
    }),
    [broadcast, presenceState, status, updatePresence],
  );
}
