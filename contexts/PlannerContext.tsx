'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/hooks/useRealtime';
import { trackEvent } from '@/lib/analytics/track';

interface PlannerAttachment {
  id: string;
  label: string;
  url?: string;
  type: 'link' | 'image' | 'document' | 'note';
  createdAt: string;
  createdBy?: string;
}

export interface PlannerComment {
  id: string;
  blockId: string;
  dayId: string;
  authorId: string;
  authorName?: string | null;
  message: string;
  createdAt: string;
}

export interface PlannerBlock {
  id: string;
  remoteId?: number;
  type: 'activity' | 'lodging' | 'logistics' | 'note';
  title: string;
  description?: string | null;
  time?: string | null;
  durationMinutes?: number | null;
  location?: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  attachments: PlannerAttachment[];
  notes?: string;
  metadata?: Record<string, unknown> | null;
  comments: PlannerComment[];
  recommended?: boolean;
}

export interface PlannerDay {
  id: string;
  index: number;
  label: string;
  date?: string | null;
  notes?: string;
  attachments: PlannerAttachment[];
  blocks: PlannerBlock[];
  metaRemoteId?: number;
}

export interface PlannerCollaborator {
  userId: string;
  name?: string | null;
  avatarUrl?: string | null;
  activeDayId?: string;
  typing?: boolean;
}

export interface PlannerRecommendationMetadata {
  score?: number;
  location?: { city?: string } | null;
  urls?: string[];
  source?: string | null;
  raw?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PlannerRecommendation {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  metadata?: PlannerRecommendationMetadata;
  type: 'activity' | 'lodging' | 'logistics';
}

type PlannerItemNotes = {
  type?: string;
  attachments?: PlannerAttachment[];
  date?: string | null;
  label?: string;
  notes?: string;
  durationMinutes?: number | null;
  metadata?: Record<string, unknown> | null;
  location?: PlannerBlock['location'];
  comments?: PlannerComment[];
  recommended?: boolean;
};

export interface PlannerItinerary {
  id: string;
  tripId: number;
  title: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ownerId?: string | null;
  updatedAt?: string | null;
  days: PlannerDay[];
  collaborators: PlannerCollaborator[];
  sharedLink?: string | null;
}

interface PlannerPresence extends Record<string, unknown> {
  userId: string;
  name?: string | null;
  avatarUrl?: string | null;
  activeDayId?: string;
  typing?: boolean;
}

interface PlannerContextValue {
  itinerary: PlannerItinerary | null;
  loading: boolean;
  saving: boolean;
  error?: string;
  activeDayId?: string;
  collaborators: PlannerCollaborator[];
  presenceState: Record<string, PlannerPresence[]>;
  realtimeStatus: 'idle' | 'connecting' | 'connected' | 'error';
  comments: PlannerComment[];
  recommendations: PlannerRecommendation[];
  recommendationsLoading: boolean;
  loadItinerary: (tripId: number | string) => Promise<void>;
  updateItinerary: (updates: Partial<Pick<PlannerItinerary, 'title' | 'destination' | 'startDate' | 'endDate'>>) => void;
  addDay: (date?: string | null) => void;
  updateDay: (dayId: string, updates: Partial<PlannerDay>) => void;
  removeDay: (dayId: string) => void;
  addBlock: (dayId: string, block: Omit<PlannerBlock, 'id' | 'attachments' | 'comments'> & {
    attachments?: PlannerAttachment[];
    comments?: PlannerComment[];
  }) => void;
  updateBlock: (dayId: string, blockId: string, updates: Partial<PlannerBlock>) => void;
  removeBlock: (dayId: string, blockId: string) => void;
  reorderBlocks: (dayId: string, blockIdsInOrder: string[]) => void;
  addAttachment: (dayId: string, targetId: { blockId?: string } | null, attachment: Omit<PlannerAttachment, 'id' | 'createdAt'>) => void;
  removeAttachment: (dayId: string, attachmentId: string, blockId?: string) => void;
  addComment: (dayId: string, blockId: string, message: string) => Promise<void>;
  setActiveDay: (dayId: string) => void;
  shareItinerary: () => Promise<string | null>;
  exportItinerary: () => void;
  addRecommendationToDay: (dayId: string, recommendation: PlannerRecommendation) => void;
  refreshRecommendations: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextValue | undefined>(undefined);

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function createEmptyDay(index: number, date?: string | null): PlannerDay {
  return {
    id: `day-${crypto.randomUUID()}`,
    index,
    label: `Day ${index}`,
    date: date || null,
    notes: '',
    attachments: [],
    blocks: [],
  };
}

function normalizeBlockType(type?: string | null): PlannerBlock['type'] {
  if (type === 'activity' || type === 'lodging' || type === 'logistics' || type === 'note') {
    return type;
  }
  return 'activity';
}

function safeParseJSON(value?: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse itinerary metadata', error);
    return undefined;
  }
}

export function PlannerProvider({
  children,
  tripId,
}: {
  children: ReactNode;
  tripId?: number | string;
}) {
  const { user } = useAuth();
  const [itinerary, setItinerary] = useState<PlannerItinerary | null>(null);
  const itineraryRef = useRef<PlannerItinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeDayId, setActiveDayId] = useState<string | undefined>();
  const [collaborators, setCollaborators] = useState<PlannerCollaborator[]>([]);
  const [presenceState, setPresenceState] = useState<Record<string, PlannerPresence[]>>({});
  const [hasPendingSave, setHasPendingSave] = useState(false);
  const [recommendations, setRecommendations] = useState<PlannerRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  const broadcastContext = useMemo(() => {
    if (!itinerary?.tripId) return undefined;
    return `planner:${itinerary.tripId}`;
  }, [itinerary?.tripId]);

  const {
    broadcast,
    updatePresence,
    presenceState: realtimePresence,
    status: realtimeStatus,
  } = useRealtime<PlannerPresence, { userId?: string; tripId?: number; dayId?: string; blockId?: string } | undefined>({
    channel: broadcastContext,
    enabled: Boolean(broadcastContext),
    presence: user
      ? {
          userId: user.id,
          name: user.user_metadata?.full_name || user.email,
          avatarUrl: user.user_metadata?.avatar_url,
          activeDayId,
        }
      : undefined,
    onPresenceUpdate: state => {
      setPresenceState(state);
      const flattened: PlannerCollaborator[] = [];
      Object.values(state).forEach(entries => {
        entries.forEach(entry => {
          if (!entry.userId || entry.userId === user?.id) return;
          flattened.push(entry);
        });
      });
      setCollaborators(flattened);
    },
    onBroadcast: (event, payload) => {
      if (!payload || payload.userId === user?.id) return;
      if (event === 'planner:update' && itinerary?.tripId) {
        loadItinerary(itinerary.tripId);
      }
      if (event === 'planner:comment' && payload?.dayId && payload?.blockId) {
        // Optimistically refresh comments without waiting for load
        loadItinerary(itinerary?.tripId || payload.tripId || 0);
      }
    },
  });

  useEffect(() => {
    setPresenceState(realtimePresence);
  }, [realtimePresence]);

  const persistItinerary = useCallback(
    async (data: PlannerItinerary) => {
      if (!user || !data.tripId) return;
      try {
        setSaving(true);
        const supabase = createClient();

        await supabase
          .from('trips')
          .update({
            title: data.title,
            destination: data.destination,
            start_date: data.startDate,
            end_date: data.endDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.tripId);

        const rows = data.days.flatMap(day => {
          const base = day.blocks.map((block, orderIndex) => ({
            id: block.remoteId,
            trip_id: data.tripId,
            day: day.index,
            order_index: orderIndex + 1,
            time: block.time,
            title: block.title,
            description: block.description,
            notes: JSON.stringify({
              type: block.type,
              durationMinutes: block.durationMinutes,
              attachments: block.attachments,
              notes: block.notes,
              metadata: block.metadata,
              location: block.location,
              comments: block.comments,
              recommended: block.recommended,
            }),
          }));

          const metaNeeded = Boolean(day.notes) || day.attachments.length > 0 || day.date;
          const dayMeta = metaNeeded
            ? [{
                id: day.metaRemoteId,
                trip_id: data.tripId,
                day: day.index,
                order_index: 0,
                time: null,
                title: '__day_meta__',
                description: day.notes || null,
                notes: JSON.stringify({
                  type: 'day',
                  attachments: day.attachments,
                  date: day.date,
                  label: day.label,
                }),
              }]
            : [];

          return [...dayMeta, ...base];
        });

        if (rows.length) {
          await supabase.from('itinerary_items').upsert(rows, { onConflict: 'id' });
        }

        const remoteItems = await supabase
          .from('itinerary_items')
          .select('id, day, order_index')
          .eq('trip_id', data.tripId);

        if (!remoteItems.error && remoteItems.data) {
          const keepIds = rows.filter(row => row.id).map(row => row.id);
          const staleIds = remoteItems.data
            .filter(item => !keepIds.includes(item.id))
            .map(item => item.id);
          if (staleIds.length) {
            await supabase.from('itinerary_items').delete().in('id', staleIds);
          }
        }

        broadcast('planner:update', { userId: user.id, tripId: data.tripId });
      } catch (persistError) {
        console.error('Failed to save itinerary', persistError);
        setError('Unable to save itinerary changes.');
      } finally {
        setSaving(false);
      }
    },
    [broadcast, user],
  );

  useEffect(() => {
    if (!hasPendingSave || !itineraryRef.current) return;
    const timeout = setTimeout(() => {
      if (itineraryRef.current) {
        void persistItinerary(itineraryRef.current);
      }
      setHasPendingSave(false);
    }, 700);

    return () => clearTimeout(timeout);
  }, [hasPendingSave, persistItinerary]);

  const queueSave = useCallback(() => {
    setHasPendingSave(true);
  }, []);

  const loadItinerary = useCallback(
    async (id: number | string) => {
      if (!user) return;
      try {
        setLoading(true);
        const supabase = createClient();
        const tripResponse = await supabase
          .from('trips')
          .select('id,title,destination,start_date,end_date,user_id,is_public,updated_at')
          .eq('id', id)
          .single();

        if (tripResponse.error || !tripResponse.data) {
          throw tripResponse.error || new Error('Trip not found');
        }

        const trip = tripResponse.data;
        const itemsResponse = await supabase
          .from('itinerary_items')
          .select('id,trip_id,day,order_index,time,title,description,notes')
          .eq('trip_id', trip.id)
          .order('day', { ascending: true })
          .order('order_index', { ascending: true });

        const grouped = new Map<number, PlannerDay>();
        (itemsResponse.data || []).forEach(item => {
          const metadata = safeParseJSON(item.notes) as PlannerItemNotes | undefined;
          if (!grouped.has(item.day)) {
            grouped.set(item.day, {
              id: `day-${item.day}-${crypto.randomUUID()}`,
              index: item.day,
              label: metadata?.label || `Day ${item.day}`,
              date: metadata?.type === 'day' ? metadata.date || null : null,
              notes: metadata?.type === 'day' ? item.description || metadata?.notes || '' : '',
              attachments:
                metadata?.type === 'day' && Array.isArray(metadata.attachments)
                  ? metadata.attachments
                  : [],
              blocks: [],
              metaRemoteId:
                item.title === '__day_meta__' || metadata?.type === 'day' ? item.id : undefined,
            });
          }

          const day = grouped.get(item.day)!;

          if (item.title === '__day_meta__' || metadata?.type === 'day') {
            day.metaRemoteId = item.id;
            day.notes = item.description || metadata?.notes || '';
            day.attachments = Array.isArray(metadata?.attachments) ? metadata.attachments : [];
            day.date = metadata?.date || day.date || null;
            day.label = metadata?.label || day.label;
            return;
          }

          const blockType = normalizeBlockType(metadata?.type);

          day.blocks.push({
            id: `block-${item.id}`,
            remoteId: item.id,
            type: blockType,
            title: item.title,
            description: item.description,
            time: item.time,
            durationMinutes: metadata?.durationMinutes ?? null,
            location: metadata?.location,
            attachments: Array.isArray(metadata?.attachments) ? metadata.attachments : [],
            notes: metadata?.notes,
            metadata: metadata?.metadata ?? null,
            comments: Array.isArray(metadata?.comments) ? metadata.comments : [],
            recommended: Boolean(metadata?.recommended),
          });
        });

        const sortedDays = [...grouped.values()].sort((a, b) => a.index - b.index);
        const normalizedDays = sortedDays.length
          ? sortedDays.map((day, index) => ({
              ...day,
              index: index + 1,
              label: day.label || `Day ${index + 1}`,
            }))
          : [createEmptyDay(1, trip.start_date)];

        const nextItinerary: PlannerItinerary = {
          id: `trip-${trip.id}`,
          tripId: trip.id,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.start_date,
          endDate: trip.end_date,
          ownerId: trip.user_id,
          updatedAt: trip.updated_at,
          days: normalizedDays,
          collaborators: [],
          sharedLink:
            trip.is_public && typeof window !== 'undefined'
              ? `${window.location.origin}/trips/${trip.id}`
              : null,
        };

        setItinerary(nextItinerary);
        setActiveDayId(nextItinerary.days[0]?.id);
        updatePresence({ activeDayId: nextItinerary.days[0]?.id });
        setError(undefined);
      } catch (loadError) {
        console.error('Failed to load itinerary', loadError);
        setError('Unable to load itinerary.');
      } finally {
        setLoading(false);
      }
    },
    [updatePresence, user],
  );

  useEffect(() => {
    if (tripId && user) {
      void loadItinerary(tripId);
    }
  }, [loadItinerary, tripId, user]);

  const mutateItinerary = useCallback(
    (updater: (draft: PlannerItinerary) => void, options?: { skipSave?: boolean }) => {
      setItinerary(prev => {
        if (!prev) return prev;
        const draft = deepClone(prev);
        updater(draft);
        return draft;
      });
      if (!options?.skipSave) {
        queueSave();
      }
    },
    [queueSave],
  );

  const updateItineraryHandler = useCallback<PlannerContextValue['updateItinerary']>(
    updates => {
      mutateItinerary(draft => {
        Object.assign(draft, updates);
      });
    },
    [mutateItinerary],
  );

  const addDay = useCallback(
    (date?: string | null) => {
      if (!itinerary) return;
      mutateItinerary(draft => {
        const nextIndex = draft.days.length + 1;
        draft.days.push(createEmptyDay(nextIndex, date));
      });
    },
    [itinerary, mutateItinerary],
  );

  const updateDay = useCallback(
    (dayId: string, updates: Partial<PlannerDay>) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        Object.assign(day, updates);
      });
    },
    [mutateItinerary],
  );

  const removeDay = useCallback(
    (dayId: string) => {
      if (!itinerary) return;
      if (itinerary.days.length === 1) return; // keep at least one day
      mutateItinerary(draft => {
        draft.days = draft.days
          .filter(day => day.id !== dayId)
          .map((day, index) => ({ ...day, index: index + 1, label: day.label || `Day ${index + 1}` }));
      });
    },
    [itinerary, mutateItinerary],
  );

  const addBlock = useCallback<PlannerContextValue['addBlock']>(
    (dayId, block) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        const newBlock: PlannerBlock = {
          id: `block-${crypto.randomUUID()}`,
          type: block.type,
          title: block.title,
          description: block.description || null,
          time: block.time || null,
          durationMinutes: block.durationMinutes ?? null,
          location: block.location,
          attachments: block.attachments || [],
          notes: block.notes,
          metadata: block.metadata || null,
          comments: block.comments || [],
          recommended: block.recommended,
        };
        day.blocks.push(newBlock);
      });
    },
    [mutateItinerary],
  );

  const updateBlock = useCallback<PlannerContextValue['updateBlock']>(
    (dayId, blockId, updates) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        const block = day.blocks.find(b => b.id === blockId);
        if (!block) return;
        Object.assign(block, updates);
      });
    },
    [mutateItinerary],
  );

  const removeBlock = useCallback<PlannerContextValue['removeBlock']>(
    (dayId, blockId) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        day.blocks = day.blocks.filter(block => block.id !== blockId);
      });
    },
    [mutateItinerary],
  );

  const reorderBlocks = useCallback<PlannerContextValue['reorderBlocks']>(
    (dayId, order) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        const newOrder: PlannerBlock[] = [];
        order.forEach(id => {
          const found = day.blocks.find(block => block.id === id);
          if (found) newOrder.push(found);
        });
        // Append any blocks not in order array
        day.blocks
          .filter(block => !order.includes(block.id))
          .forEach(block => newOrder.push(block));
        day.blocks = newOrder;
      });
    },
    [mutateItinerary],
  );

  const addAttachment = useCallback<PlannerContextValue['addAttachment']>(
    (dayId, target, attachment) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        const nextAttachment: PlannerAttachment = {
          id: `att-${crypto.randomUUID()}`,
          label: attachment.label,
          url: attachment.url,
          type: attachment.type,
          createdAt: new Date().toISOString(),
          createdBy: user?.id,
        };
        if (target?.blockId) {
          const block = day.blocks.find(b => b.id === target.blockId);
          if (!block) return;
          block.attachments.push(nextAttachment);
        } else {
          day.attachments.push(nextAttachment);
        }
      });
    },
    [mutateItinerary, user?.id],
  );

  const removeAttachment = useCallback<PlannerContextValue['removeAttachment']>(
    (dayId, attachmentId, blockId) => {
      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        if (blockId) {
          const block = day.blocks.find(b => b.id === blockId);
          if (!block) return;
          block.attachments = block.attachments.filter(att => att.id !== attachmentId);
        } else {
          day.attachments = day.attachments.filter(att => att.id !== attachmentId);
        }
      });
    },
    [mutateItinerary],
  );

  const addComment = useCallback<PlannerContextValue['addComment']>(
    async (dayId, blockId, message) => {
      if (!message.trim() || !user) return;
      const comment: PlannerComment = {
        id: `comment-${crypto.randomUUID()}`,
        dayId,
        blockId,
        authorId: user.id,
        authorName: user.user_metadata?.full_name || user.email,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      };

      mutateItinerary(draft => {
        const day = draft.days.find(d => d.id === dayId);
        if (!day) return;
        const block = day.blocks.find(b => b.id === blockId);
        if (!block) return;
        block.comments.push(comment);
      });

      broadcast('planner:comment', {
        userId: user.id,
        tripId: itinerary?.tripId,
        dayId,
        blockId,
      });
    },
    [broadcast, itinerary?.tripId, mutateItinerary, user],
  );

  const setActiveDay = useCallback(
    (dayId: string) => {
      setActiveDayId(dayId);
      updatePresence({ activeDayId: dayId });
    },
    [updatePresence],
  );

  const shareItinerary = useCallback(async () => {
    if (!itinerary || !user) return null;
    try {
      const supabase = createClient();
      await supabase
        .from('trips')
        .update({ is_public: true })
        .eq('id', itinerary.tripId);

      const shareUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/trips/${itinerary.tripId}`
          : `/trips/${itinerary.tripId}`;
      setItinerary(prev => (prev ? { ...prev, sharedLink: shareUrl } : prev));

      await trackEvent({
        event_type: 'click',
        metadata: {
          source: 'planner',
          action: 'share',
          trip_id: itinerary.tripId,
        },
      });

      return shareUrl;
    } catch (shareError) {
      console.error('Share itinerary failed', shareError);
      setError('Unable to enable sharing at this time.');
      return null;
    }
  }, [itinerary, user]);

  const exportItinerary = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.print();
      void trackEvent({
        event_type: 'click',
        metadata: {
          source: 'planner',
          action: 'export_pdf',
          trip_id: itinerary?.tripId,
        },
      });
    } catch (exportError) {
      console.error('Failed to export itinerary', exportError);
    }
  }, [itinerary?.tripId]);

  const fetchRecommendations = useCallback(async () => {
    if (!itinerary?.destination) return;
    try {
      setRecommendationsLoading(true);
      const params = new URLSearchParams({
        city: itinerary.destination,
        limit: '12',
      });
      const response = await fetch(`/api/intelligence/contextual-recommendations?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load recommendations');
      const payload: { recommendations?: unknown } = await response.json();
      const rawItems = Array.isArray(payload.recommendations)
        ? (payload.recommendations as Record<string, unknown>[])
        : [];
      const mapped: PlannerRecommendation[] = rawItems.map((item, index) => {
        const titleCandidate = item.title ?? item.name;
        const summaryCandidate = item.description ?? item.summary;
        const categoryCandidate = item.category ?? item.type;
        const domain = typeof item.domain === 'string' ? item.domain : undefined;
        const metadata: PlannerRecommendationMetadata = {
          score: typeof item.score === 'number' ? item.score : undefined,
          location:
            item.location && typeof item.location === 'object'
              ? (item.location as { city?: string })
              : null,
          urls: Array.isArray((item as { urls?: unknown }).urls)
            ? ((item as { urls?: unknown }).urls as unknown[]).filter((url): url is string => typeof url === 'string')
            : undefined,
          source: domain ?? (typeof categoryCandidate === 'string' ? categoryCandidate : null),
          raw: item,
        };

        return {
          id: typeof item.id === 'string' ? item.id : `rec-${index}`,
          title: typeof titleCandidate === 'string' ? titleCandidate : 'Recommended experience',
          summary: typeof summaryCandidate === 'string' ? summaryCandidate : undefined,
          category: typeof categoryCandidate === 'string' ? categoryCandidate : undefined,
          imageUrl:
            typeof item.image_url === 'string'
              ? item.image_url
              : typeof item.imageUrl === 'string'
                ? item.imageUrl
                : undefined,
          metadata,
          type:
            domain === 'lodging' || categoryCandidate === 'lodging'
              ? 'lodging'
              : domain === 'logistics' || categoryCandidate === 'transport'
                ? 'logistics'
                : 'activity',
        };
      });
      setRecommendations(mapped);
    } catch (recommendationsError) {
      console.error('Failed to fetch planner recommendations', recommendationsError);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [itinerary?.destination]);

  useEffect(() => {
    if (itinerary?.destination) {
      void fetchRecommendations();
    }
  }, [fetchRecommendations, itinerary?.destination]);

  const addRecommendationToDay = useCallback(
    (dayId: string, recommendation: PlannerRecommendation) => {
      const urlList = Array.isArray(recommendation.metadata?.urls)
        ? recommendation.metadata.urls.filter((url): url is string => typeof url === 'string')
        : [];
      addBlock(dayId, {
        type: recommendation.type,
        title: recommendation.title,
        description: recommendation.summary,
        metadata: recommendation.metadata,
        attachments: urlList.length
          ? urlList.map(url => ({
              id: `att-${crypto.randomUUID()}`,
              label: recommendation.title,
              url,
              type: 'link' as const,
              createdAt: new Date().toISOString(),
            }))
          : undefined,
        recommended: true,
      });
    },
    [addBlock],
  );

  const comments = useMemo(() => {
    if (!itinerary) return [] as PlannerComment[];
    return itinerary.days.flatMap(day =>
      day.blocks.flatMap(block =>
        block.comments.map(comment => ({ ...comment, dayId: day.id, blockId: block.id })),
      ),
    );
  }, [itinerary]);

  const value = useMemo<PlannerContextValue>(() => ({
    itinerary,
    loading,
    saving,
    error,
    activeDayId,
    collaborators,
    presenceState,
    realtimeStatus,
    comments,
    recommendations,
    recommendationsLoading,
    loadItinerary,
    updateItinerary: updateItineraryHandler,
    addDay,
    updateDay,
    removeDay,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    addAttachment,
    removeAttachment,
    addComment,
    setActiveDay,
    shareItinerary,
    exportItinerary,
    addRecommendationToDay,
    refreshRecommendations: fetchRecommendations,
  }), [
    itinerary,
    loading,
    saving,
    error,
    activeDayId,
    collaborators,
    presenceState,
    realtimeStatus,
    comments,
    recommendations,
    recommendationsLoading,
    loadItinerary,
    updateItineraryHandler,
    addDay,
    updateDay,
    removeDay,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    addAttachment,
    removeAttachment,
    addComment,
    setActiveDay,
    shareItinerary,
    exportItinerary,
    addRecommendationToDay,
    fetchRecommendations,
  ]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
}
