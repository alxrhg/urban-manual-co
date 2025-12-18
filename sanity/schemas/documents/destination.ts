import { defineField, defineType } from 'sanity';

/**
 * Destination Schema - Primary CMS Content Type
 *
 * This is the comprehensive schema for travel destinations.
 * Fields are organized into groups for better editorial experience.
 *
 * Sync behavior:
 * - Editorial fields: Edited in Sanity, synced TO Supabase
 * - Enrichment fields: Read-only, synced FROM Supabase
 */

// Category options for destinations
const CATEGORY_OPTIONS = [
  { title: 'Restaurant', value: 'restaurant' },
  { title: 'Hotel', value: 'hotel' },
  { title: 'Bar', value: 'bar' },
  { title: 'Cafe', value: 'cafe' },
  { title: 'Shop', value: 'shop' },
  { title: 'Gallery', value: 'gallery' },
  { title: 'Museum', value: 'museum' },
  { title: 'Landmark', value: 'landmark' },
  { title: 'Park', value: 'park' },
  { title: 'Beach', value: 'beach' },
  { title: 'Spa', value: 'spa' },
  { title: 'Club', value: 'club' },
  { title: 'Theater', value: 'theater' },
  { title: 'Market', value: 'market' },
  { title: 'Other', value: 'other' },
];

// Price level options
const PRICE_LEVEL_OPTIONS = [
  { title: '$ - Budget', value: 1 },
  { title: '$$ - Moderate', value: 2 },
  { title: '$$$ - Expensive', value: 3 },
  { title: '$$$$ - Very Expensive', value: 4 },
];

export default defineType({
  name: 'destination',
  title: 'Destination',
  type: 'document',

  // Organize fields into logical groups
  groups: [
    { name: 'editorial', title: 'Editorial', default: true },
    { name: 'location', title: 'Location' },
    { name: 'media', title: 'Media' },
    { name: 'business', title: 'Business Info' },
    { name: 'architecture', title: 'Architecture & Design' },
    { name: 'booking', title: 'Booking & Contact' },
    { name: 'enrichment', title: 'Enrichment Data' },
  ],

  fields: [
    // ═══════════════════════════════════════════════════════════════════
    // EDITORIAL - Core content fields
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'editorial',
      validation: (rule) => rule.required().min(2).max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'editorial',
      options: {
        source: 'name',
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .slice(0, 96),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'editorial',
      of: [{ type: 'string' }],
      options: {
        list: CATEGORY_OPTIONS,
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'microDescription',
      title: 'Micro Description',
      type: 'string',
      group: 'editorial',
      description: 'Short 1-line description for cards (50-100 characters)',
      validation: (rule) => rule.max(150),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'editorial',
      of: [{ type: 'block' }],
      description: 'Rich text description of the destination',
    }),
    defineField({
      name: 'content',
      title: 'Full Content',
      type: 'array',
      group: 'editorial',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
            },
            {
              name: 'alt',
              type: 'string',
              title: 'Alt Text',
            },
          ],
        },
      ],
      description: 'Longer form editorial content with images',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'editorial',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'crown',
      title: 'Crown (Featured)',
      type: 'boolean',
      group: 'editorial',
      description: 'Mark as a crown/featured destination',
      initialValue: false,
    }),
    defineField({
      name: 'brand',
      title: 'Brand (Legacy)',
      type: 'string',
      group: 'editorial',
      description: 'Legacy brand name field - use Brand Reference instead',
      hidden: true,
    }),
    defineField({
      name: 'brandRef',
      title: 'Brand',
      type: 'reference',
      to: [{ type: 'brand' }],
      group: 'editorial',
      description: 'Link to brand for logo and chain information',
    }),

    // ═══════════════════════════════════════════════════════════════════
    // LOCATION - Geographic information
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      group: 'location',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      group: 'location',
    }),
    defineField({
      name: 'neighborhood',
      title: 'Neighborhood',
      type: 'string',
      group: 'location',
      description: 'Specific neighborhood within city',
    }),
    defineField({
      name: 'geopoint',
      title: 'Location',
      type: 'geopoint',
      group: 'location',
      description: 'Latitude and longitude coordinates',
    }),
    defineField({
      name: 'formattedAddress',
      title: 'Formatted Address',
      type: 'string',
      group: 'location',
    }),

    // ═══════════════════════════════════════════════════════════════════
    // MEDIA - Images and visual content
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      group: 'media',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Important for SEO and accessibility. Use AI Assist to auto-generate.',
          validation: (rule) =>
            rule.custom((value, context) => {
              const parent = context.parent as { asset?: { _ref?: string } };
              if (parent?.asset?._ref && !value) {
                return 'Alt text is required for accessibility';
              }
              return true;
            }),
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
        },
      ],
    }),
    defineField({
      name: 'imageUrl',
      title: 'External Image URL',
      type: 'url',
      group: 'media',
      description: 'External image URL (if not using Sanity assets)',
    }),
    defineField({
      name: 'gallery',
      title: 'Image Gallery',
      type: 'array',
      group: 'media',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', type: 'string', title: 'Alt Text' },
            { name: 'caption', type: 'string', title: 'Caption' },
          ],
        },
      ],
    }),

    // ═══════════════════════════════════════════════════════════════════
    // BUSINESS INFO - Ratings, prices, recognition
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'michelinStars',
      title: 'Michelin Stars',
      type: 'number',
      group: 'business',
      options: {
        list: [
          { title: 'None', value: 0 },
          { title: '1 Star', value: 1 },
          { title: '2 Stars', value: 2 },
          { title: '3 Stars', value: 3 },
        ],
      },
      initialValue: 0,
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      group: 'business',
      description: 'Rating out of 5',
      validation: (rule) => rule.min(0).max(5),
    }),
    defineField({
      name: 'priceLevel',
      title: 'Price Level',
      type: 'number',
      group: 'business',
      options: {
        list: PRICE_LEVEL_OPTIONS,
      },
    }),
    defineField({
      name: 'editorialSummary',
      title: 'Editorial Summary',
      type: 'text',
      group: 'business',
      description: 'Brief editorial summary',
      rows: 3,
    }),

    // ═══════════════════════════════════════════════════════════════════
    // ARCHITECTURE & DESIGN
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'architect',
      title: 'Architect',
      type: 'string',
      group: 'architecture',
    }),
    defineField({
      name: 'interiorDesigner',
      title: 'Interior Designer',
      type: 'string',
      group: 'architecture',
    }),
    defineField({
      name: 'designFirm',
      title: 'Design Firm',
      type: 'string',
      group: 'architecture',
    }),
    defineField({
      name: 'architecturalStyle',
      title: 'Architectural Style',
      type: 'string',
      group: 'architecture',
      description: 'e.g., Brutalism, Modernism, Art Deco',
    }),
    defineField({
      name: 'designPeriod',
      title: 'Design Period',
      type: 'string',
      group: 'architecture',
      description: 'e.g., 1960s, Contemporary, Victorian',
    }),
    defineField({
      name: 'constructionYear',
      title: 'Construction Year',
      type: 'number',
      group: 'architecture',
      validation: (rule) => rule.min(1000).max(2100),
    }),
    defineField({
      name: 'architecturalSignificance',
      title: 'Architectural Significance',
      type: 'text',
      group: 'architecture',
      description: 'Why this matters architecturally',
      rows: 4,
    }),
    defineField({
      name: 'designStory',
      title: 'Design Story',
      type: 'array',
      group: 'architecture',
      of: [{ type: 'block' }],
      description: 'Rich narrative about the design',
    }),
    defineField({
      name: 'designAwards',
      title: 'Design Awards',
      type: 'array',
      group: 'architecture',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', type: 'string', title: 'Award Name' },
            { name: 'year', type: 'number', title: 'Year' },
            { name: 'organization', type: 'string', title: 'Organization' },
          ],
        },
      ],
    }),

    // ═══════════════════════════════════════════════════════════════════
    // BOOKING & CONTACT
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'booking',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Phone Number',
      type: 'string',
      group: 'booking',
    }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram Handle',
      type: 'string',
      group: 'booking',
      description: 'Without the @ symbol',
    }),
    defineField({
      name: 'opentableUrl',
      title: 'OpenTable URL',
      type: 'url',
      group: 'booking',
    }),
    defineField({
      name: 'resyUrl',
      title: 'Resy URL',
      type: 'url',
      group: 'booking',
    }),
    defineField({
      name: 'bookingUrl',
      title: 'Booking URL',
      type: 'url',
      group: 'booking',
      description: 'Generic booking/reservation link',
    }),
    defineField({
      name: 'googleMapsUrl',
      title: 'Google Maps URL',
      type: 'url',
      group: 'booking',
    }),

    // ═══════════════════════════════════════════════════════════════════
    // ENRICHMENT DATA (Read-only, synced FROM Supabase)
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'placeId',
      title: 'Google Place ID',
      type: 'string',
      group: 'enrichment',
      readOnly: true,
    }),
    defineField({
      name: 'userRatingsTotal',
      title: 'Total User Ratings',
      type: 'number',
      group: 'enrichment',
      readOnly: true,
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening Hours',
      type: 'object',
      group: 'enrichment',
      readOnly: true,
      fields: [
        { name: 'weekdayText', type: 'array', of: [{ type: 'string' }] },
        { name: 'openNow', type: 'boolean' },
      ],
    }),
    defineField({
      name: 'viewsCount',
      title: 'Views Count',
      type: 'number',
      group: 'enrichment',
      readOnly: true,
    }),
    defineField({
      name: 'savesCount',
      title: 'Saves Count',
      type: 'number',
      group: 'enrichment',
      readOnly: true,
    }),
    defineField({
      name: 'lastEnrichedAt',
      title: 'Last Enriched',
      type: 'datetime',
      group: 'enrichment',
      readOnly: true,
    }),
    defineField({
      name: 'lastSyncedAt',
      title: 'Last Synced',
      type: 'datetime',
      group: 'enrichment',
      readOnly: true,
    }),

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL REFERENCES
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'parentDestination',
      title: 'Parent Destination',
      type: 'reference',
      to: [{ type: 'destination' }],
      group: 'editorial',
      description: 'For nested destinations (e.g., restaurant inside a hotel)',
    }),
    defineField({
      name: 'supabaseId',
      title: 'Supabase ID',
      type: 'number',
      group: 'enrichment',
      readOnly: true,
      description: 'ID in Supabase destinations table',
    }),
  ],

  // Preview configuration for Sanity Studio
  preview: {
    select: {
      title: 'name',
      subtitle: 'city',
      media: 'heroImage',
      categories: 'categories',
      michelinStars: 'michelinStars',
      crown: 'crown',
    },
    prepare({ title, subtitle, media, categories, michelinStars, crown }) {
      const badges: string[] = [];
      if (crown) badges.push('👑');
      if (michelinStars) badges.push('⭐'.repeat(michelinStars));

      const badgeStr = badges.length > 0 ? ` ${badges.join(' ')}` : '';
      const categoryDisplay = Array.isArray(categories) && categories.length > 0
        ? categories.join(', ')
        : 'Uncategorized';

      return {
        title: `${title}${badgeStr}`,
        subtitle: `${categoryDisplay} • ${subtitle || 'No city'}`,
        media,
      };
    },
  },

  // Ordering options in Sanity Studio
  orderings: [
    {
      title: 'Name, A-Z',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
    {
      title: 'City, A-Z',
      name: 'cityAsc',
      by: [{ field: 'city', direction: 'asc' }],
    },
    {
      title: 'Recently Updated',
      name: 'updatedDesc',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
  ],
});
