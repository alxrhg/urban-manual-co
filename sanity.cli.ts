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
   * Sanity-hosted Studio configuration
   * Run `npx sanity deploy` to deploy to Sanity hosting
   */
  studioHost: 'urban-manual',

  /**
   * Deployment settings
   * Auto-updates keeps your deployed studio up to date with the latest Sanity version
   */
  deployment: {
    autoUpdates: true,
  },
});
