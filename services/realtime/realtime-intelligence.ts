/**
 * Real-Time Intelligence Service
 * Aggregates and provides real-time contextual data
 */

import { createServerClient } from '@/lib/supabase-server';

const getSupabase = async () => await createServerClient();

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
    const [crowding, openingHours, userReports] = await Promise.all([
      this.getCrowdingLevel(destinationId, dayOfWeek, hourOfDay),
      this.getOpeningStatus(destinationId, now),
      this.getRecentUserReports(destinationId),
    ]);

    // Aggregate status
    const status: RealtimeStatus = {};

    if (crowding) {
      status.crowding = crowding;
      status.bestTimeToVisit = await this.predictBestTimes(destinationId, dayOfWeek);
    }

    // Add wait time from user reports
    if (userReports.waitTime) {
      status.waitTime = userReports.waitTime;
    }

    if (openingHours) {
      status.specialHours = openingHours;
      status.availability = this.determineAvailability(openingHours, crowding);
    }

    return status;
  }

  /**
   * Get recent user reports and aggregate wait time data
   */
  private async getRecentUserReports(destinationId: number): Promise<{
    waitTime?: RealtimeStatus['waitTime'];
  }> {
    try {
      const supabase = await getSupabase();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: reports } = await supabase
        .from('user_reports')
        .select('report_type, report_data, created_at')
        .eq('destination_id', destinationId)
        .eq('verified', true)
        .in('report_type', ['wait_time'])
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!reports || reports.length === 0) {
        return {};
      }

      // Calculate average wait time from recent reports
      const waitTimeReports = reports.filter((r: any) => r.report_type === 'wait_time' && r.report_data?.wait_time);
      
      if (waitTimeReports.length > 0) {
        const waitTimes = waitTimeReports.map((r: any) => r.report_data.wait_time);
        const avgWaitTime = Math.round(
          waitTimes.reduce((sum: number, wt: number) => sum + wt, 0) / waitTimes.length
        );
        
        // Determine trend (simple: compare with older reports if available)
        const trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        
        return {
          waitTime: {
            current: avgWaitTime,
            historical: avgWaitTime, // Could be enhanced with historical data
            trend,
          },
        };
      }

      return {};
    } catch (error) {
      console.error('Error getting user reports:', error);
      return {};
    }
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
      const supabase = await getSupabase();
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
      const supabase = await getSupabase();
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
   * Predict best times to visit - Enhanced version with week predictions
   */
  private async predictBestTimes(
    destinationId: number,
    currentDayOfWeek: number
  ): Promise<RealtimeStatus['bestTimeToVisit']> {
    try {
      const supabase = await getSupabase();
      const now = new Date();
      const currentHour = now.getHours();
      
      // Get crowding data for today
      const { data: todayData } = await supabase
        .from('crowding_data')
        .select('hour_of_day, crowding_level, crowding_score')
        .eq('destination_id', destinationId)
        .eq('day_of_week', currentDayOfWeek)
        .order('hour_of_day', { ascending: true });

      const today: string[] = [];
      
      if (todayData && todayData.length > 0) {
        // Find quietest times today (remaining hours)
        const remainingHours = todayData.filter((d: any) => d.hour_of_day >= currentHour);
        
        // Prioritize quiet times, then moderate
        const quietTimes = remainingHours
          .filter((d: any) => d.crowding_level === 'quiet' || d.crowding_level === 'moderate')
          .sort((a: any, b: any) => a.crowding_score - b.crowding_score)
          .slice(0, 3)
          .map((d: any) => {
            const startHour = d.hour_of_day.toString().padStart(2, '0');
            const endHour = Math.min(23, d.hour_of_day + 2).toString().padStart(2, '0');
            return `${startHour}:00-${endHour}:00`;
          });
        
        today.push(...quietTimes);
      }

      // Get best times for rest of week
      const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const thisWeek: Array<{ day: string; hours: string[] }> = [];

      for (let i = 1; i <= 6; i++) {
        const dayIndex = (currentDayOfWeek + i) % 7;
        const { data: dayData } = await supabase
          .from('crowding_data')
          .select('hour_of_day, crowding_level, crowding_score')
          .eq('destination_id', destinationId)
          .eq('day_of_week', dayIndex)
          .order('crowding_score', { ascending: true })
          .limit(3);

        if (dayData && dayData.length > 0) {
          const bestHours = dayData
            .filter((d: any) => d.crowding_level === 'quiet' || d.crowding_level === 'moderate')
            .slice(0, 2)
            .map((d: any) => {
              const hour = d.hour_of_day.toString().padStart(2, '0');
              return `${hour}:00`;
            });
          
          if (bestHours.length > 0) {
            thisWeek.push({
              day: weekDays[dayIndex],
              hours: bestHours,
            });
          }
        }
      }

      return {
        today,
        thisWeek,
      };
    } catch (error) {
      console.error('Error predicting best times:', error);
      return { today: [], thisWeek: [] };
    }
  }
}

export const realtimeIntelligenceService = new RealtimeIntelligenceService();
