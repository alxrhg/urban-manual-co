/**
 * Discovery Candidates API
 *
 * GET /api/discovery/candidates - List pending candidates
 * DELETE /api/discovery/candidates - Clear all candidates
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const searchParams = request.nextUrl.searchParams;

    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("discovery_candidates")
      .select("*", { count: "exact" })
      .order("google_rating", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (city) {
      query = query.ilike("city", `%${city}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[Discovery Candidates] Error fetching:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      candidates: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[Discovery Candidates] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from("discovery_candidates")
      .delete()
      .neq("id", 0); // Delete all

    if (error) {
      console.error("[Discovery Candidates] Error clearing:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "All candidates cleared" });
  } catch (error: any) {
    console.error("[Discovery Candidates] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
