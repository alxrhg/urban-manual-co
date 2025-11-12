import { createServiceRoleClient } from '@/lib/supabase-server';
import type { ChatMemoryTurn } from '@/drizzle/schema/chat_memory';

type SupabaseClientLike = ReturnType<typeof createServiceRoleClient> | null;

type MemoryKind = 'recentTrip' | 'pinnedPreference' | 'priorSuggestion' | 'turnSummary';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  title: string;
  summary: string;
  lastUpdated?: string;
  metadata?: Record<string, any>;
  editable?: boolean;
  isPinned?: boolean;
  sessionId?: string | null;
}

export interface MemoryBundle {
  recentTrips: MemoryItem[];
  pinnedPreferences: MemoryItem[];
  priorSuggestions: MemoryItem[];
  turnSummaries: MemoryItem[];
}

export interface ChatPromptPayload {
  systemPrompt: string;
  memoryContext: string;
  memoryBundle: MemoryBundle;
}

export interface BuildChatPromptOptions {
  userId?: string;
  sessionId?: string;
  sessionToken?: string;
  includeMemoryIds?: string[];
  currentQuery?: string;
  basePrompt?: string;
  supabaseClient?: SupabaseClientLike;
}

type TripRow = {
  id: number;
  title: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  updated_at: string | null;
};

type MemoryRow = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  session_token: string | null;
  memory_type: 'summary' | 'preference' | 'suggestion';
  summary: string;
  metadata: Record<string, any> | null;
  turn_window: ChatMemoryTurn[] | null;
  is_pinned: boolean | null;
  updated_at: string;
};

type PreferenceRow = {
  favorite_categories: string[] | null;
  favorite_cities: string[] | null;
  interests: string[] | null;
  updated_at: string | null;
};

const CHAT_MEMORY_TABLE = 'chat_memory_items';

async function ensureClient(client?: SupabaseClientLike): Promise<SupabaseClientLike> {
  if (client) return client;
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.error('Failed to create service role client', error);
    return null;
  }
}

function buildMemoryItem(
  id: string,
  kind: MemoryKind,
  title: string,
  summary: string,
  options: Partial<Omit<MemoryItem, 'id' | 'kind' | 'title' | 'summary'>> = {}
): MemoryItem {
  return {
    id,
    kind,
    title,
    summary,
    ...options,
  };
}

function formatTripSummary(row: TripRow): string {
  const segments: string[] = [];
  if (row.destination) {
    segments.push(`Destination: ${row.destination}`);
  }
  if (row.start_date || row.end_date) {
    const parts = [];
    if (row.start_date) parts.push(new Date(row.start_date).toLocaleDateString());
    if (row.end_date) parts.push(new Date(row.end_date).toLocaleDateString());
    segments.push(`Dates: ${parts.join(' → ')}`);
  }
  if (row.status) {
    segments.push(`Status: ${row.status}`);
  }
  return segments.join(' | ');
}

function buildMemoryContext(bundle: MemoryBundle, includeIds?: string[]): string {
  const included = new Set(includeIds ?? []);

  const lines: string[] = [];
  const addLines = (items: MemoryItem[], heading: string) => {
    const relevant = includeIds ? items.filter((item) => included.has(item.id)) : items;
    if (!relevant.length) return;
    lines.push(`${heading}:`);
    for (const item of relevant) {
      lines.push(`- ${item.summary}`);
    }
  };

  addLines(bundle.pinnedPreferences, 'Pinned preferences');
  addLines(bundle.recentTrips, 'Recent trips');
  addLines(bundle.priorSuggestions, 'Prior suggestions');
  addLines(bundle.turnSummaries, 'Conversation highlights');

  return lines.join('\n');
}

function filterBundle(bundle: MemoryBundle, includeIds?: string[]): MemoryBundle {
  if (!includeIds) return bundle;
  const allowed = new Set(includeIds);
  const filterItems = (items: MemoryItem[]) => items.filter((item) => allowed.has(item.id));

  return {
    recentTrips: filterItems(bundle.recentTrips),
    pinnedPreferences: filterItems(bundle.pinnedPreferences),
    priorSuggestions: filterItems(bundle.priorSuggestions),
    turnSummaries: filterItems(bundle.turnSummaries),
  };
}

export async function loadMemoryBundle(options: {
  userId?: string;
  sessionToken?: string;
  sessionId?: string;
  supabaseClient?: SupabaseClientLike;
}): Promise<MemoryBundle> {
  const supabase = await ensureClient(options.supabaseClient);
  if (!supabase) {
    return { recentTrips: [], pinnedPreferences: [], priorSuggestions: [], turnSummaries: [] };
  }

  const recentTrips: MemoryItem[] = [];
  const pinnedPreferences: MemoryItem[] = [];
  const priorSuggestions: MemoryItem[] = [];
  const turnSummaries: MemoryItem[] = [];

  try {
    if (options.userId) {
      const { data: trips } = await supabase
        .from<TripRow>('trips')
        .select('id, title, destination, start_date, end_date, status, updated_at')
        .eq('user_id', options.userId)
        .order('updated_at', { ascending: false })
        .limit(5);

      for (const trip of trips || []) {
        recentTrips.push(
          buildMemoryItem(
            `trip-${trip.id}`,
            'recentTrip',
            trip.title || trip.destination || 'Recent trip',
            formatTripSummary(trip),
            { lastUpdated: trip.updated_at || undefined, editable: false }
          )
        );
      }
    }
  } catch (error) {
    console.warn('Failed to load recent trips for memory bundle', error);
  }

  try {
    const memoryQuery = supabase
      .from<MemoryRow>(CHAT_MEMORY_TABLE)
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(50);

    if (options.userId) {
      memoryQuery.eq('user_id', options.userId);
    } else if (options.sessionToken) {
      memoryQuery.eq('session_token', options.sessionToken);
    } else if (options.sessionId) {
      memoryQuery.eq('session_id', options.sessionId);
    }

    const { data: memories } = await memoryQuery;
    for (const memory of memories || []) {
      const item = buildMemoryItem(
        memory.id,
        memory.memory_type === 'summary'
          ? 'turnSummary'
          : memory.memory_type === 'preference'
            ? 'pinnedPreference'
            : 'priorSuggestion',
        memory.memory_type === 'summary' ? 'Conversation summary' : memory.summary.slice(0, 48) || 'Memory',
        memory.summary,
        {
          metadata: memory.metadata || undefined,
          isPinned: Boolean(memory.is_pinned),
          lastUpdated: memory.updated_at,
          editable: memory.memory_type !== 'summary',
          sessionId: memory.session_id,
        }
      );

      if (item.kind === 'pinnedPreference') {
        pinnedPreferences.push(item);
      } else if (item.kind === 'priorSuggestion') {
        priorSuggestions.push(item);
      } else {
        turnSummaries.push(item);
      }
    }
  } catch (error) {
    console.error('Failed to load chat memory items', error);
  }

  try {
    if (options.userId) {
      const { data: preferences } = await supabase
        .from<PreferenceRow>('user_preferences')
        .select('favorite_categories, favorite_cities, interests, updated_at')
        .eq('user_id', options.userId)
        .maybeSingle();

      if (preferences) {
        const preferenceLines: string[] = [];
        if (preferences.favorite_cities?.length) {
          preferenceLines.push(`Cities: ${preferences.favorite_cities.join(', ')}`);
        }
        if (preferences.favorite_categories?.length) {
          preferenceLines.push(`Categories: ${preferences.favorite_categories.join(', ')}`);
        }
        if (preferences.interests?.length) {
          preferenceLines.push(`Interests: ${preferences.interests.join(', ')}`);
        }

        if (preferenceLines.length) {
          pinnedPreferences.unshift(
            buildMemoryItem(
              'preferences-profile',
              'pinnedPreference',
              'Profile preferences',
              preferenceLines.join(' | '),
              { editable: false, lastUpdated: preferences.updated_at || undefined }
            )
          );
        }
      }
    }
  } catch (error) {
    console.debug('User preferences lookup failed (optional)', error);
  }

  return { recentTrips, pinnedPreferences, priorSuggestions, turnSummaries };
}

export async function buildChatPromptPayload(options: BuildChatPromptOptions): Promise<ChatPromptPayload> {
  const supabase = await ensureClient(options.supabaseClient);
  const bundle = await loadMemoryBundle({
    userId: options.userId,
    sessionId: options.sessionId,
    sessionToken: options.sessionToken,
    supabaseClient: supabase,
  });

  const filteredBundle = filterBundle(bundle, options.includeMemoryIds);
  const memoryContext = buildMemoryContext(bundle, options.includeMemoryIds);

  const sections: string[] = [];
  if (options.basePrompt) {
    sections.push(options.basePrompt.trim());
  }
  if (memoryContext) {
    sections.push(`Conversation memory:\n${memoryContext}`);
  }
  if (options.currentQuery) {
    sections.push(`Current query: ${options.currentQuery}`);
  }

  return {
    systemPrompt: sections.join('\n\n'),
    memoryContext,
    memoryBundle: filteredBundle,
  };
}
