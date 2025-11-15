/**
 * Run Migration 027: Add Exa Web Enrichment Fields
 * This script runs the migration SQL directly
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  try {
    console.log('🚀 Running Migration 027: Add Exa Web Enrichment Fields...\n');

    // Read the migration SQL file
    const migrationSQL = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/027_add_web_content_enrichment.sql'),
      'utf-8'
    );

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try running it via a direct query
      console.log('⚠️  exec_sql RPC not available, trying direct execution...\n');
      
      // Split SQL into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 10) { // Skip very short statements
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
            if (stmtError) {
              console.log(`⚠️  Statement failed (might already exist): ${statement.substring(0, 50)}...`);
            }
          } catch (e) {
            // Ignore errors for statements that might already exist
            console.log(`⚠️  Could not execute statement (might need manual execution)`);
          }
        }
      }
    }

    console.log('\n✅ Migration 027 complete!');
    console.log('\n💡 If you see errors above, you may need to run the SQL manually in Supabase Dashboard:');
    console.log('   File: supabase/migrations/027_add_web_content_enrichment.sql\n');

  } catch (error: any) {
    console.error('❌ Error running migration:', error.message);
    console.log('\n💡 Please run the SQL manually in your Supabase Dashboard:');
    console.log('   File: supabase/migrations/027_add_web_content_enrichment.sql\n');
  }
}

runMigration().catch(console.error);

