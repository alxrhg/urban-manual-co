import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminContext, createValidationError } from '@/lib/errors';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSanityClient } from '@sanity/client';
import {
  adminRatelimit,
  memoryAdminRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';

export const POST = withAdminAuth(async (request: NextRequest, { user, serviceClient }: AdminContext) => {
  // Apply rate limiting
  const identifier = getIdentifier(request, user.id);
  const ratelimit = isUpstashConfigured() ? adminRatelimit : memoryAdminRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Admin rate limit exceeded. Please wait before retrying.',
      limit,
      remaining,
      reset
    );
  }

  const body = await request.json();
  const { limit: syncLimit, slug, dryRun } = body;

  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get Sanity credentials
  const sanityProjectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    process.env.SANITY_STUDIO_PROJECT_ID ||
    process.env.SANITY_API_PROJECT_ID;

  const sanityDataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    process.env.SANITY_STUDIO_DATASET ||
    process.env.SANITY_API_DATASET ||
    'production';

  const sanityApiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION ||
    process.env.SANITY_API_VERSION ||
    '2023-10-01';

  const sanityToken =
    process.env.SANITY_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN ||
    process.env.SANITY_API_READ_TOKEN;

  if (!sanityProjectId) {
    throw new Error('Missing Sanity project ID. Set NEXT_PUBLIC_SANITY_PROJECT_ID');
  }

  const sanityClient = createSanityClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: sanityApiVersion,
    useCdn: false,
    token: sanityToken,
  });

  // Fetch destinations from Supabase
  let query = supabase.from('destinations').select('*').order('name');

  if (slug) {
    query = query.eq('slug', slug);
  }

  const { data: destinations, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Failed to fetch destinations: ${fetchError.message}`);
  }

  if (!destinations || destinations.length === 0) {
    return NextResponse.json({
      success: true,
      stats: { created: 0, updated: 0, skipped: 0, errors: 0 },
      message: 'No destinations found',
    });
  }

  const toSync = syncLimit ? destinations.slice(0, syncLimit) : destinations;

  // Map Supabase destination to Sanity format
  const mapToSanityDocument = (dest: any) => {
    const descriptionBlocks = dest.description
      ? [
          {
            _type: 'block',
            _key: 'desc-1',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'desc-span-1',
                text: dest.description,
                marks: [],
              },
            ],
            markDefs: [],
          },
        ]
      : [];

    const categories = dest.category ? [dest.category] : [];

    return {
      _type: 'destination',
      _id: dest.slug,
      name: dest.name,
      slug: {
        _type: 'slug',
        current: dest.slug,
      },
      city: dest.city || '',
      country: dest.country || '',
      description: descriptionBlocks,
      categories: categories,
      lastSyncedAt: new Date().toISOString(),
    };
  };

  // Check if document exists
  const getExistingDocument = async (slug: string) => {
    try {
      const existing = await sanityClient.fetch(
        `*[_type == "destination" && slug.current == $slug][0]._id`,
        { slug }
      );
      return existing || null;
    } catch {
      return null;
    }
  };

  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [] as Array<{ slug: string; error: string }>,
  };

  // Process destinations
  for (const dest of toSync) {
    try {
      const sanityDoc = mapToSanityDocument(dest);
      const existingId = await getExistingDocument(dest.slug);

      if (dryRun) {
        if (existingId) stats.updated++;
        else stats.created++;
        continue;
      }

      if (existingId) {
        const { _id, _type, ...updateData } = sanityDoc;
        await sanityClient.patch(existingId).set(updateData).commit();
        stats.updated++;
      } else {
        await sanityClient.create(sanityDoc);
        stats.created++;
      }
    } catch (error: any) {
      stats.errors++;
      stats.errorDetails.push({
        slug: dest.slug,
        error: error.message || String(error),
      });
    }
  }

  return NextResponse.json({
    success: true,
    stats,
    message: dryRun
      ? `Would ${stats.created > 0 ? 'create' : 'update'} ${stats.created + stats.updated} document(s)`
      : `Synced ${stats.created + stats.updated} document(s)`,
  });
});

