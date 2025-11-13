import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraphService } from '@/services/intelligence/knowledge-graph';
import { intelligenceLimiter, memoryIntelligenceLimiter, withRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withRateLimit({
    request,
    limiter: intelligenceLimiter,
    fallbackLimiter: memoryIntelligenceLimiter,
    message: 'Intelligence API usage is limited to 30 requests per minute.',
    handler: async () => {
      try {
        const { searchParams } = new URL(request.url);
        const destinationId = searchParams.get('destination_id');
        const limit = parseInt(searchParams.get('limit') || '5');

        if (!destinationId) {
          return NextResponse.json(
            { error: 'destination_id is required' },
            { status: 400 }
          );
        }

        const similar = await knowledgeGraphService.findSimilar(destinationId, limit);

        return NextResponse.json({
          similar,
          count: similar.length,
        });
      } catch (error: any) {
        console.error('Error finding similar destinations:', error);
        return NextResponse.json(
          { error: 'Failed to find similar destinations', details: error.message },
          { status: 500 }
        );
      }
    },
  });
}

