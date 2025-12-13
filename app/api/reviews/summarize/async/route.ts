/**
 * Async Review Summary API
 *
 * POST /api/reviews/summarize/async
 *
 * Dispatches review summarization to background job queue.
 * Returns immediately with a status response.
 * Use for batch operations or when immediate response isn't needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { dispatchSummaryJob, isInngestConfigured } from "@/lib/inngest/dispatch";

interface AsyncSummarizeRequest {
  destinationId: number;
  destinationSlug: string;
  destinationName: string;
  reviews: Array<{ text: string; rating?: number }>;
  callbackUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AsyncSummarizeRequest = await request.json();
    const { destinationId, destinationSlug, destinationName, reviews, callbackUrl } = body;

    // Validate required fields
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ error: "No reviews provided" }, { status: 400 });
    }

    if (!destinationId) {
      return NextResponse.json({ error: "Destination ID is required" }, { status: 400 });
    }

    if (!destinationName) {
      return NextResponse.json({ error: "Destination name is required" }, { status: 400 });
    }

    if (!destinationSlug) {
      return NextResponse.json({ error: "Destination slug is required" }, { status: 400 });
    }

    // Check if Inngest is configured
    if (!isInngestConfigured()) {
      return NextResponse.json(
        {
          error:
            "Background job processing is not configured. Use /api/reviews/summarize for synchronous generation.",
        },
        { status: 503 }
      );
    }

    // Dispatch the job
    const { eventId } = await dispatchSummaryJob({
      destinationId,
      destinationSlug,
      destinationName,
      reviews,
      callbackUrl,
    });

    return NextResponse.json({
      success: true,
      eventId,
      status: "queued",
      message: `Review summary queued for ${destinationName}`,
      reviewCount: reviews.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Async summarize API error:", error);
    return NextResponse.json(
      {
        error: "Failed to queue summary generation",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
