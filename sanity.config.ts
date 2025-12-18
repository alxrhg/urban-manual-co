/**
 * Sanity Studio Configuration
 *
 * This file configures the embedded Sanity Studio at /studio.
 * Includes:
 * - Presentation Tool for visual editing
 * - Structure Tool for custom document organization
 * - Vision Tool for GROQ query testing
 * - AI Assist for content generation
 */

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { assist } from '@sanity/assist';
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash';
// NOTE: Google Maps Input temporarily disabled - not compatible with Sanity v5
// import { googleMapsInput } from '@sanity/google-maps-input';
import { schemaTypes } from './sanity/schemas';
import { apiVersion, dataset, projectId, studioUrl } from './lib/sanity/env';

// NOTE: Dashboard plugin temporarily disabled - not compatible with Sanity v5
// import { dashboardTool, projectInfoWidget, projectUsersWidget } from '@sanity/dashboard';
// import { documentListWidget } from 'sanity-plugin-dashboard-widget-document-list';

// Preview URL for Presentation Tool
const PREVIEW_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Resolve document href for preview
 */
function resolveHref(
  documentType?: string,
  slug?: string
): string | undefined {
  switch (documentType) {
    case 'destination':
      return slug ? `/destinations/${slug}` : undefined;
    case 'settings':
      return '/';
    default:
      return undefined;
  }
}

export default defineConfig({
  name: 'urban-manual-cms',
  title: process.env.NEXT_PUBLIC_SANITY_PROJECT_TITLE || 'Urban Manual CMS',
  projectId: projectId || '',
  dataset,
  basePath: studioUrl,
  apiVersion,

  // Media Library - Centralized asset management
  // Requires Sanity plan with Media Library feature
  mediaLibrary: {
    enabled: true,
  },

  plugins: [
    // NOTE: Dashboard Tool temporarily disabled - not compatible with Sanity v5
    // Re-enable when @sanity/dashboard supports Sanity v5

    // Structure Tool - Document organization and list customization
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Destinations group
            S.listItem()
              .title('Destinations')
              .schemaType('destination')
              .child(
                S.documentTypeList('destination')
                  .title('All Destinations')
                  .defaultOrdering([{ field: 'name', direction: 'asc' }])
              ),
            // Brands catalog
            S.listItem()
              .title('Brands')
              .schemaType('brand')
              .child(
                S.documentTypeList('brand')
                  .title('All Brands')
                  .defaultOrdering([{ field: 'name', direction: 'asc' }])
              ),
            S.divider(),
            // By Status
            S.listItem()
              .title('By Status')
              .child(
                S.list()
                  .title('By Status')
                  .items([
                    S.listItem()
                      .title('Published')
                      .child(
                        S.documentTypeList('destination')
                          .title('Published')
                          .filter('_type == "destination" && status == "published"')
                      ),
                    S.listItem()
                      .title('Drafts')
                      .child(
                        S.documentTypeList('destination')
                          .title('Drafts')
                          .filter('_type == "destination" && status == "draft"')
                      ),
                    S.listItem()
                      .title('In Review')
                      .child(
                        S.documentTypeList('destination')
                          .title('In Review')
                          .filter('_type == "destination" && status == "review"')
                      ),
                    S.listItem()
                      .title('Scheduled')
                      .child(
                        S.documentTypeList('destination')
                          .title('Scheduled')
                          .filter('_type == "destination" && status == "scheduled"')
                      ),
                    S.listItem()
                      .title('Archived')
                      .child(
                        S.documentTypeList('destination')
                          .title('Archived')
                          .filter('_type == "destination" && status == "archived"')
                      ),
                  ])
              ),
            // By Category
            S.listItem()
              .title('By Category')
              .child(
                S.list()
                  .title('By Category')
                  .items([
                    S.listItem()
                      .title('Restaurants')
                      .child(
                        S.documentTypeList('destination')
                          .title('Restaurants')
                          .filter('_type == "destination" && category == "restaurant"')
                      ),
                    S.listItem()
                      .title('Hotels')
                      .child(
                        S.documentTypeList('destination')
                          .title('Hotels')
                          .filter('_type == "destination" && category == "hotel"')
                      ),
                    S.listItem()
                      .title('Bars')
                      .child(
                        S.documentTypeList('destination')
                          .title('Bars')
                          .filter('_type == "destination" && category == "bar"')
                      ),
                    S.listItem()
                      .title('Cafes')
                      .child(
                        S.documentTypeList('destination')
                          .title('Cafes')
                          .filter('_type == "destination" && category == "cafe"')
                      ),
                    S.listItem()
                      .title('Shops')
                      .child(
                        S.documentTypeList('destination')
                          .title('Shops')
                          .filter('_type == "destination" && category == "shop"')
                      ),
                    S.listItem()
                      .title('Galleries & Museums')
                      .child(
                        S.documentTypeList('destination')
                          .title('Galleries & Museums')
                          .filter('_type == "destination" && (category == "gallery" || category == "museum")')
                      ),
                  ])
              ),
            S.divider(),
            // Featured destinations
            S.listItem()
              .title('Featured (Crown)')
              .child(
                S.documentTypeList('destination')
                  .title('Featured Destinations')
                  .filter('_type == "destination" && crown == true')
              ),
            // Michelin starred
            S.listItem()
              .title('Michelin Starred')
              .child(
                S.documentTypeList('destination')
                  .title('Michelin Starred')
                  .filter('_type == "destination" && michelinStars > 0')
                  .defaultOrdering([{ field: 'michelinStars', direction: 'desc' }])
              ),
          ]),
    }),

    // Presentation Tool - Visual editing with live preview
    presentationTool({
      previewUrl: {
        draftMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        mainDocuments: [
          {
            route: '/destinations/:slug',
            filter: '_type == "destination" && slug.current == $slug',
          },
        ],
      },
    }),

    // Vision Tool - GROQ query playground
    visionTool({ defaultApiVersion: apiVersion }),

    // AI Assist - AI-powered content suggestions
    assist(),

    // Unsplash - Stock photo integration
    unsplashImageAsset(),

    // NOTE: Google Maps Input temporarily disabled - not compatible with Sanity v5
    // googleMapsInput({
    //   apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
    //   defaultZoom: 15,
    //   defaultLocation: {
    //     lat: 40.7128,
    //     lng: -74.006,
    //   },
    // }),
  ],

  schema: {
    types: schemaTypes,
  },
});
