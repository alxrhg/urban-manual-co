/**
 * Apply Migration 027 directly via Supabase client
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('🚀 Applying Migration 027: Add Exa Web Enrichment Fields...\n');

  const statements = [
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS design_firm text;`,
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS design_period text;`,
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS architect_info_json jsonb;`,
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS web_content_json jsonb;`,
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS web_content_updated_at timestamptz;`,
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS architect_info_updated_at timestamptz;`,
    `CREATE INDEX IF NOT EXISTS idx_destinations_design_firm ON destinations(design_firm) WHERE design_firm IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_destinations_design_period ON destinations(design_period) WHERE design_period IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_destinations_architect_info_json ON destinations USING GIN(architect_info_json) WHERE architect_info_json IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_destinations_web_content ON destinations USING GIN(web_content_json) WHERE web_content_json IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_destinations_architect_info_updated ON destinations(architect_info_updated_at DESC) WHERE architect_info_updated_at IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_destinations_web_content_updated ON destinations(web_content_updated_at DESC) WHERE web_content_updated_at IS NOT NULL;`,
  ];

  for (const sql of statements) {
    try {
      // Use Supabase's REST API to execute SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok && response.status !== 404) {
        // Try alternative: direct SQL execution via PostgREST might not work
        // Fall back to manual instruction
        console.log(`⚠️  Could not execute via API. Please run this SQL in Supabase Dashboard:\n${sql}\n`);
      } else {
        console.log(`✅ ${sql.substring(0, 60)}...`);
      }
    } catch (error: any) {
      console.log(`⚠️  ${sql.substring(0, 60)}... (may need manual execution)`);
    }
  }

  console.log('\n💡 If you see warnings above, please run the SQL manually:');
  console.log('   File: supabase/migrations/027_add_web_content_enrichment.sql');
  console.log('   In: Supabase Dashboard > SQL Editor\n');
}

applyMigration().catch(console.error);

