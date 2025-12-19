import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

type SyncType = 'brands' | 'cities' | 'countries' | 'neighborhoods' | 'all';

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

export async function POST(request: NextRequest) {
  try {
    const { type = 'all' } = await request.json() as { type?: SyncType };

    const supabase = await createServerClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: Record<string, { found: number; inserted: number; existing: number }> = {};

    // Sync brands
    if (type === 'all' || type === 'brands') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('brand')
        .not('brand', 'is', null)
        .not('brand', 'eq', '');

      const uniqueBrands = [...new Set(
        destinations?.map(d => d.brand?.trim()).filter(Boolean) || []
      )];

      let inserted = 0;
      let existing = 0;

      for (const brand of uniqueBrands) {
        const name = toTitleCase(brand);
        const slug = toSlug(brand);

        // Check if already exists
        const { data: existingBrand } = await supabase
          .from('brands')
          .select('id')
          .eq('slug', slug)
          .single();

        if (existingBrand) {
          existing++;
        } else {
          const { error } = await supabase
            .from('brands')
            .insert({ name, slug });

          if (!error) inserted++;
        }
      }

      results.brands = { found: uniqueBrands.length, inserted, existing };
    }

    // Sync cities
    if (type === 'all' || type === 'cities') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('city, country')
        .not('city', 'is', null)
        .not('city', 'eq', '');

      const cityMap = new Map<string, { name: string; country: string | null }>();
      destinations?.forEach(d => {
        if (d.city) {
          const key = `${d.city.trim().toLowerCase()}-${(d.country || '').toLowerCase()}`;
          if (!cityMap.has(key)) {
            cityMap.set(key, {
              name: toTitleCase(d.city.trim()),
              country: d.country ? toTitleCase(d.country.trim()) : null
            });
          }
        }
      });

      let inserted = 0;
      let existing = 0;

      for (const city of cityMap.values()) {
        const slug = toSlug(`${city.name}-${city.country || 'unknown'}`);

        const { data: existingCity } = await supabase
          .from('cities')
          .select('id')
          .eq('slug', slug)
          .single();

        if (existingCity) {
          existing++;
        } else {
          const { error } = await supabase
            .from('cities')
            .insert({ name: city.name, country: city.country, slug });

          if (!error) inserted++;
        }
      }

      results.cities = { found: cityMap.size, inserted, existing };
    }

    // Sync countries
    if (type === 'all' || type === 'countries') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('country')
        .not('country', 'is', null)
        .not('country', 'eq', '');

      const uniqueCountries = [...new Set(
        destinations?.map(d => d.country?.trim()).filter(Boolean) || []
      )];

      let inserted = 0;
      let existing = 0;

      for (const country of uniqueCountries) {
        const name = toTitleCase(country);
        const slug = toSlug(country);

        const { data: existingCountry } = await supabase
          .from('countries')
          .select('id')
          .eq('slug', slug)
          .single();

        if (existingCountry) {
          existing++;
        } else {
          const { error } = await supabase
            .from('countries')
            .insert({ name, slug });

          if (!error) inserted++;
        }
      }

      results.countries = { found: uniqueCountries.length, inserted, existing };
    }

    // Sync neighborhoods
    if (type === 'all' || type === 'neighborhoods') {
      const { data: destinations } = await supabase
        .from('destinations')
        .select('neighborhood, city, country')
        .not('neighborhood', 'is', null)
        .not('neighborhood', 'eq', '');

      const neighborhoodMap = new Map<string, { name: string; city: string | null; country: string | null }>();
      destinations?.forEach(d => {
        if (d.neighborhood) {
          const key = `${d.neighborhood.trim().toLowerCase()}-${(d.city || '').toLowerCase()}-${(d.country || '').toLowerCase()}`;
          if (!neighborhoodMap.has(key)) {
            neighborhoodMap.set(key, {
              name: toTitleCase(d.neighborhood.trim()),
              city: d.city ? toTitleCase(d.city.trim()) : null,
              country: d.country ? toTitleCase(d.country.trim()) : null
            });
          }
        }
      });

      let inserted = 0;
      let existing = 0;

      for (const neighborhood of neighborhoodMap.values()) {
        const slug = toSlug(`${neighborhood.name}-${neighborhood.city || 'unknown'}-${neighborhood.country || 'unknown'}`);

        const { data: existingNeighborhood } = await supabase
          .from('neighborhoods')
          .select('id')
          .eq('slug', slug)
          .single();

        if (existingNeighborhood) {
          existing++;
        } else {
          const { error } = await supabase
            .from('neighborhoods')
            .insert({ name: neighborhood.name, city: neighborhood.city, country: neighborhood.country, slug });

          if (!error) inserted++;
        }
      }

      results.neighborhoods = { found: neighborhoodMap.size, inserted, existing };
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      results
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
