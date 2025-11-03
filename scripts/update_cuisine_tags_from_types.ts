/**
 * Script to extract cuisine tags from existing place_types_json
 * and update destinations without needing to re-enrich
 * 
 * Usage: npx tsx scripts/update_cuisine_tags_from_types.ts
 */

import { createClient } from '@supabase/supabase-js';
import { extractCuisineFromTypes } from '../lib/enrichment';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateCuisineTags() {
  console.log('🚀 Starting cuisine tags update from place_types_json...\n');

  // Fetch all destinations with place_types_json
  const { data: destinations, error: fetchError } = await supabase
    .from('destinations')
    .select('id, slug, name, place_types_json, tags')
    .not('place_types_json', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching destinations:', fetchError);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('⚠️  No destinations with place_types_json found');
    return;
  }

  console.log(`📦 Found ${destinations.length} destinations to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const dest of destinations) {
    try {
      // Parse place_types_json (could be array or string)
      let googleTypes: string[] = [];
      
      if (Array.isArray(dest.place_types_json)) {
        googleTypes = dest.place_types_json;
      } else if (typeof dest.place_types_json === 'string') {
        try {
          googleTypes = JSON.parse(dest.place_types_json);
        } catch {
          skipped++;
          continue;
        }
      } else {
        skipped++;
        continue;
      }

      if (!Array.isArray(googleTypes) || googleTypes.length === 0) {
        skipped++;
        continue;
      }

      // Extract cuisine tags
      const cuisineTags = extractCuisineFromTypes(googleTypes);
      
      if (cuisineTags.length === 0) {
        skipped++;
        continue;
      }

      // Merge with existing tags (avoid duplicates)
      const existingTags = Array.isArray(dest.tags) ? dest.tags : [];
      const mergedTags = [...new Set([...cuisineTags, ...existingTags])];

      // Only update if tags changed
      if (JSON.stringify(mergedTags.sort()) === JSON.stringify(existingTags.sort())) {
        skipped++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('destinations')
        .update({ tags: mergedTags })
        .eq('id', dest.id);

      if (updateError) {
        console.error(`❌ Error updating ${dest.slug}:`, updateError.message);
        errors++;
      } else {
        console.log(`✅ ${dest.slug}: Added ${cuisineTags.join(', ')} (${mergedTags.length} total tags)`);
        updated++;
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${dest.slug}:`, error.message);
      errors++;
    }
  }

  console.log(`\n✨ Update complete!`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
}

updateCuisineTags()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

