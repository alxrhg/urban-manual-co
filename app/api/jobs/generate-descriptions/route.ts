/**
 * Generate Descriptions Job
 *
 * POST /api/jobs/generate-descriptions
 *
 * Admin endpoint to generate AI descriptions for destinations.
 */

import { NextRequest } from 'next/server';
import { withAdminAuth, createSuccessResponse, AdminContext } from '@/lib/errors';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

export const POST = withAdminAuth(async (request: NextRequest, { serviceClient }: AdminContext) => {
  const body = await request.json();
  const { batchSize = 10, dryRun = false } = body;

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Fetch destinations without ai_description
  const { data: destinations, error } = await serviceClient
    .from('destinations')
    .select('id, name, city, category, ai_description')
    .is('ai_description', null)
    .limit(batchSize);

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to fetch destinations');
  }

  if (!destinations || destinations.length === 0) {
    return createSuccessResponse({
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
        const { error: updateError } = await serviceClient
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

  return createSuccessResponse({
    message: dryRun ? 'Dry run complete' : 'Description generation complete',
    ...results,
  });
});
