import type { CollectionConfig } from 'payload'

export const Destinations: CollectionConfig = {
  slug: 'destinations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'category', 'michelin_stars'],
    listSearchableFields: ['name', 'city', 'country', 'slug'],
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    // Core fields
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier (e.g., "noma-copenhagen")',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'city',
          type: 'text',
          required: true,
          admin: { width: '33%' },
        },
        {
          name: 'country',
          type: 'text',
          admin: { width: '33%' },
        },
        {
          name: 'neighborhood',
          type: 'text',
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Restaurant', value: 'restaurant' },
        { label: 'Hotel', value: 'hotel' },
        { label: 'Bar', value: 'bar' },
        { label: 'Cafe', value: 'cafe' },
        { label: 'Museum', value: 'museum' },
        { label: 'Gallery', value: 'gallery' },
        { label: 'Shop', value: 'shop' },
        { label: 'Landmark', value: 'landmark' },
        { label: 'Park', value: 'park' },
        { label: 'Beach', value: 'beach' },
        { label: 'Market', value: 'market' },
        { label: 'Spa', value: 'spa' },
        { label: 'Club', value: 'club' },
        { label: 'Theater', value: 'theater' },
        { label: 'Other', value: 'other' },
      ],
    },

    // Descriptions
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'micro_description',
              type: 'text',
              admin: {
                description: 'Short 1-line description for cards (max 100 chars)',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              admin: {
                description: 'Medium description for destination page',
              },
            },
            {
              name: 'content',
              type: 'richText',
              admin: {
                description: 'Full editorial content',
              },
            },
          ],
        },
        {
          label: 'Media',
          fields: [
            {
              name: 'image',
              type: 'text',
              admin: {
                description: 'Main image URL',
              },
            },
            {
              name: 'image_thumbnail',
              type: 'text',
              admin: {
                description: 'Optimized thumbnail URL',
              },
            },
          ],
        },
        {
          label: 'Details',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'michelin_stars',
                  type: 'number',
                  min: 0,
                  max: 3,
                  admin: { width: '25%' },
                },
                {
                  name: 'crown',
                  type: 'checkbox',
                  admin: { width: '25%' },
                },
                {
                  name: 'rating',
                  type: 'number',
                  min: 0,
                  max: 5,
                  admin: { width: '25%' },
                },
                {
                  name: 'price_level',
                  type: 'number',
                  min: 1,
                  max: 4,
                  admin: { width: '25%' },
                },
              ],
            },
            {
              name: 'brand',
              type: 'text',
            },
            {
              name: 'tags',
              type: 'json',
              admin: {
                description: 'Array of tags (e.g., ["fine dining", "tasting menu"])',
              },
            },
          ],
        },
        {
          label: 'Architecture',
          fields: [
            {
              name: 'architect',
              type: 'text',
            },
            {
              name: 'interior_designer',
              type: 'text',
            },
            {
              name: 'design_firm',
              type: 'text',
            },
            {
              name: 'architectural_style',
              type: 'text',
            },
            {
              name: 'construction_year',
              type: 'number',
            },
            {
              name: 'architectural_significance',
              type: 'textarea',
            },
            {
              name: 'design_story',
              type: 'richText',
            },
          ],
        },
        {
          label: 'Location',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'latitude',
                  type: 'number',
                  admin: { width: '50%' },
                },
                {
                  name: 'longitude',
                  type: 'number',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'formatted_address',
              type: 'text',
            },
            {
              name: 'google_maps_url',
              type: 'text',
            },
            {
              name: 'place_id',
              type: 'text',
              admin: {
                description: 'Google Places ID',
              },
            },
          ],
        },
        {
          label: 'Contact & Booking',
          fields: [
            {
              name: 'website',
              type: 'text',
            },
            {
              name: 'phone_number',
              type: 'text',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'instagram_handle',
                  type: 'text',
                  admin: { width: '50%' },
                },
                {
                  name: 'instagram_url',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'opentable_url',
                  type: 'text',
                  admin: { width: '33%' },
                },
                {
                  name: 'resy_url',
                  type: 'text',
                  admin: { width: '33%' },
                },
                {
                  name: 'booking_url',
                  type: 'text',
                  admin: { width: '33%' },
                },
              ],
            },
          ],
        },
        {
          label: 'Metadata',
          fields: [
            {
              name: 'parent_destination_id',
              type: 'number',
              admin: {
                description: 'ID of parent destination (for nested venues)',
              },
            },
            {
              name: 'intelligence_score',
              type: 'number',
            },
            {
              name: 'last_enriched_at',
              type: 'text',
              admin: {
                readOnly: true,
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'views_count',
                  type: 'number',
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'saves_count',
                  type: 'number',
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'visits_count',
                  type: 'number',
                  admin: { width: '33%', readOnly: true },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
