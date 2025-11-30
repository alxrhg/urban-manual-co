import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraphService } from '@/services/intelligence/knowledge-graph';
import { withErrorHandling, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const destinationId = searchParams.get('destination_id');
  const limit = parseInt(searchParams.get('limit') || '5');

  if (!destinationId) {
    throw createValidationError('destination_id is required');
  }

  const similar = await knowledgeGraphService.findSimilar(destinationId, limit);

  return NextResponse.json({
    similar,
    count: similar.length,
  });
});

