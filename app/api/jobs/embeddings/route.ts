/**
 * Embeddings Job API
 *
 * POST /api/jobs/embeddings
 *
 * Triggers embedding generation jobs.
 * Supports single destination, batch, and backfill operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  dispatchEmbeddingJob,
  dispatchEmbeddingBatch,
  dispatchEmbeddingBackfill,
  isInngestConfigured,
} from "@/lib/inngest/dispatch";

interface EmbeddingsJobRequest {
  action: "single" | "batch" | "backfill";
  destinationId?: number;
  destinationIds?: number[];
  limit?: number;
  offset?: number;
  priority?: "high" | "normal" | "low";
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check admin role
    const isAdmin = user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check if Inngest is configured
    if (!isInngestConfigured()) {
      return NextResponse.json(
        { error: "Background job processing is not configured" },
        { status: 503 }
      );
    }

    const body: EmbeddingsJobRequest = await request.json();
    const { action, destinationId, destinationIds, limit, offset, priority } = body;

    switch (action) {
      case "single": {
        if (!destinationId) {
          return NextResponse.json(
            { error: "destinationId is required for single action" },
            { status: 400 }
          );
        }

        const { eventId } = await dispatchEmbeddingJob(destinationId, priority);
        return NextResponse.json({
          success: true,
          action: "single",
          eventId,
          destinationId,
          status: "queued",
        });
      }

      case "batch": {
        if (!destinationIds || !Array.isArray(destinationIds) || destinationIds.length === 0) {
          return NextResponse.json(
            { error: "destinationIds array is required for batch action" },
            { status: 400 }
          );
        }

        if (destinationIds.length > 500) {
          return NextResponse.json(
            { error: "Maximum batch size is 500 destinations" },
            { status: 400 }
          );
        }

        const { eventId, batchId } = await dispatchEmbeddingBatch(destinationIds);
        return NextResponse.json({
          success: true,
          action: "batch",
          eventId,
          batchId,
          count: destinationIds.length,
          status: "queued",
        });
      }

      case "backfill": {
        const { eventId } = await dispatchEmbeddingBackfill(limit, offset);
        return NextResponse.json({
          success: true,
          action: "backfill",
          eventId,
          limit: limit || 50,
          offset: offset || 0,
          status: "queued",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: single, batch, or backfill" },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Embeddings job API error:", error);
    return NextResponse.json(
      {
        error: "Failed to queue embedding job",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
