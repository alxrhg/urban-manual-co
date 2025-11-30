import { NextRequest, NextResponse } from 'next/server';
import { getFilterRows, type FilterRow } from '@/server/services/homepage-loaders';

type FiltersHandlerDeps = {
  loadFilterRows: () => Promise<FilterRow[]>;
};

export function createHomepageFiltersHandler(deps: FiltersHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const rows = await deps.loadFilterRows();

      // Add cache headers for CDN/browser caching
      const response = NextResponse.json({ success: true, rows });
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return response;
    } catch (error: any) {
      console.error('[Homepage Filters API] Error loading filter rows:', error?.message || error);
      
      // Check if it's a Supabase config error or connection issue
      if (error?.message?.includes('placeholder') || 
          error?.message?.includes('invalid') ||
          error?.message?.includes('Failed to create service role client') ||
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ETIMEDOUT') {
        console.warn('[Homepage Filters API] Database connection issue - returning empty filters');
        return NextResponse.json({ success: true, rows: [], note: 'Database temporarily unavailable' }, { status: 200 });
      }
      
      // For other errors, also return empty filters with 200 for better UX
      // The frontend can still render the page, just without filter options
      console.error('[Homepage Filters API] Unexpected error - returning empty filters for graceful degradation');
      return NextResponse.json({ success: true, rows: [], error: 'Unable to load filters' }, { status: 200 });
    }
  };
}

export const GET = createHomepageFiltersHandler({
  loadFilterRows: () => getFilterRows(),
});

export const revalidate = 60;
