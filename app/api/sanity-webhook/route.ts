/**
 * Sanity Webhook Endpoint
 *
 * Receives webhook events from Sanity when documents are created, updated, or deleted.
 * Automatically syncs changes to Supabase with:
 * - Draft/publish workflow support
 * - Conflict detection
 * - Audit logging
 * - Expanded field mapping
 *
 * Configure this URL in Sanity: https://your-domain.com/api/sanity-webhook
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  mapSanityToSupabase,
  shouldSyncToSupabase,
  isReadyToPublish,
  detectConflicts,
  type SanityDestination,
  type ConflictInfo,
} from '@/lib/sanity/field-mapping';
import { withErrorHandling, createSuccessResponse, CustomError, ErrorCode } from '@/lib/errors';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET;
const CONFLICT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for webhook');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(body).digest('hex');
  const expectedSignature = `sha256=${digest}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

interface AuditLogEntry {
  action: 'create' | 'update' | 'delete' | 'unpublish' | 'conflict';
  documentId: string;
  slug: string;
  source: 'sanity_webhook';
  userId?: string;
  changes?: Record<string, { old: any; new: any }>;
  conflicts?: ConflictInfo[];
  timestamp: string;
}

async function logAuditEntry(
  supabase: ReturnType<typeof getSupabaseClient>,
  entry: AuditLogEntry
): Promise<void> {
  try {
    // Try to insert into audit log table (if it exists)
    await supabase.from('content_audit_log').insert({
      action: entry.action,
      document_id: entry.documentId,
      slug: entry.slug,
      source: entry.source,
      user_id: entry.userId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      conflicts: entry.conflicts ? JSON.stringify(entry.conflicts) : null,
      created_at: entry.timestamp,
    });
  } catch (error) {
    // Audit log table may not exist yet - log to console instead
    console.log('[Sanity Webhook] Audit:', JSON.stringify(entry));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH DOCUMENT FROM SANITY
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSanityDocument(documentId: string): Promise<SanityDestination | null> {
  const sanityProjectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID;
  const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const sanityApiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION || process.env.SANITY_API_VERSION || '2023-10-01';
  const sanityToken = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;

  if (!sanityProjectId || !sanityToken) {
    throw new Error('Missing Sanity credentials');
  }

  const sanityUrl = `https://${sanityProjectId}.api.sanity.io/v${sanityApiVersion}/data/query/${sanityDataset}`;

  // Fetch complete document with all fields
  const query = `*[_id == $id && _type == "destination"][0]{
    _id,
    _type,
    _createdAt,
    _updatedAt,
    _rev,
    status,
    publishedAt,
    scheduledFor,
    name,
    slug,
    category,
    microDescription,
    description,
    content,
    tags,
    crown,
    brand,
    city,
    country,
    neighborhood,
    geopoint,
    formattedAddress,
    heroImage,
    imageUrl,
    gallery,
    michelinStars,
    rating,
    priceLevel,
    editorialSummary,
    architect,
    interiorDesigner,
    designFirm,
    architecturalStyle,
    designPeriod,
    constructionYear,
    architecturalSignificance,
    designStory,
    designAwards,
    website,
    phoneNumber,
    instagramHandle,
    opentableUrl,
    resyUrl,
    bookingUrl,
    googleMapsUrl,
    placeId,
    userRatingsTotal,
    openingHours,
    viewsCount,
    savesCount,
    lastEnrichedAt,
    lastSyncedAt,
    parentDestination,
    supabaseId
  }`;

  const response = await fetch(
    `${sanityUrl}?query=${encodeURIComponent(query)}&$id="${documentId}"`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sanityToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch from Sanity: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC DOCUMENT TO SUPABASE
// ═══════════════════════════════════════════════════════════════════════════

interface SyncResult {
  slug: string;
  status: 'created' | 'updated' | 'skipped' | 'unpublished' | 'conflict' | 'error';
  conflicts?: ConflictInfo[];
  error?: string;
}

async function syncDocumentToSupabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  doc: SanityDestination
): Promise<SyncResult> {
  const slug = doc.slug?.current || doc._id;

  if (!slug) {
    return { slug: doc._id, status: 'skipped', error: 'No slug found' };
  }

  // Check publishing status
  const shouldSync = shouldSyncToSupabase(doc);

  // Get existing record from Supabase
  const { data: existing } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // Handle scheduled publishing
  if (doc.status === 'scheduled' && isReadyToPublish(doc)) {
    // This will be handled by a separate cron job
    return { slug, status: 'skipped', error: 'Scheduled for future publishing' };
  }

  // Handle unpublishing (draft, review, archived)
  if (!shouldSync && existing) {
    // Document exists but is no longer published
    // Option 1: Delete from Supabase
    // Option 2: Mark as hidden/archived
    // For now, we'll leave it but log the unpublish action
    await logAuditEntry(supabase, {
      action: 'unpublish',
      documentId: doc._id,
      slug,
      source: 'sanity_webhook',
      timestamp: new Date().toISOString(),
    });

    return { slug, status: 'unpublished' };
  }

  // Skip if document shouldn't be synced
  if (!shouldSync) {
    return { slug, status: 'skipped', error: `Status is '${doc.status}', not published` };
  }

  // Check for conflicts
  if (existing) {
    const conflicts = detectConflicts(doc, existing, CONFLICT_WINDOW_MS);

    if (conflicts.length > 0) {
      await logAuditEntry(supabase, {
        action: 'conflict',
        documentId: doc._id,
        slug,
        source: 'sanity_webhook',
        conflicts,
        timestamp: new Date().toISOString(),
      });

      console.warn(`[Sanity Webhook] Conflicts detected for ${slug}:`, conflicts);

      // Still sync, but Sanity wins (it's the source of truth for editorial content)
      // The conflicts are logged for review
    }
  }

  // Map Sanity document to Supabase format
  const supabaseData = mapSanityToSupabase(doc);

  // Perform upsert
  if (existing) {
    // Track changes for audit log
    const changes: Record<string, { old: any; new: any }> = {};
    for (const [key, newValue] of Object.entries(supabaseData)) {
      const oldValue = (existing as any)[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }

    const { error: updateError } = await supabase
      .from('destinations')
      .update(supabaseData)
      .eq('slug', slug);

    if (updateError) {
      throw updateError;
    }

    // Log the update
    await logAuditEntry(supabase, {
      action: 'update',
      documentId: doc._id,
      slug,
      source: 'sanity_webhook',
      changes,
      timestamp: new Date().toISOString(),
    });

    return { slug, status: 'updated' };
  } else {
    // Create new destination
    const { error: createError } = await supabase.from('destinations').insert({
      ...supabaseData,
      created_at: new Date().toISOString(),
    });

    if (createError) {
      throw createError;
    }

    // Log the creation
    await logAuditEntry(supabase, {
      action: 'create',
      documentId: doc._id,
      slug,
      source: 'sanity_webhook',
      timestamp: new Date().toISOString(),
    });

    return { slug, status: 'created' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST HANDLER - Receive webhook events
// ═══════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();

  const supabase = getSupabaseClient();

  let webhookData: {
    projectId?: string;
    dataset?: string;
    ids?: string[];
    _id?: string;
    _type?: string;
  };

  // Verify webhook signature
  if (SANITY_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-sanity-signature');
    const body = await request.text();

    if (!verifyWebhookSignature(body, signature, SANITY_WEBHOOK_SECRET)) {
      console.error('[Sanity Webhook] Invalid signature');
      throw new CustomError(ErrorCode.UNAUTHORIZED, 'Invalid signature', 401);
    }

    webhookData = JSON.parse(body);
  } else {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET required in production');
      throw new CustomError(
        ErrorCode.UNAUTHORIZED,
        'Webhook signature verification required in production',
        401
      );
    }
    console.warn('[Sanity Webhook] Running without signature verification - dev mode only');
    webhookData = await request.json();
  }

  // Handle different webhook payload formats
  // Format 1: { ids: [...] } - multiple document IDs
  // Format 2: { _id: "...", _type: "..." } - single document
  let documentIds: string[] = [];

  if (webhookData.ids && Array.isArray(webhookData.ids)) {
    documentIds = webhookData.ids;
  } else if (webhookData._id) {
    documentIds = [webhookData._id];
  }

  if (documentIds.length === 0) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'No document IDs provided', 400);
  }

  console.log(`[Sanity Webhook] Processing ${documentIds.length} document(s)`);

  // Process each document
  const results: SyncResult[] = [];

  for (const docId of documentIds) {
    try {
      // Fetch full document from Sanity
      const doc = await fetchSanityDocument(docId);

      if (!doc) {
        results.push({
          slug: docId,
          status: 'skipped',
          error: 'Document not found or not a destination',
        });
        continue;
      }

      // Sync to Supabase
      const result = await syncDocumentToSupabase(supabase, doc);
      results.push(result);

      console.log(`[Sanity Webhook] ${result.status}: ${result.slug}`);
    } catch (error: any) {
      results.push({
        slug: docId,
        status: 'error',
        error: error.message || String(error),
      });
      console.error(`[Sanity Webhook] Error processing ${docId}:`, error);
    }
  }

  // Summarize results
  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    unpublished: results.filter((r) => r.status === 'unpublished').length,
    conflicts: results.filter((r) => r.status === 'conflict').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  const duration = Date.now() - startTime;

  return createSuccessResponse({
    message: `Processed ${summary.total} document(s) in ${duration}ms`,
    summary,
    results,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER - Webhook verification and status
// ═══════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandling(async () => {
  const hasSecret = !!SANITY_WEBHOOK_SECRET;
  const hasSupabase = !!(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const hasSanity = !!(
    (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID) &&
    (process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN)
  );

  return createSuccessResponse({
    status: 'active',
    message: 'Sanity webhook endpoint is ready',
    configuration: {
      signatureVerification: hasSecret,
      supabaseConfigured: hasSupabase,
      sanityConfigured: hasSanity,
    },
    features: [
      'Draft/publish workflow support',
      'Conflict detection',
      'Audit logging',
      'Expanded field mapping (40+ fields)',
    ],
    instructions: {
      step1: 'Go to sanity.io/manage → API → Webhooks',
      step2: 'Create webhook pointing to this URL',
      step3: 'Set filter: _type == "destination"',
      step4: 'Enable: Document created, Document updated',
      step5: 'Set secret matching SANITY_WEBHOOK_SECRET env var',
    },
  });
});
