import { createClient } from '@supabase/supabase-js';
import { generateDestinationEmbedding } from '../lib/embeddings/generate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

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
        console.error(`\n✗ Failed ${dest.slug}:`, err.message);
        errors++;
      }
    }

    offset += batchSize;
  }

  console.log(`\n\n✅ Complete! Processed ${processed} destinations with ${errors} errors.`);
}

backfillEmbeddings().catch(console.error);

