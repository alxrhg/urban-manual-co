/**
 * Inngest Functions: Taste Profile
 *
 * Background job handlers for updating user taste profiles and syncing to Mem0.
 * Keeps user interactions fast by deferring heavy analysis to background jobs.
 */

import { inngest } from "../client";
import {
  tasteProfileEvolutionService,
  TasteProfile,
} from "@/services/intelligence/taste-profile-evolution";
import { mem0Service, isMem0Available } from "@/lib/ai/mem0";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Update user taste profile based on new interactions
 * This is triggered after user saves, visits, or views destinations
 */
export const updateTasteProfile = inngest.createFunction(
  {
    id: "update-taste-profile",
    name: "Update User Taste Profile",
    retries: 3,
    concurrency: {
      limit: 20,
    },
    // Debounce rapid interactions from same user
    debounce: {
      key: "event.data.userId",
      period: "30s",
    },
  },
  { event: "taste/update" },
  async ({ event, step }) => {
    const { userId, interactions } = event.data;

    // Convert string timestamps back to Date objects
    const parsedInteractions = interactions.map((i) => ({
      ...i,
      timestamp: new Date(i.timestamp),
      type: i.type as "view" | "save" | "visit",
    }));

    // Step 1: Update taste profile
    await step.run("update-profile", async () => {
      await tasteProfileEvolutionService.updateTasteProfile(
        userId,
        parsedInteractions
      );
    });

    // Step 2: Get updated profile
    const profile = await step.run("get-profile", async () => {
      return await tasteProfileEvolutionService.getTasteProfile(userId);
    });

    // Step 3: Sync to Mem0 if significant changes
    if (profile && interactions.length >= 3) {
      await step.sendEvent("sync-mem0", {
        name: "taste/sync-mem0",
        data: { userId },
      });
    }

    return {
      success: true,
      userId,
      interactionsProcessed: interactions.length,
      hasProfile: !!profile,
    };
  }
);

/**
 * Sync user taste profile to Mem0 for persistent memory
 */
export const syncProfileToMem0 = inngest.createFunction(
  {
    id: "sync-profile-mem0",
    name: "Sync Taste Profile to Mem0",
    retries: 2,
    concurrency: {
      limit: 5,
    },
    // Rate limit Mem0 syncs per user
    rateLimit: {
      key: "event.data.userId",
      limit: 5,
      period: "1h",
    },
  },
  { event: "taste/sync-mem0" },
  async ({ event, step }) => {
    const { userId } = event.data;

    if (!isMem0Available()) {
      return {
        success: false,
        error: "Mem0 not configured",
        userId,
      };
    }

    // Step 1: Get current taste profile
    const profile = await step.run("get-profile", async () => {
      return await tasteProfileEvolutionService.getTasteProfile(userId);
    });

    if (!profile) {
      return {
        success: false,
        error: "No taste profile found",
        userId,
      };
    }

    // Step 2: Sync to Mem0
    await step.run("sync-to-mem0", async () => {
      await tasteProfileEvolutionService.syncProfileToMem0(userId);
    });

    return {
      success: true,
      userId,
      profileSynced: true,
    };
  }
);

/**
 * Record a single interaction and update taste profile
 * This is a lightweight job for individual user actions
 */
export const recordInteraction = inngest.createFunction(
  {
    id: "record-interaction",
    name: "Record User Interaction",
    retries: 2,
    concurrency: {
      limit: 50,
    },
  },
  { event: "taste/record-interaction" },
  async ({ event, step }) => {
    const { userId, interaction } = event.data;

    // Step 1: Record to Mem0 (fire and forget)
    if (isMem0Available()) {
      await step.run("record-mem0", async () => {
        try {
          await mem0Service.recordInteraction(
            userId,
            interaction.type,
            interaction.destination
          );
        } catch (err) {
          console.debug("Mem0 interaction recording failed:", err);
        }
      });
    }

    // Step 2: Record to database if it's a significant action
    if (
      interaction.destination.id &&
      ["save", "visit"].includes(interaction.type)
    ) {
      await step.run("record-database", async () => {
        const supabase = createServiceRoleClient();

        await supabase.from("user_interactions").insert({
          user_id: userId,
          interaction_type: interaction.type,
          destination_id: interaction.destination.id,
          destination_slug: interaction.destination.slug,
          context: {
            name: interaction.destination.name,
            city: interaction.destination.city,
            category: interaction.destination.category,
          },
          created_at: new Date().toISOString(),
        });
      });

      // Step 3: Queue taste profile update (debounced)
      await step.sendEvent("queue-taste-update", {
        name: "taste/update",
        data: {
          userId,
          interactions: [
            {
              type: interaction.type as "save" | "visit",
              destinationId: interaction.destination.id!,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }

    return {
      success: true,
      userId,
      interactionType: interaction.type,
      destinationSlug: interaction.destination.slug,
    };
  }
);

export const tasteProfileFunctions = [
  updateTasteProfile,
  syncProfileToMem0,
  recordInteraction,
];
