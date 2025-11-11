import { createClient } from '@/lib/supabase/client';
import type { Destination } from '../components/columns';

function assertSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!url || !key || url.includes('placeholder') || key.includes('placeholder') || url.includes('invalid') || key.includes('invalid')) {
    throw new Error('Supabase environment variables are not configured for the CMS.');
  }
}

export type DestinationRecord = Destination;

export type DestinationInput = {
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string | null;
  content?: string | null;
  image?: string | null;
  michelin_stars?: number | null;
  crown?: boolean;
  parent_destination_id?: number | null;
};

export interface AdminAnalyticsSummary {
  totalViews: number;
  totalSearches: number;
  totalSaves: number;
  totalUsers: number;
  topSearches: { query: string; count: number }[];
}

export interface SearchLogEntry {
  id: number;
  created_at: string;
  interaction_type: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
}

export async function listDestinations(options: { search?: string; limit?: number } = {}): Promise<DestinationRecord[]> {
  assertSupabaseConfig();
  const supabase = createClient();
  const { search, limit = 20 } = options;

  let query = supabase
    .from('destinations')
    .select(
      'slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown, parent_destination_id'
    )
    .order('slug', { ascending: true })
    .limit(limit);

  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,slug.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as DestinationRecord[];
}

export async function createDestination(payload: DestinationInput): Promise<void> {
  assertSupabaseConfig();
  const supabase = createClient();
  const { error } = await supabase.from('destinations').insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateDestination(originalSlug: string, payload: DestinationInput): Promise<void> {
  assertSupabaseConfig();
  const supabase = createClient();
  const { error } = await supabase.from('destinations').update(payload).eq('slug', originalSlug);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDestination(slug: string): Promise<void> {
  assertSupabaseConfig();
  const supabase = createClient();
  const { error } = await supabase.from('destinations').delete().eq('slug', slug);
  if (error) {
    throw new Error(error.message);
  }
}

type InteractionRow = {
  interaction_type: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type UserInteractionRow = {
  user_id: string | null;
};

export async function fetchAnalyticsSummary(): Promise<AdminAnalyticsSummary> {
  assertSupabaseConfig();
  const supabase = createClient();
  const { data: interactions, error } = await supabase
    .from('user_interactions')
    .select('interaction_type, created_at, metadata');

  if (error) {
    throw new Error(error.message);
  }

  const rows = (interactions || []) as InteractionRow[];
  const viewInteractions = rows.filter((item) => item.interaction_type === 'view');
  const searchInteractions = rows.filter((item) => item.interaction_type === 'search');
  const saveInteractions = rows.filter((item) => item.interaction_type === 'save');

  const { data: users, error: usersError } = await supabase
    .from('user_interactions')
    .select('user_id')
    .not('user_id', 'is', null);

  if (usersError) {
    throw new Error(usersError.message);
  }

  const userRows = (users || []) as UserInteractionRow[];
  const uniqueUsers = new Set(userRows.map((entry) => entry.user_id).filter(Boolean));
  const searchCounts = new Map<string, number>();

  searchInteractions.forEach((interaction) => {
    const metadata = interaction.metadata || {};
    const query = typeof metadata?.query === 'string' ? metadata.query : 'Unknown';
    searchCounts.set(query, (searchCounts.get(query) || 0) + 1);
  });

  const topSearches = Array.from(searchCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalViews: viewInteractions.length,
    totalSearches: searchInteractions.length,
    totalSaves: saveInteractions.length,
    totalUsers: uniqueUsers.size,
    topSearches,
  };
}

export async function fetchSearchLogs(limit = 100): Promise<SearchLogEntry[]> {
  assertSupabaseConfig();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_interactions')
    .select('id, created_at, interaction_type, user_id, metadata')
    .eq('interaction_type', 'search')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as SearchLogEntry[];
}
