import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import {
  withErrorHandling,
  createNotFoundError,
  createUnauthorizedError,
  createValidationError,
  handleSupabaseError,
} from '@/lib/errors';

export const GET = withErrorHandling(async (_req: NextRequest, context) => {
  const collectionId = context?.params?.collection_id as string | undefined;

  if (!collectionId) {
    throw createValidationError('Collection ID is required');
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceClient = createServiceRoleClient();

  const { data: collection, error: collectionError } = await serviceClient
    .from('collections')
    .select('id, user_id, name, description, emoji, is_public, destination_count, created_at, updated_at')
    .eq('id', collectionId)
    .single();

  if (collectionError) {
    throw handleSupabaseError(collectionError);
  }

  if (!collection) {
    throw createNotFoundError('Collection');
  }

  const isOwner = user?.id === collection.user_id;

  if (!collection.is_public && !isOwner) {
    throw createUnauthorizedError('This collection is private. Sign in with the owner account to view it.');
  }

  const { data: listItems, error: itemsError } = await serviceClient
    .from('list_items')
    .select('destination_slug')
    .eq('list_id', collectionId);

  if (itemsError) {
    throw handleSupabaseError(itemsError);
  }

  let destinations: Array<{ slug: string; name: string; city: string | null; category: string | null; image: string | null }> = [];

  if (listItems && listItems.length > 0) {
    const slugs = Array.from(new Set(listItems.map((item) => item.destination_slug)));
    if (slugs.length > 0) {
      const { data: destinationData, error: destinationError } = await serviceClient
        .from('destinations')
        .select('slug, name, city, category, image')
        .in('slug', slugs);

      if (destinationError) {
        throw handleSupabaseError(destinationError);
      }

      destinations = destinationData ?? [];
    }
  }

  return NextResponse.json({
    collection,
    destinations,
    isOwner,
  });
});
