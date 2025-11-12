/**
 * Enhanced Intent Analysis Service
 * Deep understanding of user queries with temporal, comparative, and multi-intent support
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateJSON } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase-server';

type PrimaryIntentType =
  | 'discover'
  | 'plan'
  | 'compare'
  | 'recommend'
  | 'learn'
  | 'book';

type TimeframeType = 'now' | 'soon' | 'future' | 'flexible';

const INTENT_KEYWORDS: Record<PrimaryIntentType, Array<RegExp | string>> = {
  discover: [
    'discover',
    'explore',
    'find',
    'what to do',
    'things to do',
    /where should i go/i,
  ],
  plan: [
    'plan',
    'planning',
    'itinerary',
    'schedule',
    'organize',
    'arrange',
    'timeline',
  ],
  compare: [
    'compare',
    'versus',
    'vs',
    'difference between',
    'better than',
    'which is better',
    'which one',
    'compare to',
  ],
  recommend: [
    'recommend',
    'recommendation',
    'suggest',
    'suggestion',
    'ideas for',
    'any tips',
    'what do you recommend',
  ],
  learn: [
    'learn',
    'understand',
    'tell me about',
    'information about',
    'history of',
    'when is',
    'why is',
    'how does',
  ],
  book: [
    'book',
    'reserve',
    'reservation',
    'tickets',
    'booking',
  ],
};

const COMPARATIVE_PATTERNS = [
  /\bcompare\b/i,
  /\bcomparison\b/i,
  /\bbetter than\b/i,
  /\bworse than\b/i,
  /\bversus\b/i,
  /\bvs\.?\b/i,
  /\bdifference between\b/i,
  /\bprefer (?:over|to)\b/i,
  /\bmore (?:than|versus)\b/i,
  /\bless (?:than|versus)\b/i,
  /\bwhich (?:is|one is) better\b/i,
];

const NOW_KEYWORDS = ['right now', 'currently', 'today', 'tonight', 'immediately'];
const SOON_KEYWORDS = [
  'soon',
  'this week',
  'this weekend',
  'tomorrow',
  'later today',
  'later tonight',
  'later this week',
  'next week',
  'next weekend',
  'upcoming',
  'over the weekend',
];
const FUTURE_KEYWORDS = [
  'next month',
  'next year',
  'later this year',
  'in a few months',
  'in the future',
  'eventually',
  'next season',
];

const MONTH_REGEX =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b/i;

const SPECIFIC_DATE_REGEX =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i;

const ISO_DATE_REGEX = /\b\d{4}-\d{2}-\d{2}\b/;

const DATE_RANGE_REGEX = /\b(?:between|from)\s+([^.,;]+?)\s+(?:and|to)\s+([^.,;]+)/i;

const SEASON_REGEX = /\b(?:this|next)?\s*(spring|summer|fall|autumn|winter)\b/i;

export interface EnhancedIntent {
  primaryIntent: PrimaryIntentType;
  secondaryIntents?: string[];
  temporalContext?: {
    timeframe: TimeframeType;
    dateRange?: { start: string; end: string };
    specificDate?: string;
  };
  comparisonMode?: boolean;
  referenceResolution?: {
    type: 'previous_result' | 'conversation' | 'user_saved' | 'search';
    reference: string;
    confidence: number;
  };
  constraints?: {
    budget?: { min?: number; max?: number; currency?: string };
    time?: { duration?: string; timeOfDay?: string };
    preferences?: string[];
    exclusions?: string[];
  };
  urgency?: 'low' | 'medium' | 'high';
  queryComplexity: 'simple' | 'moderate' | 'complex';
}

export class IntentAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private supabase;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    try {
      this.supabase = createServiceRoleClient();
    } catch (error: unknown) {
      this.supabase = null;
      console.warn('IntentAnalysisService: Supabase client not available', error);
    }
  }

  /**
   * Analyze query with full context
   */
  async analyzeIntent(
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userId?: string
  ): Promise<EnhancedIntent> {
    try {

      // Build context
      const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      // Get user context if available
      let userContext = '';
      if (userId && this.supabase) {
        const { data: profile, error: profileError } = await this.supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn('IntentAnalysisService: profile lookup failed', profileError.message);
        }

        if (profile) {
          const parts = [];
          if (profile.favorite_cities?.length) {
            parts.push(`Favorite cities: ${profile.favorite_cities.join(', ')}`);
          }
          if (profile.favorite_categories?.length) {
            parts.push(`Favorite categories: ${profile.favorite_categories.join(', ')}`);
          }
          if (profile.travel_style) {
            parts.push(`Travel style: ${profile.travel_style}`);
          }
          if (parts.length > 0) {
            userContext = `\n\nUser Context: ${parts.join('; ')}`;
          }
        }
      }

      const system = `Analyze travel queries deeply and return STRICT JSON only with these fields: primaryIntent, secondaryIntents, temporalContext{timeframe,dateRange{start,end},specificDate}, comparisonMode, referenceResolution{type,reference,confidence}, constraints{budget{min,max,currency},time{duration,timeOfDay},preferences,exclusions}, urgency, queryComplexity.`;
      const userPayload = `Query: "${query}"${conversationContext}${userContext}`;
      const parsed = await generateJSON(system, userPayload);
      if (parsed) {
        return this.validateAndEnhanceIntent(parsed, query, conversationHistory);
      }
    } catch (error: unknown) {
      console.error('Error in intent analysis:', error);
    }

    return this.fallbackAnalysis(query);
  }

  /**
   * Validate and enhance parsed intent
   */
  private validateAndEnhanceIntent(
    parsed: Partial<EnhancedIntent> & Record<string, unknown>,
    query: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): EnhancedIntent {
    // Detect relative queries
    const lowerQuery = query.toLowerCase();
    if ((lowerQuery.includes('more') || lowerQuery.includes('another') || lowerQuery.includes('similar'))
        && conversationHistory.length > 0) {
      parsed.referenceResolution = {
        type: 'previous_result',
        reference: 'last search results',
        confidence: 0.7,
      };
    }

    // Classify primary intent heuristically if missing or generic
    if (!parsed.primaryIntent || parsed.primaryIntent === 'discover') {
      parsed.primaryIntent = this.detectPrimaryIntent(query, parsed.primaryIntent);
    }

    // Detect comparisons
    if (this.detectComparativeLanguage(query)) {
      parsed.comparisonMode = true;
      if (!parsed.primaryIntent || parsed.primaryIntent === 'discover') {
        parsed.primaryIntent = 'compare';
      }
    }

    // Detect urgency
    if (lowerQuery.includes('urgent') || lowerQuery.includes('asap') || lowerQuery.includes('immediately')) {
      parsed.urgency = 'high';
    } else if (lowerQuery.includes('soon') || lowerQuery.includes('next week')) {
      parsed.urgency = 'medium';
    } else {
      parsed.urgency = parsed.urgency || 'low';
    }

    // Extract temporal context
    const temporalFromQuery = this.extractTemporalContext(query);
    parsed.temporalContext = this.mergeTemporalContext(parsed.temporalContext, temporalFromQuery);

    // Assess complexity
    const intentCount = [parsed.primaryIntent, ...(parsed.secondaryIntents || [])].length;
    if (intentCount === 1 && !parsed.constraints) {
      parsed.queryComplexity = 'simple';
    } else if (intentCount <= 3 && parsed.constraints) {
      parsed.queryComplexity = 'moderate';
    } else {
      parsed.queryComplexity = 'complex';
    }

    return parsed as EnhancedIntent;
  }

  /**
   * Fallback analysis without AI
   */
  private fallbackAnalysis(query: string): EnhancedIntent {
    const lowerQuery = query.toLowerCase();

    const primaryIntent = this.detectPrimaryIntent(query);
    const comparisonMode = this.detectComparativeLanguage(query);

    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (lowerQuery.includes('urgent') || lowerQuery.includes('asap')) {
      urgency = 'high';
    } else if (lowerQuery.includes('soon')) {
      urgency = 'medium';
    }

    const temporalContext = this.extractTemporalContext(query);

    return {
      primaryIntent,
      comparisonMode,
      urgency,
      ...(temporalContext ? { temporalContext } : {}),
      queryComplexity: 'simple',
    };
  }

  private detectPrimaryIntent(query: string, existingIntent?: PrimaryIntentType): PrimaryIntentType {
    const normalized = query.toLowerCase();

    const scores: Record<PrimaryIntentType, number> = {
      discover: 0,
      plan: 0,
      compare: 0,
      recommend: 0,
      learn: 0,
      book: 0,
    };

    Object.entries(INTENT_KEYWORDS).forEach(([intent, keywords]) => {
      keywords.forEach((keyword) => {
        if (typeof keyword === 'string') {
          if (normalized.includes(keyword.toLowerCase())) {
            scores[intent as PrimaryIntentType] += 1;
          }
        } else if (keyword.test(query)) {
          scores[intent as PrimaryIntentType] += 1.5;
        }
      });
    });

    // Question-focused heuristics leaning toward recommend/learn
    if (/\bwhat are the best\b/i.test(query) || /\bany (?:good|great)\b/i.test(query)) {
      scores.recommend += 1.5;
    }
    if (/\bhow (?:do|does|should)\b/i.test(query) || /\bwhy\b/i.test(query)) {
      scores.learn += 1;
    }
    if (/\btrip\b/i.test(query) || /\btravel plan\b/i.test(query)) {
      scores.plan += 1;
    }

    let bestIntent: PrimaryIntentType = existingIntent || 'discover';
    let bestScore = scores[bestIntent];

    (Object.keys(scores) as PrimaryIntentType[]).forEach((intent) => {
      const score = scores[intent];
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    });

    return bestIntent;
  }

  private detectComparativeLanguage(query: string): boolean {
    return COMPARATIVE_PATTERNS.some((pattern) => pattern.test(query));
  }

  private extractTemporalContext(query: string): EnhancedIntent['temporalContext'] | undefined {
    const lower = query.toLowerCase();

    let timeframe: TimeframeType = 'flexible';
    if (NOW_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      timeframe = 'now';
    } else if (SOON_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      timeframe = 'soon';
    } else if (
      FUTURE_KEYWORDS.some((keyword) => lower.includes(keyword)) ||
      /next\s+(?:month|year|spring|summer|fall|autumn|winter)/i.test(query)
    ) {
      timeframe = 'future';
    } else if (MONTH_REGEX.test(lower) || SEASON_REGEX.test(query)) {
      timeframe = 'future';
    }

    const isoMatch = query.match(ISO_DATE_REGEX);
    const specificMatch = query.match(SPECIFIC_DATE_REGEX);
    const seasonMatch = query.match(SEASON_REGEX);
    const rangeMatch = query.match(DATE_RANGE_REGEX);

    const temporalContext: EnhancedIntent['temporalContext'] = {
      timeframe,
    };

    if (rangeMatch) {
      temporalContext.dateRange = {
        start: rangeMatch[1].trim(),
        end: rangeMatch[2].trim(),
      };
    }

    if (isoMatch) {
      temporalContext.specificDate = isoMatch[0];
    } else if (specificMatch) {
      temporalContext.specificDate = specificMatch[0];
    } else if (seasonMatch) {
      temporalContext.specificDate = seasonMatch[0];
    }

    if (
      timeframe === 'flexible' &&
      !temporalContext.dateRange &&
      !temporalContext.specificDate
    ) {
      return undefined;
    }

    return temporalContext;
  }

  private mergeTemporalContext(
    existing?: EnhancedIntent['temporalContext'],
    extracted?: EnhancedIntent['temporalContext'],
  ): EnhancedIntent['temporalContext'] | undefined {
    if (!existing && !extracted) {
      return undefined;
    }

    if (!existing) {
      return extracted;
    }

    if (!extracted) {
      return existing;
    }

    const merged: EnhancedIntent['temporalContext'] = { ...existing };

    if (
      (!merged.timeframe || merged.timeframe === 'flexible') &&
      extracted.timeframe &&
      extracted.timeframe !== 'flexible'
    ) {
      merged.timeframe = extracted.timeframe;
    }

    if (!merged.dateRange && extracted.dateRange) {
      merged.dateRange = extracted.dateRange;
    }

    if (!merged.specificDate && extracted.specificDate) {
      merged.specificDate = extracted.specificDate;
    }

    return merged;
  }
}

export const intentAnalysisService = new IntentAnalysisService();
