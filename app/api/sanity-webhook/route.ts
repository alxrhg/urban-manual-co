/**
 * Sanity Webhook Endpoint
 * 
 * Receives webhook events from Sanity when documents are created, updated, or deleted.
 * Automatically syncs changes back to Supabase.
 * 
 * Configure this URL in Sanity: https://your-domain.com/api/sanity-webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Optional: Sanity webhook secret for verification
const SANITY_WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET;

/**
 * Get Supabase client lazily to avoid build-time errors
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for webhook');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Verify webhook signature (optional but recommended)
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(body).digest('hex');
  const expectedSignature = `sha256=${digest}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Convert Sanity Portable Text to plain text
 */
function portableTextToPlainText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  return blocks
    .map((block) => {
      if (block._type !== 'block' || !block.children) return '';
      return block.children
        .map((child: any) => (child.text || ''))
        .join('');
    })
    .join('\n\n');
}

/**
 * Map Sanity document to Supabase format
 */
function mapSanityToSupabase(sanityDoc: any): any {
  // Extract slug from Sanity slug object
  const slug = sanityDoc.slug?.current || sanityDoc._id;
  
  // Convert Portable Text description to plain text
  const description = portableTextToPlainText(sanityDoc.description || []);
  
  // Extract category from categories array (take first one)
  const category = Array.isArray(sanityDoc.categories) && sanityDoc.categories.length > 0
    ? sanityDoc.categories[0]
    : null;
  
  // Get image URL from heroImage (if it's a reference, we'll need to fetch it)
  // For now, we'll store it as metadata or skip
  const imageUrl = sanityDoc.heroImage?.asset?._ref 
    ? null // Would need to fetch asset URL from Sanity
    : sanityDoc.heroImage?.asset?.url || null;

  return {
    slug,
    name: sanityDoc.name || '',
    city: sanityDoc.city || '',
    country: sanityDoc.country || null,
    category: category || null,
    description: description || null,
    // Note: image handling requires fetching from Sanity asset API
    // For now, we'll update description and other text fields
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get Supabase client (throws if credentials missing)
    const supabase = getSupabaseClient();

    let webhookData: { projectId?: string; dataset?: string; ids?: string[] };

    // Verify webhook secret - required in production for security
    if (SANITY_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-sanity-signature');
      const body = await request.text();

      if (!verifyWebhookSignature(body, signature, SANITY_WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      webhookData = JSON.parse(body);
    } else {
      // No secret configured - require it in production for security
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET is required in production');
        return NextResponse.json(
          { error: 'Webhook signature verification required in production' },
          { status: 401 }
        );
      }
      console.warn('[Sanity Webhook] Running without signature verification - development mode only');
      webhookData = await request.json();
    }

    const { projectId, dataset, ids } = webhookData;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No document IDs provided' },
        { status: 400 }
      );
    }

    console.log(`[Sanity Webhook] Received event for ${ids.length} document(s)`);

    // Fetch updated documents from Sanity
    const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID;
    const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
    const sanityApiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || process.env.SANITY_API_VERSION || '2023-10-01';
    const sanityToken = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;

    if (!sanityProjectId || !sanityToken) {
      console.error('[Sanity Webhook] Missing Sanity credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Fetch documents from Sanity using GROQ query
    const sanityUrl = `https://${sanityProjectId}.api.sanity.io/v${sanityApiVersion}/data/query/${sanityDataset}`;
    
    // Build GROQ query with proper syntax
    const query = `*[_id in ${JSON.stringify(ids)} && _type == "destination"]`;
    
    const sanityResponse = await fetch(`${sanityUrl}?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sanityToken}`,
      },
    });

    if (!sanityResponse.ok) {
      throw new Error(`Failed to fetch from Sanity: ${sanityResponse.statusText}`);
    }

    const sanityData = await sanityResponse.json();
    const documents = sanityData.result || [];

    if (documents.length === 0) {
      console.log('[Sanity Webhook] No destination documents found in webhook payload');
      return NextResponse.json({ 
        message: 'No destination documents to sync',
        synced: 0 
      });
    }

    // Sync each document to Supabase
    const results = {
      synced: 0,
      errors: 0,
      details: [] as Array<{ slug: string; status: string; error?: string }>,
    };

    for (const doc of documents) {
      try {
        const supabaseData = mapSanityToSupabase(doc);
        const slug = supabaseData.slug;

        if (!slug) {
          console.warn(`[Sanity Webhook] Document ${doc._id} has no slug, skipping`);
          results.errors++;
          results.details.push({
            slug: doc._id,
            status: 'skipped',
            error: 'No slug found',
          });
          continue;
        }

        // Check if destination exists in Supabase
        const { data: existing } = await supabase
          .from('destinations')
          .select('slug')
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          // Update existing destination
          const { error: updateError } = await supabase
            .from('destinations')
            .update(supabaseData)
            .eq('slug', slug);

          if (updateError) {
            throw updateError;
          }

          results.synced++;
          results.details.push({ slug, status: 'updated' });
          console.log(`[Sanity Webhook] ✅ Updated: ${slug}`);
        } else {
          // Create new destination (only if it doesn't exist)
          // Note: You might want to skip creation and only update
          const { error: createError } = await supabase
            .from('destinations')
            .insert({
              ...supabaseData,
              created_at: new Date().toISOString(),
            });

          if (createError) {
            throw createError;
          }

          results.synced++;
          results.details.push({ slug, status: 'created' });
          console.log(`[Sanity Webhook] ➕ Created: ${slug}`);
        }
      } catch (error: any) {
        results.errors++;
        results.details.push({
          slug: doc._id,
          status: 'error',
          error: error.message || String(error),
        });
        console.error(`[Sanity Webhook] ❌ Error syncing ${doc._id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Synced ${results.synced} document(s)`,
      ...results,
    });
  } catch (error: any) {
    console.error('[Sanity Webhook] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification/testing)
export async function GET() {
  return NextResponse.json({
    message: 'Sanity webhook endpoint is active',
    instructions: 'Configure this URL in Sanity webhook settings',
    url: '/api/sanity-webhook',
  });
}

