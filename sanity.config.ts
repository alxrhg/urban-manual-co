import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './sanity/schemas';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-10-01';

if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID. Please set it in your env.');
}

export default defineConfig({
  name: 'urban-manual-cms',
  title: process.env.NEXT_PUBLIC_SANITY_PROJECT_TITLE || 'Urban Manual CMS',
  projectId,
  dataset,
  basePath: '/studio',
  apiVersion,
  plugins: [deskTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
