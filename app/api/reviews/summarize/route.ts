import { NextRequest } from 'next/server';
import { generateText } from '@/lib/llm';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { reviews, destinationName } = await request.json();

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    throw createValidationError('No reviews provided');
  }

  if (!destinationName) {
    throw createValidationError('Destination name is required');
  }

  // Extract review texts (limit to first 10 reviews to avoid token limits)
  const reviewTexts = reviews
    .slice(0, 10)
    .map((r: any) => r.text)
    .filter((text: string) => text && text.length > 0)
    .join('\n\n');

  if (!reviewTexts) {
    throw createValidationError('No review text found');
  }

  const prompt = `Summarize the following customer reviews for ${destinationName} in 2-3 concise sentences. Focus on:
- Common themes and highlights
- What customers love most
- Any notable concerns or patterns
- Overall sentiment

Reviews:
${reviewTexts}

Summary:`;

  const summary = await generateText(prompt, {
    temperature: 0.7,
    maxTokens: 150
  });

  if (!summary) {
    throw createValidationError('Failed to generate summary');
  }

  return createSuccessResponse({ summary });
});

