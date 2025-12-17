/**
 * Sanity CLI Configuration
 *
 * This file configures the Sanity CLI for:
 * - Sanity-hosted Studio deployment (sanity deploy)
 * - Schema extraction and type generation
 * - Blueprint/Functions deployment
 *
 * Deploy to Sanity hosting: npx sanity deploy
 * Your Studio will be available at: https://<project-name>.sanity.studio
 */

import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },

  /**
   * Deployment configuration for Sanity-hosted studios
   * Run `npx sanity deploy` to deploy to Sanity hosting
   */
  deployment: {
    appId: 'zrbwei86rxluvt09l2hz28bx',
    autoUpdates: true,
  },

  /**
   * Sanity-hosted Studio hostname
   */
  studioHost: 'urban-manual',
});
