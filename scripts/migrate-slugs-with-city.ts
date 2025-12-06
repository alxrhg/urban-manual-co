/**
 * Migration Script: Add city suffix to all destination slugs
 *
 * This script:
 * 1. Fetches all destinations from the database
 * 2. Generates new slugs in format: {name}-{city}
 * 3. Creates a mapping of old -> new slugs for redirects
 * 4. Updates the database with new slugs
 * 5. Outputs redirect rules for next.config.ts
 *
 * Usage:
 *   npx tsx scripts/migrate-slugs-with-city.ts --dry-run    # Preview changes
 *   npx tsx scripts/migrate-slugs-with-city.ts --apply      # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import { generateDestinationSlug, slugify } from '../lib/slugify';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
}

interface SlugMapping {
  id: number;
  oldSlug: string;
  newSlug: string;
  name: string;
  city: string;
}

async function fetchAllDestinations(): Promise<Destination[]> {
  console.log('📥 Fetching all destinations...');

  const { data, error } = await supabase
    .from('destinations')
    .select('id, slug, name, city')
    .order('id');

  if (error) {
    console.error('❌ Error fetching destinations:', error.message);
    process.exit(1);
  }

  console.log(`✅ Found ${data?.length || 0} destinations`);
  return (data || []) as Destination[];
}

function generateSlugMappings(destinations: Destination[]): SlugMapping[] {
  const mappings: SlugMapping[] = [];
  const newSlugsSet = new Set<string>();
  const conflicts: string[] = [];

  for (const dest of destinations) {
    const newSlug = generateDestinationSlug(dest.name, dest.city);

    // Check if slug already has city suffix
    const citySlug = slugify(dest.city);
    if (dest.slug.endsWith(`-${citySlug}`)) {
      // Already has city suffix, skip
      continue;
    }

    // Check for conflicts (duplicate new slugs)
    if (newSlugsSet.has(newSlug)) {
      conflicts.push(`${dest.name} (${dest.city}) -> ${newSlug}`);
      // Add ID suffix to resolve conflict
      const uniqueSlug = `${newSlug}-${dest.id}`;
      mappings.push({
        id: dest.id,
        oldSlug: dest.slug,
        newSlug: uniqueSlug,
        name: dest.name,
        city: dest.city,
      });
      newSlugsSet.add(uniqueSlug);
    } else {
      mappings.push({
        id: dest.id,
        oldSlug: dest.slug,
        newSlug,
        name: dest.name,
        city: dest.city,
      });
      newSlugsSet.add(newSlug);
    }
  }

  if (conflicts.length > 0) {
    console.log(`\n⚠️  Found ${conflicts.length} slug conflicts (resolved with ID suffix):`);
    conflicts.forEach(c => console.log(`   - ${c}`));
  }

  return mappings;
}

async function applyMigration(mappings: SlugMapping[]): Promise<void> {
  console.log(`\n🔄 Applying migration to ${mappings.length} destinations...`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    const { error } = await supabase
      .from('destinations')
      .update({ slug: mapping.newSlug })
      .eq('id', mapping.id);

    if (error) {
      errorCount++;
      errors.push(`${mapping.oldSlug} -> ${mapping.newSlug}: ${error.message}`);
    } else {
      successCount++;
    }

    // Progress indicator
    if ((successCount + errorCount) % 50 === 0) {
      console.log(`   Progress: ${successCount + errorCount}/${mappings.length}`);
    }
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(e => console.log(`   - ${e}`));
  }
}

function generateRedirectsConfig(mappings: SlugMapping[]): string {
  const redirects = mappings.map(m => ({
    source: `/destination/${m.oldSlug}`,
    destination: `/destination/${m.newSlug}`,
    permanent: true,
  }));

  return `
// Auto-generated slug redirects (${new Date().toISOString()})
// Add these to your next.config.ts redirects() function
const slugRedirects = ${JSON.stringify(redirects, null, 2)};

// Example usage in next.config.ts:
// async redirects() {
//   return [
//     ...slugRedirects,
//     // ... other redirects
//   ];
// }
`;
}

function saveRedirectsToFile(mappings: SlugMapping[]): void {
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save as JSON for programmatic use
  const jsonPath = path.join(outputDir, 'slug-redirects.json');
  const jsonContent = mappings.map(m => ({
    source: `/destination/${m.oldSlug}`,
    destination: `/destination/${m.newSlug}`,
    permanent: true,
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2));
  console.log(`📄 Saved redirect mappings to: ${jsonPath}`);

  // Save as TypeScript config snippet
  const tsPath = path.join(outputDir, 'slug-redirects.ts');
  fs.writeFileSync(tsPath, generateRedirectsConfig(mappings));
  console.log(`📄 Saved redirect config to: ${tsPath}`);

  // Save as CSV for reference
  const csvPath = path.join(outputDir, 'slug-mappings.csv');
  const csvContent = [
    'id,old_slug,new_slug,name,city',
    ...mappings.map(m => `${m.id},"${m.oldSlug}","${m.newSlug}","${m.name.replace(/"/g, '""')}","${m.city}"`)
  ].join('\n');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`📄 Saved CSV mapping to: ${csvPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const shouldApply = args.includes('--apply');

  if (!isDryRun && !shouldApply) {
    console.log('Usage:');
    console.log('  npx tsx scripts/migrate-slugs-with-city.ts --dry-run    # Preview changes');
    console.log('  npx tsx scripts/migrate-slugs-with-city.ts --apply      # Apply changes');
    process.exit(0);
  }

  console.log('🚀 Slug Migration: Add City Suffix');
  console.log('===================================\n');

  // Fetch destinations
  const destinations = await fetchAllDestinations();

  // Generate mappings
  const mappings = generateSlugMappings(destinations);

  console.log(`\n📊 Summary:`);
  console.log(`   - Total destinations: ${destinations.length}`);
  console.log(`   - Need migration: ${mappings.length}`);
  console.log(`   - Already correct: ${destinations.length - mappings.length}`);

  if (mappings.length === 0) {
    console.log('\n✅ No migrations needed. All slugs already have city suffix.');
    process.exit(0);
  }

  // Show sample changes
  console.log(`\n📋 Sample changes (first 10):`);
  mappings.slice(0, 10).forEach(m => {
    console.log(`   ${m.oldSlug} -> ${m.newSlug}`);
  });
  if (mappings.length > 10) {
    console.log(`   ... and ${mappings.length - 10} more`);
  }

  // Save redirect mappings
  saveRedirectsToFile(mappings);

  if (isDryRun) {
    console.log('\n🔍 DRY RUN - No changes applied.');
    console.log('   Run with --apply to apply changes.');
  } else if (shouldApply) {
    console.log('\n⚠️  This will update the database. Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await applyMigration(mappings);

    console.log('\n📝 Next steps:');
    console.log('   1. Add the generated redirects to next.config.ts');
    console.log('   2. Deploy the changes');
    console.log('   3. Clear any CDN/cache');
    console.log('   4. Submit new sitemap to Google Search Console');
  }
}

main().catch(console.error);
