/**
 * Sanity Function: Sync Destination to Supabase
 *
 * This function runs in Sanity's infrastructure and replaces the webhook-based sync.
 * It automatically syncs destination documents to Supabase when they are published or updated.
 *
 * Benefits over webhooks:
 * - Runs in Sanity's secure infrastructure
 * - No external webhook URL to configure
 * - Better reliability and retry handling
 * - Access to full document data via projection
 *
 * Test locally: npx sanity functions test sync-destination-to-supabase
 * Deploy: npx sanity blueprints deploy
 */

import { documentEventHandler } from '@sanity/functions';
import { createClient as createSanityClient } from '@sanity/client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SanityDestination {
  _id: string;
  _type: 'destination';
  _createdAt?: string;
  _updatedAt?: string;
  _rev?: string;
  name: string;
  slug: { _type: 'slug'; current: string } | string;
  categories?: string[];
  microDescription?: string;
  description?: PortableTextBlock[];
  content?: PortableTextBlock[];
  tags?: string[];
  crown?: boolean;
  brand?: string;
  city: string;
  country?: string;
  neighborhood?: string;
  geopoint?: { _type: 'geopoint'; lat: number; lng: number };
  formattedAddress?: string;
  heroImage?: SanityImage;
  imageUrl?: string;
  gallery?: SanityImage[];
  michelinStars?: number;
  rating?: number;
  priceLevel?: number;
  editorialSummary?: string;
  architect?: string;
  interiorDesigner?: string;
  designFirm?: string;
  architecturalStyle?: string;
  designPeriod?: string;
  constructionYear?: number;
  architecturalSignificance?: string;
  designStory?: PortableTextBlock[];
  designAwards?: Array<{ name: string; year: number; organization: string }>;
  website?: string;
  phoneNumber?: string;
  instagramHandle?: string;
  opentableUrl?: string;
  resyUrl?: string;
  bookingUrl?: string;
  googleMapsUrl?: string;
  placeId?: string;
  userRatingsTotal?: number;
  openingHours?: { weekdayText?: string[]; openNow?: boolean };
  viewsCount?: number;
  savesCount?: number;
  lastEnrichedAt?: string;
  lastSyncedAt?: string;
  parentDestination?: { _type: 'reference'; _ref: string };
  supabaseId?: number;
}

interface PortableTextBlock {
  _type: 'block';
  _key?: string;
  style?: string;
  children?: Array<{ _type: 'span'; text: string; marks?: string[] }>;
  markDefs?: unknown[];
}

interface SanityImage {
  _type: 'image';
  asset?: { _type: 'reference'; _ref: string };
  hotspot?: { x: number; y: number; height: number; width: number };
  alt?: string;
  caption?: string;
}

interface SupabaseDestination {
  slug: string;
  name: string;
  category?: string | null;
  micro_description?: string | null;
  description?: string | null;
  content?: string | null;
  tags?: string[] | null;
  crown?: boolean | null;
  brand?: string | null;
  city: string;
  country?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  image?: string | null;
  michelin_stars?: number | null;
  rating?: number | null;
  price_level?: number | null;
  editorial_summary?: string | null;
  architect?: string | null;
  interior_designer?: string | null;
  design_firm?: string | null;
  architectural_style?: string | null;
  design_period?: string | null;
  construction_year?: number | null;
  architectural_significance?: string | null;
  design_story?: string | null;
  design_awards?: string | null;
  website?: string | null;
  phone_number?: string | null;
  instagram_handle?: string | null;
  instagram_url?: string | null;
  opentable_url?: string | null;
  resy_url?: string | null;
  booking_url?: string | null;
  google_maps_url?: string | null;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert Sanity Portable Text to plain text
 */
function portableTextToPlainText(blocks: PortableTextBlock[] | undefined): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks
    .filter((block) => block._type === 'block')
    .map((block) => {
      if (!block.children) return '';
      return block.children.map((child) => child.text || '').join('');
    })
    .join('\n\n')
    .trim();
}

/**
 * Map Sanity document to Supabase row format
 */
function mapSanityToSupabase(doc: SanityDestination): SupabaseDestination {
  const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current;

  return {
    slug: slug || doc._id,
    name: doc.name,
    category: Array.isArray(doc.categories) && doc.categories.length > 0 ? doc.categories[0] : null,
    micro_description: doc.microDescription || null,
    description: doc.description ? portableTextToPlainText(doc.description) : null,
    content: doc.content ? portableTextToPlainText(doc.content) : null,
    tags: doc.tags || null,
    crown: doc.crown ?? null,
    brand: doc.brand || null,
    city: doc.city,
    country: doc.country || null,
    neighborhood: doc.neighborhood || null,
    latitude: doc.geopoint?.lat ?? null,
    longitude: doc.geopoint?.lng ?? null,
    formatted_address: doc.formattedAddress || null,
    image: doc.imageUrl || null,
    michelin_stars: doc.michelinStars ?? null,
    rating: doc.rating ?? null,
    price_level: doc.priceLevel ?? null,
    editorial_summary: doc.editorialSummary || null,
    architect: doc.architect || null,
    interior_designer: doc.interiorDesigner || null,
    design_firm: doc.designFirm || null,
    architectural_style: doc.architecturalStyle || null,
    design_period: doc.designPeriod || null,
    construction_year: doc.constructionYear ?? null,
    architectural_significance: doc.architecturalSignificance || null,
    design_story: doc.designStory ? portableTextToPlainText(doc.designStory) : null,
    design_awards: doc.designAwards ? JSON.stringify(doc.designAwards) : null,
    website: doc.website || null,
    phone_number: doc.phoneNumber || null,
    instagram_handle: doc.instagramHandle || null,
    instagram_url: doc.instagramHandle
      ? `https://instagram.com/${doc.instagramHandle.replace('@', '')}`
      : null,
    opentable_url: doc.opentableUrl || null,
    resy_url: doc.resyUrl || null,
    booking_url: doc.bookingUrl || null,
    google_maps_url: doc.googleMapsUrl || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if a document should be synced to Supabase
 * Only published documents (without 'drafts.' prefix) should sync
 */
function shouldSyncToSupabase(doc: SanityDestination): boolean {
  return !doc._id.startsWith('drafts.');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

async function supabaseRequest<T>(
  url: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<SupabaseResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      data: null,
      error: { message: errorText, code: response.status.toString() },
    };
  }

  const data = response.status === 204 ? null : await response.json();
  return { data, error: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export const handler = documentEventHandler<SanityDestination>(async ({ event }) => {
  const startTime = Date.now();
  const doc = event.data;

  // Get environment variables from Sanity Functions secrets
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Sanity Function] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }

  const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current || doc._id;

  // Check if document should be synced
  if (!shouldSyncToSupabase(doc)) {
    console.log(`[Sanity Function] Skipping draft document: ${slug}`);
    return; // Skip draft documents
  }

  console.log(`[Sanity Function] Processing: ${slug}`);

  try {
    // Check if destination exists in Supabase
    const existingUrl = `${supabaseUrl}/rest/v1/destinations?slug=eq.${encodeURIComponent(slug)}&select=slug,updated_at`;
    const { data: existing, error: fetchError } = await supabaseRequest<
      Array<{ slug: string; updated_at: string }>
    >(existingUrl, supabaseServiceKey, { method: 'GET' });

    if (fetchError) {
      throw new Error(`Failed to check existing record: ${fetchError.message}`);
    }

    // Map Sanity document to Supabase format
    const supabaseData = mapSanityToSupabase(doc);

    let status: 'created' | 'updated';

    if (existing && existing.length > 0) {
      // Update existing record
      const updateUrl = `${supabaseUrl}/rest/v1/destinations?slug=eq.${encodeURIComponent(slug)}`;
      const { error: updateError } = await supabaseRequest(updateUrl, supabaseServiceKey, {
        method: 'PATCH',
        body: JSON.stringify(supabaseData),
      });

      if (updateError) {
        throw new Error(`Failed to update: ${updateError.message}`);
      }

      status = 'updated';
    } else {
      // Create new record
      const createUrl = `${supabaseUrl}/rest/v1/destinations`;
      const { error: createError } = await supabaseRequest(createUrl, supabaseServiceKey, {
        method: 'POST',
        body: JSON.stringify({
          ...supabaseData,
          created_at: new Date().toISOString(),
        }),
      });

      if (createError) {
        throw new Error(`Failed to create: ${createError.message}`);
      }

      status = 'created';
    }

    const duration = Date.now() - startTime;
    console.log(`[Sanity Function] ${status}: ${slug} in ${duration}ms`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Sanity Function] Error syncing ${slug}:`, errorMessage);
    // Re-throw to let Sanity Functions handle the error
    throw error;
  }
});
