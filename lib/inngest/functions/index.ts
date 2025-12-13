/**
 * Inngest Functions Index
 *
 * Exports all background job functions for registration with Inngest.
 */

export { embeddingFunctions } from "./embeddings";
export { summaryFunctions } from "./summaries";
export { tasteProfileFunctions } from "./taste-profile";
export { itineraryFunctions } from "./itinerary";

// Combined export for API route
import { embeddingFunctions } from "./embeddings";
import { summaryFunctions } from "./summaries";
import { tasteProfileFunctions } from "./taste-profile";
import { itineraryFunctions } from "./itinerary";

export const allFunctions = [
  ...embeddingFunctions,
  ...summaryFunctions,
  ...tasteProfileFunctions,
  ...itineraryFunctions,
];
