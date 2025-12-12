/**
 * Enrich destinations with Google Trends data
 * Fetches search interest and trend direction for each destination
 *
 * Usage:
 *   npm run enrich:trends           # Enrich all destinations missing trends data
 *   npm run enrich:trends -- --all  # Re-enrich all destinations
 *   npm run enrich:trends -- --limit 50  # Limit to 50 destinations
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Dynamic import for google-trends-api (may not be installed)
let googleTrends: any;

const SUPABASE_URL = (process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI arguments
const args = process.argv.slice(2);
const enrichAll = args.includes("--all");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TrendResult {
  interest: number;
  trendDirection: "rising" | "stable" | "falling";
}

async function fetchGoogleTrends(query: string): Promise<TrendResult | null> {
  if (!googleTrends) {
    return null;
  }

  try {
    // Fetch interest over time (last 90 days)
    const interestData = await googleTrends.interestOverTime({
      keyword: query,
      geo: "",
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endTime: new Date(),
    });

    const parsed = JSON.parse(interestData);
    const timelineData = parsed.default?.timelineData || [];

    if (timelineData.length === 0) {
      return { interest: 0, trendDirection: "stable" };
    }

    // Calculate average interest
    const values = timelineData.map((d: any) => d.value[0] || 0);
    const avgInterest =
      values.reduce((a: number, b: number) => a + b, 0) / values.length;

    // Determine trend direction by comparing recent vs older values
    const recentValues = values.slice(-7);
    const olderValues = values.slice(-14, -7);

    if (recentValues.length === 0 || olderValues.length === 0) {
      return { interest: Math.round(avgInterest), trendDirection: "stable" };
    }

    const recentAvg =
      recentValues.reduce((a: number, b: number) => a + b, 0) /
      recentValues.length;
    const olderAvg =
      olderValues.reduce((a: number, b: number) => a + b, 0) /
      olderValues.length;

    let trendDirection: "rising" | "stable" | "falling" = "stable";
    const changePercent = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

    if (changePercent > 10) {
      trendDirection = "rising";
    } else if (changePercent < -10) {
      trendDirection = "falling";
    }

    return {
      interest: Math.round(avgInterest),
      trendDirection,
    };
  } catch (error: any) {
    // Rate limit or other error - return null to skip
    if (error.message?.includes("429") || error.message?.includes("rate")) {
      console.warn(`  Rate limited, waiting 30s...`);
      await sleep(30000);
      return null;
    }
    console.warn(`  Error fetching trends: ${error.message}`);
    return null;
  }
}

async function run() {
  console.log("Google Trends Enrichment");
  console.log("========================\n");

  // Try to load google-trends-api
  try {
    googleTrends = await import("google-trends-api");
    console.log("google-trends-api loaded successfully\n");
  } catch (error) {
    console.error(
      "google-trends-api not installed. Run: npm install google-trends-api"
    );
    process.exit(1);
  }

  // Fetch destinations to enrich
  let query = supabase
    .from("destinations")
    .select("id, slug, name, city, search_interest, trends_updated_at")
    .order("id");

  if (!enrichAll) {
    // Only fetch destinations without trends data or older than 7 days
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    query = query.or(
      `trends_updated_at.is.null,trends_updated_at.lt.${sevenDaysAgo}`
    );
  }

  query = query.limit(limit);

  const { data: destinations, error } = await query;

  if (error) {
    console.error("Error fetching destinations:", error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log("No destinations need trends enrichment.");
    return;
  }

  console.log(`Found ${destinations.length} destinations to enrich\n`);

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    const searchQuery = `${dest.name} ${dest.city}`;

    console.log(
      `[${i + 1}/${destinations.length}] ${dest.name} (${dest.city})...`
    );

    const result = await fetchGoogleTrends(searchQuery);

    if (result === null) {
      console.log(`  Skipped (error or rate limit)`);
      skipped++;
      await sleep(2000);
      continue;
    }

    // Update destination
    const { error: updateError } = await supabase
      .from("destinations")
      .update({
        search_interest: result.interest,
        trend_direction: result.trendDirection,
        trends_updated_at: new Date().toISOString(),
      })
      .eq("id", dest.id);

    if (updateError) {
      console.log(`  Error updating: ${updateError.message}`);
      errors++;
    } else {
      console.log(
        `  Interest: ${result.interest}, Direction: ${result.trendDirection}`
      );
      enriched++;
    }

    // Rate limit: wait 1.5s between requests
    await sleep(1500);
  }

  console.log("\n========================");
  console.log("Enrichment Complete");
  console.log(`  Enriched: ${enriched}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
}

run().catch(console.error);
