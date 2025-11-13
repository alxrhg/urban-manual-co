import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { OPENAI_EMBEDDING_DIMENSION } from '../lib/openai';

const VECTOR_COLUMNS: Array<{ table: string; column: string; description: string }> = [
  { table: 'destinations', column: 'embedding', description: 'Primary semantic search embeddings' },
  { table: 'destinations', column: 'vector_embedding', description: 'Vibe/curation embeddings' },
  { table: 'conversation_messages', column: 'embedding', description: 'Conversational AI memory' },
  { table: 'location_relationships', column: 'embedding', description: 'Graph edges between locations' },
  { table: 'discovery_candidates', column: 'embedding', description: 'Incoming Google candidates' },
];

function resolveSupabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
}

function resolveSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and a service/anon key are required to verify embedding dimensions.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const mismatches: string[] = [];

  for (const target of VECTOR_COLUMNS) {
    const { table, column, description } = target;
    const { data, error } = await supabase
      .from(table)
      .select(`${column}`)
      .not(column, 'is', null)
      .limit(200);

    if (error) {
      mismatches.push(`${table}.${column} check failed: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️  No rows found for ${table}.${column}; skipping dimension validation.`);
      continue;
    }

    const invalid = data.filter((row: Record<string, any>) => {
      const vector = row[column];
      return !Array.isArray(vector) || vector.length !== OPENAI_EMBEDDING_DIMENSION;
    });

    if (invalid.length > 0) {
      mismatches.push(
        `${table}.${column} (${description}) has ${invalid.length} row(s) outside the ${OPENAI_EMBEDDING_DIMENSION}-dimension expectation.`
      );
    }
  }

  if (mismatches.length > 0) {
    const message = ['Embedding dimension verification failed:', ...mismatches].join('\n - ');
    throw new Error(message);
  }

  console.log(
    `✅ Verified ${VECTOR_COLUMNS.length} vector columns; all sampled rows use the configured ${OPENAI_EMBEDDING_DIMENSION}-dimension embeddings.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
