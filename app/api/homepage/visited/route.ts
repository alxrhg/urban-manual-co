import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getVisitedSlugsForUser } from '@/server/services/homepage-loaders';

type VisitedHandlerDeps = {
  getCurrentUserId: () => Promise<string | null>;
  loadVisitedSlugs: (userId: string) => Promise<string[]>;
};

export function createHomepageVisitedHandler(deps: VisitedHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const userId = await deps.getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const slugs = await deps.loadVisitedSlugs(userId);
      return NextResponse.json({ success: true, slugs });
    } catch (error: any) {
      // Check if it's a Supabase config error or network error
      const cause = error?.cause as any;
      const isConfigError = error?.message?.includes('placeholder') || 
                           error?.message?.includes('invalid') ||
                           error?.message?.includes('fetch failed') ||
                           error?.code === 'ECONNREFUSED' ||
                           error?.code === 'ETIMEDOUT' ||
                           cause?.code === 'ECONNREFUSED' ||
                           cause?.message?.includes('fetch failed');
      
      if (isConfigError) {
        // Return 200 with empty slugs for graceful degradation
        const cause = error?.cause as any;
        console.warn('[Homepage Visited] Supabase config/network error, returning empty slugs:', error?.message || cause?.message);
        return NextResponse.json({ success: true, slugs: [] }, { status: 200 });
      }
      
      // Log unexpected errors
      console.error('Error loading visited places for homepage', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

async function getUserIdFromSession() {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      // Check if it's a network/config error (placeholder client)
      const cause = error?.cause as any;
      if (error?.message?.includes('fetch failed') ||
          error?.message?.includes('ECONNREFUSED') ||
          error?.message?.includes('ETIMEDOUT') ||
          cause?.code === 'ECONNREFUSED' ||
          cause?.message?.includes('fetch failed')) {
        console.warn('[Homepage Visited] Supabase config error, returning null user');
        return null;
      }
      console.warn('Error retrieving auth user for homepage visited', error.message);
      return null;
    }

    return data?.user?.id ?? null;
  } catch (error: any) {
    // Handle network errors and config errors gracefully
    const cause = error?.cause as any;
    if (error?.message?.includes('placeholder') || 
        error?.message?.includes('invalid') ||
        error?.message?.includes('fetch failed') ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT' ||
        cause?.code === 'ECONNREFUSED') {
      console.warn('[Homepage Visited] Supabase client error:', error?.message || cause?.message);
      return null;
    }
    throw error;
  }
}

export const GET = createHomepageVisitedHandler({
  getCurrentUserId: getUserIdFromSession,
  loadVisitedSlugs: getVisitedSlugsForUser,
});

export const dynamic = 'force-dynamic';
