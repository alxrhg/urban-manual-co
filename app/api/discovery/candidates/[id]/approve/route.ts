/**
 * Approve Discovery Candidate
 *
 * POST /api/discovery/candidates/[id]/approve
 *
 * Approves a candidate, enriches it with Google Places data,
 * and adds it to the destinations table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { enrichDestination } from "@/lib/enrichment";
import { normalizeCategory } from "@/lib/categories";

function generateSlug(name: string, city: string): string {
  const combined = `${name}-${city}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

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

    const supabase = await createServerClient();

    // Fetch the candidate
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

    // Check if place already exists in destinations
    const { data: existing } = await supabase
      .from("destinations")
      .select("id, slug")
      .eq("google_place_id", candidate.place_id)
      .single();

    if (existing) {
      // Remove from candidates since it already exists
      await supabase.from("discovery_candidates").delete().eq("id", candidateId);

      return NextResponse.json({
        success: false,
        error: "Place already exists in destinations",
        existing_destination: existing,
      });
    }

    // Enrich the destination with Google Places + Gemini
    let enrichedData = null;
    try {
      enrichedData = await enrichDestination(
        candidate.name,
        candidate.city,
        candidate.category,
        undefined // no existing description
      );
    } catch (enrichError) {
      console.warn("[Approve] Enrichment failed, proceeding with basic data:", enrichError);
    }

    // Prepare destination data
    const slug = generateSlug(candidate.name, candidate.city);
    const normalizedCategory = normalizeCategory(
      enrichedData?.category || candidate.category
    );

    const destinationData: Record<string, any> = {
      slug,
      name: candidate.name,
      city: candidate.city,
      category: normalizedCategory,
      google_place_id: candidate.place_id,
      image: candidate.image_url,
      rating: candidate.google_rating,
    };

    // Add enriched data if available
    if (enrichedData?.places) {
      const places = enrichedData.places;
      if (places.latitude) destinationData.latitude = places.latitude;
      if (places.longitude) destinationData.longitude = places.longitude;
      if (places.formatted_address) destinationData.address = places.formatted_address;
      if (places.phone_number) destinationData.phone = places.phone_number;
      if (places.website) destinationData.website = places.website;
      if (places.google_maps_url) destinationData.google_maps_url = places.google_maps_url;
      if (places.price_level) destinationData.price_level = places.price_level;
      if (places.opening_hours) destinationData.opening_hours = places.opening_hours;
      if (places.editorial_summary) destinationData.description = places.editorial_summary;
      if (places.google_types) destinationData.google_types = places.google_types;
      if (places.cuisine_type) destinationData.cuisine_type = places.cuisine_type;
    }

    // Add AI-generated tags if available
    if (enrichedData?.gemini?.tags && enrichedData.gemini.tags.length > 0) {
      destinationData.tags = enrichedData.gemini.tags;
    }

    // Insert into destinations
    const { data: newDestination, error: insertError } = await supabase
      .from("destinations")
      .insert(destinationData)
      .select()
      .single();

    if (insertError) {
      console.error("[Approve] Insert error:", insertError);
      return NextResponse.json(
        { error: `Failed to create destination: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Remove from candidates
    await supabase.from("discovery_candidates").delete().eq("id", candidateId);

    return NextResponse.json({
      success: true,
      destination: newDestination,
      enriched: !!enrichedData,
    });
  } catch (error: any) {
    console.error("[Approve] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
