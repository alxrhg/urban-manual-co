/**
 * Architecture Data Enrichment: Materials
 * Creates material entities
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Common architectural materials
 */
const MATERIALS = [
  {
    name: 'Concrete',
    slug: 'concrete',
    description: 'Versatile building material known for strength and durability, often used in Brutalist architecture.',
    common_uses: ['Structural elements', 'Facades', 'Floors', 'Walls'],
  },
  {
    name: 'Glass',
    slug: 'glass',
    description: 'Transparent material enabling light-filled spaces and modern aesthetics.',
    common_uses: ['Windows', 'Facades', 'Partitions', 'Skylights'],
  },
  {
    name: 'Steel',
    slug: 'steel',
    description: 'Strong, flexible metal used for structural frames and modern architectural expression.',
    common_uses: ['Structural frames', 'Facades', 'Details', 'Railings'],
  },
  {
    name: 'Wood',
    slug: 'wood',
    description: 'Natural material providing warmth and organic character to architectural spaces.',
    common_uses: ['Floors', 'Ceilings', 'Facades', 'Interior finishes'],
  },
  {
    name: 'Stone',
    slug: 'stone',
    description: 'Natural stone material offering durability and timeless aesthetic.',
    common_uses: ['Facades', 'Floors', 'Walls', 'Details'],
  },
  {
    name: 'Brick',
    slug: 'brick',
    description: 'Traditional building material with rich texture and historical associations.',
    common_uses: ['Walls', 'Facades', 'Interior walls', 'Details'],
  },
  {
    name: 'Marble',
    slug: 'marble',
    description: 'Luxurious natural stone known for its veining and elegant appearance.',
    common_uses: ['Floors', 'Walls', 'Countertops', 'Details'],
  },
  {
    name: 'Copper',
    slug: 'copper',
    description: 'Metal that develops a distinctive patina over time, used for roofs and facades.',
    common_uses: ['Roofs', 'Facades', 'Details', 'Interior elements'],
  },
];

/**
 * Create slug from material name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create materials
 */
async function createMaterials() {
  console.log('📋 Creating materials...\n');

  let created = 0;
  let skipped = 0;

  for (const material of MATERIALS) {
    // Check if material already exists
    const { data: existing } = await supabase
      .from('materials')
      .select('id')
      .eq('slug', material.slug)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping ${material.name} (already exists)`);
      skipped++;
      continue;
    }

    // Create material
    const { error: insertError } = await supabase
      .from('materials')
      .insert({
        name: material.name,
        slug: material.slug,
        description: material.description,
        common_uses: material.common_uses,
      });

    if (insertError) {
      console.error(`❌ Error creating material ${material.name}:`, insertError.message);
      continue;
    }

    console.log(`✅ Created material: ${material.name}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total materials: ${MATERIALS.length}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await createMaterials();
    console.log('\n✅ Materials creation complete!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

