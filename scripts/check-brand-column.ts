#!/usr/bin/env tsx
/**
 * Check if brand column exists in destinations table
 * and create it if missing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateBrandColumn() {
  console.log('🔍 Checking if brand column exists...\n');

  try {
    // Try to query the brand column
    const { data, error } = await supabase
      .from('destinations')
      .select('brand')
      .limit(1);

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('brand')) {
        console.log('❌ Brand column does NOT exist in destinations table');
        console.log('\n📝 Creating brand column...\n');
        
        // Create the column using RPC or direct SQL
        // Note: This requires service role key
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE public.destinations
            ADD COLUMN IF NOT EXISTS brand TEXT;
            
            CREATE INDEX IF NOT EXISTS idx_destinations_brand 
            ON public.destinations(brand);
            
            COMMENT ON COLUMN public.destinations.brand IS 'Brand or hotel group name';
          `
        });

        if (alterError) {
          console.error('❌ Error creating column via RPC:', alterError);
          console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
          console.log(`
ALTER TABLE public.destinations
ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_destinations_brand 
ON public.destinations(brand);

COMMENT ON COLUMN public.destinations.brand IS 'Brand or hotel group name';
          `);
          process.exit(1);
        } else {
          console.log('✅ Brand column created successfully!');
        }
      } else {
        console.error('❌ Error checking column:', error);
        process.exit(1);
      }
    } else {
      console.log('✅ Brand column exists in destinations table');
      console.log(`   Sample value: ${data?.[0]?.brand || 'null'}`);
    }

    // Verify by trying to update a test record
    console.log('\n🧪 Testing update operation...');
    const { error: testError } = await supabase
      .from('destinations')
      .update({ brand: null })
      .eq('slug', 'test-non-existent-slug')
      .select('brand');

    if (testError && testError.message?.includes('column') && testError.message?.includes('brand')) {
      console.error('❌ Update test failed - brand column still not accessible');
      process.exit(1);
    } else {
      console.log('✅ Update operation works correctly');
    }

    console.log('\n✅ All checks passed! Brand column is configured correctly.');
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkAndCreateBrandColumn();

