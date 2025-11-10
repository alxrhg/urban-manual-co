/**
 * Conversation-Based Itinerary Generation
 * Generate itineraries through natural conversation
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { itineraryIntelligenceService, Itinerary } from '@/services/intelligence/itinerary';
import { extendedConversationMemoryService } from './conversation-memory';
import { richQueryContextService } from './rich-query-context';

export interface ConversationItineraryRequest {
  userId: string;
  sessionId: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentQuery: string;
}

export class ConversationItineraryService {
  private supabase;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generate itinerary through conversation
   */
  async generateFromConversation(
    request: ConversationItineraryRequest
  ): Promise<{
    itinerary: Itinerary | null;
    needsClarification: boolean;
    clarificationQuestions?: string[];
    confidence: number;
  }> {
    try {
      // Extract requirements from conversation
      const requirements = await this.extractRequirements(request);

      if (requirements.needsClarification) {
        return {
          itinerary: null,
          needsClarification: true,
          clarificationQuestions: requirements.clarificationQuestions,
          confidence: 0.3,
        };
      }

      // Build rich context
      const context = await richQueryContextService.buildContext(
        request.userId,
        requirements.city
      );

      // Generate itinerary
      const itinerary = await itineraryIntelligenceService.generateItinerary(
        requirements.city || 'Unknown',
        requirements.durationDays || 3,
        {
          categories: requirements.categories,
          budget: requirements.budget,
          style: requirements.style,
          mustVisit: requirements.mustVisit,
        },
        request.userId
      );

      // Optimize route if multiple destinations
      if (itinerary && itinerary.items.length > 1) {
        const optimized = await this.optimizeRoute(itinerary);
        return {
          itinerary: optimized,
          needsClarification: false,
          confidence: requirements.confidence,
        };
      }

      return {
        itinerary,
        needsClarification: false,
        confidence: requirements.confidence,
      };
    } catch (error) {
      console.error('Error generating conversation itinerary:', error);
      return {
        itinerary: null,
        needsClarification: true,
        clarificationQuestions: ['Could you tell me which city you\'d like to visit?'],
        confidence: 0.0,
      };
    }
  }

  /**
   * Extract requirements from conversation
   */
  private async extractRequirements(
    request: ConversationItineraryRequest
  ): Promise<{
    city?: string;
    durationDays?: number;
    categories?: string[];
    budget?: number;
    style?: string;
    mustVisit?: string[];
    needsClarification: boolean;
    clarificationQuestions?: string[];
    confidence: number;
  }> {
    if (!this.genAI) {
      return {
        needsClarification: true,
        clarificationQuestions: ['Please specify your travel destination and dates.'],
        confidence: 0.0,
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      const conversationText = request.conversationHistory
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Extract travel itinerary requirements from this conversation. Return JSON:
{
  "city": "city name or null",
  "durationDays": number or null,
  "categories": ["dining", "culture", etc.] or null,
  "budget": number or null,
  "style": "luxury" | "budget" | "mid-range" | null,
  "mustVisit": ["destination names"] or null,
  "needsClarification": boolean,
  "clarificationQuestions": ["question1", "question2"] or null,
  "confidence": 0.0 to 1.0
}

Conversation:
${conversationText}

Current Query: "${request.currentQuery}"

Return only JSON:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error extracting requirements:', error);
    }

    return {
      needsClarification: true,
      clarificationQuestions: ['Could you provide more details about your trip?'],
      confidence: 0.0,
    };
  }

  /**
   * Optimize route for multi-day itinerary
   */
  private async optimizeRoute(itinerary: Itinerary): Promise<Itinerary> {
    try {
      // Use graph sequencing service for route optimization
      const destinationIds = itinerary.items.map(item => {
        // Convert UUID to integer if needed
        const id = typeof item.destination_id === 'string' 
          ? parseInt(item.destination_id) 
          : item.destination_id;
        return id;
      }).filter(id => !isNaN(id));

      if (destinationIds.length < 2) {
        return itinerary;
      }

      // Call ML service for route optimization
      const mlServiceUrl = process.env.ML_SERVICE_URL;
      if (mlServiceUrl) {
        try {
          const response = await fetch(`${mlServiceUrl}/api/graph/optimize-itinerary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination_ids: destinationIds,
              start_latitude: null, // Would get from first destination
              start_longitude: null,
            }),
          });

          if (response.ok) {
            const optimized = await response.json();
            // Map optimized sequence back to itinerary items
            // This is simplified - full implementation would preserve timing, notes, etc.
            return itinerary; // For now, return original
          }
        } catch (error) {
          console.error('Error calling ML service for route optimization:', error);
        }
      }

      // Fallback: simple geographic optimization
      return this.simpleRouteOptimization(itinerary);
    } catch (error) {
      console.error('Error optimizing route:', error);
      return itinerary;
    }
  }

  private async simpleRouteOptimization(itinerary: Itinerary): Promise<Itinerary> {
    // Simple optimization: group by day, sort by location proximity
    // For now, return as-is
    return itinerary;
  }
}

export const conversationItineraryService = new ConversationItineraryService();

