/**
 * Job Status API
 *
 * GET /api/jobs/status?jobId=xxx
 * GET /api/jobs/status?type=itinerary_generation&limit=10
 *
 * Allows clients to poll for background job status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandling, createValidationError } from "@/lib/errors";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get("jobId");
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const supabase = await createServerClient();

  // Get authenticated user (optional)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Query by jobId
  if (jobId) {
    const { data: job, error } = await supabase
      .from("background_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching job:", error);
      return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only return job if user owns it or it's public
    if (job.user_id && job.user_id !== user?.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  }

  // Query by type (for authenticated users)
  if (type) {
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to list jobs" },
        { status: 401 }
      );
    }

    const { data: jobs, error } = await supabase
      .from("background_jobs")
      .select("*")
      .eq("type", type)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 50));

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  }

  // List recent jobs for authenticated user
  if (user) {
    const { data: jobs, error } = await supabase
      .from("background_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 50));

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  }

  throw createValidationError("jobId parameter is required for unauthenticated requests");
});
