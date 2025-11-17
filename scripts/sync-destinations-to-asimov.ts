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
import { syncDestinationToAsimov } from '../lib/search/asimov-sync';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!process.env.ASIMOV_API_KEY) {
  console.error('❌ ASIMOV_API_KEY not set in environment variables');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

    process.stdout.write(`[${i + 1}/${destinations.length}] ${dest.name}... `);

    const success = await syncDestinationToAsimov(dest);

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

