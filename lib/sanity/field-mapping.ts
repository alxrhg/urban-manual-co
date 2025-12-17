/**
 * Bi-directional Field Mapping for Sanity ↔ Supabase Sync
 *
 * This module handles field name transformations and type conversions
 * between Sanity CMS and Supabase database schemas.
 *
 * Sync Direction:
 * - Editorial fields: Sanity → Supabase (Sanity is source of truth)
 * - Enrichment fields: Supabase → Sanity (read-only in Sanity)
 */

import type { Destination } from '@/types/destination';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SanityDestination {
  _id: string;
  _type: 'destination';
  _createdAt?: string;
  _updatedAt?: string;
  _rev?: string;

  // Editorial
  name: string;
  slug: { _type: 'slug'; current: string };
  categories?: string[];
  microDescription?: string;
  description?: PortableTextBlock[];
  content?: PortableTextBlock[];
  tags?: string[];
  crown?: boolean;
  brand?: string;

  // Location
  city: string;
  country?: string;
  neighborhood?: string;
  geopoint?: { _type: 'geopoint'; lat: number; lng: number };
  formattedAddress?: string;

  // Media
  heroImage?: SanityImage;
  imageUrl?: string;
  gallery?: SanityImage[];

  // Business
  michelinStars?: number;
  rating?: number;
  priceLevel?: number;
  editorialSummary?: string;

  // Architecture
  architect?: string;
  interiorDesigner?: string;
  designFirm?: string;
  architecturalStyle?: string;
  designPeriod?: string;
  constructionYear?: number;
  architecturalSignificance?: string;
  designStory?: PortableTextBlock[];
  designAwards?: Array<{ name: string; year: number; organization: string }>;

  // Booking
  website?: string;
  phoneNumber?: string;
  instagramHandle?: string;
  opentableUrl?: string;
  resyUrl?: string;
  bookingUrl?: string;
  googleMapsUrl?: string;

  // Enrichment (read-only)
  placeId?: string;
  userRatingsTotal?: number;
  openingHours?: { weekdayText?: string[]; openNow?: boolean };
  viewsCount?: number;
  savesCount?: number;
  lastEnrichedAt?: string;
  lastSyncedAt?: string;

  // References
  parentDestination?: { _type: 'reference'; _ref: string };
  supabaseId?: number;
}

interface PortableTextBlock {
  _type: 'block';
  _key?: string;
  style?: string;
  children?: Array<{ _type: 'span'; text: string; marks?: string[] }>;
  markDefs?: any[];
}

interface SanityImage {
  _type: 'image';
  asset?: { _type: 'reference'; _ref: string };
  hotspot?: { x: number; y: number; height: number; width: number };
  alt?: string;
  caption?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD MAPPING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Field mapping configuration
 * - sanity: field name in Sanity
 * - supabase: field name in Supabase
 * - direction: 'toSupabase' (Sanity→Supabase), 'toSanity' (Supabase→Sanity), 'both'
 * - transform: optional transformation function
 */
interface FieldMapping {
  sanity: string;
  supabase: string;
  direction: 'toSupabase' | 'toSanity' | 'both';
  transformToSupabase?: (value: any, doc: SanityDestination) => any;
  transformToSanity?: (value: any, row: Partial<Destination>) => any;
}

export const FIELD_MAPPINGS: FieldMapping[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Core Editorial (Sanity → Supabase)
  // ─────────────────────────────────────────────────────────────────────────
  {
    sanity: 'slug',
    supabase: 'slug',
    direction: 'toSupabase',
    transformToSupabase: (value) => value?.current || value,
  },
  { sanity: 'name', supabase: 'name', direction: 'toSupabase' },
  {
    sanity: 'categories',
    supabase: 'category',
    direction: 'toSupabase',
    // Supabase stores single category, so we take the first one from the array
    transformToSupabase: (value) => (Array.isArray(value) && value.length > 0 ? value[0] : null),
  },
  { sanity: 'microDescription', supabase: 'micro_description', direction: 'toSupabase' },
  {
    sanity: 'description',
    supabase: 'description',
    direction: 'toSupabase',
    transformToSupabase: portableTextToPlainText,
  },
  {
    sanity: 'content',
    supabase: 'content',
    direction: 'toSupabase',
    transformToSupabase: portableTextToPlainText,
  },
  { sanity: 'tags', supabase: 'tags', direction: 'toSupabase' },
  { sanity: 'crown', supabase: 'crown', direction: 'toSupabase' },
  { sanity: 'brand', supabase: 'brand', direction: 'toSupabase' },

  // ─────────────────────────────────────────────────────────────────────────
  // Location (Sanity → Supabase)
  // ─────────────────────────────────────────────────────────────────────────
  { sanity: 'city', supabase: 'city', direction: 'toSupabase' },
  { sanity: 'country', supabase: 'country', direction: 'toSupabase' },
  { sanity: 'neighborhood', supabase: 'neighborhood', direction: 'toSupabase' },
  {
    sanity: 'geopoint',
    supabase: 'latitude',
    direction: 'toSupabase',
    transformToSupabase: (value) => value?.lat || null,
  },
  {
    sanity: 'geopoint',
    supabase: 'longitude',
    direction: 'toSupabase',
    transformToSupabase: (value) => value?.lng || null,
  },
  { sanity: 'formattedAddress', supabase: 'formatted_address', direction: 'toSupabase' },

  // ─────────────────────────────────────────────────────────────────────────
  // Media (Sanity → Supabase)
  // ─────────────────────────────────────────────────────────────────────────
  { sanity: 'imageUrl', supabase: 'image', direction: 'toSupabase' },

  // ─────────────────────────────────────────────────────────────────────────
  // Business Info (Sanity → Supabase)
  // ─────────────────────────────────────────────────────────────────────────
  { sanity: 'michelinStars', supabase: 'michelin_stars', direction: 'toSupabase' },
  { sanity: 'rating', supabase: 'rating', direction: 'toSupabase' },
  { sanity: 'priceLevel', supabase: 'price_level', direction: 'toSupabase' },
  { sanity: 'editorialSummary', supabase: 'editorial_summary', direction: 'toSupabase' },

  // ─────────────────────────────────────────────────────────────────────────
  // Architecture (Sanity → Supabase)
  // ─────────────────────────────────────────────────────────────────────────
  { sanity: 'architect', supabase: 'architect', direction: 'toSupabase' },
  { sanity: 'interiorDesigner', supabase: 'interior_designer', direction: 'toSupabase' },
  { sanity: 'designFirm', supabase: 'design_firm', direction: 'toSupabase' },
  { sanity: 'architecturalStyle', supabase: 'architectural_style', direction: 'toSupabase' },
  { sanity: 'designPeriod', supabase: 'design_period', direction: 'toSupabase' },
  { sanity: 'constructionYear', supabase: 'construction_year', direction: 'toSupabase' },
  {
    sanity: 'architecturalSignificance',
    supabase: 'architectural_significance',
    direction: 'toSupabase',
  },
  {
    sanity: 'designStory',
    supabase: 'design_story',
    direction: 'toSupabase',
    transformToSupabase: portableTextToPlainText,
  },
  {
    sanity: 'designAwards',
    supabase: 'design_awards',
    direction: 'toSupabase',
    transformToSupabase: (value) => (value ? JSON.stringify(value) : null),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Booking & Contact (Sanity → Supabase)
  // ─────────────────────────────────────────────────────────────────────────
  { sanity: 'website', supabase: 'website', direction: 'toSupabase' },
  { sanity: 'phoneNumber', supabase: 'phone_number', direction: 'toSupabase' },
  { sanity: 'instagramHandle', supabase: 'instagram_handle', direction: 'toSupabase' },
  { sanity: 'opentableUrl', supabase: 'opentable_url', direction: 'toSupabase' },
  { sanity: 'resyUrl', supabase: 'resy_url', direction: 'toSupabase' },
  { sanity: 'bookingUrl', supabase: 'booking_url', direction: 'toSupabase' },
  { sanity: 'googleMapsUrl', supabase: 'google_maps_url', direction: 'toSupabase' },

  // ─────────────────────────────────────────────────────────────────────────
  // Enrichment Data (Supabase → Sanity, read-only in Sanity)
  // ─────────────────────────────────────────────────────────────────────────
  { sanity: 'placeId', supabase: 'place_id', direction: 'toSanity' },
  { sanity: 'userRatingsTotal', supabase: 'user_ratings_total', direction: 'toSanity' },
  {
    sanity: 'openingHours',
    supabase: 'opening_hours_json',
    direction: 'toSanity',
    transformToSanity: (value) => {
      if (!value) return null;
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return {
        weekdayText: parsed.weekday_text || [],
        openNow: parsed.open_now || false,
      };
    },
  },
  { sanity: 'viewsCount', supabase: 'views_count', direction: 'toSanity' },
  { sanity: 'savesCount', supabase: 'saves_count', direction: 'toSanity' },
  { sanity: 'lastEnrichedAt', supabase: 'last_enriched_at', direction: 'toSanity' },
  { sanity: 'supabaseId', supabase: 'id', direction: 'toSanity' },

  // ─────────────────────────────────────────────────────────────────────────
  // Bi-directional (sync both ways)
  // ─────────────────────────────────────────────────────────────────────────
  {
    sanity: 'instagramHandle',
    supabase: 'instagram_url',
    direction: 'toSupabase',
    transformToSupabase: (handle) =>
      handle ? `https://instagram.com/${handle.replace('@', '')}` : null,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert Sanity Portable Text to plain text
 */
export function portableTextToPlainText(blocks: PortableTextBlock[] | undefined): string {
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
 * Convert plain text to Sanity Portable Text
 */
export function plainTextToPortableText(text: string | undefined): PortableTextBlock[] {
  if (!text) return [];

  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((paragraph, index) => ({
    _type: 'block',
    _key: `block-${index}`,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        text: paragraph.trim(),
        marks: [],
      },
    ],
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPPING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map Sanity document to Supabase row format
 * Only includes fields that should sync from Sanity → Supabase
 */
export function mapSanityToSupabase(
  sanityDoc: SanityDestination
): Partial<Destination> & { updated_at: string } {
  const result: Record<string, any> = {};

  // Get mappings for Sanity → Supabase direction
  const toSupabaseMappings = FIELD_MAPPINGS.filter(
    (m) => m.direction === 'toSupabase' || m.direction === 'both'
  );

  for (const mapping of toSupabaseMappings) {
    const sanityValue = (sanityDoc as any)[mapping.sanity];

    if (sanityValue !== undefined) {
      const transformedValue = mapping.transformToSupabase
        ? mapping.transformToSupabase(sanityValue, sanityDoc)
        : sanityValue;

      // Only set if value is not undefined
      if (transformedValue !== undefined) {
        result[mapping.supabase] = transformedValue;
      }
    }
  }

  // Add timestamp
  result.updated_at = new Date().toISOString();

  return result as Partial<Destination> & { updated_at: string };
}

/**
 * Map Supabase row to Sanity document format
 * Only includes fields that should sync from Supabase → Sanity
 */
export function mapSupabaseToSanity(
  supabaseRow: Partial<Destination>
): Partial<SanityDestination> {
  const result: Record<string, any> = {
    _type: 'destination',
  };

  // Get mappings for Supabase → Sanity direction
  const toSanityMappings = FIELD_MAPPINGS.filter(
    (m) => m.direction === 'toSanity' || m.direction === 'both'
  );

  for (const mapping of toSanityMappings) {
    const supabaseValue = (supabaseRow as any)[mapping.supabase];

    if (supabaseValue !== undefined) {
      const transformedValue = mapping.transformToSanity
        ? mapping.transformToSanity(supabaseValue, supabaseRow)
        : supabaseValue;

      if (transformedValue !== undefined) {
        result[mapping.sanity] = transformedValue;
      }
    }
  }

  // Add sync timestamp
  result.lastSyncedAt = new Date().toISOString();

  return result as Partial<SanityDestination>;
}

/**
 * Get list of editorial fields (Sanity is source of truth)
 */
export function getEditorialFields(): string[] {
  return FIELD_MAPPINGS.filter((m) => m.direction === 'toSupabase').map((m) => m.supabase);
}

/**
 * Get list of enrichment fields (Supabase is source of truth)
 */
export function getEnrichmentFields(): string[] {
  return FIELD_MAPPINGS.filter((m) => m.direction === 'toSanity').map((m) => m.supabase);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export interface ConflictInfo {
  field: string;
  sanityValue: any;
  supabaseValue: any;
  lastSanityUpdate?: string;
  lastSupabaseUpdate?: string;
}

/**
 * Detect conflicts between Sanity and Supabase data
 * Returns fields where both sides have different values and both were recently updated
 */
export function detectConflicts(
  sanityDoc: SanityDestination,
  supabaseRow: Partial<Destination>,
  conflictWindowMs: number = 5 * 60 * 1000 // 5 minutes
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const now = Date.now();

  // Only check editorial fields for conflicts (where Sanity should be source of truth)
  const editorialMappings = FIELD_MAPPINGS.filter((m) => m.direction === 'toSupabase');

  for (const mapping of editorialMappings) {
    const sanityValue = (sanityDoc as any)[mapping.sanity];
    const supabaseValue = (supabaseRow as any)[mapping.supabase];

    // Transform Sanity value for comparison
    const transformedSanityValue = mapping.transformToSupabase
      ? mapping.transformToSupabase(sanityValue, sanityDoc)
      : sanityValue;

    // Check if values differ
    if (!valuesEqual(transformedSanityValue, supabaseValue)) {
      // Check if Supabase was updated within the conflict window
      const supabaseUpdatedAt = supabaseRow.last_enriched_at || (supabaseRow as any).updated_at;
      const supabaseUpdateTime = supabaseUpdatedAt ? new Date(supabaseUpdatedAt).getTime() : 0;

      const sanityUpdateTime = sanityDoc._updatedAt
        ? new Date(sanityDoc._updatedAt).getTime()
        : 0;

      // Both were updated recently = potential conflict
      if (now - supabaseUpdateTime < conflictWindowMs && now - sanityUpdateTime < conflictWindowMs) {
        conflicts.push({
          field: mapping.supabase,
          sanityValue: transformedSanityValue,
          supabaseValue,
          lastSanityUpdate: sanityDoc._updatedAt,
          lastSupabaseUpdate: supabaseUpdatedAt,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Compare two values for equality (handles arrays and objects)
 */
function valuesEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => valuesEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => valuesEqual(a[key], b[key]));
  }

  return String(a) === String(b);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLISHING STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a document should be synced to Supabase
 * Uses Sanity's native publish state - documents with 'drafts.' prefix are drafts
 */
export function shouldSyncToSupabase(sanityDoc: SanityDestination): boolean {
  // In Sanity, published documents don't have 'drafts.' prefix in their _id
  return !sanityDoc._id.startsWith('drafts.');
}
