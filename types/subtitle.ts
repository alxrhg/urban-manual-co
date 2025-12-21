/**
 * Types for auto-subtitle generation system
 */

import { Destination } from './destination';

/**
 * Payload received from Supabase webhooks
 */
export interface SubtitleWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Destination;
  old_record?: Destination;
  schema: string;
}

/**
 * Input for subtitle generation
 */
export interface SubtitleGenerationInput {
  name: string;
  category: string;
  city: string;
  country?: string;
  description?: string;
  architect?: string | null;
  architectural_style?: string | null;
  cuisine?: string;
}

/**
 * Result of subtitle generation
 */
export interface SubtitleGenerationResult {
  success: boolean;
  subtitle?: string;
  destinationId: string | number;
  message: string;
  error?: string;
}

/**
 * Batch generation result
 */
export interface BatchGenerationResult {
  success: boolean;
  processed: number;
  total: number;
  results: SubtitleGenerationResult[];
  errors: string[];
}
