/**
 * Inngest Functions: Summaries
 *
 * Background job handlers for generating AI-powered review summaries.
 * Moves expensive LLM calls out of the request/response cycle.
 */

import { inngest } from "../client";
import { generateText } from "@/lib/llm";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Generate a summary for destination reviews
 */
export const generateSummary = inngest.createFunction(
  {
    id: "generate-summary",
    name: "Generate Review Summary",
    retries: 3,
    concurrency: {
      limit: 10,
    },
  },
  { event: "summaries/generate" },
  async ({ event, step }) => {
    const { destinationId, destinationSlug, destinationName, reviews, callbackUrl } =
      event.data;

    // Step 1: Prepare review text
    const reviewTexts = reviews
      .slice(0, 10) // Limit to 10 reviews
      .map((r) => r.text)
      .filter((text) => text && text.length > 0)
      .join("\n\n");

    if (!reviewTexts) {
      return {
        success: false,
        error: "No valid review text found",
        destinationId,
      };
    }

    // Step 2: Generate summary with LLM
    const summary = await step.run("generate-summary-llm", async () => {
      const prompt = `Summarize the following customer reviews for ${destinationName} in 2-3 concise sentences. Focus on:
- Common themes and highlights
- What customers love most
- Any notable concerns or patterns
- Overall sentiment

Reviews:
${reviewTexts}

Summary:`;

      return await generateText(prompt, {
        temperature: 0.7,
        maxTokens: 150,
      });
    });

    if (!summary) {
      return {
        success: false,
        error: "Failed to generate summary",
        destinationId,
      };
    }

    // Step 3: Store the summary in the database
    await step.run("store-summary", async () => {
      const supabase = createServiceRoleClient();

      // Upsert to review_summaries table (or update destination)
      const { error } = await supabase.from("review_summaries").upsert(
        {
          destination_id: destinationId,
          destination_slug: destinationSlug,
          summary,
          review_count: reviews.length,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: "destination_id",
        }
      );

      if (error) {
        // Table might not exist, fallback to updating destination
        console.warn("review_summaries table error, updating destination:", error);
        await supabase
          .from("destinations")
          .update({
            review_summary: summary,
            review_summary_updated_at: new Date().toISOString(),
          })
          .eq("id", destinationId);
      }
    });

    // Step 4: Optionally call callback URL
    if (callbackUrl) {
      await step.run("notify-callback", async () => {
        try {
          await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "summary_complete",
              destinationId,
              summary,
            }),
          });
        } catch (err) {
          console.warn("Callback notification failed:", err);
        }
      });
    }

    return {
      success: true,
      destinationId,
      summary,
      reviewCount: reviews.length,
    };
  }
);

export const summaryFunctions = [generateSummary];
