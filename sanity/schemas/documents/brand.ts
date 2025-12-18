import { defineField, defineType } from 'sanity';

/**
 * Brand Schema - Brand/Chain Catalog
 *
 * This schema manages brands and their logos for destinations.
 * Brands can be hotel chains (Four Seasons, Aman), restaurant groups,
 * or any organization that operates multiple destinations.
 */

// Category options for brands (what types of destinations they operate)
const BRAND_CATEGORY_OPTIONS = [
  { title: 'Hotels', value: 'hotel' },
  { title: 'Restaurants', value: 'restaurant' },
  { title: 'Bars', value: 'bar' },
  { title: 'Cafes', value: 'cafe' },
  { title: 'Spas', value: 'spa' },
  { title: 'Retail', value: 'shop' },
  { title: 'Mixed/Lifestyle', value: 'mixed' },
];

export default defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',

  groups: [
    { name: 'info', title: 'Brand Info', default: true },
    { name: 'media', title: 'Media' },
    { name: 'contact', title: 'Contact & Social' },
  ],

  fields: [
    // ═══════════════════════════════════════════════════════════════════
    // BRAND INFO
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'name',
      title: 'Brand Name',
      type: 'string',
      group: 'info',
      description: 'The official brand name (e.g., "Four Seasons", "Aman")',
      validation: (rule) => rule.required().min(2).max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'info',
      description: 'URL-friendly identifier',
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
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'info',
      description: 'Brief description of the brand',
      rows: 3,
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'info',
      description: 'Types of destinations this brand operates',
      of: [{ type: 'string' }],
      options: {
        list: BRAND_CATEGORY_OPTIONS,
      },
    }),
    defineField({
      name: 'founded',
      title: 'Year Founded',
      type: 'number',
      group: 'info',
      validation: (rule) => rule.min(1800).max(2100),
    }),
    defineField({
      name: 'headquarters',
      title: 'Headquarters',
      type: 'string',
      group: 'info',
      description: 'City or country where the brand is headquartered',
    }),
    defineField({
      name: 'tier',
      title: 'Brand Tier',
      type: 'string',
      group: 'info',
      description: 'Market positioning of the brand',
      options: {
        list: [
          { title: 'Ultra Luxury', value: 'ultra-luxury' },
          { title: 'Luxury', value: 'luxury' },
          { title: 'Upper Upscale', value: 'upper-upscale' },
          { title: 'Upscale', value: 'upscale' },
          { title: 'Upper Midscale', value: 'upper-midscale' },
          { title: 'Midscale', value: 'midscale' },
          { title: 'Economy', value: 'economy' },
        ],
      },
    }),

    // ═══════════════════════════════════════════════════════════════════
    // MEDIA - Logo and images
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'media',
      description: 'Primary brand logo (preferably SVG or transparent PNG)',
      options: {
        hotspot: false,
        accept: 'image/*',
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Alternative text for accessibility',
        },
      ],
    }),
    defineField({
      name: 'logoDark',
      title: 'Logo (Dark Mode)',
      type: 'image',
      group: 'media',
      description: 'Logo variant for dark backgrounds (optional)',
      options: {
        hotspot: false,
        accept: 'image/*',
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
        },
      ],
    }),
    defineField({
      name: 'logoIcon',
      title: 'Logo Icon/Symbol',
      type: 'image',
      group: 'media',
      description: 'Square icon version of the logo for small displays',
      options: {
        hotspot: false,
        accept: 'image/*',
      },
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      group: 'media',
      description: 'Featured image for brand pages',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
        },
      ],
    }),
    defineField({
      name: 'brandColor',
      title: 'Brand Color',
      type: 'string',
      group: 'media',
      description: 'Primary brand color (hex code, e.g., #1a1a1a)',
    }),

    // ═══════════════════════════════════════════════════════════════════
    // CONTACT & SOCIAL
    // ═══════════════════════════════════════════════════════════════════
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'contact',
    }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram Handle',
      type: 'string',
      group: 'contact',
      description: 'Without the @ symbol',
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn URL',
      type: 'url',
      group: 'contact',
    }),
  ],

  // Preview configuration for Sanity Studio
  preview: {
    select: {
      title: 'name',
      subtitle: 'tier',
      media: 'logo',
      categories: 'categories',
    },
    prepare({ title, subtitle, media, categories }) {
      const categoryDisplay =
        Array.isArray(categories) && categories.length > 0
          ? categories.join(', ')
          : 'No categories';

      return {
        title: title || 'Untitled Brand',
        subtitle: subtitle ? `${subtitle} • ${categoryDisplay}` : categoryDisplay,
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
      title: 'Recently Updated',
      name: 'updatedDesc',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
  ],
});
