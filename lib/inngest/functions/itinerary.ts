/**
 * Inngest Functions: Itinerary Generation
 *
 * Background job handlers for AI-powered itinerary generation.
 * Moves expensive AI calls out of the request/response cycle.
 * Clients poll for status or receive webhook callbacks.
 */

import { inngest } from "../client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  genAI,
  GEMINI_MODEL_PRO,
  isGeminiAvailable,
} from "@/lib/gemini";

// System prompt for itinerary generation
const ITINERARY_SYSTEM_PROMPT = `You are an expert travel planner for Urban Manual, a curated travel guide featuring 897+ destinations worldwide. Create detailed, personalized itineraries that showcase the best restaurants, hotels, cafes, bars, and attractions.

Guidelines:
- Create day-by-day itineraries with specific times and activities
- Include a mix of dining experiences (breakfast, lunch, dinner)
- Suggest activities appropriate for the time of day
- Consider travel time between locations
- Balance must-see highlights with hidden gems
- Account for user preferences and travel style
- Keep recommendations authentic and locally-focused
- Format each day clearly with time slots

Output format for each day:
Day [N]: [Theme/Focus]
- Morning (9:00): [Activity/Place]
- Lunch (12:30): [Restaurant recommendation]
- Afternoon (14:00): [Activity/Place]
- Evening (18:00): [Activity or dinner preparation]
- Dinner (19:30): [Restaurant recommendation]
- Night (21:00): [Optional: bar, show, or activity]

Include brief descriptions of why each place is worth visiting.`;

/**
 * Generate an itinerary in the background
 * Results are stored in the database and optionally sent via callback
 */
export const generateItinerary = inngest.createFunction(
  {
    id: "generate-itinerary",
    name: "Generate Trip Itinerary",
    retries: 2,
    concurrency: {
      limit: 10,
    },
  },
  { event: "itinerary/generate" },
  async ({ event, step }) => {
    const {
      jobId,
      userId,
      destination,
      dates,
      preferences = [],
      travelStyle = "moderate",
      budget = "moderate",
      tripId,
      callbackUrl,
    } = event.data;

    // Step 1: Mark job as started
    await step.run("mark-started", async () => {
      const supabase = createServiceRoleClient();
      await supabase.from("background_jobs").upsert(
        {
          id: jobId,
          type: "itinerary_generation",
          status: "processing",
          user_id: userId,
          metadata: {
            destination,
            dates,
            preferences,
            travelStyle,
            budget,
            tripId,
          },
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    });

    // Step 2: Calculate trip details
    const tripDetails = await step.run("calculate-trip-details", async () => {
      const startDate = new Date(dates.start);
      const endDate = new Date(dates.end);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const tripDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return { tripDays, startDate, endDate };
    });

    // Step 3: Fetch user preferences if logged in
    const userPreferences = await step.run("fetch-user-preferences", async () => {
      const allPreferences = [...preferences];

      if (userId) {
        try {
          const supabase = createServiceRoleClient();
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("favorite_cities, favorite_categories, travel_style")
            .eq("user_id", userId)
            .maybeSingle();

          if (profile?.favorite_categories) {
            allPreferences.push(...profile.favorite_categories);
          }
        } catch (error) {
          console.debug("User profile fetch failed (optional):", error);
        }
      }

      return [...new Set(allPreferences)]; // Dedupe
    });

    // Step 4: Generate itinerary with AI
    let itineraryContent: string | null = null;
    let error: string | null = null;

    try {
      itineraryContent = await step.run("generate-with-ai", async () => {
        if (!isGeminiAvailable() || !genAI) {
          throw new Error("AI service is not available");
        }

        const preferencesText =
          userPreferences.length > 0
            ? `User preferences: ${userPreferences.join(", ")}`
            : "No specific preferences provided";

        const budgetGuide = {
          budget:
            "Focus on affordable local spots, street food, free attractions, and budget-friendly accommodations.",
          moderate:
            "Mix of mid-range restaurants, quality attractions, and comfortable hotels.",
          luxury:
            "Emphasize fine dining, exclusive experiences, premium hotels, and VIP access where available.",
        }[budget];

        const paceGuide = {
          relaxed: "Keep the pace leisurely with plenty of downtime and flexibility.",
          moderate: "Balanced itinerary with good coverage but not rushed.",
          packed:
            "Maximize activities and experiences - ideal for those who want to see everything.",
        }[travelStyle];

        const prompt = `Create a detailed ${tripDetails.tripDays}-day itinerary for ${destination} from ${dates.start} to ${dates.end}.

${preferencesText}
Travel style: ${travelStyle} - ${paceGuide}
Budget level: ${budget} - ${budgetGuide}

Please create a comprehensive day-by-day itinerary following the format specified. Include specific venue names where possible, and explain why each recommendation fits the traveler's preferences.`;

        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL_PRO,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
          },
          systemInstruction: ITINERARY_SYSTEM_PROMPT,
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Itinerary generation failed:", err);
    }

    // Step 5: Store result
    const finalStatus = itineraryContent ? "completed" : "failed";

    await step.run("store-result", async () => {
      const supabase = createServiceRoleClient();

      // Update job status
      await supabase
        .from("background_jobs")
        .update({
          status: finalStatus,
          result: itineraryContent
            ? {
                content: itineraryContent,
                destination,
                dates,
                tripDays: tripDetails.tripDays,
                preferences: userPreferences,
                travelStyle,
                budget,
              }
            : null,
          error,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // If linked to a trip, update the trip
      if (tripId && itineraryContent) {
        await supabase
          .from("trips")
          .update({
            ai_itinerary: itineraryContent,
            ai_itinerary_generated_at: new Date().toISOString(),
          })
          .eq("id", tripId);
      }
    });

    // Step 6: Send completion event
    await step.sendEvent("send-completion-event", {
      name: "itinerary/draft-complete",
      data: {
        jobId,
        tripId,
        userId,
        status: finalStatus,
        content: itineraryContent || undefined,
        error: error || undefined,
      },
    });

    // Step 7: Notify callback URL if provided
    if (callbackUrl) {
      await step.run("notify-callback", async () => {
        try {
          await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "itinerary_complete",
              jobId,
              tripId,
              status: finalStatus,
              content: itineraryContent,
              error,
            }),
          });
        } catch (err) {
          console.warn("Callback notification failed:", err);
        }
      });
    }

    return {
      success: !!itineraryContent,
      jobId,
      tripId,
      status: finalStatus,
      tripDays: tripDetails.tripDays,
      error,
    };
  }
);

/**
 * Handle itinerary draft completion
 * Can be used to trigger notifications, analytics, etc.
 */
export const handleItineraryComplete = inngest.createFunction(
  {
    id: "handle-itinerary-complete",
    name: "Handle Itinerary Draft Complete",
  },
  { event: "itinerary/draft-complete" },
  async ({ event, step }) => {
    const { jobId, tripId, userId, status, content, error } = event.data;

    // Could trigger notifications, update analytics, etc.
    if (status === "completed" && userId) {
      await step.run("log-completion", async () => {
        console.log(
          `Itinerary job ${jobId} completed for user ${userId}${tripId ? ` (trip: ${tripId})` : ""}`
        );
      });
    }

    if (status === "failed") {
      await step.run("log-failure", async () => {
        console.error(
          `Itinerary job ${jobId} failed: ${error || "Unknown error"}`
        );
      });
    }

    return { handled: true, jobId, status };
  }
);

export const itineraryFunctions = [generateItinerary, handleItineraryComplete];
