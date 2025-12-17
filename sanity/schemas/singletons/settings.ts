/**
 * Settings Schema (Singleton)
 *
 * Global site settings managed through Sanity.
 * Only one settings document should exist.
 */

import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',

  fields: [
    defineField({
      name: 'title',
      title: 'Site Title',
      type: 'string',
      description: 'The main title of the website',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Site Description',
      type: 'text',
      description: 'Used for SEO meta description',
      rows: 3,
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      description: 'Default image for social sharing',
      options: {
        hotspot: true,
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
      name: 'footer',
      title: 'Footer',
      type: 'object',
      fields: [
        {
          name: 'copyright',
          type: 'string',
          title: 'Copyright Text',
        },
        {
          name: 'links',
          type: 'array',
          title: 'Footer Links',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'title', type: 'string', title: 'Title' },
                { name: 'url', type: 'url', title: 'URL' },
              ],
            },
          ],
        },
      ],
    }),
  ],

  preview: {
    prepare() {
      return {
        title: 'Site Settings',
      };
    },
  },
});
