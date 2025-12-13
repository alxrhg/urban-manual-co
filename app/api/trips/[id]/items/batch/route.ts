import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError, createNotFoundError } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Batch update item for reordering
 */
interface BatchReorderItem {
  id: string;
  order_index: number;
  day?: number;
  time?: string | null;
}

/**
 * Batch schedule update item
 */
interface BatchScheduleItem {
  id: string;
  time?: string | null;
  day?: number;
  order_index?: number;
}

/**
 * POST /api/trips/[id]/items/batch
 * Batch update itinerary items (reorder, reschedule, move between days)
 *
 * This endpoint handles batch operations in a single transaction:
 * - Reordering items within a day
 * - Moving items between days
 * - Updating scheduled times
 *
 * Request body:
 * {
 *   operation: 'reorder' | 'schedule' | 'move',
 *   items: BatchReorderItem[] | BatchScheduleItem[]
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const { id: tripId } = await context.params;

  if (!tripId) {
    throw createValidationError('Trip ID is required');
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  const body = await request.json();
  const { operation, items } = body;

  if (!operation || !Array.isArray(items) || items.length === 0) {
    throw createValidationError('Operation and items array are required');
  }

  // Validate operation type
  if (!['reorder', 'schedule', 'move'].includes(operation)) {
    throw createValidationError('Invalid operation. Must be: reorder, schedule, or move');
  }

  // Filter and validate item IDs - skip temp IDs and virtual items
  const validItems = items.filter((item: BatchReorderItem | BatchScheduleItem) => {
    const idStr = String(item.id);
    // Skip temp IDs, empty IDs, or invalid IDs
    if (idStr.startsWith('temp-') || !idStr || idStr === 'undefined' || idStr === 'null') {
      return false;
    }
    // Skip virtual hotel activity items
    if (idStr.startsWith('breakfast-') || idStr.startsWith('checkout-') || idStr.startsWith('checkin-')) {
      return false;
    }
    // Check if it looks like a valid UUID (basic check)
    if (idStr.length < 10) {
      return false;
    }
    return true;
  });

  if (validItems.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  // Verify all items belong to this trip
  const itemIds = validItems.map((item: BatchReorderItem | BatchScheduleItem) => item.id);
  const { data: existingItems, error: verifyError } = await supabase
    .from('itinerary_items')
    .select('id')
    .eq('trip_id', tripId)
    .in('id', itemIds);

  if (verifyError) {
    throw verifyError;
  }

  const existingIds = new Set(existingItems?.map(i => i.id) || []);
  const itemsToUpdate = validItems.filter((item: BatchReorderItem | BatchScheduleItem) =>
    existingIds.has(item.id)
  );

  if (itemsToUpdate.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  // Try to use the RPC function for atomic transaction
  // Falls back to upsert if RPC is not available
  const rpcItems = itemsToUpdate.map((item: BatchReorderItem | BatchScheduleItem) => ({
    id: item.id,
    order_index: item.order_index,
    ...(item.day !== undefined && { day: item.day }),
    ...('time' in item && item.time !== undefined && { time: item.time }),
  }));

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'batch_update_itinerary_items',
    {
      p_trip_id: tripId,
      p_user_id: user.id,
      p_items: rpcItems,
    }
  );

  // If RPC succeeds, use its result
  if (!rpcError && rpcResult) {
    // Revalidate the trip page
    revalidatePath(`/trips/${tripId}`);

    return NextResponse.json({
      success: true,
      updated: rpcResult.updated || itemsToUpdate.length,
      operation,
    });
  }

  // RPC not available or failed - fall back to upsert
  // This handles cases where the migration hasn't been run yet
  if (rpcError?.code !== 'PGRST202') {
    // Log non-"function not found" errors
    console.warn('RPC batch_update_itinerary_items failed, falling back to upsert:', rpcError);
  }

  // Perform batch update using upsert fallback
  let updateError: Error | null = null;

  switch (operation) {
    case 'reorder': {
      // Batch update order_index (and optionally day)
      const updates = itemsToUpdate.map((item: BatchReorderItem) => ({
        id: item.id,
        order_index: item.order_index,
        trip_id: tripId,
        ...(item.day !== undefined && { day: item.day }),
      }));

      const { error } = await supabase
        .from('itinerary_items')
        .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

      updateError = error;
      break;
    }

    case 'schedule': {
      // Batch update time (and optionally day/order_index)
      const updates = itemsToUpdate.map((item: BatchScheduleItem) => {
        const update: Record<string, unknown> = {
          id: item.id,
          trip_id: tripId,
        };
        if (item.time !== undefined) update.time = item.time;
        if (item.day !== undefined) update.day = item.day;
        if (item.order_index !== undefined) update.order_index = item.order_index;
        return update;
      });

      const { error } = await supabase
        .from('itinerary_items')
        .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

      updateError = error;
      break;
    }

    case 'move': {
      // Move items to a different day with new order indices
      const updates = itemsToUpdate.map((item: BatchReorderItem) => ({
        id: item.id,
        day: item.day,
        order_index: item.order_index,
        trip_id: tripId,
        ...(item.time !== undefined && { time: item.time }),
      }));

      const { error } = await supabase
        .from('itinerary_items')
        .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

      updateError = error;
      break;
    }
  }

  if (updateError) {
    console.error(`Error in batch ${operation}:`, updateError);
    throw updateError;
  }

  // Revalidate the trip page
  revalidatePath(`/trips/${tripId}`);

  return NextResponse.json({
    success: true,
    updated: itemsToUpdate.length,
    operation,
  });
});
