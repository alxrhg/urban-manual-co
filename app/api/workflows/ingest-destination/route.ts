/**
 * Destination Ingestion Workflow
 * 
 * POST /api/workflows/ingest-destination
 * 
 * Multi-step workflow for ingesting a new destination:
 * 1. Fetch destination from Supabase
 * 2. Geocode if missing coordinates
 * 3. Generate AI description if missing
 * 4. Generate embedding
 * 5. Upsert to Upstash Vector
 * 6. Update Supabase with last_indexed_at
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDestinationEmbedding } from '@/lib/ml/embeddings';
import { upsertDestinationEmbedding } from '@/lib/upstash-vector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface WorkflowStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  message?: string;
  duration_ms?: number;
}

export async function POST(request: NextRequest) {
  const workflow: WorkflowStep[] = [];
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { destinationId, skipGeocoding = false, skipDescription = false } = body;

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destinationId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch destination
    workflow.push({ step: 'fetch_destination', status: 'running' });
    const stepStart = Date.now();

    const { data: destination, error: fetchError } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', destinationId)
      .single();

    if (fetchError || !destination) {
      workflow[0].status = 'failed';
      workflow[0].message = fetchError?.message || 'Destination not found';
      return NextResponse.json(
        { error: 'Failed to fetch destination', workflow },
        { status: 404 }
      );
    }

    workflow[0].status = 'completed';
    workflow[0].duration_ms = Date.now() - stepStart;

    // Step 2: Geocode (if needed and not skipped)
    if (!skipGeocoding && (!destination.latitude || !destination.longitude)) {
      workflow.push({ step: 'geocode', status: 'running' });
      const geocodeStart = Date.now();

      try {
        // Call geocoding job
        const geocodeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/geocode-missing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinationIds: [destinationId] }),
        });

        if (geocodeResponse.ok) {
          workflow[workflow.length - 1].status = 'completed';
          workflow[workflow.length - 1].duration_ms = Date.now() - geocodeStart;
        } else {
          workflow[workflow.length - 1].status = 'failed';
          workflow[workflow.length - 1].message = 'Geocoding failed';
        }
      } catch (err) {
        workflow[workflow.length - 1].status = 'failed';
        workflow[workflow.length - 1].message = err instanceof Error ? err.message : 'Unknown geocoding error';
      }
    } else {
      workflow.push({ step: 'geocode', status: 'skipped', message: 'Already geocoded or skipped' });
    }

    // Step 3: Generate description (if needed and not skipped)
    if (!skipDescription && !destination.ai_description) {
      workflow.push({ step: 'generate_description', status: 'running' });
      const descStart = Date.now();

      try {
        const descResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/generate-descriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinationIds: [destinationId], batchSize: 1 }),
        });

        if (descResponse.ok) {
          workflow[workflow.length - 1].status = 'completed';
          workflow[workflow.length - 1].duration_ms = Date.now() - descStart;
        } else {
          workflow[workflow.length - 1].status = 'failed';
          workflow[workflow.length - 1].message = 'Description generation failed';
        }
      } catch (err) {
        workflow[workflow.length - 1].status = 'failed';
        workflow[workflow.length - 1].message = err instanceof Error ? err.message : 'Unknown description error';
      }
    } else {
      workflow.push({ step: 'generate_description', status: 'skipped', message: 'Already has description or skipped' });
    }

    // Step 4: Generate embedding
    workflow.push({ step: 'generate_embedding', status: 'running' });
    const embedStart = Date.now();

    try {
      const { embedding } = await generateDestinationEmbedding({
        name: destination.name,
        city: destination.city,
        category: destination.category || undefined,
        description: destination.description || undefined,
        tags: destination.tags || undefined,
        ai_description: destination.ai_description || undefined,
      });

      workflow[workflow.length - 1].status = 'completed';
      workflow[workflow.length - 1].duration_ms = Date.now() - embedStart;

      // Step 5: Upsert to Upstash Vector
      workflow.push({ step: 'upsert_vector', status: 'running' });
      const vectorStart = Date.now();

      await upsertDestinationEmbedding(
        destinationId,
        embedding,
        {
          destination_id: destinationId,
          name: destination.name,
          city: destination.city,
          country: destination.country || undefined,
          category: destination.category || undefined,
          price_range: destination.price_range || undefined,
          popularity_score: destination.popularity_score || undefined,
          michelin_stars: destination.michelin_stars || undefined,
          slug: destination.slug || undefined,
        }
      );

      workflow[workflow.length - 1].status = 'completed';
      workflow[workflow.length - 1].duration_ms = Date.now() - vectorStart;

      // Step 6: Update last_indexed_at in Supabase
      workflow.push({ step: 'update_supabase', status: 'running' });
      const updateStart = Date.now();

      const { error: updateError } = await supabase
        .from('destinations')
        .update({ last_indexed_at: new Date().toISOString() })
        .eq('id', destinationId);

      if (updateError) {
        workflow[workflow.length - 1].status = 'failed';
        workflow[workflow.length - 1].message = updateError.message;
      } else {
        workflow[workflow.length - 1].status = 'completed';
        workflow[workflow.length - 1].duration_ms = Date.now() - updateStart;
      }

    } catch (err) {
      const lastStep = workflow[workflow.length - 1];
      lastStep.status = 'failed';
      lastStep.message = err instanceof Error ? err.message : 'Unknown error';
    }

    const totalDuration = Date.now() - startTime;
    const success = workflow.every(s => s.status === 'completed' || s.status === 'skipped');

    return NextResponse.json({
      success,
      destinationId,
      workflow,
      total_duration_ms: totalDuration,
    });

  } catch (error) {
    console.error('Workflow error:', error);
    return NextResponse.json(
      {
        error: 'Workflow failed',
        workflow,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
