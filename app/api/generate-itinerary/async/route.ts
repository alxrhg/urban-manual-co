/**
 * Async Itinerary Generation API
 *
 * POST /api/generate-itinerary/async
 *
 * Dispatches itinerary generation to background job queue.
 * Returns immediately with a jobId that can be polled for status.
 * Much faster response time compared to synchronous streaming.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { dispatchItineraryJob, isInngestConfigured } from "@/lib/inngest/dispatch";
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from "@/lib/rate-limit";

interface AsyncItineraryRequest {
  destination: string;
  dates: {
    start: string;
    end: string;
  };
  preferences?: string[];
  travelStyle?: "relaxed" | "moderate" | "packed";
  budget?: "budget" | "moderate" | "luxury";
  tripId?: string;
  callbackUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user context for rate limiting and personalization
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // Rate limiting: 5 requests per 10 seconds
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured()
      ? conversationRatelimit
      : memoryConversationRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a moment before generating another itinerary.",
          limit,
          remaining,
          reset,
        },
        { status: 429 }
      );
    }

    const body: AsyncItineraryRequest = await request.json();
    const {
      destination,
      dates,
      preferences = [],
      travelStyle = "moderate",
      budget = "moderate",
      tripId,
      callbackUrl,
    } = body;

    // Validate required fields
    if (!destination || typeof destination !== "string" || destination.trim().length === 0) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    }

    if (!dates?.start || !dates?.end) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    // Check if Inngest is configured
    if (!isInngestConfigured()) {
      return NextResponse.json(
        {
          error: "Background job processing is not configured. Use /api/generate-itinerary for synchronous generation.",
        },
        { status: 503 }
      );
    }

    // Dispatch the job
    const { jobId, eventId } = await dispatchItineraryJob({
      userId,
      destination,
      dates,
      preferences,
      travelStyle,
      budget,
      tripId,
      callbackUrl,
    });

    // Calculate estimated trip days for response
    const startDate = new Date(dates.start);
    const endDate = new Date(dates.end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const tripDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return NextResponse.json({
      success: true,
      jobId,
      eventId,
      status: "queued",
      message: `Itinerary generation queued for ${tripDays}-day trip to ${destination}`,
      statusUrl: `/api/jobs/status?jobId=${jobId}`,
      estimatedWaitTime: "30-60 seconds",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Async itinerary API error:", error);
    return NextResponse.json(
      {
        error: "Failed to queue itinerary generation",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
