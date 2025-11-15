/**
 * Generate Descriptions Job
 * 
 * POST /api/jobs/generate-descriptions
 * 
 * QStash-compatible endpoint to generate AI descriptions for destinations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireQStashSignature } from '@/lib/qstash-middleware';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '');

async function generateShortDescription(name: string, city: string, category: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const prompt = `Generate a short, punchy 5-word tagline for this destination:
Name: ${name}
City: ${city}
Category: ${category}

Requirements:
- Exactly 5 words
- Editorial, story-driven tone
- Engaging and memorable
- No punctuation at the end
- Examples: "Refined Japanese dining meets tradition", "Cozy cafe with artisan pastries", "Modern hotel overlooking the harbor"

Tagline:`;
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim();
}

async function handleGenerateDescriptionsJob(request: NextRequest, body: any) {
  try {
    const { batchSize = 10, dryRun = false } = body;

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch destinations without ai_description
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, name, city, category, ai_description')
      .is('ai_description', null)
      .limit(batchSize);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch destinations' },
        { status: 500 }
      );
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({
        message: 'No destinations need descriptions',
        processed: 0,
      });
    }

    const results = {
      total: destinations.length,
      processed: 0,
      errors: [] as string[],
      updated: [] as number[],
    };

    // Process each destination
    for (const dest of destinations) {
      try {
        console.log(`Generating description for: ${dest.name}`);
        const description = await generateShortDescription(
          dest.name,
          dest.city,
          dest.category || 'destination'
        );

        if (!dryRun) {
          // Update the destination
          const { error: updateError } = await supabase
            .from('destinations')
            .update({
              ai_description: description,
            })
            .eq('id', dest.id);

          if (updateError) {
            throw updateError;
          }
        }

        results.updated.push(dest.id);
        results.processed++;
        console.log(`✓ Generated: ${description}`);

        // Rate limiting for AI API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`Error processing destination ${dest.id}:`, err);
        results.errors.push(`Destination ${dest.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: dryRun ? 'Dry run complete' : 'Description generation complete',
      ...results,
    });

  } catch (error) {
    console.error('Generate descriptions job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check if QStash signature verification is enabled
  const qstashEnabled = process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY;

  if (qstashEnabled) {
    return requireQStashSignature(request, handleGenerateDescriptionsJob);
  } else {
    // For local testing, allow without signature
    const body = await request.json();
    return handleGenerateDescriptionsJob(request, body);
  }
}
