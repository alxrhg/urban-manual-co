import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateSearchResponseContext } from '@/lib/search/generateSearchContext';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { deriveRefinementFilters, applyRefinementFilters } from '@/lib/search/refinementFilters';

export async function POST(request: NextRequest) {
  try {
    const { originalQuery, refinements = [], allResults = [] } = await request.json();
    const supabase = await createServerClient();

    if (!allResults || allResults.length === 0) {
      return NextResponse.json({
        filteredResults: [],
        contextResponse: 'No results to filter.',
        suggestions: [],
      });
    }

    const { filters: derivedFilters, appliedFilters: derivedApplied } = deriveRefinementFilters(refinements);

    const refinedQuery = applyRefinementFilters(
      supabase.from('destinations').select('*').in('id', allResults),
      derivedFilters,
    );

    const { data: filtered, error } = await refinedQuery;

    if (error || !filtered) {
      return NextResponse.json({
        filteredResults: [],
        contextResponse: 'No results found.',
        suggestions: [],
      });
    }

    const appliedFilters = Array.from(new Set(derivedApplied));

    // Generate contextual response
    let contextResponse = '';
    try {
      contextResponse = await generateSearchResponseContext({
        query: originalQuery,
        results: filtered,
        filters: {},
      }) || '';
    } catch (error) {
      console.error('Error generating context response:', error);
      contextResponse = generateFallbackResponse(filtered.length, allResults.length, appliedFilters);
    }

    // Generate suggestions
    let suggestions: Array<{ label: string; refinement: string }> = [];
    try {
      suggestions = await generateSuggestions({
        query: originalQuery,
        results: filtered,
        refinements,
        filters: {},
      }) || [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      suggestions = [];
    }

    return NextResponse.json({
      filteredResults: filtered,
      contextResponse,
      suggestions,
      appliedFilters,
    });
  } catch (error: any) {
    console.error('Refine endpoint error:', error);
    return NextResponse.json({
      filteredResults: [],
      contextResponse: 'Sorry, there was an error filtering results. Please try again.',
      suggestions: [],
    });
  }
}

function generateFallbackResponse(
  filteredCount: number,
  originalCount: number,
  appliedFilters: string[]
): string {
  if (filteredCount === 0) {
    return `No matches for ${appliedFilters.join(' + ')}. Want to try different filters?`;
  }
  if (filteredCount === 1) {
    return `One place matches ${appliedFilters.join(' + ')}.`;
  }
  const parts: string[] = [];
  if (filteredCount < originalCount) {
    parts.push(`Narrowed to ${filteredCount} of ${originalCount} places.`);
  } else {
    parts.push(`${filteredCount} places.`);
  }
  if (appliedFilters.length > 0) {
    parts.push(`Filtered by: ${appliedFilters.join(', ')}.`);
  }
  return parts.join(' ');
}
