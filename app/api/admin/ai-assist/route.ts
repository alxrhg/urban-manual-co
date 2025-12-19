import { NextRequest, NextResponse } from 'next/server';
import { routePrompt } from '@/services/ai-gateway';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AIResponseSchema = z.object({
  message: z.string(),
  suggestions: z.array(z.string()).optional(),
  actions: z.array(z.object({
    label: z.string(),
    href: z.string(),
  })).optional(),
});

type AIResponse = z.infer<typeof AIResponseSchema>;

// Admin dashboard context for the AI
const ADMIN_CONTEXT = `You are an AI assistant helping manage the Urban Manual travel guide admin dashboard.

Available features and their locations:
- Destinations (/admin/destinations): View, edit, create, and manage all travel destinations
- Analytics (/admin/analytics): View user engagement metrics, popular destinations, search patterns
- Searches (/admin/searches): Analyze search logs, find content gaps, see trending queries
- Enrich (/admin/enrich): Enrich destinations with Google Places data (images, reviews, details)
- Reindex (/admin/reindex): Update the AI search vector index for better search results

Common tasks you can help with:
1. Writing descriptions for destinations
2. Finding destinations that need attention (missing images, no descriptions, not enriched)
3. Understanding analytics and user behavior
4. Explaining how to use different features
5. Providing content recommendations

When responding:
- Be concise and helpful
- Suggest relevant actions when appropriate
- Reference specific admin pages when relevant
- If asked to write content, be creative but professional`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify admin access
    const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Fetch some context data for the AI
    const [
      { count: totalDestinations },
      { count: enrichedCount },
      { count: missingImages },
      { count: notEnriched },
    ] = await Promise.all([
      supabase.from('destinations').select('*', { count: 'exact', head: true }),
      supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
      supabase.from('destinations').select('*', { count: 'exact', head: true }).or('image.is.null,image.eq.'),
      supabase.from('destinations').select('*', { count: 'exact', head: true }).is('last_enriched_at', null),
    ]);

    const statsContext = `
Current database stats:
- Total destinations: ${totalDestinations || 0}
- Enriched destinations: ${enrichedCount || 0} (${totalDestinations ? Math.round(((enrichedCount || 0) / totalDestinations) * 100) : 0}%)
- Missing images: ${missingImages || 0}
- Not enriched: ${notEnriched || 0}`;

    const fullPrompt = `${ADMIN_CONTEXT}

${statsContext}

User's question: "${prompt}"

Respond with a helpful answer in JSON format:
{
  "message": "Your helpful response here",
  "suggestions": ["Optional follow-up question 1", "Optional follow-up question 2"],
  "actions": [{"label": "Action button text", "href": "/admin/page"}]
}

Keep the message concise (2-4 sentences). Include 0-3 suggestions for follow-up questions. Include 0-2 action buttons linking to relevant admin pages.`;

    const response = await routePrompt<AIResponse>({
      prompt: fullPrompt,
      responseSchema: AIResponseSchema,
      metadata: {
        useCase: 'admin.ai-assist',
        userId: user?.id,
      },
      preferredProviders: ['gemini', 'openai'],
      capabilities: ['json'],
      temperature: 0.7,
      safetyBudget: {
        maxOutputTokens: 500,
        maxLatencyMs: 10000,
      },
    });

    if (response.parsed) {
      return NextResponse.json(response.parsed);
    }

    // Fallback if parsing failed
    return NextResponse.json({
      message: response.output || 'I apologize, but I encountered an issue processing your request. Please try again.',
    });
  } catch (error) {
    console.error('[admin/ai-assist] Error:', error);

    // Provide helpful fallback responses based on common queries
    const body = await request.clone().json().catch(() => ({ prompt: '' }));
    const prompt = body.prompt?.toLowerCase() || '';

    if (prompt.includes('what can i do') || prompt.includes('help')) {
      return NextResponse.json({
        message: 'I can help you manage your travel destinations! You can ask me to help write descriptions, find destinations that need attention, explain analytics, or guide you through the dashboard features.',
        suggestions: [
          'Show me destinations that need images',
          'Help me write a description',
          'What are the most popular destinations?',
        ],
        actions: [
          { label: 'View Destinations', href: '/admin/destinations' },
          { label: 'See Analytics', href: '/admin/analytics' },
        ],
      });
    }

    if (prompt.includes('write') || prompt.includes('description')) {
      return NextResponse.json({
        message: 'I can help you write compelling descriptions for your destinations! Select a destination from the list and I can generate a professional, engaging description based on its details.',
        actions: [
          { label: 'Go to Destinations', href: '/admin/destinations' },
        ],
      });
    }

    if (prompt.includes('find') || prompt.includes('attention') || prompt.includes('missing')) {
      return NextResponse.json({
        message: 'You can find destinations that need attention using the filters on the Destinations page. Filter by "Missing Image", "No Description", or "Not Enriched" to see what needs work.',
        actions: [
          { label: 'Missing Images', href: '/admin/destinations?filter=no_image' },
          { label: 'Not Enriched', href: '/admin/destinations?filter=not_enriched' },
        ],
      });
    }

    return NextResponse.json({
      message: 'I apologize, but I encountered an issue processing your request. Please try asking in a different way or use the navigation to find what you need.',
      suggestions: [
        'What can I do in this dashboard?',
        'Show me the analytics',
      ],
    });
  }
}
