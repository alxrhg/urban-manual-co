/**
 * Sanity CLI Configuration
 * 
 * This file is used by the Sanity CLI to configure your project.
 * It's automatically used when you run commands like:
 * - npx sanity init
 * - npx sanity start
 * - npx sanity deploy
 */

import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ryd11bal',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  },
  
  /**
   * Enable auto-updates for incompatible plugins
   * This is only used for plugins being loaded by the CLI directly
   */
  autoUpdates: true,
})
