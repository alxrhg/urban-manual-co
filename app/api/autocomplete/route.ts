import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withErrorHandling } from '@/lib/errors';
import { AutocompleteRequestSchema, validateSchema } from '@/lib/validation';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { query } = validateSchema(
    AutocompleteRequestSchema,
    await request.json(),
    'Invalid autocomplete request'
  );

  const searchTerm = query.toLowerCase().trim();
  const suggestions: string[] = [];

  // 1. Search cities
  const { data: cities } = await (async () => {
    const query = supabase
      .from('destinations')
      .select('city')
      .ilike('city', `%${searchTerm}%`)
      .limit(5);
    return await query;
  })();

  if (cities) {
    const uniqueCities = Array.from(new Set(cities.map((c: any) => c.city)));
    suggestions.push(...uniqueCities.map((c: string) => `📍 ${c}`));
  }

  // 2. Search destinations
  const { data: destinations } = await (async () => {
    const query = supabase
      .from('destinations')
      .select('name, city')
      .or(`name.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .limit(5);
    return await query;
  })();

  if (destinations) {
    destinations.forEach((dest: any) => {
      suggestions.push(`🏛️ ${dest.name} - ${dest.city}`);
    });
  }

  // 3. Search categories
  const categories = ['Hotels', 'Restaurants', 'Cafes', 'Bars', 'Shops', 'Museums', 'Parks', 'Spas'];
  const matchingCategories = categories.filter(cat => 
    cat.toLowerCase().includes(searchTerm)
  );

  matchingCategories.forEach(cat => {
    suggestions.push(`🏷️ ${cat}`);
  });

  // Remove duplicates and limit
  const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 8);

  return NextResponse.json({ suggestions: uniqueSuggestions });
});

