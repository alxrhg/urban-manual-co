/**
 * Sync Urban Manual destinations to Asimov
 * 
 * This script sends destination data to Asimov so it can be indexed
 * and used for semantic search fallback.
 * 
 * Run: npx tsx scripts/sync-destinations-to-asimov.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const ASIMOV_API_KEY = process.env.ASIMOV_API_KEY;
const ASIMOV_API_URL = 'https://asimov.mov/api';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!ASIMOV_API_KEY) {
  console.error('❌ ASIMOV_API_KEY not set in environment variables');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Add content to Asimov
 */
async function addContentToAsimov(content: {
  title: string;
  content: string;
  metadata?: Record<string, any>;
  url?: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${ASIMOV_API_URL}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ASIMOV_API_KEY}`,
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   ❌ Failed: ${response.status} - ${error}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

/**
 * Build searchable content from destination
 */
function buildDestinationContent(dest: any): {
  title: string;
  content: string;
  metadata: Record<string, any>;
  url: string;
} {
  // Combine all searchable text
  const contentParts = [
    dest.name,
    dest.description,
    dest.content,
    dest.city,
    dest.category,
    dest.country,
    dest.neighborhood,
    dest.architect,
    dest.brand,
    ...(dest.tags || []),
    ...(dest.ai_keywords || []),
    ...(dest.ai_vibe_tags || []),
    dest.ai_short_summary,
    dest.editorial_summary,
  ].filter(Boolean);

  const fullContent = contentParts.join(' ');

  return {
    title: dest.name,
    content: fullContent,
    metadata: {
      id: dest.id,
      slug: dest.slug,
      city: dest.city,
      category: dest.category,
      country: dest.country,
      rating: dest.rating,
      michelin_stars: dest.michelin_stars,
      price_level: dest.price_level,
      neighborhood: dest.neighborhood,
      tags: dest.tags || [],
    },
    url: `https://urbanmanual.co/destination/${dest.slug}`,
  };
}

async function main() {
  console.log('🚀 Starting Asimov sync...\n');

  // Fetch all destinations
  console.log('📥 Fetching destinations from Supabase...');
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('*')
    .limit(1000); // Adjust limit as needed

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('⚠️  No destinations found');
    process.exit(0);
  }

  console.log(`✅ Found ${destinations.length} destinations\n`);

  // Sync to Asimov
  console.log('📤 Syncing to Asimov...\n');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    const content = buildDestinationContent(dest);

    process.stdout.write(`[${i + 1}/${destinations.length}] ${dest.name}... `);

    const success = await addContentToAsimov(content);

    if (success) {
      successCount++;
      console.log('✅');
    } else {
      failCount++;
      console.log('❌');
    }

    // Rate limiting - be nice to Asimov API
    if (i < destinations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Sync Summary');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Success Rate: ${Math.round((successCount / destinations.length) * 100)}%`);
  console.log('\n💡 Your destinations are now indexed in Asimov!');
  console.log('   Asimov will use this data for semantic search fallback.');
}

main().catch(console.error);

