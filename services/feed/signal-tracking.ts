/**
 * Signal Tracking Service
 * Tracks all user interactions with destinations for algorithmic feed
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

export type SignalType =
  | 'view'          // Card appeared in viewport
  | 'dwell'         // User paused on card
  | 'hover'         // Mouse hover
  | 'click'         // Clicked for details
  | 'save'          // Explicitly saved
  | 'skip'          // Explicitly skipped
  | 'visit_marked'  // Marked as visited
  | 'share'         // Shared with someone
  | 'zoom_image'    // Zoomed into image
  | 'read_details'; // Expanded description

export interface SignalContext {
  position_in_feed?: number;
  session_id?: string;
  time_of_day?: number;
  device?: 'mobile' | 'desktop' | 'tablet';
  previous_card_id?: number;
  dwell_seconds?: number;
  metadata?: Record<string, any>;
}

export interface UserSignal {
  user_id: string;
  destination_id: number;
  signal_type: SignalType;
  signal_value: number;
  context?: SignalContext;
}

// Signal weights for different interactions
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  view: 0.1,
  dwell: 0.2, // Will be adjusted based on duration
  hover: 0.3,
  click: 0.5,
  save: 1.0,
  skip: -0.5,
  visit_marked: 1.5,
  share: 1.2,
  zoom_image: 0.4,
  read_details: 0.5,
};

export class SignalTrackingService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('SignalTrackingService: Supabase client not available');
    }
  }

  /**
   * Track a user signal
   */
  async trackSignal(signal: UserSignal): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      // Calculate signal value if not provided
      let signalValue = signal.signal_value;

      // Special handling for dwell signals
      if (signal.signal_type === 'dwell' && signal.context?.dwell_seconds) {
        // Dwell weight increases with time: 0.06 per second, max 0.6 at 10s
        signalValue = Math.min(0.6, signal.context.dwell_seconds * 0.06);
      }

      // Prepare signal data
      const signalData = {
        user_id: signal.user_id,
        destination_id: signal.destination_id,
        signal_type: signal.signal_type,
        signal_value: signalValue,
        position_in_feed: signal.context?.position_in_feed,
        session_id: signal.context?.session_id,
        time_of_day: signal.context?.time_of_day || new Date().getHours(),
        device: signal.context?.device,
        previous_card_id: signal.context?.previous_card_id,
        dwell_seconds: signal.context?.dwell_seconds,
        metadata: signal.context?.metadata || {},
      };

      // Insert signal
      const { error } = await this.supabase
        .from('user_signals')
        .insert(signalData);

      if (error) {
        console.error('Error tracking signal:', error);
        return false;
      }

      // Update recently viewed for view signals
      if (signal.signal_type === 'view') {
        await this.updateRecentlyViewed(
          signal.user_id,
          signal.destination_id,
          signal.context?.session_id
        );
      }

      return true;
    } catch (error) {
      console.error('Error in trackSignal:', error);
      return false;
    }
  }

  /**
   * Track multiple signals in batch (for performance)
   */
  async trackSignalsBatch(signals: UserSignal[]): Promise<boolean> {
    if (!this.supabase || signals.length === 0) return false;

    try {
      const signalsData = signals.map(signal => {
        let signalValue = signal.signal_value;

        if (signal.signal_type === 'dwell' && signal.context?.dwell_seconds) {
          signalValue = Math.min(0.6, signal.context.dwell_seconds * 0.06);
        }

        return {
          user_id: signal.user_id,
          destination_id: signal.destination_id,
          signal_type: signal.signal_type,
          signal_value: signalValue,
          position_in_feed: signal.context?.position_in_feed,
          session_id: signal.context?.session_id,
          time_of_day: signal.context?.time_of_day || new Date().getHours(),
          device: signal.context?.device,
          previous_card_id: signal.context?.previous_card_id,
          dwell_seconds: signal.context?.dwell_seconds,
          metadata: signal.context?.metadata || {},
        };
      });

      const { error } = await this.supabase
        .from('user_signals')
        .insert(signalsData);

      if (error) {
        console.error('Error tracking signals batch:', error);
        return false;
      }

      // Update recently viewed for view signals
      const viewSignals = signals.filter(s => s.signal_type === 'view');
      for (const signal of viewSignals) {
        await this.updateRecentlyViewed(
          signal.user_id,
          signal.destination_id,
          signal.context?.session_id
        );
      }

      return true;
    } catch (error) {
      console.error('Error in trackSignalsBatch:', error);
      return false;
    }
  }

  /**
   * Update recently viewed destinations
   */
  private async updateRecentlyViewed(
    userId: string,
    destinationId: number,
    sessionId?: string
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('recently_viewed')
        .upsert({
          user_id: userId,
          destination_id: destinationId,
          session_id: sessionId,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,destination_id',
        });
    } catch (error) {
      console.error('Error updating recently viewed:', error);
    }
  }

  /**
   * Get user's recent signals (for debugging/analytics)
   */
  async getUserSignals(
    userId: string,
    limit: number = 100,
    signalType?: SignalType
  ): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      let query = this.supabase
        .from('user_signals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (signalType) {
        query = query.eq('signal_type', signalType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting user signals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSignals:', error);
      return [];
    }
  }

  /**
   * Get signal statistics for user
   */
  async getUserSignalStats(userId: string): Promise<Record<SignalType, number>> {
    if (!this.supabase) {
      return {} as Record<SignalType, number>;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_signals')
        .select('signal_type')
        .eq('user_id', userId);

      if (error || !data) {
        return {} as Record<SignalType, number>;
      }

      // Count by signal type
      const stats = data.reduce((acc, signal) => {
        acc[signal.signal_type as SignalType] = (acc[signal.signal_type as SignalType] || 0) + 1;
        return acc;
      }, {} as Record<SignalType, number>);

      return stats;
    } catch (error) {
      console.error('Error in getUserSignalStats:', error);
      return {} as Record<SignalType, number>;
    }
  }

  /**
   * Generate a session ID for tracking
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Get device type from user agent
   */
  getDeviceType(userAgent?: string): 'mobile' | 'desktop' | 'tablet' {
    if (!userAgent) return 'desktop';

    const ua = userAgent.toLowerCase();

    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet';
    }

    if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) {
      return 'mobile';
    }

    return 'desktop';
  }
}

export const signalTrackingService = new SignalTrackingService();
