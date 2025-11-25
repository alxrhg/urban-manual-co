/**
 * Category Cleanup Script
 *
 * Standardizes all destination categories in Supabase
 *
 * Usage:
 *   npx tsx scripts/cleanup-categories.ts          # Dry run - shows changes
 *   npx tsx scripts/cleanup-categories.ts --apply  # Actually apply changes
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { normalizeCategory, VALID_CATEGORIES, type ValidCategory } from '../lib/categories';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CategoryChange {
  id: number;
  name: string;
  city: string;
  oldCategory: string | null;
  newCategory: ValidCategory;
}

async function analyzeCategories(): Promise<{
  changes: CategoryChange[];
  categoryCounts: Map<string, number>;
  invalidCategories: Map<string, number>;
}> {
  console.log('📊 Fetching all destinations...\n');

  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, name, city, category')
    .order('category', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch destinations: ${error.message}`);
  }

  if (!destinations || destinations.length === 0) {
    throw new Error('No destinations found');
  }

  console.log(`Found ${destinations.length} destinations\n`);

  const changes: CategoryChange[] = [];
  const categoryCounts = new Map<string, number>();
  const invalidCategories = new Map<string, number>();

  for (const dest of destinations) {
    const oldCategory = dest.category?.trim() || null;
    const newCategory = normalizeCategory(oldCategory);

    // Count current categories
    const catKey = oldCategory || '(null)';
    categoryCounts.set(catKey, (categoryCounts.get(catKey) || 0) + 1);

    // Check if it's invalid
    if (oldCategory && !VALID_CATEGORIES.includes(oldCategory as ValidCategory)) {
      invalidCategories.set(oldCategory, (invalidCategories.get(oldCategory) || 0) + 1);
    }

    // Track changes needed
    if (oldCategory !== newCategory) {
      changes.push({
        id: dest.id,
        name: dest.name,
        city: dest.city,
        oldCategory,
        newCategory,
      });
    }
  }

  return { changes, categoryCounts, invalidCategories };
}

async function applyChanges(changes: CategoryChange[]): Promise<void> {
  console.log(`\n🔄 Applying ${changes.length} changes...\n`);

  let updated = 0;
  let errors = 0;

  for (const change of changes) {
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ category: change.newCategory })
        .eq('id', change.id);

      if (error) {
        console.error(`  ❌ Failed to update ${change.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`  ✅ ${change.name}: "${change.oldCategory}" → "${change.newCategory}"`);
        updated++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err: any) {
      console.error(`  ❌ Error updating ${change.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Results: ${updated} updated, ${errors} errors`);
}

async function main() {
  const applyFlag = process.argv.includes('--apply');

  console.log('🧹 Category Cleanup Script\n');
  console.log(`Mode: ${applyFlag ? '🔴 APPLY CHANGES' : '🟡 DRY RUN (use --apply to execute)'}\n`);
  console.log('Valid categories:', VALID_CATEGORIES.join(', '), '\n');

  try {
    const { changes, categoryCounts, invalidCategories } = await analyzeCategories();

    // Show current category distribution
    console.log('📈 Current Category Distribution:');
    const sortedCounts = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sortedCounts) {
      const isValid = VALID_CATEGORIES.includes(cat as ValidCategory) || cat === '(null)';
      const marker = isValid ? '✓' : '✗';
      console.log(`  ${marker} ${cat}: ${count}`);
    }

    // Show invalid categories
    if (invalidCategories.size > 0) {
      console.log('\n⚠️  Invalid Categories Found:');
      for (const [cat, count] of invalidCategories.entries()) {
        const normalized = normalizeCategory(cat);
        console.log(`  "${cat}" (${count}) → will become "${normalized}"`);
      }
    }

    // Show changes summary
    console.log(`\n📝 Changes Required: ${changes.length}`);

    if (changes.length > 0) {
      // Group changes by transformation
      const transformations = new Map<string, number>();
      for (const change of changes) {
        const key = `"${change.oldCategory || 'null'}" → "${change.newCategory}"`;
        transformations.set(key, (transformations.get(key) || 0) + 1);
      }

      console.log('\nTransformations:');
      for (const [transform, count] of transformations.entries()) {
        console.log(`  ${transform}: ${count} destinations`);
      }

      if (applyFlag) {
        await applyChanges(changes);
      } else {
        console.log('\n💡 Run with --apply to execute these changes');

        // Show first 10 changes as preview
        if (changes.length > 0) {
          console.log('\nPreview (first 10 changes):');
          for (const change of changes.slice(0, 10)) {
            console.log(`  • ${change.name} (${change.city}): "${change.oldCategory}" → "${change.newCategory}"`);
          }
          if (changes.length > 10) {
            console.log(`  ... and ${changes.length - 10} more`);
          }
        }
      }
    } else {
      console.log('\n✨ All categories are already standardized!');
    }
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
