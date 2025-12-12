import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchGoogleTrends } from "@/lib/google-trends";

const BATCH_SIZE = 20; // Process 20 destinations per cron run
const STALE_DAYS = 7; // Refresh trends older than 7 days

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronSecret = request.headers.get("x-vercel-cron");

  if (cronSecret) {
    const hasValidSecret = authHeader === `Bearer ${cronSecret}`;
    const hasVercelCron = vercelCronSecret === "1";

    if (!hasValidSecret && !hasVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (vercelCronSecret !== "1") {
      return NextResponse.json(
        { error: "Unauthorized - must be called by Vercel cron" },
        { status: 401 }
      );
    }
  }

  const supabase = createServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role client not available" },
      { status: 500 }
    );
  }

  try {
    // Fetch destinations that need trends update
    const staleCutoff = new Date(
      Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: destinations, error: fetchError } = await supabase
      .from("destinations")
      .select("id, name, city")
      .or(`trends_updated_at.is.null,trends_updated_at.lt.${staleCutoff}`)
      .order("trends_updated_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch destinations", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({
        message: "All destinations have recent trends data",
        updated: 0,
      });
    }

    const results: Array<{
      id: number;
      name: string;
      status: "success" | "error" | "skipped";
      interest?: number;
      direction?: string;
      error?: string;
    }> = [];

    // Process each destination with rate limiting
    for (const dest of destinations) {
      const searchQuery = `${dest.name} ${dest.city}`;

      try {
        const trendData = await fetchGoogleTrends(searchQuery);

        if (trendData.interest === 0 && trendData.trendDirection === "stable") {
          // Likely no data or error - mark as updated but with null values
          await supabase
            .from("destinations")
            .update({
              search_interest: null,
              trend_direction: null,
              trends_updated_at: new Date().toISOString(),
            })
            .eq("id", dest.id);

          results.push({
            id: dest.id,
            name: dest.name,
            status: "skipped",
          });
        } else {
          // Update with real data
          const { error: updateError } = await supabase
            .from("destinations")
            .update({
              search_interest: trendData.interest,
              trend_direction: trendData.trendDirection,
              trends_updated_at: new Date().toISOString(),
            })
            .eq("id", dest.id);

          if (updateError) {
            results.push({
              id: dest.id,
              name: dest.name,
              status: "error",
              error: updateError.message,
            });
          } else {
            results.push({
              id: dest.id,
              name: dest.name,
              status: "success",
              interest: trendData.interest,
              direction: trendData.trendDirection,
            });
          }
        }

        // Rate limit: wait 1.5 seconds between requests
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error: any) {
        results.push({
          id: dest.id,
          name: dest.name,
          status: "error",
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({
      message: "Trends update completed",
      processed: destinations.length,
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      results,
    });
  } catch (error: any) {
    console.error("Error in update-trends cron:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
