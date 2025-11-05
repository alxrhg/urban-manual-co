/**
 * Real-Time Intelligence Service
 * Aggregates and provides real-time contextual data
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface RealtimeStatus {
  crowding?: {
    level: 'quiet' | 'moderate' | 'busy' | 'very_busy';
    score: number; // 0-100
    lastUpdated: string;
    predictedNext?: { time: string; level: string }[];
  };
  waitTime?: {
    current: number; // minutes
    historical: number; // average for this time
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  availability?: {
    status: 'available' | 'limited' | 'full' | 'closed';
    details?: string;
  };
  specialHours?: {
    isOpen: boolean;
    closingSoon?: boolean;
    nextOpen?: string;
    reason?: string;
  };
  bestTimeToVisit?: {
    today: string[];
    thisWeek: Array<{ day: string; hours: string[] }>;
  };
  alerts?: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'urgent';
  }>;
}

export class RealtimeIntelligenceService {
  /**
   * Get comprehensive real-time status for a destination
   */
  async getRealtimeStatus(
    destinationId: number,
    userId?: string
  ): Promise<RealtimeStatus> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();

    // Fetch data in parallel
    const [crowding, openingHours] = await Promise.all([
      this.getCrowdingLevel(destinationId, dayOfWeek, hourOfDay),
      this.getOpeningStatus(destinationId, now),
    ]);

    // Aggregate status
    const status: RealtimeStatus = {};

    if (crowding) {
      status.crowding = crowding;
      status.bestTimeToVisit = await this.predictBestTimes(destinationId, dayOfWeek);
    }

    if (openingHours) {
      status.specialHours = openingHours;
      status.availability = this.determineAvailability(openingHours, crowding);
    }

    return status;
  }

  /**
   * Get current crowding level
   */
  private async getCrowdingLevel(
    destinationId: number,
    dayOfWeek: number,
    hourOfDay: number
  ): Promise<RealtimeStatus['crowding'] | null> {
    try {
      // Try real-time data first
      const { data: recentStatus } = await supabase
        .from('destination_status')
        .select('*')
        .eq('destination_id', destinationId)
        .eq('status_type', 'crowding')
        .gte('recorded_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (recentStatus) {
        return {
          level: recentStatus.status_value.level,
          score: recentStatus.status_value.score,
          lastUpdated: recentStatus.recorded_at,
        };
      }

      // Fall back to historical patterns
      const { data: historical } = await supabase
        .from('crowding_data')
        .select('*')
        .eq('destination_id', destinationId)
        .eq('day_of_week', dayOfWeek)
        .eq('hour_of_day', hourOfDay)
        .single();

      if (historical) {
        return {
          level: historical.crowding_level as any,
          score: historical.crowding_score,
          lastUpdated: historical.last_updated,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting crowding level:', error);
      return null;
    }
  }

  /**
   * Get opening status
   */
  private async getOpeningStatus(
    destinationId: number,
    now: Date
  ): Promise<RealtimeStatus['specialHours'] | null> {
    try {
      const { data: destination } = await supabase
        .from('destinations')
        .select('opening_hours_json')
        .eq('id', destinationId)
        .single();

      if (!destination?.opening_hours_json) return null;

      const hours = typeof destination.opening_hours_json === 'string'
        ? JSON.parse(destination.opening_hours_json)
        : destination.opening_hours_json;

      if (!hours?.weekday_text) return null;

      const dayOfWeek = now.getDay();
      const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const todayText = hours.weekday_text[googleDayIndex];

      if (!todayText) return null;

      const hoursText = todayText.substring(todayText.indexOf(':') + 1).trim();
      const isOpen = this.isOpenNow(hoursText, now);
      const closingSoon = isOpen && this.isClosingSoon(hoursText, now, 60);

      return {
        isOpen,
        closingSoon,
      };
    } catch (error) {
      console.error('Error getting opening status:', error);
      return null;
    }
  }

  private isOpenNow(hoursText: string, now: Date): boolean {
    if (!hoursText || hoursText.toLowerCase().includes('closed')) return false;
    if (hoursText.toLowerCase().includes('24 hours')) return true;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const timeRanges = hoursText.split(',').map(r => r.trim());

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = this.parseTime(times[0]);
        const closeTime = this.parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return true;
        }
      }
    }

    return false;
  }

  private isClosingSoon(hoursText: string, now: Date, minutesThreshold: number): boolean {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const timeRanges = hoursText.split(',').map(r => r.trim());

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const closeTime = this.parseTime(times[1]);

        if (currentTime >= closeTime - minutesThreshold && currentTime < closeTime) {
          return true;
        }
      }
    }

    return false;
  }

  private parseTime(timeStr: string): number {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  /**
   * Determine availability
   */
  private determineAvailability(
    hours: RealtimeStatus['specialHours'],
    crowding: RealtimeStatus['crowding'] | null
  ): RealtimeStatus['availability'] {
    if (!hours?.isOpen) {
      return { status: 'closed' };
    }

    if (hours.closingSoon) {
      return { status: 'limited', details: 'Closing soon' };
    }

    if (!crowding) {
      return { status: 'available' };
    }

    switch (crowding.level) {
      case 'very_busy':
        return { status: 'limited', details: 'Very busy right now' };
      case 'busy':
        return { status: 'limited', details: 'Busy' };
      default:
        return { status: 'available' };
    }
  }

  /**
   * Predict best times to visit
   */
  private async predictBestTimes(
    destinationId: number,
    currentDayOfWeek: number
  ): Promise<RealtimeStatus['bestTimeToVisit']> {
    try {
      // Get crowding data for today
      const { data: todayData } = await supabase
        .from('crowding_data')
        .select('hour_of_day, crowding_level, crowding_score')
        .eq('destination_id', destinationId)
        .eq('day_of_week', currentDayOfWeek)
        .order('hour_of_day', { ascending: true });

      if (!todayData) {
        return { today: [], thisWeek: [] };
      }

      // Find quietest times today
      const currentHour = new Date().getHours();
      const remainingHours = todayData.filter(d => d.hour_of_day >= currentHour);

      const quietTimes = remainingHours
        .filter(d => d.crowding_level === 'quiet' || d.crowding_level === 'moderate')
        .sort((a, b) => a.crowding_score - b.crowding_score)
        .slice(0, 3)
        .map(d => {
          const startHour = d.hour_of_day.toString().padStart(2, '0');
          const endHour = (d.hour_of_day + 2).toString().padStart(2, '0');
          return `${startHour}:00-${endHour}:00`;
        });

      return {
        today: quietTimes,
        thisWeek: [],
      };
    } catch (error) {
      console.error('Error predicting best times:', error);
      return { today: [], thisWeek: [] };
    }
  }
}

export const realtimeIntelligenceService = new RealtimeIntelligenceService();
