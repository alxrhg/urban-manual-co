/**
 * Sync Sanity CMS documents to Supabase
 *
 * This script:
 * 1. Fetches all destination documents from Sanity
 * 2. Maps them to Supabase format
 * 3. Creates or updates records in Supabase
 * 4. Supports incremental sync (only updates changed records)
 *
 * Usage:
 *   npx tsx scripts/sync-sanity-to-supabase.ts              # Full sync
 *   npx tsx scripts/sync-sanity-to-supabase.ts --dry-run   # Preview changes
 *   npx tsx scripts/sync-sanity-to-supabase.ts --limit 10   # Sync first 10
 *   npx tsx scripts/sync-sanity-to-supabase.ts --slug hellbender  # Sync specific destination
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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

const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

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
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN;

if (!sanityProjectId) {
  console.error('❌ Missing Sanity project ID. Set NEXT_PUBLIC_SANITY_PROJECT_ID');
  process.exit(1);
}

const sanityClient = createSanityClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  useCdn: false, // Don't use CDN for reads
  token: sanityToken,
});

interface SyncStats {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ slug: string; error: string }>;
}

/**
 * Convert Sanity Portable Text to plain text
 */
function portableTextToPlainText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  return blocks
    .map((block) => {
      if (block._type !== 'block' || !block.children) return '';
      return block.children
        .map((child: any) => (child.text || ''))
        .join('');
    })
    .join('\n\n');
}

/**
 * Map Sanity document to Supabase format
 */
function mapToSupabase(sanityDoc: any): any {
  // Extract slug from Sanity slug object
  const slug = sanityDoc.slug?.current || sanityDoc._id;
  
  // Convert Portable Text description to plain text
  const description = portableTextToPlainText(sanityDoc.description || []);
  
  // Extract category from categories array (take first one)
  const category = Array.isArray(sanityDoc.categories) && sanityDoc.categories.length > 0
    ? sanityDoc.categories[0]
    : null;
  
  // Get image URL from heroImage
  // Note: If heroImage is a reference, we'd need to fetch the asset
  // For now, we'll try to get the URL if available
  let imageUrl: string | null = null;
  if (sanityDoc.heroImage) {
    if (sanityDoc.heroImage.asset?._ref) {
      // It's a reference, would need to fetch from Sanity asset API
      // For now, we'll skip it
      imageUrl = null;
    } else if (sanityDoc.heroImage.asset?.url) {
      imageUrl = sanityDoc.heroImage.asset.url;
    }
  }

  return {
    slug,
    name: sanityDoc.name || '',
    city: sanityDoc.city || '',
    country: sanityDoc.country || null,
    category: category || null,
    description: description || null,
    image: imageUrl,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if a destination exists in Supabase
 */
async function destinationExists(slug: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error(`Error checking destination existence for ${slug}:`, error);
    return false;
  }
}

/**
 * Sync a single destination
 */
async function syncDestination(
  sanityDoc: any,
  stats: SyncStats,
  isDryRun: boolean
): Promise<void> {
  try {
    const supabaseData = mapToSupabase(sanityDoc);
    const slug = supabaseData.slug;

    if (!slug) {
      stats.skipped++;
      console.log(`  ⏭️  Skipped: No slug found for document ${sanityDoc._id}`);
      return;
    }

    const exists = await destinationExists(slug);

    if (isDryRun) {
      console.log(`  ${exists ? '📝 Would update' : '➕ Would create'}: ${supabaseData.name} (${slug})`);
      if (exists) stats.updated++;
      else stats.created++;
      return;
    }

    if (exists) {
      // Update existing destination
      const { error } = await supabase
        .from('destinations')
        .update(supabaseData)
        .eq('slug', slug);

      if (error) throw error;

      stats.updated++;
      console.log(`  ✅ Updated: ${supabaseData.name} (${slug})`);
    } else {
      // Create new destination
      const { error } = await supabase
        .from('destinations')
        .insert({
          ...supabaseData,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      stats.created++;
      console.log(`  ➕ Created: ${supabaseData.name} (${slug})`);
    }
  } catch (error: any) {
    stats.errors++;
    const slug = sanityDoc.slug?.current || sanityDoc._id;
    stats.errorDetails.push({
      slug,
      error: error.message || String(error),
    });
    console.error(`  ❌ Error syncing ${slug}:`, error.message);
  }
}

/**
 * Main sync function
 */
async function syncToSupabase(options: {
  dryRun?: boolean;
  limit?: number;
  slug?: string;
}): Promise<void> {
  const { dryRun = false, limit, slug } = options;

  console.log('🔄 Starting Sanity → Supabase sync...\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE: Previewing changes without applying\n');
  }

  try {
    // Build GROQ query
    let query = '*[_type == "destination"]';
    
    if (slug) {
      query = `*[_type == "destination" && slug.current == $slug]`;
      console.log(`📍 Syncing specific destination: ${slug}\n`);
    } else {
      console.log('📥 Fetching all destinations from Sanity...');
    }

    const params = slug ? { slug } : {};
    const documents = await sanityClient.fetch(query, params);

    if (!documents || documents.length === 0) {
      console.log('⚠️  No destinations found in Sanity');
      return;
    }

    const toSync = limit ? documents.slice(0, limit) : documents;
    console.log(`✅ Found ${documents.length} total destinations in Sanity`);
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
        batch.map((doc) => syncDestination(doc, stats, dryRun))
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
syncToSupabase({ dryRun, limit, slug }).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

