/**
 * AI Cost Tracking Module
 *
 * Tracks token usage and estimated costs for AI API calls.
 * Persists data to Supabase for durability and analytics.
 *
 * Features:
 * - Automatic cost calculation based on model pricing
 * - Persistent storage in Supabase (survives restarts)
 * - In-memory buffer for batched writes (reduces DB load)
 * - Usage statistics and aggregation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Pricing per 1M tokens (as of 2024-2025)
const PRICING = {
  // OpenAI GPT-4
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  // OpenAI Embeddings
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Gemini
  'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro-latest': { input: 1.25, output: 5.00 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // Claude (if used)
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
} as const;

type ModelName = keyof typeof PRICING;

export interface UsageRecord {
  id?: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  endpoint: string;
  user_id?: string;
  estimated_cost: number;
}

// In-memory buffer for batched writes
const pendingRecords: UsageRecord[] = [];
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

// Lazy Supabase client
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[AI Cost Tracking] Supabase not configured, using console logging only');
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// Periodic flush timer
let flushTimer: ReturnType<typeof setInterval> | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  if (typeof setInterval !== 'undefined') {
    flushTimer = setInterval(() => {
      flushPendingRecords().catch(console.error);
    }, FLUSH_INTERVAL);
  }
}

/**
 * Flush pending records to database
 */
async function flushPendingRecords(): Promise<void> {
  if (pendingRecords.length === 0) return;

  const supabase = getSupabase();
  if (!supabase) {
    // No database, just clear the buffer
    pendingRecords.length = 0;
    return;
  }

  const toFlush = pendingRecords.splice(0, pendingRecords.length);

  try {
    const { error } = await supabase
      .from('ai_usage_logs')
      .insert(toFlush);

    if (error) {
      console.error('[AI Cost Tracking] Failed to persist usage records:', error);
      // Put records back if insert failed (will retry on next flush)
      pendingRecords.unshift(...toFlush);
    }
  } catch (error) {
    console.error('[AI Cost Tracking] Database error:', error);
    pendingRecords.unshift(...toFlush);
  }
}

/**
 * Calculate estimated cost for a request
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model as ModelName];
  if (!pricing) {
    // Default to gpt-4o-mini pricing for unknown models
    const defaultPricing = PRICING['gpt-4o-mini'];
    return (inputTokens * defaultPricing.input + outputTokens * defaultPricing.output) / 1_000_000;
  }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Track AI API usage
 * Buffers records and persists to database in batches
 */
export function trackUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  endpoint: string;
  userId?: string;
}): void {
  const estimatedCost = calculateCost(params.model, params.inputTokens, params.outputTokens);

  const record: UsageRecord = {
    timestamp: new Date().toISOString(),
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    endpoint: params.endpoint,
    user_id: params.userId,
    estimated_cost: estimatedCost,
  };

  // Log for monitoring
  console.log(
    `[AI Cost] ${params.model}: ${params.inputTokens}in/${params.outputTokens}out = $${estimatedCost.toFixed(6)} | ${params.endpoint}`
  );

  // Add to buffer
  pendingRecords.push(record);

  // Start timer if not running
  startFlushTimer();

  // Flush if batch size reached
  if (pendingRecords.length >= BATCH_SIZE) {
    flushPendingRecords().catch(console.error);
  }
}

/**
 * Get usage statistics for a time period
 * Fetches from database for accurate historical data
 */
export async function getUsageStats(params?: {
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  model?: string;
  endpoint?: string;
}): Promise<{
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }>;
  byEndpoint: Record<string, { requests: number; cost: number }>;
}> {
  const supabase = getSupabase();

  // Default response
  const emptyStats = {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    byModel: {} as Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }>,
    byEndpoint: {} as Record<string, { requests: number; cost: number }>,
  };

  if (!supabase) {
    return emptyStats;
  }

  try {
    let query = supabase
      .from('ai_usage_logs')
      .select('*');

    if (params?.startTime) {
      query = query.gte('timestamp', params.startTime.toISOString());
    }
    if (params?.endTime) {
      query = query.lte('timestamp', params.endTime.toISOString());
    }
    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params?.model) {
      query = query.eq('model', params.model);
    }
    if (params?.endpoint) {
      query = query.eq('endpoint', params.endpoint);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('[AI Cost Tracking] Failed to fetch stats:', error);
      return emptyStats;
    }

    // Aggregate results
    const byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }> = {};
    const byEndpoint: Record<string, { requests: number; cost: number }> = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const record of data) {
      totalInputTokens += record.input_tokens;
      totalOutputTokens += record.output_tokens;
      totalCost += record.estimated_cost;

      // Group by model
      if (!byModel[record.model]) {
        byModel[record.model] = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      }
      byModel[record.model].requests++;
      byModel[record.model].inputTokens += record.input_tokens;
      byModel[record.model].outputTokens += record.output_tokens;
      byModel[record.model].cost += record.estimated_cost;

      // Group by endpoint
      if (!byEndpoint[record.endpoint]) {
        byEndpoint[record.endpoint] = { requests: 0, cost: 0 };
      }
      byEndpoint[record.endpoint].requests++;
      byEndpoint[record.endpoint].cost += record.estimated_cost;
    }

    return {
      totalRequests: data.length,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      byModel,
      byEndpoint,
    };
  } catch (error) {
    console.error('[AI Cost Tracking] Error fetching stats:', error);
    return emptyStats;
  }
}

/**
 * Get recent usage records
 */
export async function getRecentUsage(limit: number = 100): Promise<UsageRecord[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AI Cost Tracking] Failed to fetch recent usage:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AI Cost Tracking] Error:', error);
    return [];
  }
}

/**
 * Estimate tokens from text (rough approximation: ~4 chars per token for English)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a usage tracker wrapper for OpenAI responses
 */
export function trackOpenAIResponse(
  response: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } },
  model: string,
  endpoint: string,
  userId?: string
): void {
  if (response.usage) {
    trackUsage({
      model,
      inputTokens: response.usage.prompt_tokens || 0,
      outputTokens: response.usage.completion_tokens || 0,
      endpoint,
      userId,
    });
  }
}

/**
 * Track embedding usage (embeddings only have input tokens)
 */
export function trackEmbeddingUsage(
  inputText: string,
  model: string,
  endpoint: string,
  userId?: string
): void {
  const inputTokens = estimateTokens(inputText);
  trackUsage({
    model,
    inputTokens,
    outputTokens: 0,
    endpoint,
    userId,
  });
}

/**
 * Force flush all pending records (call before shutdown)
 */
export async function shutdown(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushPendingRecords();
}

/**
 * Get current model pricing
 */
export function getModelPricing(): typeof PRICING {
  return { ...PRICING };
}
