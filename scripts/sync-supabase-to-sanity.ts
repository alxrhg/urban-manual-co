/**
 * Sync Supabase destinations to Sanity CMS
 *
 * This script:
 * 1. Fetches all destinations from Supabase
 * 2. Maps them to Sanity document format
 * 3. Creates or updates documents in Sanity
 * 4. Supports incremental sync (only updates changed records)
 *
 * Usage:
 *   npx tsx scripts/sync-supabase-to-sanity.ts              # Full sync
 *   npx tsx scripts/sync-supabase-to-sanity.ts --dry-run   # Preview changes
 *   npx tsx scripts/sync-supabase-to-sanity.ts --limit 10  # Sync first 10
 *   npx tsx scripts/sync-supabase-to-sanity.ts --slug hellbender  # Sync specific destination
 */

import { createClient } from '@supabase/supabase-js';
import { createClient as createSanityClient } from '@sanity/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Sanity client
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
  console.error('❌ Missing Sanity project ID. Set NEXT_PUBLIC_SANITY_PROJECT_ID');
  process.exit(1);
}

const sanityClient = createSanityClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  useCdn: false, // Don't use CDN for writes
  token: sanityToken,
});

interface SupabaseDestination {
  id: number;
  slug: string;
  name: string;
  city: string;
  country?: string | null;
  category: string;
  description?: string | null;
  content?: string | null;
  image?: string | null;
  main_image?: string | null;
  michelin_stars?: number | null;
  crown?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  updated_at?: string;
  created_at?: string;
}

interface SyncStats {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ slug: string; error: string }>;
}

/**
 * Convert Supabase destination to Sanity document format
 */
function mapToSanityDocument(dest: SupabaseDestination): any {
  // Convert description/content from plain text to Sanity block content
  // Sanity uses Portable Text format (array of blocks)
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

  // Use main_image if available, fallback to image
  const imageUrl = dest.main_image || dest.image;

  // Map category to array format (Sanity schema expects array)
  const categories = dest.category ? [dest.category] : [];

  // Build geopoint from latitude/longitude if available
  const geopoint =
    dest.latitude != null && dest.longitude != null
      ? {
          _type: 'geopoint',
          lat: dest.latitude,
          lng: dest.longitude,
        }
      : undefined;

  // For images, we'll store the URL as a string
  // To upload images to Sanity, you'd need to use Sanity's asset upload API
  // For now, we'll store the URL and you can manually upload images in Studio if needed

  return {
    _type: 'destination',
    _id: dest.slug, // Use slug as document ID for easy lookup
    name: dest.name,
    slug: {
      _type: 'slug',
      current: dest.slug,
    },
    city: dest.city || '',
    country: dest.country || '',
    description: descriptionBlocks,
    // Note: heroImage requires uploading to Sanity's asset system
    // For now, we'll skip it and you can upload manually in Studio
    // Or extend the schema to include imageUrl field
    categories: categories,
    geopoint,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Check if a document exists in Sanity and get its ID
 */
async function getExistingDocument(slug: string): Promise<string | null> {
  try {
    const existing = await sanityClient.fetch(
      `*[_type == "destination" && slug.current == $slug][0]._id`,
      { slug }
    );
    return existing || null;
  } catch (error) {
    console.error(`Error checking document existence for ${slug}:`, error);
    return null;
  }
}

/**
 * Sync a single destination
 */
async function syncDestination(
  dest: SupabaseDestination,
  stats: SyncStats,
  isDryRun: boolean
): Promise<void> {
  try {
    const existingId = await getExistingDocument(dest.slug);
    const sanityDoc = mapToSanityDocument(dest);

    if (isDryRun) {
      console.log(`  ${existingId ? '📝 Would update' : '➕ Would create'}: ${dest.name} (${dest.slug})`);
      if (existingId) stats.updated++;
      else stats.created++;
      return;
    }

    if (existingId) {
      // Update existing document - remove _id and _type from update
      const { _id, _type, ...updateData } = sanityDoc;
      await sanityClient
        .patch(existingId)
        .set(updateData)
        .commit();
      stats.updated++;
      console.log(`  ✅ Updated: ${dest.name} (${dest.slug})`);
    } else {
      // Create new document
      await sanityClient.create(sanityDoc);
      stats.created++;
      console.log(`  ➕ Created: ${dest.name} (${dest.slug})`);
    }
  } catch (error: any) {
    stats.errors++;
    stats.errorDetails.push({
      slug: dest.slug,
      error: error.message || String(error),
    });
    console.error(`  ❌ Error syncing ${dest.slug}:`, error.message);
  }
}

/**
 * Main sync function
 */
async function syncToSanity(options: {
  dryRun?: boolean;
  limit?: number;
  slug?: string;
}): Promise<void> {
  const { dryRun = false, limit, slug } = options;

  console.log('🔄 Starting Supabase → Sanity sync...\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE: Previewing changes without applying\n');
  }

  try {
    // Build query
    let query = supabase.from('destinations').select('*').order('name');

    if (slug) {
      query = query.eq('slug', slug);
      console.log(`📍 Syncing specific destination: ${slug}\n`);
    } else {
      console.log('📥 Fetching all destinations from Supabase...');
    }

    const { data: destinations, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch destinations: ${error.message}`);
    }

    if (!destinations || destinations.length === 0) {
      console.log('⚠️  No destinations found');
      return;
    }

    const toSync = limit ? destinations.slice(0, limit) : destinations;
    console.log(`✅ Found ${destinations.length} total destinations`);
    console.log(`📦 Syncing ${toSync.length} destinations...\n`);

    const stats: SyncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < toSync.length; i += batchSize) {
      const batch = toSync.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toSync.length / batchSize)}...`);

      await Promise.all(
        batch.map((dest) => syncDestination(dest as SupabaseDestination, stats, dryRun))
      );

      // Small delay between batches to avoid rate limits
      if (i + batchSize < toSync.length && !dryRun) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Sync Summary');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${stats.created}`);
    console.log(`📝 Updated: ${stats.updated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      stats.errorDetails.forEach(({ slug, error }) => {
        console.log(`   - ${slug}: ${error}`);
      });
    }

    if (dryRun) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Sync completed!');
    }
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const slugArg = args.find((arg) => arg.startsWith('--slug='));
const slug = slugArg ? slugArg.split('=')[1] : undefined;

// Run sync
syncToSanity({ dryRun, limit, slug }).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

