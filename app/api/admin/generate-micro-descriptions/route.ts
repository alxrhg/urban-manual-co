/**
 * Admin Generate Micro Descriptions API Route
 *
 * POST /api/admin/generate-micro-descriptions
 *
 * Generates AI-powered micro descriptions (subtitles) for destinations.
 * Uses Google Gemini for luxury travel copywriting style.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withAdminAuth, createValidationError, AdminContext } from '@/lib/errors';
import {
  adminRatelimit,
  memoryAdminRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';

const geminiApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

/**
 * Generate a micro description (max 50 characters) for a destination
 * Luxury travel copywriting style
 */
async function generateMicroDescription(
  genAI: GoogleGenerativeAI,
  name: string,
  city: string,
  country: string | null,
  category: string,
  description?: string | null,
  michelinStars?: number | null
): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const context = `
Destination Name: ${name}
City: ${city}
Country: ${country || 'Unknown'}
Category: ${category}
${michelinStars ? `Michelin Stars: ${michelinStars}` : ''}
${description ? `Notable features: ${description.substring(0, 300)}` : ''}
`.trim();

  const prompt = `You are a luxury travel copywriter. Generate a single, short, eye-catching subtitle for a travel destination card.

${context}

Requirements:
- Maximum 50 characters including spaces (STRICT limit)
- Compelling, specific, and memorable
- Use style descriptors, designer names, experiences, or unique attributes
- No ending punctuation
- Focus on what makes this place truly special
- Evoke sophistication, discovery, or uniqueness

Examples of good outputs:
- "Bill Bensley's architectural masterpiece"
- "Michelin-starred minimalist dining"
- "Portuguese coastal bohemian retreat"
- "Tokyo's hidden izakaya gem"
- "Design-forward luxury in historic charm"
- "Art deco grandeur meets modern luxury"
- "Chef's table omakase experience"
- "Brutalist icon with panoramic views"

Generate the subtitle now (just the text, nothing else):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    // Remove quotes if present
    text = text.replace(/^["']|["']$/g, '');

    // Remove any newlines to ensure single line
    text = text.replace(/\n/g, ' ').trim();

    // Ensure it's within character limit (max 50 chars)
    if (text.length > 50) {
      text = text.substring(0, 47).trim() + '...';
    }

    return text;
  } catch (error) {
    console.error('Error generating micro description:', error);
    return null;
  }
}

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  country?: string | null;
  category: string;
  description?: string | null;
  content?: string | null;
  michelin_stars?: number | null;
  micro_description?: string | null;
}

export const POST = withAdminAuth(async (request: NextRequest, { user, serviceClient: supabase }: AdminContext) => {
  // Check for Gemini API key
  if (!geminiApiKey) {
    throw createValidationError('Gemini API key not configured');
  }

  // Apply rate limiting
  const identifier = getIdentifier(request, user.id);
  const ratelimit = isUpstashConfigured() ? adminRatelimit : memoryAdminRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Admin rate limit exceeded. Please wait before retrying.',
      limit,
      remaining,
      reset
    );
  }

  const body = await request.json();
  const { mode = 'missing', batchSize = 10, slug } = body;

  // Single destination mode
  if (slug) {
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('id, slug, name, city, country, category, description, content, michelin_stars, micro_description')
      .eq('slug', slug)
      .single();

    if (error || !destination) {
      throw createValidationError(`Destination not found: ${slug}`);
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const microDesc = await generateMicroDescription(
      genAI,
      destination.name,
      destination.city,
      destination.country || null,
      destination.category,
      destination.description || destination.content,
      destination.michelin_stars
    );

    if (!microDesc) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate micro description',
        slug,
      });
    }

    // Update in database
    const { error: updateError } = await supabase
      .from('destinations')
      .update({ micro_description: microDesc })
      .eq('id', destination.id);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
        slug,
      });
    }

    return NextResponse.json({
      success: true,
      slug,
      micro_description: microDesc,
      previous: destination.micro_description,
    });
  }

  // Batch mode
  if (typeof batchSize !== 'number' || batchSize < 1 || batchSize > 50) {
    throw createValidationError('batchSize must be a number between 1 and 50');
  }

  if (!['missing', 'all'].includes(mode)) {
    throw createValidationError('Mode must be "missing" or "all"');
  }

  // Fetch destinations to process
  let query = supabase
    .from('destinations')
    .select('id, slug, name, city, country, category, description, content, michelin_stars, micro_description')
    .order('id');

  if (mode === 'missing') {
    query = query.or('micro_description.is.null,micro_description.eq.');
  }

  query = query.limit(batchSize);

  const { data: destinations, error } = await query;

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to fetch destinations');
  }

  if (!destinations || destinations.length === 0) {
    return NextResponse.json({
      message: 'No destinations to process',
      count: 0,
    });
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);

  // Process destinations
  const results = {
    total: destinations.length,
    processed: 0,
    errors: [] as string[],
    generated: [] as { slug: string; micro_description: string }[],
  };

  for (const dest of destinations as Destination[]) {
    try {
      const microDesc = await generateMicroDescription(
        genAI,
        dest.name,
        dest.city,
        dest.country || null,
        dest.category,
        dest.description || dest.content,
        dest.michelin_stars
      );

      if (microDesc) {
        const { error: updateError } = await supabase
          .from('destinations')
          .update({ micro_description: microDesc })
          .eq('id', dest.id);

        if (updateError) {
          results.errors.push(`${dest.slug}: ${updateError.message}`);
        } else {
          results.processed++;
          results.generated.push({ slug: dest.slug, micro_description: microDesc });
        }
      } else {
        results.errors.push(`${dest.slug}: Failed to generate`);
      }

      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      results.errors.push(`${dest.slug}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({
    message: 'Generation complete',
    ...results,
  });
});
