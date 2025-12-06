import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { richQueryContextService } from '@/services/intelligence/rich-query-context';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/intelligence/rich-context
 * Get rich query context for enhanced understanding
 */

// Mark route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || user?.id;
  const city = searchParams.get('city') || undefined;
  const destinationId = searchParams.get('destinationId')
    ? parseInt(searchParams.get('destinationId')!)
    : undefined;

  const context = await richQueryContextService.buildContext(userId, city, destinationId);

  return NextResponse.json(context);
});

