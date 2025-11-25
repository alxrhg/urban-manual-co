/**
 * Admin AI Enrichment API
 * Uses Gemini Grounding with Google Search to enrich destination data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';
import {
  enrichDestinationWithGrounding,
  verifyDestination,
  isGroundingAvailable,
} from '@/lib/ai/gemini-grounding';

export async function POST(request: NextRequest) {
  try {
    const { serviceClient: supabase } = await requireAdmin(request);

    if (!isGroundingAvailable()) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { slug, action = 'enrich' } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Destination slug required' },
        { status: 400 }
      );
    }

    // Fetch destination
    const { data: destination, error: fetchError } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError || !destination) {
      return NextResponse.json(
        { error: 'Destination not found', slug },
        { status: 404 }
      );
    }

    if (action === 'verify') {
      // Verify destination exists and is operational
      const verification = await verifyDestination({
        name: destination.name,
        city: destination.city,
        country: destination.country,
        address: destination.formatted_address,
        phone: destination.international_phone_number,
        website: destination.website,
      });

      if (!verification) {
        return NextResponse.json({
          slug,
          action: 'verify',
          success: false,
          error: 'Verification failed - could not process',
        });
      }

      return NextResponse.json({
        slug,
        action: 'verify',
        success: true,
        verification,
      });
    }

    // Default: Enrich with AI-generated content
    const enrichment = await enrichDestinationWithGrounding(
      {
        name: destination.name,
        city: destination.city,
        country: destination.country,
        category: destination.category,
        description: destination.description,
        address: destination.formatted_address,
      },
      {
        includeNearby: true,
        includeLocalTips: true,
        generateEditorial: true,
        verifyInfo: true,
      }
    );

    if (!enrichment) {
      return NextResponse.json({
        slug,
        action: 'enrich',
        success: false,
        error: 'Enrichment failed - could not process',
      });
    }

    // Prepare update object (only update fields that were generated)
    const updates: Record<string, any> = {};

    if (enrichment.editorial_description && !destination.description) {
      updates.description = enrichment.editorial_description;
    }
    if (enrichment.micro_description && !destination.micro_description) {
      updates.micro_description = enrichment.micro_description;
    }
    if (enrichment.cuisine_type && !destination.cuisine_type) {
      updates.cuisine_type = enrichment.cuisine_type;
    }

    // Store AI-generated insights as JSON
    const aiInsights = {
      notable_features: enrichment.notable_features,
      best_for: enrichment.best_for,
      atmosphere: enrichment.atmosphere,
      price_insight: enrichment.price_insight,
      local_tips: enrichment.local_tips,
      nearby_landmarks: enrichment.nearby_landmarks,
      best_time_to_visit: enrichment.best_time_to_visit,
      reservation_info: enrichment.reservation_info,
      verification_status: enrichment.verification_status,
      confidence_score: enrichment.confidence_score,
      grounding_sources: enrichment.grounding_sources,
      enriched_at: new Date().toISOString(),
    };

    updates.ai_insights_json = JSON.stringify(aiInsights);

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('destinations')
        .update(updates)
        .eq('slug', slug);

      if (updateError) {
        console.error('[AI Enrich] Update failed:', updateError);
        return NextResponse.json({
          slug,
          action: 'enrich',
          success: false,
          error: `Update failed: ${updateError.message}`,
          enrichment, // Still return enrichment data
        });
      }
    }

    return NextResponse.json({
      slug,
      action: 'enrich',
      success: true,
      enrichment,
      updates: Object.keys(updates),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[AI Enrich] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Enrichment failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    available: isGroundingAvailable(),
    actions: ['enrich', 'verify'],
    description: 'AI-powered destination enrichment using Gemini with Google Search grounding',
  });
}
