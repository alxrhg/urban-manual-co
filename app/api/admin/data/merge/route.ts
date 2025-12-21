import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods' | 'architects';

const VALID_TYPES: DataType[] = ['brands', 'cities', 'countries', 'neighborhoods', 'architects'];

// Mapping from entity type to the field name in destinations table (for text-based types)
const FIELD_MAPPING: Record<Exclude<DataType, 'architects'>, string> = {
  brands: 'brand',
  cities: 'city',
  countries: 'country',
  neighborhoods: 'neighborhood',
};

// Architect-related UUID fields in destinations table (both reference architects table)
// Note: design_firm_id references design_firms table, not architects
const ARCHITECT_FIELDS = ['architect_id', 'interior_designer_id'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, targetId, deleteSource } = body;
    const type = body.type as string;

    if (!type || !VALID_TYPES.includes(type as DataType)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const validatedType = type as DataType;

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Source and target IDs are required' }, { status: 400 });
    }

    if (sourceId === targetId) {
      return NextResponse.json({ error: 'Source and target cannot be the same' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get source and target items
    const { data: sourceItem, error: sourceError } = await supabase
      .from(validatedType)
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !sourceItem) {
      return NextResponse.json({ error: 'Source item not found' }, { status: 404 });
    }

    const { data: targetItem, error: targetError } = await supabase
      .from(validatedType)
      .select('*')
      .eq('id', targetId)
      .single();

    if (targetError || !targetItem) {
      return NextResponse.json({ error: 'Target item not found' }, { status: 404 });
    }

    let affectedCount = 0;
    const sourceName = sourceItem.name;
    const targetName = targetItem.name;

    if (validatedType === 'architects') {
      // For architects: update all three architect-related UUID fields
      for (const field of ARCHITECT_FIELDS) {
        const { data: updated, error: updateError } = await supabase
          .from('destinations')
          .update({ [field]: targetId })
          .eq(field, sourceId)
          .select('id');

        if (updateError) {
          throw new Error(`Failed to update destinations.${field}: ${updateError.message}`);
        }
        affectedCount += updated?.length || 0;
      }
    } else {
      // For text-based types (brands, cities, etc.)
      const field = FIELD_MAPPING[validatedType];
      const { data: updatedDestinations, error: updateError } = await supabase
        .from('destinations')
        .update({ [field]: targetName })
        .eq(field, sourceName)
        .select('id');

      if (updateError) {
        throw new Error(`Failed to update destinations: ${updateError.message}`);
      }
      affectedCount = updatedDestinations?.length || 0;
    }

    // Optionally delete the source item
    let sourceDeleted = false;
    let deleteError: string | null = null;
    if (deleteSource) {
      // Use service role client to bypass RLS for admin delete operations
      const serviceClient = createServiceRoleClient();
      const { error } = await serviceClient
        .from(validatedType)
        .delete()
        .eq('id', sourceId);

      if (error) {
        deleteError = error.message;
        console.warn(`Failed to delete source item: ${error.message}`);
      } else {
        sourceDeleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      affectedCount,
      sourceDeleted,
      deleteError,
      source: sourceName,
      target: targetName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Merge failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint to preview merge (count affected destinations)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const sourceId = searchParams.get('sourceId');

  if (!type || !VALID_TYPES.includes(type as DataType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const validatedType = type as DataType;

  if (!sourceId) {
    return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get source item
    const { data: sourceItem, error: sourceError } = await supabase
      .from(validatedType)
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !sourceItem) {
      return NextResponse.json({ error: 'Source item not found' }, { status: 404 });
    }

    let totalCount = 0;

    if (validatedType === 'architects') {
      // For architects: count references across all three UUID fields
      for (const field of ARCHITECT_FIELDS) {
        const { count, error: countError } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true })
          .eq(field, sourceId);

        if (countError) {
          throw new Error(`Failed to count destinations.${field}: ${countError.message}`);
        }
        totalCount += count || 0;
      }
    } else {
      // For text-based types
      const field = FIELD_MAPPING[validatedType];
      const sourceName = sourceItem.name;

      const { count, error: countError } = await supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true })
        .eq(field, sourceName);

      if (countError) {
        throw new Error(`Failed to count destinations: ${countError.message}`);
      }
      totalCount = count || 0;
    }

    return NextResponse.json({
      source: sourceItem,
      affectedCount: totalCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
