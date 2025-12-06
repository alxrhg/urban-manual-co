/**
 * Seasonal Intelligence Service
 * Provides crowd levels, timing recommendations, and seasonal insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SeasonalIntelligence } from '@/types/trip';

/**
 * Known peak seasons for major destinations
 * Format: city -> array of peak month ranges
 */
const PEAK_SEASONS: Record<string, { months: number[]; reason: string }[]> = {
  // Europe
  paris: [
    { months: [6, 7, 8], reason: 'Summer vacation season' },
    { months: [12], reason: 'Christmas markets and New Year celebrations' },
  ],
  london: [
    { months: [6, 7, 8], reason: 'Summer tourist season' },
    { months: [12], reason: 'Christmas shopping and festivities' },
  ],
  rome: [
    { months: [4, 5, 6, 9, 10], reason: 'Spring and fall are ideal weather' },
    { months: [7, 8], reason: 'Peak summer despite heat' },
  ],
  barcelona: [
    { months: [6, 7, 8], reason: 'Beach and festival season' },
    { months: [9], reason: 'La Merce festival' },
  ],
  amsterdam: [
    { months: [4, 5], reason: 'Tulip season and King\'s Day' },
    { months: [7, 8], reason: 'Summer festivals' },
  ],

  // Asia
  tokyo: [
    { months: [3, 4], reason: 'Cherry blossom season' },
    { months: [10, 11], reason: 'Fall foliage season' },
    { months: [12], reason: 'New Year celebrations' },
  ],
  kyoto: [
    { months: [3, 4], reason: 'Cherry blossom season' },
    { months: [10, 11], reason: 'Fall foliage at temples' },
  ],
  bangkok: [
    { months: [11, 12, 1, 2], reason: 'Cool and dry season' },
  ],
  singapore: [
    { months: [12, 1], reason: 'Year-end holidays and sales' },
  ],

  // Americas
  'new york': [
    { months: [11, 12], reason: 'Thanksgiving through New Year' },
    { months: [6, 7, 8], reason: 'Summer vacation season' },
  ],
  miami: [
    { months: [12, 1, 2, 3], reason: 'Winter escape and spring break' },
    { months: [11], reason: 'Art Basel and music festivals' },
  ],
  'los angeles': [
    { months: [6, 7, 8], reason: 'Summer vacation season' },
    { months: [2], reason: 'Awards season' },
  ],
  'san francisco': [
    { months: [9, 10], reason: 'Indian summer - best weather' },
    { months: [6, 7, 8], reason: 'Tourist season despite fog' },
  ],
  'mexico city': [
    { months: [10, 11], reason: 'Day of the Dead celebrations' },
    { months: [12, 1, 2], reason: 'Dry season with pleasant weather' },
  ],

  // Caribbean
  'san juan': [
    { months: [12, 1, 2, 3, 4], reason: 'Dry season and cruise traffic' },
  ],

  // Middle East
  dubai: [
    { months: [11, 12, 1, 2, 3], reason: 'Cool season and shopping festivals' },
  ],
  istanbul: [
    { months: [4, 5, 9, 10], reason: 'Pleasant weather and fewer crowds' },
    { months: [6, 7, 8], reason: 'Peak summer tourism' },
  ],
};

/**
 * Major events that affect crowd levels
 */
const MAJOR_EVENTS: Record<string, { month: number; day?: number; name: string; duration?: number }[]> = {
  'new york': [
    { month: 11, day: 24, name: 'Thanksgiving', duration: 4 },
    { month: 12, day: 31, name: 'New Year\'s Eve', duration: 2 },
    { month: 1, day: 1, name: 'New Year\'s Day', duration: 1 },
  ],
  tokyo: [
    { month: 3, day: 25, name: 'Cherry Blossom Festival', duration: 14 },
    { month: 5, day: 3, name: 'Golden Week', duration: 7 },
  ],
  barcelona: [
    { month: 9, day: 24, name: 'La Merce Festival', duration: 5 },
    { month: 6, day: 23, name: 'Sant Joan Festival', duration: 3 },
  ],
  miami: [
    { month: 12, day: 1, name: 'Art Basel Miami Beach', duration: 5 },
    { month: 3, day: 15, name: 'Spring Break', duration: 21 },
  ],
  'san juan': [
    { month: 6, day: 23, name: 'San Juan Bautista Festival', duration: 3 },
  ],
};

export class SeasonalIntelligenceService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Get seasonal intelligence for a destination and date range
   */
  async getSeasonalIntelligence(
    destination: string,
    startDate: string,
    endDate?: string
  ): Promise<SeasonalIntelligence> {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const month = start.getMonth() + 1; // 1-indexed

    // Normalize destination for lookup
    const normalizedDest = destination.toLowerCase().trim();

    // Check known peak seasons
    const peakSeasons = this.findPeakSeasons(normalizedDest, month);
    const isPeakSeason = peakSeasons.length > 0;

    // Check for major events
    const events = this.findEvents(normalizedDest, start, end);

    // Calculate crowd level
    const crowdLevel = this.calculateCrowdLevel(isPeakSeason, events.length, month);

    // Generate tips
    const tips = this.generateTips(isPeakSeason, crowdLevel, events, month);

    // Get AI-enhanced description if available
    let seasonDescription = this.getDefaultDescription(destination, month, isPeakSeason, peakSeasons);

    if (this.genAI) {
      try {
        const aiDescription = await this.getAIDescription(destination, startDate, endDate, isPeakSeason);
        if (aiDescription) {
          seasonDescription = aiDescription;
        }
      } catch (error) {
        console.warn('AI description generation failed, using default');
      }
    }

    return {
      isPeakSeason,
      crowdLevel,
      seasonDescription,
      tips,
      bestTimeToVisit: this.getBestTimeToVisit(normalizedDest),
      weatherPattern: this.getWeatherPattern(normalizedDest, month),
      majorEvents: events.map((e) => e.name),
    };
  }

  /**
   * Find applicable peak seasons for destination and month
   */
  private findPeakSeasons(
    destination: string,
    month: number
  ): { months: number[]; reason: string }[] {
    // Try exact match first
    let seasons = PEAK_SEASONS[destination];

    // Try partial match
    if (!seasons) {
      const matchingKey = Object.keys(PEAK_SEASONS).find(
        (key) => destination.includes(key) || key.includes(destination)
      );
      if (matchingKey) {
        seasons = PEAK_SEASONS[matchingKey];
      }
    }

    if (!seasons) return [];

    return seasons.filter((s) => s.months.includes(month));
  }

  /**
   * Find events occurring during the date range
   */
  private findEvents(
    destination: string,
    start: Date,
    end: Date
  ): { month: number; day?: number; name: string }[] {
    // Try exact match first
    let events = MAJOR_EVENTS[destination];

    // Try partial match
    if (!events) {
      const matchingKey = Object.keys(MAJOR_EVENTS).find(
        (key) => destination.includes(key) || key.includes(destination)
      );
      if (matchingKey) {
        events = MAJOR_EVENTS[matchingKey];
      }
    }

    if (!events) return [];

    // Filter events that fall within the date range
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;

    return events.filter((event) => {
      return event.month >= startMonth && event.month <= endMonth;
    });
  }

  /**
   * Calculate crowd level based on various factors
   */
  private calculateCrowdLevel(
    isPeakSeason: boolean,
    eventCount: number,
    month: number
  ): SeasonalIntelligence['crowdLevel'] {
    let score = 0;

    if (isPeakSeason) score += 2;
    score += eventCount;

    // Weekend/holiday boost
    if ([6, 7, 8, 12].includes(month)) score += 1;

    if (score >= 4) return 'very_high';
    if (score >= 2) return 'high';
    if (score >= 1) return 'moderate';
    return 'low';
  }

  /**
   * Generate helpful tips based on conditions
   */
  private generateTips(
    isPeakSeason: boolean,
    crowdLevel: SeasonalIntelligence['crowdLevel'],
    events: { name: string }[],
    month: number
  ): string[] {
    const tips: string[] = [];

    if (isPeakSeason || crowdLevel === 'high' || crowdLevel === 'very_high') {
      tips.push('Book accommodations and popular activities well in advance, as this is a popular travel period.');
      tips.push('Consider visiting during the weekdays to potentially experience slightly fewer crowds compared to weekends.');
    }

    if (crowdLevel === 'very_high') {
      tips.push('Expect longer wait times at popular attractions. Consider booking skip-the-line tickets where available.');
      tips.push('Restaurant reservations are highly recommended, especially for popular spots.');
    }

    if (events.length > 0) {
      tips.push(`Special events during your visit: ${events.map((e) => e.name).join(', ')}. Plan around these for unique experiences or to avoid extra crowds.`);
    }

    if (crowdLevel === 'low' || crowdLevel === 'moderate') {
      tips.push('Great timing! You\'ll likely enjoy shorter lines and better availability at attractions.');
    }

    // Seasonal tips
    if ([12, 1, 2].includes(month)) {
      tips.push('Pack layers and check for holiday closures at attractions.');
    } else if ([6, 7, 8].includes(month)) {
      tips.push('Stay hydrated and plan outdoor activities for cooler morning or evening hours.');
    }

    return tips;
  }

  /**
   * Get default description for the season
   */
  private getDefaultDescription(
    destination: string,
    month: number,
    isPeakSeason: boolean,
    peakSeasons: { reason: string }[]
  ): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[month - 1];

    if (isPeakSeason && peakSeasons.length > 0) {
      const reason = peakSeasons[0].reason;
      return `${monthName} in ${destination} falls within the peak tourist season, driven by ${reason.toLowerCase()}. Expect higher prices and more visitors.`;
    }

    if (isPeakSeason) {
      return `${monthName} in ${destination} is a popular time to visit. Plan ahead to secure the best rates and availability.`;
    }

    return `${monthName} is a relatively quiet time to visit ${destination}, making it an attractive option for travelers seeking fewer crowds.`;
  }

  /**
   * Get AI-enhanced seasonal description
   */
  private async getAIDescription(
    destination: string,
    startDate: string,
    endDate?: string,
    isPeakSeason?: boolean
  ): Promise<string | null> {
    if (!this.genAI) return null;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `Provide a brief (2-3 sentences) description of what travelers can expect when visiting ${destination} around ${startDate}${endDate ? ` to ${endDate}` : ''}.
Focus on:
- Weather conditions
- Crowd levels
- Any notable seasonal characteristics

Be informative but concise. Do not include booking tips or recommendations.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  /**
   * Get best time to visit recommendation
   */
  private getBestTimeToVisit(destination: string): string | undefined {
    const recommendations: Record<string, string> = {
      paris: 'April-June or September-October for mild weather and fewer crowds',
      tokyo: 'Late March-April for cherry blossoms, or November for fall colors',
      'new york': 'September-November for pleasant weather and fall foliage',
      miami: 'March-May for warm weather before summer heat and hurricane season',
      barcelona: 'May-June or September-October for ideal beach and sightseeing weather',
      london: 'May-September for warmest weather and longest days',
      rome: 'April-May or September-October to avoid summer heat and crowds',
    };

    return recommendations[destination];
  }

  /**
   * Get typical weather pattern
   */
  private getWeatherPattern(destination: string, month: number): string | undefined {
    // This is a simplified version - could be enhanced with actual weather data
    const winterMonths = [12, 1, 2];
    const summerMonths = [6, 7, 8];

    if (destination.includes('miami') || destination.includes('san juan')) {
      if (winterMonths.includes(month)) return 'Warm and dry - ideal beach weather';
      if ([6, 7, 8, 9, 10].includes(month)) return 'Hot and humid with chance of tropical storms';
      return 'Pleasant and warm';
    }

    if (destination.includes('tokyo') || destination.includes('kyoto')) {
      if (winterMonths.includes(month)) return 'Cold and dry';
      if ([3, 4].includes(month)) return 'Mild with cherry blossoms';
      if ([6, 7].includes(month)) return 'Rainy season (tsuyu)';
      if ([8].includes(month)) return 'Hot and humid';
      if ([10, 11].includes(month)) return 'Pleasant fall weather';
      return 'Variable';
    }

    // Default patterns for temperate destinations
    if (winterMonths.includes(month)) return 'Cold winter weather';
    if (summerMonths.includes(month)) return 'Warm summer weather';
    if ([3, 4, 5].includes(month)) return 'Mild spring weather';
    return 'Pleasant fall weather';
  }
}

export const seasonalIntelligenceService = new SeasonalIntelligenceService();
