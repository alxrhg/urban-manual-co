/**
 * Job Dispatch Utilities
 *
 * Helper functions for dispatching background jobs from API routes.
 * Provides a clean interface for sending events to Inngest.
 */

import { inngest, EventData } from "./client";
import { randomUUID } from "crypto";

/**
 * Dispatch an embedding generation job for a single destination
 */
export async function dispatchEmbeddingJob(
  destinationId: number,
  priority: "high" | "normal" | "low" = "normal"
): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "embeddings/generate",
    data: { destinationId, priority },
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch a batch embedding job for multiple destinations
 */
export async function dispatchEmbeddingBatch(
  destinationIds: number[]
): Promise<{ eventId: string; batchId: string }> {
  const batchId = `batch-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const result = await inngest.send({
    name: "embeddings/batch",
    data: { destinationIds, batchId },
  });

  return { eventId: result.ids[0], batchId };
}

/**
 * Dispatch an embedding backfill job
 */
export async function dispatchEmbeddingBackfill(
  limit?: number,
  offset?: number
): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "embeddings/backfill",
    data: { limit, offset },
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch a review summary generation job
 */
export async function dispatchSummaryJob(params: {
  destinationId: number;
  destinationSlug: string;
  destinationName: string;
  reviews: Array<{ text: string; rating?: number }>;
  callbackUrl?: string;
}): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "summaries/generate",
    data: params,
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch a taste profile update job
 */
export async function dispatchTasteUpdate(
  userId: string,
  interactions: Array<{
    type: "view" | "save" | "visit" | "unsave";
    destinationId: number;
    timestamp?: Date;
    context?: string;
  }>
): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "taste/update",
    data: {
      userId,
      interactions: interactions.map((i) => ({
        ...i,
        timestamp: (i.timestamp || new Date()).toISOString(),
      })),
    },
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch a Mem0 sync job for a user's taste profile
 */
export async function dispatchMem0Sync(userId: string): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "taste/sync-mem0",
    data: { userId },
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch a user interaction recording job
 */
export async function dispatchInteractionRecord(
  userId: string,
  interaction: {
    type: "view" | "save" | "visit" | "unsave";
    destination: {
      id?: number;
      slug: string;
      name: string;
      city?: string;
      category?: string;
    };
  }
): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "taste/record-interaction",
    data: { userId, interaction },
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch an itinerary generation job
 * Returns a jobId that can be used to poll for status
 */
export async function dispatchItineraryJob(params: {
  userId?: string;
  destination: string;
  dates: { start: string; end: string };
  preferences?: string[];
  travelStyle?: "relaxed" | "moderate" | "packed";
  budget?: "budget" | "moderate" | "luxury";
  tripId?: string;
  callbackUrl?: string;
}): Promise<{ eventId: string; jobId: string }> {
  const jobId = `itinerary-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const result = await inngest.send({
    name: "itinerary/generate",
    data: {
      jobId,
      ...params,
    },
  });

  return { eventId: result.ids[0], jobId };
}

/**
 * Dispatch a description generation job
 */
export async function dispatchDescriptionJob(params: {
  destinationId: number;
  destinationName: string;
  city: string;
  category: string;
}): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "descriptions/generate",
    data: params,
  });

  return { eventId: result.ids[0] };
}

/**
 * Dispatch a batch description generation job
 */
export async function dispatchDescriptionBatch(
  limit?: number,
  dryRun?: boolean
): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: "descriptions/batch",
    data: { limit, dryRun },
  });

  return { eventId: result.ids[0] };
}

/**
 * Check if Inngest is configured
 */
export function isInngestConfigured(): boolean {
  // In development, Inngest dev server runs locally
  // In production, INNGEST_EVENT_KEY is required
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return !!process.env.INNGEST_EVENT_KEY;
}
