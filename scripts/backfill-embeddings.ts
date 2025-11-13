// Load environment variables FIRST before importing anything else
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
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

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Please ensure these are set in .env.local');
  process.exit(1);
}

console.log('Environment check:');
console.log(`- OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`- Supabase URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}`);
console.log(`- Supabase Key: ${supabaseKey ? '✓ Set' : '✗ Missing'}`);
console.log('');

// Note: These are environment checks only, not logging actual secret values

const supabase = createClient(supabaseUrl, supabaseKey);

type BackfillOptions = {
  batchSize: number;
  throttleMs: number;
  startId?: number;
  resume: boolean;
  includeExisting: boolean;
};

const DEFAULT_BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE || 40);
const DEFAULT_THROTTLE = Number(process.env.EMBEDDING_THROTTLE_MS || 150);
const PRICE_PER_1K = Number(process.env.OPENAI_EMBEDDING_PRICE_PER_1K || '0.13');
const PROGRESS_FILE = resolve(process.cwd(), 'scripts/.backfill-embeddings-progress.json');

function parseArgs(argv: string[]): BackfillOptions {
  const opts: BackfillOptions = {
    batchSize: DEFAULT_BATCH_SIZE,
    throttleMs: DEFAULT_THROTTLE,
    resume: false,
    includeExisting: false,
  };

  argv.forEach(arg => {
    if (arg.startsWith('--batch-size=')) {
      opts.batchSize = Number(arg.split('=')[1]) || DEFAULT_BATCH_SIZE;
    } else if (arg.startsWith('--throttle-ms=')) {
      opts.throttleMs = Number(arg.split('=')[1]) || DEFAULT_THROTTLE;
    } else if (arg.startsWith('--start-id=')) {
      opts.startId = Number(arg.split('=')[1]);
    } else if (arg === '--resume') {
      opts.resume = true;
    } else if (arg === '--include-existing' || arg === '--rebuild') {
      opts.includeExisting = true;
    }
  });

  return opts;
}

const cliOptions = parseArgs(process.argv.slice(2));

type ProgressPayload = { lastProcessedId: number; updatedAt: string };

function loadProgress(): ProgressPayload | null {
  if (!existsSync(PROGRESS_FILE)) return null;
  try {
    const raw = readFileSync(PROGRESS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to read progress file, starting fresh. Error:', error);
    return null;
  }
}

function persistProgress(id: number) {
  const payload: ProgressPayload = {
    lastProcessedId: id,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(PROGRESS_FILE, JSON.stringify(payload, null, 2));
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4); // Rough heuristic
}

const progressState = loadProgress();
let startId = cliOptions.startId ?? 0;
if (cliOptions.resume && progressState?.lastProcessedId) {
  startId = progressState.lastProcessedId;
}

async function wait(ms: number) {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillEmbeddings() {
  let lastProcessedId = startId;
  let totalTarget = 0;
  const metrics = {
    processed: 0,
    errors: 0,
    skipped: 0,
    batches: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    errorBuckets: new Map<string, number>(),
  };

  let countQuery = supabase.from('destinations').select('*', { count: 'exact', head: true });
  if (!cliOptions.includeExisting) {
    countQuery = countQuery.is('embedding', null);
  }
  const { count } = await countQuery;
  totalTarget = count || 0;

  console.log('Starting embedding backfill...');
  console.log(`Target rows: ${totalTarget || 'unknown'}`);
  console.log(`Batch size: ${cliOptions.batchSize}`);
  console.log(`Throttle: ${cliOptions.throttleMs}ms between requests`);
  console.log(`Start ID: ${startId}`);
  console.log(`Include existing embeddings: ${cliOptions.includeExisting}`);
  console.log(`Writing progress to ${PROGRESS_FILE}`);

  while (true) {
    let query = supabase
      .from('destinations')
      .select('id, slug, name, city, category, content, description, tags, style_tags, ambience_tags, experience_tags', { count: 'exact' })
      .gt('id', lastProcessedId)
      .order('id', { ascending: true })
      .limit(cliOptions.batchSize);

    if (!cliOptions.includeExisting) {
      query = query.is('embedding', null);
    }

    const { data: destinations, error } = await query;
    if (error) {
      console.error('Error fetching destinations:', error.message);
      break;
    }

    if (!destinations || destinations.length === 0) {
      console.log('No more destinations to process.');
      break;
    }

    metrics.batches += 1;
    console.log(`\nBatch #${metrics.batches} (records ${destinations[0].id}-${destinations[destinations.length - 1].id})`);

    for (const dest of destinations) {
      lastProcessedId = dest.id;
      persistProgress(lastProcessedId);

      try {
        const embedding = await generateDestinationEmbedding({
          name: dest.name || '',
          city: dest.city || '',
          category: dest.category || '',
          content: dest.content,
          description: dest.description,
          tags: dest.tags || [],
          style_tags: dest.style_tags || [],
          ambience_tags: dest.ambience_tags || [],
          experience_tags: dest.experience_tags || [],
        }, { versionTag: 'backfill-script' });

        const estimatedTokens = estimateTokens(embedding.text);
        metrics.totalTokens += estimatedTokens;
        metrics.totalCostUsd += (estimatedTokens / 1000) * PRICE_PER_1K;

        const { error: updateError } = await supabase
          .from('destinations')
          .update({
            embedding: embedding.serialized as any,
            embedding_model: embedding.metadata.model,
            embedding_generated_at: embedding.metadata.generatedAt,
            embedding_metadata: embedding.metadata,
          })
          .eq('id', dest.id);

        if (updateError) {
          metrics.errors += 1;
          const reason = updateError.message || 'update_error';
          metrics.errorBuckets.set(reason, (metrics.errorBuckets.get(reason) || 0) + 1);
          console.error(`✗ Failed to update ${dest.slug}: ${reason}`);
        } else {
          metrics.processed += 1;
          if (metrics.processed % 10 === 0) {
            process.stdout.write(
              `\rProcessed: ${metrics.processed} | Errors: ${metrics.errors} | Cost ~$${metrics.totalCostUsd.toFixed(2)}`
            );
          }
        }
      } catch (err: any) {
        metrics.errors += 1;
        const reason = err?.message || 'embedding_failed';
        metrics.errorBuckets.set(reason, (metrics.errorBuckets.get(reason) || 0) + 1);
        console.error(`✗ Failed ${dest.slug}: ${reason}`);
      }

      await wait(cliOptions.throttleMs);
    }
  }

  console.log('\n\n✅ Backfill complete');
  console.log(`Processed: ${metrics.processed}`);
  console.log(`Errors: ${metrics.errors}`);
  console.log(`Estimated tokens: ${metrics.totalTokens}`);
  console.log(`Estimated cost (USD): $${metrics.totalCostUsd.toFixed(4)}`);
  console.log('Error buckets:', Object.fromEntries(metrics.errorBuckets));
  console.log(`Resume future runs with --start-id=${lastProcessedId}`);

  const { count: remaining } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  console.log(`Remaining destinations without embeddings: ${remaining ?? 'unknown'}`);
}

backfillEmbeddings().catch(error => {
  console.error('Backfill failed:', error);
  process.exit(1);
});

