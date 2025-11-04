// Load environment variables FIRST before importing anything else
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateDestinationEmbedding } from '../lib/embeddings/generate';
import { initOpenAI } from '../lib/openai';

// Reinitialize OpenAI after dotenv loads
initOpenAI();

// Verify OpenAI API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not found in environment variables');
  console.error('Please ensure .env.local contains: OPENAI_API_KEY=sk-...');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Please ensure these are set in .env.local');
  process.exit(1);
}

console.log('Environment check:');
console.log(`- OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`- Supabase URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}`);
console.log(`- Supabase Key: ${supabaseKey ? '✓ Set' : '✗ Missing'}`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillEmbeddings(batchSize = 50) {
  let offset = 0;
  let processed = 0;
  let errors = 0;

  console.log('Starting embedding backfill...');
  console.log(`Using batch size: ${batchSize}`);

  while (true) {
    const { data: destinations, error: fetchError } = await supabase
      .from('destinations')
      .select('*')
      .is('embedding', null)
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('Error fetching destinations:', fetchError);
      break;
    }

    if (!destinations || destinations.length === 0) {
      console.log('No more destinations to process');
      break;
    }

    console.log(`\nProcessing batch ${Math.floor(offset / batchSize) + 1} (${destinations.length} destinations)...`);

    for (const dest of destinations) {
      try {
        const embedding = await generateDestinationEmbedding({
          name: dest.name || '',
          city: dest.city || '',
          category: dest.category || '',
          content: dest.content,
          description: dest.description,
          tags: dest.tags || []
        });

        if (!embedding) {
          console.error(`\n✗ Failed ${dest.slug}: No embedding returned`);
          errors++;
          continue;
        }

        // Update destination with embedding
        // Supabase/PostgreSQL vector type expects array format
        const { error: updateError } = await supabase
          .from('destinations')
          .update({
            embedding: `[${embedding.join(',')}]` as any, // Cast to any for vector type
            embedding_model: 'text-embedding-3-large',
            embedding_generated_at: new Date().toISOString(),
          })
          .eq('id', dest.id);

        if (updateError) {
          console.error(`✗ Failed to update ${dest.slug}:`, updateError.message);
          errors++;
        } else {
          processed++;
          if (processed % 10 === 0) {
            process.stdout.write(`\r✓ Processed: ${processed} | Errors: ${errors}`);
          }
        }

        // Rate limiting: wait 25ms between requests
        await new Promise(r => setTimeout(r, 25));
      } catch (err: any) {
        console.error(`\n✗ Failed ${dest.slug}:`, err.message || err);
        errors++;
      }
    }

    offset += batchSize;
  }

  console.log(`\n\n✅ Complete! Processed ${processed} destinations with ${errors} errors.`);
}

backfillEmbeddings().catch(console.error);

