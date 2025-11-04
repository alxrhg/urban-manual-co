import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { originalQuery, refinements = [], allResults = [] } = await request.json();
    const supabase = await createServerClient();

    // Fetch full data for provided IDs
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .in('id', allResults);

    if (error || !destinations) {
      return NextResponse.json({ filteredResults: [], contextResponse: 'No results found.' });
    }

    let filtered = destinations;
    const appliedFilters: string[] = [];

    for (const refinement of refinements) {
      const lower = String(refinement).toLowerCase();

      // Price filters
      if (lower.includes('cheap') || lower.includes('budget') || lower.includes('under')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) <= 2);
        appliedFilters.push('budget-friendly');
      } else if (lower.includes('luxury') || lower.includes('expensive') || lower.includes('upscale')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) >= 4);
        appliedFilters.push('luxury');
      } else if (lower.includes('¥30k') || lower.includes('30000')) {
        filtered = filtered.filter((d: any) => (d.price_level ?? 0) <= 3);
        appliedFilters.push('under ¥30k');
      }

      // Style filters
      if (lower.includes('design') || lower.includes('minimalist')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('design') ||
          d.description?.toLowerCase().includes('minimalist') ||
          (Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase().includes('design')))
        );
        appliedFilters.push('design-focused');
      } else if (lower.includes('traditional') || lower.includes('classic')) {
        filtered = filtered.filter((d: any) =>
          d.description?.toLowerCase().includes('traditional') ||
          d.description?.toLowerCase().includes('classic')
        );
        appliedFilters.push('traditional');
      }

      // Status filters
      if (lower.includes('open now') || lower.includes('open')) {
        filtered = filtered.filter((d: any) => !!d.is_open_now);
        appliedFilters.push('open now');
      }

      // Quality filters
      if (lower.includes('michelin')) {
        filtered = filtered.filter((d: any) => (d.michelin_stars ?? 0) > 0);
        appliedFilters.push('Michelin-starred');
      }

      // Location expansion (placeholder)
      if (lower.includes('nearby') || lower.includes('expand')) {
        appliedFilters.push('nearby areas');
      }
    }

    const contextResponse = generateRefinedResponse({
      filteredCount: filtered.length,
      originalCount: destinations.length,
      appliedFilters,
      results: filtered,
    });

    return NextResponse.json({ filteredResults: filtered, contextResponse, appliedFilters });
  } catch (error: any) {
    return NextResponse.json({ filteredResults: [], contextResponse: '' });
  }
}

function generateRefinedResponse(input: {
  filteredCount: number;
  originalCount: number;
  appliedFilters: string[];
  results: any[];
}): string {
  const { filteredCount, originalCount, appliedFilters, results } = input;

  if (filteredCount === 0) {
    return `No matches for ${appliedFilters.join(' + ')}. Want to try different filters?`;
  }
  if (filteredCount === 1) {
    return `One place matches ${appliedFilters.join(' + ')}. ${(results[0] as any)?.name} — it's excellent.`;
  }
  const parts: string[] = [];
  if (filteredCount < originalCount) parts.push(`Narrowed to ${filteredCount} places.`);
  else parts.push(`${filteredCount} places.`);
  if (appliedFilters.length > 0) parts.push(`Filtered by: ${appliedFilters.join(', ')}.`);
  parts.push(`All still curated.`);
  return parts.join(' ');
}


