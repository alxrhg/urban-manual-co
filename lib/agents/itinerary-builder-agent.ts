/**
 * Smart Itinerary Builder Agent
 * Automatically groups, optimizes, schedules, and suggests meal breaks for destinations
 */

import { BaseAgent, AgentResult, Tool } from './base-agent';
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
  private destinationLookup: Map<number, ItineraryRequest['destinations'][number]> = new Map();

  constructor() {
    super();
    // Register all available tools
    getAllTools().forEach(tool => this.registerTool(tool));
  }

  async execute(request: ItineraryRequest): Promise<AgentResult<ItineraryResult>> {
    try {
      const steps: string[] = [];
      steps.push('Analyzing destinations...');

      this.destinationLookup = new Map(request.destinations.map((dest) => [dest.id, dest]));

      // Step 1: Analyze destinations (autonomous)
      const analysis = await this.analyzeDestinations(request.destinations);
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
      const scheduled = await this.scheduleByTime(optimized, request.preferences);
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
    destinations: ItineraryRequest['destinations']
  ): Promise<Map<number, any>> {
    const analysis = new Map();

    for (const dest of destinations) {
      const category = dest.category?.toLowerCase() || 'other';
      const isDining = ['dining', 'restaurant', 'cafe', 'bar'].some(c => category.includes(c));
      const isCulture = ['culture', 'museum', 'gallery', 'theater'].some(c => category.includes(c));
      const isOutdoor = ['park', 'beach', 'outdoor'].some(c => category.includes(c));

      // Estimate duration based on category
      let estimatedDuration = 60; // Default 1 hour
      if (isDining) estimatedDuration = 90; // 1.5 hours for meals
      if (isCulture) estimatedDuration = 120; // 2 hours for museums
      if (isOutdoor) estimatedDuration = 90; // 1.5 hours for outdoor activities

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
        const routeInput = day.items.map((item) => {
          const destination = this.destinationLookup.get(item.destination_id);
          const latitude = destination?.latitude ?? (destination as any)?.lat;
          const longitude = destination?.longitude ?? (destination as any)?.lng;
          return {
            id: item.destination_id,
            lat: typeof latitude === 'number' ? latitude : undefined,
            lng: typeof longitude === 'number' ? longitude : undefined,
          };
        });

        const coordinateCount = routeInput.filter(
          (dest) => typeof dest.lat === 'number' && typeof dest.lng === 'number'
        ).length;

        if (coordinateCount < 2) {
          return day;
        }

        try {
          const optimizedRoute = await this.useTool('optimize_route', { destinations: routeInput });
          const orderMap = new Map<number, number>();
          optimizedRoute.forEach((dest: { id: number }, index: number) => {
            orderMap.set(dest.id, index);
          });

          const optimizedItems: typeof day.items = [];
          optimizedRoute.forEach((routeDest: { id: number }) => {
            const match = day.items.find((item) => item.destination_id === routeDest.id);
            if (match) {
              optimizedItems.push(match);
            }
          });

          const remainingItems = day.items.filter((item) => !orderMap.has(item.destination_id));
          const finalItems = [...optimizedItems, ...remainingItems].map((item, index) => ({
            ...item,
            order: index + 1,
          }));

          return {
            ...day,
            items: finalItems,
          };
        } catch (error) {
          console.error('[ItineraryBuilderAgent] Failed to optimize route', error);
          return day;
        }
      })
    );

    return optimized;
  }

  /**
   * Schedule destinations by time
   */
  private async scheduleByTime(
    days: ItineraryDay[],
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
        
        // Estimate duration (default 60 minutes)
        const duration = 60;
        
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

