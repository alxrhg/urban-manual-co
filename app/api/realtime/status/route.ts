import { NextRequest } from 'next/server';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const destinationId = parseInt(searchParams.get('destination_id') || '0');
  const userId = searchParams.get('user_id') || undefined;

  if (!destinationId || destinationId <= 0) {
    throw createValidationError('destination_id is required');
  }

  const status = await realtimeIntelligenceService.getRealtimeStatus(
    destinationId,
    userId
  );

  return createSuccessResponse({ status });
});
