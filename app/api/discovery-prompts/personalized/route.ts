import { NextRequest } from 'next/server';
import { generatePersonalizedPrompt, GenerativePromptContext } from '@/lib/discovery-prompts-generative';
import { DiscoveryPromptService } from '@/lib/discovery-prompts';
import { withOptionalAuth, createSuccessResponse, createValidationError, OptionalAuthContext } from '@/lib/errors';

/**
 * GET /api/discovery-prompts/personalized
 *
 * Query parameters:
 * - city: string (required)
 * - user_id: string (optional) - For personalized prompts
 * - date: string (optional) - Date to check (YYYY-MM-DD)
 *
 * Returns personalized discovery prompts using generative AI
 */
export const GET = withOptionalAuth(async (request: NextRequest, { user }: OptionalAuthContext) => {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');
  const userId = searchParams.get('user_id') || user?.id;
  const userName = searchParams.get('user_name') || user?.user_metadata?.name || undefined;
  const dateParam = searchParams.get('date');

  if (!city) {
    throw createValidationError('City parameter is required');
  }

  const date = dateParam ? new Date(dateParam) : new Date();

  // Get base prompts for the city
  const basePrompts = await DiscoveryPromptService.getPromptsForCity(city, date);

  // Generate personalized prompt if user_id provided
  let personalizedPrompt: string | null = null;
  if (userId) {
    const context: GenerativePromptContext = {
      userId,
      userName,
      city: city.toLowerCase(),
      currentPrompts: basePrompts,
    };

    personalizedPrompt = await generatePersonalizedPrompt(context);
  }

  return createSuccessResponse({
    city,
    current_date: date.toISOString().split('T')[0],
    base_prompts: basePrompts,
    personalized_prompt: personalizedPrompt,
  });
});

