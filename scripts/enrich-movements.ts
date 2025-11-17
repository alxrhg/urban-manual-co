/**
 * Architecture Data Enrichment: Design Movements
 * Creates design movement entities
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
 * Design movements to create
 */
const DESIGN_MOVEMENTS = [
  {
    name: 'Brutalism',
    slug: 'brutalism',
    description: 'Architectural style characterized by raw concrete, bold geometric forms, and emphasis on material honesty.',
    period_start: 1950,
    period_end: 1980,
    key_characteristics: ['Raw concrete', 'Bold forms', 'Geometric shapes', 'Material honesty'],
  },
  {
    name: 'Modernism',
    slug: 'modernism',
    description: 'Architectural movement emphasizing function, simplicity, and rejection of ornamentation.',
    period_start: 1920,
    period_end: 1970,
    key_characteristics: ['Form follows function', 'Simplicity', 'Clean lines', 'Rejection of ornament'],
  },
  {
    name: 'Postmodernism',
    slug: 'postmodernism',
    description: 'Architectural movement reacting against modernism, incorporating historical references and ornamentation.',
    period_start: 1960,
    period_end: 1990,
    key_characteristics: ['Historical references', 'Ornamentation', 'Playful forms', 'Eclecticism'],
  },
  {
    name: 'Contemporary',
    slug: 'contemporary',
    description: 'Current architectural trends emphasizing innovation, sustainability, and technology.',
    period_start: 2000,
    period_end: null, // Ongoing
    key_characteristics: ['Innovation', 'Sustainability', 'Technology', 'Global influences'],
  },
  {
    name: 'Minimalism',
    slug: 'minimalism',
    description: 'Architectural style emphasizing simplicity, essential elements, and reduction to essentials.',
    period_start: 1960,
    period_end: null,
    key_characteristics: ['Simplicity', 'Essential elements', 'Clean spaces', 'Reduction'],
  },
  {
    name: 'Art Deco',
    slug: 'art-deco',
    description: 'Decorative architectural style of the 1920s and 1930s, characterized by geometric patterns and luxury.',
    period_start: 1920,
    period_end: 1940,
    key_characteristics: ['Geometric patterns', 'Luxury materials', 'Streamlined forms', 'Decorative elements'],
  },
  {
    name: 'Deconstructivism',
    slug: 'deconstructivism',
    description: 'Architectural movement characterized by fragmentation, non-rectilinear shapes, and manipulation of surface.',
    period_start: 1980,
    period_end: 2000,
    key_characteristics: ['Fragmentation', 'Non-rectilinear', 'Complex geometry', 'Surface manipulation'],
  },
];

/**
 * Create slug from movement name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create design movements
 */
async function createMovements() {
  console.log('📋 Creating design movements...\n');

  let created = 0;
  let skipped = 0;

  for (const movement of DESIGN_MOVEMENTS) {
    // Check if movement already exists
    const { data: existing } = await supabase
      .from('design_movements')
      .select('id')
      .eq('slug', movement.slug)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping ${movement.name} (already exists)`);
      skipped++;
      continue;
    }

    // Create movement
    const { error: insertError } = await supabase
      .from('design_movements')
      .insert({
        name: movement.name,
        slug: movement.slug,
        description: movement.description,
        period_start: movement.period_start,
        period_end: movement.period_end,
        key_characteristics: movement.key_characteristics,
      });

    if (insertError) {
      console.error(`❌ Error creating movement ${movement.name}:`, insertError.message);
      continue;
    }

    console.log(`✅ Created movement: ${movement.name}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total movements: ${DESIGN_MOVEMENTS.length}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await createMovements();
    console.log('\n✅ Design movements creation complete!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

