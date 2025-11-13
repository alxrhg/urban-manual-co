import { NextRequest, NextResponse } from 'next/server';
import { getFilterRows, type FilterRow } from '@/server/services/homepage-loaders';

type FiltersHandlerDeps = {
  loadFilterRows: () => Promise<FilterRow[]>;
};

export function createHomepageFiltersHandler(deps: FiltersHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const rows = await deps.loadFilterRows();
      return NextResponse.json({ success: true, rows });
    } catch (error) {
      console.error('Error loading homepage filter rows', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export const GET = createHomepageFiltersHandler({
  loadFilterRows: () => getFilterRows(),
});

export const revalidate = 60;
