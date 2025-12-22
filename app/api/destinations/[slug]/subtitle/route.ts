import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/llm';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * Generate AI-powered subtitle for a destination
 * Emphasizes architect/designer with aspirational travel copywriting
 *
 * POST /api/destinations/[slug]/subtitle
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;

  if (!slug) {
    throw createValidationError('Destination slug is required');
  }

  const supabase = await createServerClient();

  // Fetch destination details
  const { data: destination, error } = await supabase
    .from('destinations')
    .select(`
      id, name, slug, city, category,
      architect, architectural_style, design_period,
      architectural_significance, design_story,
      description, micro_description
    `)
    .eq('slug', slug)
    .single();

  if (error || !destination) {
    return NextResponse.json(
      { error: 'Destination not found' },
      { status: 404 }
    );
  }

  // Build context for AI generation
  const context = [
    `Name: ${destination.name}`,
    destination.architect ? `Architect/Designer: ${destination.architect}` : null,
    destination.architectural_style ? `Style: ${destination.architectural_style}` : null,
    destination.design_period ? `Period: ${destination.design_period}` : null,
    destination.category ? `Category: ${destination.category}` : null,
    destination.city ? `City: ${destination.city}` : null,
    destination.architectural_significance ? `Significance: ${destination.architectural_significance}` : null,
    destination.description ? `Description: ${destination.description.slice(0, 200)}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are a luxury travel copywriter specializing in architectural and design-focused travel descriptions.

Generate a single, compelling subtitle for this destination (max 50 characters):

${context}

Requirements:
- Maximum 50 characters (including spaces)
- Lead with the architect/designer name if notable
- Reference signature style or famous work if applicable
- Be aspirational and luxurious in tone
- If no architect, focus on the most distinctive design element
- Examples:
  - "Frank Gehry's titanium masterpiece"
  - "Richard Meier's white minimalist icon"
  - "Zaha Hadid's flowing organic curves"
  - "1920s Art Deco grandeur restored"
  - "Contemporary Japanese minimalism"

Generate only the subtitle, no explanation or quotes.`;

  try {
    const subtitle = await generateText(prompt, {
      temperature: 0.8,
      maxTokens: 30,
    });

    if (!subtitle) {
      return NextResponse.json(
        { error: 'Failed to generate subtitle' },
        { status: 500 }
      );
    }

    // Clean up the subtitle
    const cleanSubtitle = subtitle
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .slice(0, 50); // Ensure max length

    // Optionally save to database
    const { save } = await request.json().catch(() => ({ save: false }));

    if (save) {
      await supabase
        .from('destinations')
        .update({
          micro_description: cleanSubtitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', destination.id);
    }

    return NextResponse.json({
      subtitle: cleanSubtitle,
      saved: save,
      destination: {
        id: destination.id,
        slug: destination.slug,
        name: destination.name,
      },
    });
  } catch (error: any) {
    console.error('[Subtitle API] Error generating subtitle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate subtitle' },
      { status: 500 }
    );
  }
});
