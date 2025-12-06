/**
 * Trip Narrative Generation Service
 * Creates human-readable, engaging trip summaries using AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TripNarrative } from '@/types/trip';
import type { ItineraryItem } from '@/types/trip';

interface TripData {
  destination: string;
  startDate: string;
  endDate: string;
  tripType?: 'leisure' | 'work';
  items?: Array<{
    title: string;
    category?: string;
    day?: number;
    time?: string;
  }>;
}

export class NarrativeService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generate a narrative summary for a trip
   */
  async generateNarrative(tripData: TripData): Promise<TripNarrative> {
    const { destination, startDate, endDate, tripType = 'leisure', items = [] } = tripData;

    // Calculate trip duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Format dates for display
    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // If no AI available or no items, generate a basic narrative
    if (!this.genAI || items.length === 0) {
      return this.generateBasicNarrative(destination, durationDays, startFormatted, endFormatted, tripType);
    }

    // Generate AI-powered narrative
    try {
      return await this.generateAINarrative(
        destination,
        durationDays,
        startFormatted,
        endFormatted,
        tripType,
        items
      );
    } catch (error) {
      console.error('AI narrative generation failed:', error);
      return this.generateBasicNarrative(destination, durationDays, startFormatted, endFormatted, tripType);
    }
  }

  /**
   * Generate a basic narrative without AI
   */
  private generateBasicNarrative(
    destination: string,
    durationDays: number,
    startDate: string,
    endDate: string,
    tripType: 'leisure' | 'work'
  ): TripNarrative {
    const intro = tripType === 'work'
      ? `Your ${durationDays}-day business trip to ${destination} from ${startDate} to ${endDate}.`
      : `Get ready for an amazing ${durationDays}-day adventure in ${destination}!`;

    const description = tripType === 'work'
      ? `Make the most of your time in ${destination} with a well-organized schedule. Balance your meetings and work commitments with opportunities to explore the local highlights.`
      : `From ${startDate} to ${endDate}, you'll have the chance to explore ${destination}'s best attractions, savor local cuisine, and create unforgettable memories.`;

    return {
      summary: `${intro} ${description}`,
      dayHighlights: [],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate narrative using AI
   */
  private async generateAINarrative(
    destination: string,
    durationDays: number,
    startDate: string,
    endDate: string,
    tripType: 'leisure' | 'work',
    items: TripData['items']
  ): Promise<TripNarrative> {
    if (!this.genAI) {
      return this.generateBasicNarrative(destination, durationDays, startDate, endDate, tripType);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Group items by day
    const itemsByDay: Record<number, string[]> = {};
    items?.forEach((item) => {
      const day = item.day || 1;
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item.title);
    });

    const itineraryOverview = Object.entries(itemsByDay)
      .map(([day, places]) => `Day ${day}: ${places.join(', ')}`)
      .join('\n');

    const prompt = `Write an engaging, conversational trip summary for a ${tripType} trip to ${destination}.

Trip Details:
- Duration: ${durationDays} days
- Dates: ${startDate} to ${endDate}
- Type: ${tripType}

Planned Activities:
${itineraryOverview || 'Flexible itinerary - exploring the city'}

Write:
1. A 2-3 sentence summary that sounds like a friend describing an exciting trip (use "you'll" and second person)
2. Keep it warm and enthusiastic but not over-the-top
3. Mention specific places from the itinerary naturally
4. Focus on experiences, not logistics

${tripType === 'work' ? 'Balance work mentions with local experiences.' : ''}

Return ONLY the summary text, no JSON or formatting. Keep it under 100 words.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    // Generate day highlights if we have items
    let dayHighlights: string[] = [];
    if (Object.keys(itemsByDay).length > 0) {
      dayHighlights = await this.generateDayHighlights(model, destination, itemsByDay);
    }

    return {
      summary,
      dayHighlights,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate brief highlights for each day
   */
  private async generateDayHighlights(
    model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
    destination: string,
    itemsByDay: Record<number, string[]>
  ): Promise<string[]> {
    try {
      const prompt = `For a trip to ${destination}, write ONE short phrase (5-8 words max) for each day highlighting the main activity:

${Object.entries(itemsByDay)
  .map(([day, places]) => `Day ${day}: ${places.slice(0, 3).join(', ')}`)
  .join('\n')}

Return one line per day, just the phrase, no "Day X:" prefix. Be creative and evocative.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      return text.split('\n').map((line) => line.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Regenerate narrative for an existing trip
   * This is called when user clicks "New plan" to get a fresh narrative
   */
  async regenerateNarrative(tripData: TripData): Promise<TripNarrative> {
    // Simply generate a new narrative
    return this.generateNarrative(tripData);
  }
}

export const narrativeService = new NarrativeService();
