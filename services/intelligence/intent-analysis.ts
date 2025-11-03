/**
 * Enhanced Intent Analysis Service
 * Deep understanding of user queries with temporal, comparative, and multi-intent support
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceRoleClient } from '@/lib/supabase-server';

export interface EnhancedIntent {
  primaryIntent: 'discover' | 'plan' | 'compare' | 'recommend' | 'learn' | 'book';
  secondaryIntents?: string[];
  temporalContext?: {
    timeframe: 'now' | 'soon' | 'future' | 'flexible';
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
  private supabase = createServiceRoleClient();

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
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
    if (!this.genAI) {
      return this.fallbackAnalysis(query);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Build context
      const conversationContext = conversationHistory.length > 0
        ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      // Get user context if available
      let userContext = '';
      if (userId) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style')
          .eq('user_id', userId)
          .single();

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

      const prompt = `Analyze this travel query deeply. Extract not just what, but WHY and HOW.
      
Return ONLY valid JSON with this exact structure:
{
  "primaryIntent": "discover|plan|compare|recommend|learn|book",
  "secondaryIntents": ["array", "of", "additional", "intents"],
  "temporalContext": {
    "timeframe": "now|soon|future|flexible",
    "dateRange": {"start": "YYYY-MM-DD or null", "end": "YYYY-MM-DD or null"},
    "specificDate": "YYYY-MM-DD or null"
  },
  "comparisonMode": true/false,
  "referenceResolution": {
    "type": "previous_result|conversation|user_saved|search",
    "reference": "what is being referenced",
    "confidence": 0.0-1.0
  },
  "constraints": {
    "budget": {"min": number or null, "max": number or null, "currency": "USD or null"},
    "time": {"duration": "string or null", "timeOfDay": "string or null"},
    "preferences": ["array", "of", "preferences"],
    "exclusions": ["array", "of", "things", "to", "exclude"]
  },
  "urgency": "low|medium|high",
  "queryComplexity": "simple|moderate|complex"
}

Query: "${query}"${conversationContext}${userContext}

Guidelines:
- Detect temporal references: "this weekend", "next month", "peak season"
- Identify comparisons: "better than", "similar to", "cheaper than"
- Resolve references: "that one", "the first result", "the hotel you mentioned"
- Extract constraints: budget, time, preferences
- Determine urgency: "urgent", "asap", "flexible"
- Assess complexity: simple (single intent), moderate (2-3 intents), complex (4+ intents)

Return only JSON, no other text:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndEnhanceIntent(parsed, query, conversationHistory);
      }
    } catch (error) {
      console.error('Error in intent analysis:', error);
    }

    return this.fallbackAnalysis(query);
  }

  /**
   * Validate and enhance parsed intent
   */
  private validateAndEnhanceIntent(
    parsed: any,
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

    // Detect comparisons
    if (lowerQuery.includes('better than') || lowerQuery.includes('vs') || lowerQuery.includes('compare')) {
      parsed.comparisonMode = true;
      if (!parsed.primaryIntent) {
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
    
    let primaryIntent: EnhancedIntent['primaryIntent'] = 'discover';
    if (lowerQuery.includes('plan') || lowerQuery.includes('itinerary')) {
      primaryIntent = 'plan';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('better')) {
      primaryIntent = 'compare';
    } else if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      primaryIntent = 'recommend';
    } else if (lowerQuery.includes('when') || lowerQuery.includes('best time')) {
      primaryIntent = 'learn';
    } else if (lowerQuery.includes('book') || lowerQuery.includes('reserve')) {
      primaryIntent = 'book';
    }

    const comparisonMode = lowerQuery.includes('better') || lowerQuery.includes('vs') || lowerQuery.includes('compare');
    
    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (lowerQuery.includes('urgent') || lowerQuery.includes('asap')) {
      urgency = 'high';
    } else if (lowerQuery.includes('soon')) {
      urgency = 'medium';
    }

    return {
      primaryIntent,
      comparisonMode,
      urgency,
      queryComplexity: 'simple',
    };
  }
}

export const intentAnalysisService = new IntentAnalysisService();

