/**
 * Reject Discovery Candidate
 *
 * POST /api/discovery/candidates/[id]/reject
 *
 * Rejects a candidate and removes it from the queue.
 * Optionally stores in a rejected_places table to avoid re-fetching.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidateId = parseInt(id, 10);

    if (isNaN(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    // Optional reason from body
    let reason = null;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body provided, that's fine
    }

    const supabase = await createServerClient();

    // Fetch the candidate first
    const { data: candidate, error: fetchError } = await supabase
      .from("discovery_candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Delete from candidates
    const { error: deleteError } = await supabase
      .from("discovery_candidates")
      .delete()
      .eq("id", candidateId);

    if (deleteError) {
      console.error("[Reject] Delete error:", deleteError);
      return NextResponse.json(
        { error: `Failed to reject candidate: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rejected: {
        id: candidateId,
        name: candidate.name,
        city: candidate.city,
        place_id: candidate.place_id,
      },
      reason,
    });
  } catch (error: any) {
    console.error("[Reject] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
