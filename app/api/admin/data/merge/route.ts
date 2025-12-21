import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods';

const VALID_TYPES: DataType[] = ['brands', 'cities', 'countries', 'neighborhoods'];

// Mapping from entity type to the field name in destinations table
const FIELD_MAPPING: Record<DataType, string> = {
  brands: 'brand',
  cities: 'city',
  countries: 'country',
  neighborhoods: 'neighborhood',
};

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

    const field = FIELD_MAPPING[validatedType];
    const sourceName = sourceItem.name;
    const targetName = targetItem.name;

    // Update all destinations that reference the source to reference the target
    const { data: updatedDestinations, error: updateError } = await supabase
      .from('destinations')
      .update({ [field]: targetName })
      .eq(field, sourceName)
      .select('id');

    if (updateError) {
      throw new Error(`Failed to update destinations: ${updateError.message}`);
    }

    const affectedCount = updatedDestinations?.length || 0;

    // Optionally delete the source item
    if (deleteSource) {
      const { error: deleteError } = await supabase
        .from(validatedType)
        .delete()
        .eq('id', sourceId);

      if (deleteError) {
        // Don't fail the whole operation, just warn
        console.warn(`Failed to delete source item: ${deleteError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      affectedCount,
      sourceDeleted: deleteSource,
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

    const field = FIELD_MAPPING[validatedType];
    const sourceName = sourceItem.name;

    // Count affected destinations
    const { count, error: countError } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .eq(field, sourceName);

    if (countError) {
      throw new Error(`Failed to count destinations: ${countError.message}`);
    }

    return NextResponse.json({
      source: sourceItem,
      affectedCount: count || 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
