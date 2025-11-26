/**
 * Best Time to Visit Intelligence Service
 * Combines weather, crowd levels, and price forecasts to recommend optimal visit windows
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { forecastingService } from './forecasting';

export interface TimeWindow {
  startDate: string;
  endDate: string;
  overallScore: number; // 0-100, higher is better
  factors: {
    weather: {
      score: number;
      description: string;
      avgTemperature?: number;
      rainProbability?: number;
    };
    crowds: {
      score: number;
      description: string;
      expectedLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    };
    prices: {
      score: number;
      description: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      relativeCost: 'budget' | 'value' | 'moderate' | 'premium' | 'peak';
    };
  };
  recommendation: string;
  urgency?: 'book_now' | 'book_soon' | 'flexible';
}

export interface BestTimeResult {
  destinationId?: string;
  city: string;
  country?: string;
  analysis: {
    bestOverall: TimeWindow;
    bestForBudget: TimeWindow;
    bestForWeather: TimeWindow;
    bestForCrowds: TimeWindow;
  };
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    overallScore: number;
    weatherScore: number;
    crowdScore: number;
    priceScore: number;
    highlights: string[];
    warnings: string[];
  }>;
  insights: string[];
  lastUpdated: Date;
}

// Seasonal weather patterns by region (simplified)
const REGIONAL_WEATHER_PATTERNS: Record<string, {
  hemisphere: 'northern' | 'southern' | 'tropical';
  bestMonths: number[];
  worstMonths: number[];
  rainyMonths: number[];
}> = {
  // Europe
  'France': { hemisphere: 'northern', bestMonths: [5, 6, 9], worstMonths: [1, 2, 12], rainyMonths: [11, 3] },
  'Italy': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [1, 2], rainyMonths: [11] },
  'Spain': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [7, 8], rainyMonths: [11, 3] },
  'United Kingdom': { hemisphere: 'northern', bestMonths: [5, 6, 7], worstMonths: [11, 12, 1], rainyMonths: [10, 11] },
  'Germany': { hemisphere: 'northern', bestMonths: [5, 6, 9], worstMonths: [1, 2], rainyMonths: [7, 8] },
  'Netherlands': { hemisphere: 'northern', bestMonths: [4, 5, 6], worstMonths: [11, 12, 1], rainyMonths: [10, 11] },
  'Portugal': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [7, 8], rainyMonths: [11, 12] },
  'Greece': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [7, 8], rainyMonths: [11, 12] },
  'Denmark': { hemisphere: 'northern', bestMonths: [6, 7, 8], worstMonths: [11, 12, 1, 2], rainyMonths: [9, 10] },
  'Sweden': { hemisphere: 'northern', bestMonths: [6, 7, 8], worstMonths: [11, 12, 1, 2], rainyMonths: [9, 10] },
  'Norway': { hemisphere: 'northern', bestMonths: [6, 7, 8], worstMonths: [11, 12, 1], rainyMonths: [9, 10] },
  'Austria': { hemisphere: 'northern', bestMonths: [5, 6, 9], worstMonths: [1, 2], rainyMonths: [6, 7] },
  'Switzerland': { hemisphere: 'northern', bestMonths: [6, 7, 8, 9], worstMonths: [11, 12, 1], rainyMonths: [5, 6] },
  'Belgium': { hemisphere: 'northern', bestMonths: [5, 6, 7], worstMonths: [11, 12, 1], rainyMonths: [10, 11] },

  // Americas
  'United States': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [1, 2], rainyMonths: [4] },
  'Mexico': { hemisphere: 'northern', bestMonths: [11, 12, 1, 2, 3], worstMonths: [6, 7, 8, 9], rainyMonths: [6, 7, 8, 9] },
  'Brazil': { hemisphere: 'southern', bestMonths: [6, 7, 8, 9], worstMonths: [1, 2, 3], rainyMonths: [12, 1, 2, 3] },
  'Argentina': { hemisphere: 'southern', bestMonths: [10, 11, 3, 4], worstMonths: [6, 7, 8], rainyMonths: [3, 4] },
  'Peru': { hemisphere: 'southern', bestMonths: [5, 6, 7, 8, 9], worstMonths: [1, 2, 3], rainyMonths: [12, 1, 2, 3] },
  'Colombia': { hemisphere: 'tropical', bestMonths: [12, 1, 2, 7, 8], worstMonths: [4, 5, 10, 11], rainyMonths: [4, 5, 10, 11] },
  'Canada': { hemisphere: 'northern', bestMonths: [6, 7, 8, 9], worstMonths: [12, 1, 2], rainyMonths: [4, 10] },

  // Asia
  'Japan': { hemisphere: 'northern', bestMonths: [3, 4, 10, 11], worstMonths: [6, 7, 8], rainyMonths: [6, 7] },
  'Thailand': { hemisphere: 'tropical', bestMonths: [11, 12, 1, 2], worstMonths: [4, 5], rainyMonths: [5, 6, 7, 8, 9, 10] },
  'Vietnam': { hemisphere: 'tropical', bestMonths: [2, 3, 4], worstMonths: [7, 8, 9], rainyMonths: [7, 8, 9, 10] },
  'Singapore': { hemisphere: 'tropical', bestMonths: [2, 3, 4, 5, 6, 7, 8, 9], worstMonths: [11, 12, 1], rainyMonths: [11, 12, 1] },
  'South Korea': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [7, 8], rainyMonths: [7, 8] },
  'China': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [7, 8], rainyMonths: [7, 8] },
  'India': { hemisphere: 'tropical', bestMonths: [10, 11, 12, 1, 2, 3], worstMonths: [6, 7, 8, 9], rainyMonths: [6, 7, 8, 9] },
  'Indonesia': { hemisphere: 'tropical', bestMonths: [5, 6, 7, 8, 9], worstMonths: [12, 1, 2], rainyMonths: [11, 12, 1, 2, 3] },
  'Malaysia': { hemisphere: 'tropical', bestMonths: [1, 2, 6, 7], worstMonths: [10, 11, 12], rainyMonths: [10, 11, 12] },
  'Philippines': { hemisphere: 'tropical', bestMonths: [1, 2, 3, 4, 5], worstMonths: [7, 8, 9], rainyMonths: [6, 7, 8, 9, 10, 11] },

  // Oceania
  'Australia': { hemisphere: 'southern', bestMonths: [9, 10, 11, 3, 4, 5], worstMonths: [12, 1, 2], rainyMonths: [1, 2, 3] },
  'New Zealand': { hemisphere: 'southern', bestMonths: [12, 1, 2, 3], worstMonths: [6, 7, 8], rainyMonths: [6, 7] },

  // Middle East
  'UAE': { hemisphere: 'northern', bestMonths: [11, 12, 1, 2, 3], worstMonths: [6, 7, 8], rainyMonths: [1, 2] },
  'Israel': { hemisphere: 'northern', bestMonths: [3, 4, 5, 10, 11], worstMonths: [7, 8], rainyMonths: [12, 1, 2] },
  'Turkey': { hemisphere: 'northern', bestMonths: [4, 5, 9, 10], worstMonths: [7, 8], rainyMonths: [12, 1] },
  'Morocco': { hemisphere: 'northern', bestMonths: [3, 4, 5, 10, 11], worstMonths: [7, 8], rainyMonths: [11, 12] },

  // Africa
  'South Africa': { hemisphere: 'southern', bestMonths: [9, 10, 11, 3, 4], worstMonths: [6, 7, 8], rainyMonths: [11, 12, 1, 2, 3] },
  'Egypt': { hemisphere: 'northern', bestMonths: [10, 11, 2, 3, 4], worstMonths: [6, 7, 8], rainyMonths: [12, 1] },
  'Kenya': { hemisphere: 'tropical', bestMonths: [1, 2, 6, 7, 8, 9], worstMonths: [4, 5, 11], rainyMonths: [3, 4, 5, 10, 11] },
  'Tanzania': { hemisphere: 'tropical', bestMonths: [6, 7, 8, 9, 10, 1, 2], worstMonths: [3, 4, 5], rainyMonths: [3, 4, 5, 11] },
};

// Peak tourism seasons by country
const PEAK_SEASONS: Record<string, number[]> = {
  'France': [7, 8, 12],
  'Italy': [7, 8, 4],
  'Spain': [7, 8],
  'United Kingdom': [7, 8],
  'Japan': [3, 4, 10, 11],
  'Thailand': [12, 1, 2],
  'United States': [6, 7, 8, 12],
  'Australia': [12, 1],
  'Mexico': [12, 1, 3],
  'Greece': [7, 8],
  'Portugal': [7, 8],
  'Germany': [7, 8, 12],
  'Netherlands': [4, 5, 7, 8],
  'Turkey': [7, 8],
  'Morocco': [3, 4, 10],
};

export class BestTimeToVisitService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch {
      this.supabase = null;
    }
  }

  /**
   * Get best time to visit analysis for a destination or city
   */
  async getBestTimeToVisit(
    options: {
      city?: string;
      country?: string;
      destinationId?: string;
      monthsAhead?: number;
    }
  ): Promise<BestTimeResult | null> {
    const { city, country, destinationId, monthsAhead = 12 } = options;

    if (!city && !destinationId) {
      return null;
    }

    try {
      // Get destination/city data
      let destinationCountry = country;
      let destinationCity = city;

      if (destinationId && this.supabase) {
        const { data } = await this.supabase
          .from('destinations')
          .select('city, country')
          .eq('id', destinationId)
          .single();

        if (data) {
          destinationCity = data.city;
          destinationCountry = data.country;
        }
      }

      if (!destinationCity) {
        return null;
      }

      // Generate monthly breakdown
      const monthlyBreakdown = await this.generateMonthlyBreakdown(
        destinationCity,
        destinationCountry || '',
        destinationId,
        monthsAhead
      );

      // Find best windows for different criteria
      const bestOverall = this.findBestWindow(monthlyBreakdown, 'overall');
      const bestForBudget = this.findBestWindow(monthlyBreakdown, 'price');
      const bestForWeather = this.findBestWindow(monthlyBreakdown, 'weather');
      const bestForCrowds = this.findBestWindow(monthlyBreakdown, 'crowd');

      // Generate insights
      const insights = this.generateInsights(
        monthlyBreakdown,
        destinationCity,
        destinationCountry || ''
      );

      return {
        destinationId,
        city: destinationCity,
        country: destinationCountry,
        analysis: {
          bestOverall,
          bestForBudget,
          bestForWeather,
          bestForCrowds,
        },
        monthlyBreakdown,
        insights,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error getting best time to visit:', error);
      return null;
    }
  }

  /**
   * Generate monthly breakdown for the next N months
   */
  private async generateMonthlyBreakdown(
    city: string,
    country: string,
    destinationId: string | undefined,
    monthsAhead: number
  ): Promise<BestTimeResult['monthlyBreakdown']> {
    const breakdown: BestTimeResult['monthlyBreakdown'] = [];
    const now = new Date();

    for (let i = 0; i < monthsAhead; i++) {
      const targetDate = new Date(now);
      targetDate.setMonth(targetDate.getMonth() + i);
      const month = targetDate.getMonth() + 1; // 1-12
      const year = targetDate.getFullYear();
      const monthName = targetDate.toLocaleString('en-US', { month: 'long' });

      // Calculate scores
      const weatherScore = this.calculateWeatherScore(country, month);
      const crowdScore = this.calculateCrowdScore(country, month);
      const priceScore = await this.calculatePriceScore(city, destinationId, month, year);

      // Overall score: weighted average
      const overallScore = Math.round(
        weatherScore * 0.35 + crowdScore * 0.30 + priceScore * 0.35
      );

      // Generate highlights and warnings
      const highlights: string[] = [];
      const warnings: string[] = [];

      if (weatherScore >= 80) {
        highlights.push('Excellent weather conditions');
      } else if (weatherScore >= 60) {
        highlights.push('Good weather expected');
      }

      if (crowdScore >= 80) {
        highlights.push('Low tourist crowds');
      } else if (crowdScore <= 30) {
        warnings.push('Peak tourist season - expect crowds');
      }

      if (priceScore >= 80) {
        highlights.push('Best prices of the year');
      } else if (priceScore <= 30) {
        warnings.push('Peak pricing period');
      }

      // Check for special events/seasons
      const specialNotes = this.getSpecialNotes(country, month);
      if (specialNotes.highlights.length > 0) {
        highlights.push(...specialNotes.highlights);
      }
      if (specialNotes.warnings.length > 0) {
        warnings.push(...specialNotes.warnings);
      }

      breakdown.push({
        month: monthName,
        year,
        overallScore,
        weatherScore,
        crowdScore,
        priceScore,
        highlights,
        warnings,
      });
    }

    return breakdown;
  }

  /**
   * Calculate weather score based on regional patterns
   */
  private calculateWeatherScore(country: string, month: number): number {
    const pattern = REGIONAL_WEATHER_PATTERNS[country];

    if (!pattern) {
      // Default: northern hemisphere, mild preference for spring/fall
      const defaultBest = [4, 5, 9, 10];
      const defaultWorst = [1, 2, 7, 8];

      if (defaultBest.includes(month)) return 80 + Math.random() * 15;
      if (defaultWorst.includes(month)) return 30 + Math.random() * 20;
      return 50 + Math.random() * 25;
    }

    let score = 50; // Base score

    // Best months get high scores
    if (pattern.bestMonths.includes(month)) {
      score = 85 + Math.random() * 10;
    }
    // Worst months get low scores
    else if (pattern.worstMonths.includes(month)) {
      score = 20 + Math.random() * 15;
    }
    // Rainy months get medium-low scores
    else if (pattern.rainyMonths.includes(month)) {
      score = 35 + Math.random() * 15;
    }
    // Other months are moderate
    else {
      score = 55 + Math.random() * 20;
    }

    return Math.round(score);
  }

  /**
   * Calculate crowd score (inverse of crowding - higher is better/less crowded)
   */
  private calculateCrowdScore(country: string, month: number): number {
    const peakMonths = PEAK_SEASONS[country] || [7, 8, 12];

    // Peak season = low score (crowded)
    if (peakMonths.includes(month)) {
      return Math.round(15 + Math.random() * 20);
    }

    // Shoulder season (month before/after peak)
    const isShoulderSeason = peakMonths.some(peak => {
      const before = peak === 1 ? 12 : peak - 1;
      const after = peak === 12 ? 1 : peak + 1;
      return month === before || month === after;
    });

    if (isShoulderSeason) {
      return Math.round(50 + Math.random() * 20);
    }

    // Off-peak = high score (less crowded)
    return Math.round(75 + Math.random() * 20);
  }

  /**
   * Calculate price score based on demand forecasting
   */
  private async calculatePriceScore(
    city: string,
    destinationId: string | undefined,
    month: number,
    year: number
  ): Promise<number> {
    // Try to get actual forecast data
    if (destinationId) {
      try {
        const forecast = await forecastingService.forecastPrice(destinationId, 365);
        if (forecast && forecast.forecast.length > 0) {
          // Find forecasts for the target month
          const targetMonthForecasts = forecast.forecast.filter(f => {
            const date = new Date(f.date);
            return date.getMonth() + 1 === month && date.getFullYear() === year;
          });

          if (targetMonthForecasts.length > 0) {
            const avgValue = targetMonthForecasts.reduce((sum, f) => sum + f.value, 0) / targetMonthForecasts.length;
            const allValues = forecast.forecast.map(f => f.value);
            const minValue = Math.min(...allValues);
            const maxValue = Math.max(...allValues);
            const range = maxValue - minValue || 1;

            // Normalize: lower price = higher score
            const normalizedScore = 100 - ((avgValue - minValue) / range) * 100;
            return Math.round(Math.max(10, Math.min(95, normalizedScore)));
          }
        }
      } catch {
        // Fall back to heuristics
      }
    }

    // Heuristic-based pricing (inverse of crowd patterns)
    const crowdScore = this.calculateCrowdScore(city, month);
    // Price inversely correlates with crowds (more crowds = higher prices)
    // Add some noise
    return Math.round(crowdScore * 0.8 + Math.random() * 20);
  }

  /**
   * Find best window based on specific criteria
   */
  private findBestWindow(
    breakdown: BestTimeResult['monthlyBreakdown'],
    criteria: 'overall' | 'weather' | 'crowd' | 'price'
  ): TimeWindow {
    // Sort by the specified criteria
    const scoreKey = criteria === 'overall' ? 'overallScore' :
                     criteria === 'weather' ? 'weatherScore' :
                     criteria === 'crowd' ? 'crowdScore' : 'priceScore';

    const sorted = [...breakdown].sort((a, b) => b[scoreKey] - a[scoreKey]);
    const best = sorted[0];

    // Find contiguous window of good months
    const threshold = best[scoreKey] * 0.85;
    const goodMonths = breakdown.filter(m => m[scoreKey] >= threshold);

    const startMonth = goodMonths[0];
    const endMonth = goodMonths[goodMonths.length - 1];

    // Calculate average scores for the window
    const avgWeather = Math.round(goodMonths.reduce((s, m) => s + m.weatherScore, 0) / goodMonths.length);
    const avgCrowd = Math.round(goodMonths.reduce((s, m) => s + m.crowdScore, 0) / goodMonths.length);
    const avgPrice = Math.round(goodMonths.reduce((s, m) => s + m.priceScore, 0) / goodMonths.length);

    return {
      startDate: `${startMonth.month} ${startMonth.year}`,
      endDate: `${endMonth.month} ${endMonth.year}`,
      overallScore: best[scoreKey],
      factors: {
        weather: {
          score: avgWeather,
          description: this.getWeatherDescription(avgWeather),
          avgTemperature: undefined,
          rainProbability: avgWeather < 50 ? 0.4 : avgWeather < 70 ? 0.2 : 0.1,
        },
        crowds: {
          score: avgCrowd,
          description: this.getCrowdDescription(avgCrowd),
          expectedLevel: this.getCrowdLevel(avgCrowd),
        },
        prices: {
          score: avgPrice,
          description: this.getPriceDescription(avgPrice),
          trend: avgPrice > 60 ? 'decreasing' : avgPrice < 40 ? 'increasing' : 'stable',
          relativeCost: this.getRelativeCost(avgPrice),
        },
      },
      recommendation: this.generateRecommendation(criteria, best, goodMonths.length),
      urgency: this.calculateUrgency(startMonth, criteria),
    };
  }

  private getWeatherDescription(score: number): string {
    if (score >= 80) return 'Excellent conditions - ideal weather for sightseeing';
    if (score >= 60) return 'Good weather with occasional variations';
    if (score >= 40) return 'Mixed conditions - pack layers';
    return 'Challenging weather - plan indoor activities';
  }

  private getCrowdDescription(score: number): string {
    if (score >= 80) return 'Very few tourists - authentic local experience';
    if (score >= 60) return 'Moderate crowds - comfortable exploration';
    if (score >= 40) return 'Busy but manageable';
    return 'Peak tourist season - expect lines and crowds';
  }

  private getCrowdLevel(score: number): TimeWindow['factors']['crowds']['expectedLevel'] {
    if (score >= 80) return 'very_low';
    if (score >= 60) return 'low';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'high';
    return 'very_high';
  }

  private getPriceDescription(score: number): string {
    if (score >= 80) return 'Best rates of the year - significant savings available';
    if (score >= 60) return 'Good value - below average prices';
    if (score >= 40) return 'Standard pricing';
    return 'Premium pricing - peak season rates apply';
  }

  private getRelativeCost(score: number): TimeWindow['factors']['prices']['relativeCost'] {
    if (score >= 80) return 'budget';
    if (score >= 60) return 'value';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'premium';
    return 'peak';
  }

  private generateRecommendation(
    criteria: string,
    best: BestTimeResult['monthlyBreakdown'][0],
    windowLength: number
  ): string {
    const monthRange = windowLength > 1 ? `${windowLength}-month window` : best.month;

    switch (criteria) {
      case 'overall':
        return `${best.month} offers the best balance of weather, crowds, and prices. Book this ${monthRange} for the optimal experience.`;
      case 'weather':
        return `${best.month} has the best weather conditions. Perfect for outdoor activities and sightseeing.`;
      case 'crowd':
        return `Visit in ${best.month} to avoid crowds and experience the destination like a local.`;
      case 'price':
        return `${best.month} offers the best value. Book during this period for maximum savings.`;
      default:
        return `${best.month} is recommended for your visit.`;
    }
  }

  private calculateUrgency(
    startMonth: BestTimeResult['monthlyBreakdown'][0],
    criteria: string
  ): TimeWindow['urgency'] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const targetMonth = new Date(`${startMonth.month} 1, ${startMonth.year}`).getMonth();

    const monthsUntil = (targetMonth - currentMonth + 12) % 12;
    if (monthsUntil === 0) monthsUntil === 12;

    if (monthsUntil <= 1) return 'book_now';
    if (monthsUntil <= 3) return 'book_soon';
    return 'flexible';
  }

  /**
   * Get special notes for specific months (festivals, events, holidays)
   */
  private getSpecialNotes(
    country: string,
    month: number
  ): { highlights: string[]; warnings: string[] } {
    const highlights: string[] = [];
    const warnings: string[] = [];

    const events: Record<string, Record<number, { highlights?: string[]; warnings?: string[] }>> = {
      'Japan': {
        3: { highlights: ['Cherry blossom season begins'] },
        4: { highlights: ['Peak cherry blossom viewing'] },
        10: { highlights: ['Autumn foliage begins'] },
        11: { highlights: ['Peak autumn colors'] },
      },
      'France': {
        7: { highlights: ['Bastille Day celebrations'], warnings: ['August closures begin'] },
        8: { warnings: ['Many local businesses closed', 'Very crowded tourist areas'] },
        12: { highlights: ['Christmas markets'] },
      },
      'Thailand': {
        4: { highlights: ['Songkran (Thai New Year) water festival'], warnings: ['Very hot'] },
        11: { highlights: ['Loy Krathong lantern festival'] },
      },
      'Spain': {
        3: { highlights: ['Las Fallas festival (Valencia)'] },
        4: { highlights: ['Semana Santa (Holy Week)'] },
        7: { highlights: ['Running of the Bulls (Pamplona)'], warnings: ['Extreme heat in south'] },
      },
      'Germany': {
        9: { highlights: ['Oktoberfest begins'] },
        10: { highlights: ['Oktoberfest'] },
        12: { highlights: ['Christmas markets nationwide'] },
      },
      'Italy': {
        2: { highlights: ['Venice Carnival'] },
        4: { highlights: ['Easter celebrations'] },
        8: { warnings: ['Ferragosto - many businesses closed mid-month'] },
      },
      'India': {
        10: { highlights: ['Diwali festival of lights'] },
        11: { highlights: ['Diwali celebrations continue'] },
        3: { highlights: ['Holi festival of colors'] },
      },
      'United States': {
        7: { highlights: ['Independence Day celebrations'] },
        11: { warnings: ['Thanksgiving travel rush'] },
        12: { highlights: ['Holiday festivities'], warnings: ['Holiday travel peak'] },
      },
      'Mexico': {
        11: { highlights: ['Day of the Dead celebrations'] },
        12: { highlights: ['Posadas and Christmas traditions'] },
      },
    };

    const countryEvents = events[country];
    if (countryEvents && countryEvents[month]) {
      if (countryEvents[month].highlights) {
        highlights.push(...countryEvents[month].highlights!);
      }
      if (countryEvents[month].warnings) {
        warnings.push(...countryEvents[month].warnings!);
      }
    }

    return { highlights, warnings };
  }

  /**
   * Generate insights based on the analysis
   */
  private generateInsights(
    breakdown: BestTimeResult['monthlyBreakdown'],
    city: string,
    country: string
  ): string[] {
    const insights: string[] = [];

    // Find best and worst months
    const sortedByOverall = [...breakdown].sort((a, b) => b.overallScore - a.overallScore);
    const bestMonth = sortedByOverall[0];
    const worstMonth = sortedByOverall[sortedByOverall.length - 1];

    insights.push(
      `${bestMonth.month} ${bestMonth.year} is the best time to visit ${city} with an overall score of ${bestMonth.overallScore}/100`
    );

    // Price variation insight
    const priceScores = breakdown.map(m => m.priceScore);
    const priceVariation = Math.max(...priceScores) - Math.min(...priceScores);
    if (priceVariation > 40) {
      const cheapest = breakdown.reduce((a, b) => a.priceScore > b.priceScore ? a : b);
      insights.push(
        `Prices vary significantly throughout the year. Visit in ${cheapest.month} for savings of up to ${Math.round(priceVariation)}%`
      );
    }

    // Shoulder season insight
    const shoulderMonths = breakdown.filter(m =>
      m.overallScore >= 65 && m.crowdScore >= 60 && m.priceScore >= 55
    );
    if (shoulderMonths.length > 0 && shoulderMonths.length < breakdown.length) {
      insights.push(
        `Shoulder season (${shoulderMonths.map(m => m.month).slice(0, 2).join(', ')}) offers the best value: good weather, fewer crowds, and lower prices`
      );
    }

    // Weather warning
    const badWeatherMonths = breakdown.filter(m => m.weatherScore < 40);
    if (badWeatherMonths.length > 0) {
      insights.push(
        `Avoid ${badWeatherMonths.map(m => m.month).slice(0, 2).join(' and ')} if weather is a priority`
      );
    }

    // Booking timing insight
    const upcomingGoodMonths = breakdown.slice(0, 4).filter(m => m.overallScore >= 70);
    if (upcomingGoodMonths.length > 0) {
      insights.push(
        `${upcomingGoodMonths[0].month} is coming up soon - book now to secure the best rates`
      );
    }

    return insights;
  }
}

export const bestTimeToVisitService = new BestTimeToVisitService();
