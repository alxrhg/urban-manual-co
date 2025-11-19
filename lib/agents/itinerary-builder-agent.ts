/**
 * Smart Itinerary Builder Agent
 * Automatically groups, optimizes, schedules, and suggests meal breaks for destinations
 */

import { generateJSON } from '../llm';
import { BaseAgent, AgentResult } from './base-agent';
import { getAllTools } from './tools';

export interface ItineraryRequest {
  destinations: Array<{
    id: number;
    name: string;
    city: string;
    category: string;
    latitude?: number;
    longitude?: number;
    opening_hours?: any;
  }>;
  days: number;
  preferences?: {
    startTime?: string; // e.g., "09:00"
    endTime?: string; // e.g., "22:00"
    mealBreakTime?: string; // e.g., "12:00-14:00"
    optimizeRoute?: boolean;
    vibe?: string; // e.g., "relaxed", "packed", "family"
  };
  userId?: string;
}

export interface ItineraryDay {
  day: number;
  date?: string;
  items: Array<{
    destination_id: number;
    destination_name: string;
    order: number;
    latitude?: number;
    longitude?: number;
    category?: string;
    scheduled_time?: string;
    duration_minutes?: number;
    travel_time_minutes?: number;
    notes?: string;
  }>;
}

export interface ItineraryResult {
  days: ItineraryDay[];
  total_destinations: number;
  optimization_applied: boolean;
}

export class ItineraryBuilderAgent extends BaseAgent {
  constructor() {
    super();
    // Register all available tools
    getAllTools().forEach(tool => this.registerTool(tool));
  }

  async execute(request: ItineraryRequest): Promise<AgentResult<ItineraryResult>> {
    try {
      const steps: string[] = [];
      steps.push('Analyzing destinations...');

      // Step 1: Analyze destinations (autonomous)
      const analysis = await this.analyzeDestinations(request.destinations, request.preferences?.vibe);
      steps.push(`Analyzed ${request.destinations.length} destinations`);

      // Step 2: Group by day (autonomous)
      const days = await this.groupByDay(request.destinations, request.days, request.preferences);
      steps.push(`Grouped into ${days.length} days`);

      // Step 3: Optimize routes if requested (autonomous)
      let optimized = days;
      if (request.preferences?.optimizeRoute !== false) {
        optimized = await this.optimizeRoutes(days, request.preferences);
        steps.push('Optimized routes');
      }

      // Step 4: Schedule by time (autonomous)
      const scheduled = await this.scheduleByTime(optimized, analysis, request.preferences);
      steps.push('Scheduled by time');

      // Step 5: Add travel time estimates (autonomous)
      const withTravelTime = await this.addTravelTime(scheduled);
      steps.push('Added travel time estimates');

      // Step 6: Suggest meal breaks (autonomous)
      const withMealBreaks = await this.suggestMealBreaks(withTravelTime, request.preferences);
      steps.push('Added meal break suggestions');

      return {
        success: true,
        data: {
          days: withMealBreaks,
          total_destinations: request.destinations.length,
          optimization_applied: request.preferences?.optimizeRoute !== false,
        },
        steps,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to build itinerary',
      };
    }
  }

  /**
   * Analyze destinations to understand their characteristics
   */
  private async analyzeDestinations(
    destinations: ItineraryRequest['destinations'],
    vibe?: string
  ): Promise<Map<number, any>> {
    const analysis = new Map();

    for (const dest of destinations) {
      const category = dest.category?.toLowerCase() || 'other';
      const isDining = ['dining', 'restaurant', 'cafe', 'bar'].some(c => category.includes(c));
      const isCulture = ['culture', 'museum', 'gallery', 'theater'].some(c => category.includes(c));
      const isOutdoor = ['park', 'beach', 'outdoor'].some(c => category.includes(c));

      const estimatedDuration = await this.estimateDurationMinutes(dest.category, vibe);

      analysis.set(dest.id, {
        ...dest,
        isDining,
        isCulture,
        isOutdoor,
        estimatedDuration,
      });
    }

    return analysis;
  }

  /**
   * Estimate visit duration using an LLM
   */
  private async estimateDurationMinutes(category?: string, vibe?: string): Promise<number> {
    const systemPrompt =
      'You are a travel planner that estimates how long a traveler typically spends at a place. ' +
      'Use the place category and traveler vibe (pace) to return a realistic visit duration in minutes. ' +
      'Respond with JSON: {"duration_minutes": <integer between 15 and 240>}.';

    const userPrompt = `Category: ${category || 'general attraction'}\nTraveler vibe: ${vibe || 'balanced pace'}\n` +
      'Consider whether the category suggests a quick photo stop, a leisurely meal, or an in-depth experience.';

    try {
      const llmResponse = await generateJSON(systemPrompt, userPrompt);
      const duration = Number(llmResponse?.duration_minutes);
      if (Number.isFinite(duration) && duration > 0) {
        return Math.min(Math.max(Math.round(duration), 15), 240);
      }
    } catch (error) {
      console.error('Failed to estimate duration via LLM:', error);
    }

    // Fallback heuristic if LLM is unavailable
    const normalizedCategory = category?.toLowerCase() || '';
    if (/(museum|gallery|culture|theater)/.test(normalizedCategory)) return 120;
    if (/(park|beach|outdoor)/.test(normalizedCategory)) return 90;
    if (/(dining|restaurant|cafe|bar|food)/.test(normalizedCategory)) return 90;
    return 60;
  }

  /**
   * Group destinations by day
   */
  private async groupByDay(
    destinations: ItineraryRequest['destinations'],
    days: number,
    preferences?: ItineraryRequest['preferences']
  ): Promise<ItineraryDay[]> {
    const destinationsPerDay = Math.ceil(destinations.length / days);
    const result: ItineraryDay[] = [];

    for (let day = 1; day <= days; day++) {
      const startIdx = (day - 1) * destinationsPerDay;
      const endIdx = Math.min(startIdx + destinationsPerDay, destinations.length);
      const dayDestinations = destinations.slice(startIdx, endIdx);

      result.push({
        day,
        items: dayDestinations.map((dest, idx) => ({
          destination_id: dest.id,
          destination_name: dest.name,
          order: idx + 1,
          latitude: dest.latitude,
          longitude: dest.longitude,
          category: dest.category,
        })),
      });
    }

    return result;
  }

  /**
   * Optimize routes within each day
   */
  private async optimizeRoutes(
    days: ItineraryDay[],
    preferences?: ItineraryRequest['preferences']
  ): Promise<ItineraryDay[]> {
    const optimized = await Promise.all(
      days.map(async (day) => {
        const withCoords = day.items.filter(
          (item) => typeof item.latitude === 'number' && typeof item.longitude === 'number'
        );
        if (withCoords.length < 2) {
          return day;
        }

        const withoutCoords = day.items.filter(
          (item) => typeof item.latitude !== 'number' || typeof item.longitude !== 'number'
        );

        const remaining = [...withCoords];
        const route: typeof withCoords = [];
        let current = remaining.shift();
        if (current) route.push(current);

        while (remaining.length > 0 && current) {
          let nearestIdx = 0;
          let nearestDistance = this.calculateDistance(current, remaining[0]);

          for (let i = 1; i < remaining.length; i++) {
            const distance = this.calculateDistance(current, remaining[i]);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIdx = i;
            }
          }

          current = remaining.splice(nearestIdx, 1)[0];
          route.push(current);
        }

        const reorderedItems = [...route, ...withoutCoords].map((item, idx) => ({
          ...item,
          order: idx + 1,
        }));

        return {
          ...day,
          items: reorderedItems,
        };
      })
    );

    return optimized;
  }

  private calculateDistance(a: { latitude?: number; longitude?: number }, b: { latitude?: number; longitude?: number }): number {
    if (
      typeof a.latitude !== 'number' ||
      typeof a.longitude !== 'number' ||
      typeof b.latitude !== 'number' ||
      typeof b.longitude !== 'number'
    ) {
      return Number.POSITIVE_INFINITY;
    }

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  /**
   * Schedule destinations by time
   */
  private async scheduleByTime(
    days: ItineraryDay[],
    analysis: Map<number, any>,
    preferences?: ItineraryRequest['preferences']
  ): Promise<ItineraryDay[]> {
    const startTime = preferences?.startTime || '09:00';
    const [startHour, startMinute] = startTime.split(':').map(Number);

    return days.map((day) => {
      let currentHour = startHour;
      let currentMinute = startMinute;

      const scheduledItems = day.items.map((item, idx) => {
        // Schedule item
        const scheduledTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        // Estimate duration based on analysis
        const duration = Math.max(
          30,
          Math.min(Number(analysis.get(item.destination_id)?.estimatedDuration) || 60, 240)
        );

        // Move to next time slot
        currentMinute += duration;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }

        // Add 15 minutes travel time between destinations
        if (idx < day.items.length - 1) {
          currentMinute += 15;
          if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
          }
        }

        return {
          ...item,
          scheduled_time: scheduledTime,
          duration_minutes: duration,
        };
      });

      return {
        ...day,
        items: scheduledItems,
      };
    });
  }

  /**
   * Add travel time estimates between destinations
   */
  private async addTravelTime(days: ItineraryDay[]): Promise<ItineraryDay[]> {
    return days.map((day) => {
      const itemsWithTravel = day.items.map((item, idx) => {
        // Estimate travel time (default 15 minutes)
        const travelTime = idx === 0 ? 0 : 15; // No travel time for first item

        return {
          ...item,
          travel_time_minutes: travelTime,
        };
      });

      return {
        ...day,
        items: itemsWithTravel,
      };
    });
  }

  /**
   * Suggest meal breaks
   */
  private async suggestMealBreaks(
    days: ItineraryDay[],
    preferences?: ItineraryRequest['preferences']
  ): Promise<ItineraryDay[]> {
    const mealBreakTime = preferences?.mealBreakTime || '12:00-14:00';
    const [start, end] = mealBreakTime.split('-').map((t: string) => t.trim());

    return days.map((day) => {
      // Check if there's already a dining destination scheduled
      const hasDining = day.items.some(item => {
        // Would need to check destination category
        return false; // Placeholder
      });

      // If no dining and it's around meal time, suggest a break
      if (!hasDining && day.items.length > 0) {
        // Find a good spot to insert meal break (around lunch time)
        const lunchTime = start;
        // For now, just add a note
        const itemsWithNotes = day.items.map(item => ({
          ...item,
          notes: item.notes || (item.scheduled_time === lunchTime ? 'Consider meal break here' : undefined),
        }));

        return {
          ...day,
          items: itemsWithNotes,
        };
      }

      return day;
    });
  }
}

