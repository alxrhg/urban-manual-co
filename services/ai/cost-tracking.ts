/**
 * AI Cost Tracking Module
 *
 * Tracks token usage and estimated costs for AI API calls.
 * Helps monitor spending and optimize usage.
 */

// Pricing per 1M tokens (as of 2024)
const PRICING = {
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Gemini (approximate)
  'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro-latest': { input: 1.25, output: 5.00 },
} as const;

type ModelName = keyof typeof PRICING;

interface UsageRecord {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  endpoint: string;
  userId?: string;
  estimatedCost: number;
}

// In-memory storage for current session (could be extended to use Redis/DB)
const usageRecords: UsageRecord[] = [];
const MAX_RECORDS = 10000; // Keep last 10k records in memory

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
    timestamp: Date.now(),
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    endpoint: params.endpoint,
    userId: params.userId,
    estimatedCost,
  };

  usageRecords.push(record);

  // Trim old records if exceeding limit
  if (usageRecords.length > MAX_RECORDS) {
    usageRecords.splice(0, usageRecords.length - MAX_RECORDS);
  }

  // Log for monitoring (can be replaced with proper logging service)
  console.log(`[AI Cost] ${params.model}: ${params.inputTokens}in/${params.outputTokens}out = $${estimatedCost.toFixed(6)} | ${params.endpoint}`);
}

/**
 * Get usage statistics for a time period
 */
export function getUsageStats(params?: {
  startTime?: number;
  endTime?: number;
  userId?: string;
  model?: string;
  endpoint?: string;
}): {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }>;
  byEndpoint: Record<string, { requests: number; cost: number }>;
} {
  const startTime = params?.startTime ?? 0;
  const endTime = params?.endTime ?? Date.now();

  let filteredRecords = usageRecords.filter(
    (r) => r.timestamp >= startTime && r.timestamp <= endTime
  );

  if (params?.userId) {
    filteredRecords = filteredRecords.filter((r) => r.userId === params.userId);
  }
  if (params?.model) {
    filteredRecords = filteredRecords.filter((r) => r.model === params.model);
  }
  if (params?.endpoint) {
    filteredRecords = filteredRecords.filter((r) => r.endpoint === params.endpoint);
  }

  const byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }> = {};
  const byEndpoint: Record<string, { requests: number; cost: number }> = {};

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  for (const record of filteredRecords) {
    totalInputTokens += record.inputTokens;
    totalOutputTokens += record.outputTokens;
    totalCost += record.estimatedCost;

    // Group by model
    if (!byModel[record.model]) {
      byModel[record.model] = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    }
    byModel[record.model].requests++;
    byModel[record.model].inputTokens += record.inputTokens;
    byModel[record.model].outputTokens += record.outputTokens;
    byModel[record.model].cost += record.estimatedCost;

    // Group by endpoint
    if (!byEndpoint[record.endpoint]) {
      byEndpoint[record.endpoint] = { requests: 0, cost: 0 };
    }
    byEndpoint[record.endpoint].requests++;
    byEndpoint[record.endpoint].cost += record.estimatedCost;
  }

  return {
    totalRequests: filteredRecords.length,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    byModel,
    byEndpoint,
  };
}

/**
 * Get recent usage records
 */
export function getRecentUsage(limit: number = 100): UsageRecord[] {
  return usageRecords.slice(-limit);
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
