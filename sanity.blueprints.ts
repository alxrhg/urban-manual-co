/**
 * Sanity Blueprints Configuration
 *
 * Defines Sanity Functions that run in Sanity's infrastructure.
 * These replace traditional webhooks with more secure, scalable automation.
 *
 * Deploy with: npx sanity blueprints deploy
 * Test locally: npx sanity functions test sync-destination-to-supabase
 */

import { defineBlueprint, defineDocumentFunction } from '@sanity/blueprints';

export default defineBlueprint({
  resources: [
    // Sync destination documents to Supabase on publish
    defineDocumentFunction({
      name: 'sync-destination-to-supabase',
      // Syncs destination documents to Supabase when published or updated
      event: {
        // Trigger on publish and update events
        on: ['publish', 'update'],
        // Only trigger for destination documents
        filter: '_type == "destination"',
        // Project the fields we need for sync
        projection: `{
          _id,
          _type,
          _createdAt,
          _updatedAt,
          _rev,
          name,
          slug,
          categories,
          microDescription,
          description,
          content,
          tags,
          crown,
          brand,
          city,
          country,
          neighborhood,
          geopoint,
          formattedAddress,
          heroImage,
          imageUrl,
          gallery,
          michelinStars,
          rating,
          priceLevel,
          editorialSummary,
          architect,
          interiorDesigner,
          designFirm,
          architecturalStyle,
          designPeriod,
          constructionYear,
          architecturalSignificance,
          designStory,
          designAwards,
          website,
          phoneNumber,
          instagramHandle,
          opentableUrl,
          resyUrl,
          bookingUrl,
          googleMapsUrl,
          placeId,
          userRatingsTotal,
          openingHours,
          viewsCount,
          savesCount,
          lastEnrichedAt,
          lastSyncedAt,
          parentDestination,
          supabaseId
        }`,
      },
    }),

    // Handle document deletion
    defineDocumentFunction({
      name: 'handle-destination-delete',
      // Handles destination document deletion events
      event: {
        on: ['delete'],
        filter: '_type == "destination"',
        projection: '{ _id, slug }',
      },
    }),
  ],
});
