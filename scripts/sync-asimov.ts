/**
 * Script to sync all Urban Manual destinations to Asimov
 * 
 * Run: npm run sync:asimov
 * 
 * This will:
 * 1. Fetch all destinations from Supabase
 * 2. Sync them to Asimov search index
 * 3. Show progress and results
 */

import { syncAllDestinationsToAsimov } from '@/lib/search/asimov-sync';

async function main() {
  console.log('🚀 Starting Asimov Sync...\n');

  if (!process.env.ASIMOV_API_KEY) {
    console.error('❌ ASIMOV_API_KEY not set in environment variables');
    console.log('   Add it to your .env.local file or Vercel environment variables');
    process.exit(1);
  }

  const results = await syncAllDestinationsToAsimov();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Sync Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully synced: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.success + results.failed}`);
  console.log('\n💡 Your destinations are now searchable via Asimov!');
}

main().catch(console.error);

