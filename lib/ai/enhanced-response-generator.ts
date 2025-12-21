/**
 * Enhanced Response Generator
 *
 * Generates smart AI responses that:
 * - Acknowledge what was matched vs. not matched
 * - Suggest alternatives for unmatched filters
 * - Provide context-aware refinement options
 * - Explain why results were selected
 */

import { generateText } from "@/lib/llm";
import type { Destination } from "@/types/destination";
import type { EnhancedParsedQuery } from "./enhanced-query-parser";

// ============================================================================
// Types
// ============================================================================

export interface ResponseContext {
  parsedQuery: EnhancedParsedQuery;
  results: Destination[];
  matchedFilters: MatchedFilter[];
  unmatchedFilters: UnmatchedFilter[];
  alternatives?: AlternativeSuggestion[];
}

export interface MatchedFilter {
  filter: string;
  value: string;
  matchCount: number;
}

export interface UnmatchedFilter {
  filter: string;
  requestedValue: string;
  reason: string;
  alternatives?: string[];
}

export interface AlternativeSuggestion {
  label: string;
  description: string;
  patch: Record<string, unknown>;
  reason: "alternative" | "expand" | "similar";
}

export interface EnhancedResponse {
  text: string;
  matchedFilters: MatchedFilter[];
  unmatchedFilters: UnmatchedFilter[];
  alternatives: AlternativeSuggestion[];
  refinements: RefinementChip[];
  explanations: Record<string, string[]>; // destination slug -> reasons
}

export interface RefinementChip {
  label: string;
  kind: "vibe" | "price" | "neighborhood" | "category" | "cuisine" | "seating" | "dietary" | "misc";
  patch: Record<string, unknown>;
}

// ============================================================================
// Filter Analysis
// ============================================================================

/**
 * Analyze which filters were matched in the results
 */
export function analyzeMatchedFilters(
  query: EnhancedParsedQuery,
  results: Destination[]
): { matched: MatchedFilter[]; unmatched: UnmatchedFilter[] } {
  const matched: MatchedFilter[] = [];
  const unmatched: UnmatchedFilter[] = [];

  // Check cuisines
  if (query.cuisines?.length) {
    const matchCount = results.filter((r) =>
      r.cuisines?.some((c) =>
        query.cuisines!.some((qc) => c.toLowerCase().includes(qc.toLowerCase()))
      )
    ).length;

    if (matchCount > 0) {
      matched.push({
        filter: "cuisine",
        value: query.cuisines.join(", "),
        matchCount,
      });
    } else {
      unmatched.push({
        filter: "cuisine",
        requestedValue: query.cuisines.join(", "),
        reason: `No ${query.cuisines.join("/")} restaurants found in the results`,
        alternatives: getSimilarCuisines(query.cuisines),
      });
    }
  }

  // Check dietary options
  if (query.dietary?.length) {
    const matchCount = results.filter((r) =>
      r.dietary_options?.some((d) =>
        query.dietary!.some((qd) => d.toLowerCase().includes(qd.toLowerCase()))
      )
    ).length;

    if (matchCount > 0) {
      matched.push({
        filter: "dietary",
        value: query.dietary.join(", "),
        matchCount,
      });
    } else {
      unmatched.push({
        filter: "dietary",
        requestedValue: query.dietary.join(", "),
        reason: `Limited ${query.dietary.join("/")} options in our curated selection`,
        alternatives: ["Most restaurants can accommodate with advance notice"],
      });
    }
  }

  // Check seating types
  if (query.seatingTypes?.length) {
    const matchCount = results.filter((r) =>
      r.seating_types?.some((s) =>
        query.seatingTypes!.some((qs) =>
          s.toLowerCase().includes(qs.toLowerCase())
        )
      )
    ).length;

    if (matchCount > 0) {
      matched.push({
        filter: "seating",
        value: query.seatingTypes.join(", "),
        matchCount,
      });
    } else {
      unmatched.push({
        filter: "seating",
        requestedValue: query.seatingTypes.join(", "),
        reason: `${query.seatingTypes.join("/")} seating not explicitly listed`,
        alternatives: getAlternativeSeating(query.seatingTypes),
      });
    }
  }

  // Check vibes/atmosphere
  if (query.vibes?.length) {
    const matchCount = results.filter((r) =>
      r.vibe_tags?.some((v) =>
        query.vibes!.some((qv) => v.toLowerCase().includes(qv.toLowerCase()))
      )
    ).length;

    if (matchCount > 0) {
      matched.push({
        filter: "vibe",
        value: query.vibes.join(", "),
        matchCount,
      });
    } else {
      // Vibes are often implied, so don't mark as unmatched if we have results
      if (results.length === 0) {
        unmatched.push({
          filter: "vibe",
          requestedValue: query.vibes.join(", "),
          reason: `Couldn't find places matching "${query.vibes.join(", ")}" vibe`,
          alternatives: ["romantic", "trendy", "hidden-gem", "upscale", "casual"],
        });
      }
    }
  }

  // Check group size
  if (query.groupSize) {
    const matchCount = results.filter(
      (r) => r.max_group_size && r.max_group_size >= query.groupSize!
    ).length;

    if (matchCount > 0) {
      matched.push({
        filter: "group size",
        value: `${query.groupSize} people`,
        matchCount,
      });
    } else {
      // Most restaurants can accommodate, just note it
      if (query.groupSize > 8) {
        unmatched.push({
          filter: "group size",
          requestedValue: `${query.groupSize} people`,
          reason: `Large group capacity not confirmed for all venues`,
          alternatives: ["Consider calling ahead", "Look for private dining options"],
        });
      }
    }
  }

  // Check price range
  if (query.priceRange) {
    const priceLabel =
      query.priceRange === "budget"
        ? "Budget-friendly"
        : query.priceRange === "splurge"
        ? "High-end"
        : "Mid-range";

    const matchCount = results.filter((r) => {
      if (!r.price_level) return false;
      if (query.priceLevelMax && r.price_level > query.priceLevelMax) return false;
      if (query.priceLevelMin && r.price_level < query.priceLevelMin) return false;
      return true;
    }).length;

    if (matchCount > 0) {
      matched.push({
        filter: "price",
        value: priceLabel,
        matchCount,
      });
    }
  }

  // Check Michelin
  if (query.michelinOnly) {
    const matchCount = results.filter((r) => r.michelin_stars && r.michelin_stars > 0).length;

    if (matchCount > 0) {
      matched.push({
        filter: "quality",
        value: "Michelin starred",
        matchCount,
      });
    } else {
      unmatched.push({
        filter: "quality",
        requestedValue: "Michelin starred",
        reason: "No Michelin-starred restaurants match your other criteria",
        alternatives: ["Try removing some filters", "Highly-rated alternatives available"],
      });
    }
  }

  return { matched, unmatched };
}

/**
 * Get similar cuisines as alternatives
 */
function getSimilarCuisines(cuisines: string[]): string[] {
  const cuisineGroups: Record<string, string[]> = {
    asian: ["japanese", "chinese", "korean", "thai", "vietnamese"],
    european: ["italian", "french", "spanish", "mediterranean"],
    american: ["american", "mexican", "southern"],
  };

  const alternatives: string[] = [];

  for (const cuisine of cuisines) {
    for (const [, group] of Object.entries(cuisineGroups)) {
      if (group.includes(cuisine.toLowerCase())) {
        alternatives.push(...group.filter((c) => c !== cuisine.toLowerCase()));
      }
    }
  }

  return [...new Set(alternatives)].slice(0, 3);
}

/**
 * Get alternative seating options
 */
function getAlternativeSeating(seating: string[]): string[] {
  const alternatives: Record<string, string[]> = {
    outdoor: ["rooftop", "garden", "terrace"],
    rooftop: ["outdoor", "terrace", "bar seating"],
    private: ["semi-private", "quiet corner", "bar seating"],
    garden: ["outdoor", "courtyard", "terrace"],
  };

  const result: string[] = [];
  for (const seat of seating) {
    if (alternatives[seat.toLowerCase()]) {
      result.push(...alternatives[seat.toLowerCase()]);
    }
  }

  return [...new Set(result)].slice(0, 3);
}

// ============================================================================
// Response Generation
// ============================================================================

/**
 * Generate a smart response that acknowledges matched and unmatched filters
 */
export async function generateEnhancedResponse(
  context: ResponseContext
): Promise<EnhancedResponse> {
  const { parsedQuery, results, matchedFilters, unmatchedFilters } = context;

  // Generate destination-specific explanations
  const explanations = generateResultExplanations(parsedQuery, results.slice(0, 10));

  // Generate refinement chips
  const refinements = generateRefinementChips(parsedQuery, results, unmatchedFilters);

  // Generate alternatives for unmatched filters
  const alternatives = generateAlternatives(parsedQuery, unmatchedFilters);

  // Generate the response text
  const text = await generateResponseText(context);

  return {
    text,
    matchedFilters,
    unmatchedFilters,
    alternatives,
    refinements,
    explanations,
  };
}

/**
 * Generate explanations for why each result was included
 */
function generateResultExplanations(
  query: EnhancedParsedQuery,
  results: Destination[]
): Record<string, string[]> {
  const explanations: Record<string, string[]> = {};

  for (const dest of results) {
    if (!dest.slug) continue;

    const reasons: string[] = [];

    // Michelin stars
    if (dest.michelin_stars && dest.michelin_stars > 0) {
      reasons.push(`${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? "s" : ""}`);
    }

    // High rating
    if (dest.rating && dest.rating >= 4.5) {
      reasons.push(`Highly rated (${dest.rating})`);
    }

    // Vibe match
    if (query.vibes?.length && dest.vibe_tags?.length) {
      const matchedVibes = query.vibes.filter((v) =>
        dest.vibe_tags!.some((dv) => dv.toLowerCase().includes(v.toLowerCase()))
      );
      if (matchedVibes.length > 0) {
        reasons.push(`${matchedVibes[0].replace("-", " ")} atmosphere`);
      }
    }

    // Cuisine match
    if (query.cuisines?.length && dest.cuisines?.length) {
      const matchedCuisines = query.cuisines.filter((c) =>
        dest.cuisines!.some((dc) => dc.toLowerCase().includes(c.toLowerCase()))
      );
      if (matchedCuisines.length > 0) {
        reasons.push(`${matchedCuisines[0]} cuisine`);
      }
    }

    // Seating match
    if (query.seatingTypes?.length && dest.seating_types?.length) {
      const matchedSeating = query.seatingTypes.filter((s) =>
        dest.seating_types!.some((ds) => ds.toLowerCase().includes(s.toLowerCase()))
      );
      if (matchedSeating.length > 0) {
        reasons.push(`${matchedSeating[0]} seating available`);
      }
    }

    // Group size match
    if (query.groupSize && dest.max_group_size && dest.max_group_size >= query.groupSize) {
      reasons.push(`Accommodates groups of ${query.groupSize}+`);
    }

    // Crown designation
    if (dest.crown) {
      reasons.push("Editor's pick");
    }

    // Neighborhood
    if (dest.neighborhood) {
      reasons.push(`In ${dest.neighborhood}`);
    }

    if (reasons.length > 0) {
      explanations[dest.slug] = reasons.slice(0, 3);
    }
  }

  return explanations;
}

/**
 * Generate refinement chips based on query and results
 */
function generateRefinementChips(
  query: EnhancedParsedQuery,
  results: Destination[],
  unmatchedFilters: UnmatchedFilter[]
): RefinementChip[] {
  const chips: RefinementChip[] = [];

  // Price refinements
  if (!query.priceLevelMax || query.priceLevelMax > 2) {
    chips.push({
      label: "More budget",
      kind: "price",
      patch: { priceMax: 2, priceMin: null },
    });
  }

  if (!query.priceLevelMin || query.priceLevelMin < 3) {
    chips.push({
      label: "More premium",
      kind: "price",
      patch: { priceMin: 3, priceMax: null },
    });
  }

  // Vibe refinements (only add vibes not already in query)
  const vibeOptions = ["romantic", "trendy", "hidden-gem", "upscale", "casual", "lively"];
  for (const vibe of vibeOptions) {
    if (!query.vibes?.includes(vibe)) {
      chips.push({
        label: vibe.charAt(0).toUpperCase() + vibe.slice(1).replace("-", " "),
        kind: "vibe",
        patch: { vibes: [...(query.vibes || []), vibe] },
      });
      if (chips.filter((c) => c.kind === "vibe").length >= 3) break;
    }
  }

  // Seating refinements (especially if outdoor was unmatched)
  const hasUnmatchedSeating = unmatchedFilters.some((f) => f.filter === "seating");
  if (hasUnmatchedSeating) {
    const seatingOptions = ["rooftop", "garden", "terrace", "bar"];
    for (const seating of seatingOptions) {
      if (!query.seatingTypes?.includes(seating)) {
        chips.push({
          label: `${seating.charAt(0).toUpperCase() + seating.slice(1)} seating`,
          kind: "seating",
          patch: { seatingTypes: [seating] },
        });
        break;
      }
    }
  }

  // Dietary refinements
  if (!query.dietary?.length) {
    chips.push({
      label: "Vegetarian options",
      kind: "dietary",
      patch: { dietary: ["vegetarian"] },
    });
  }

  // Extract top neighborhoods from results
  const neighborhoods = new Map<string, number>();
  for (const r of results) {
    if (r.neighborhood) {
      neighborhoods.set(r.neighborhood, (neighborhoods.get(r.neighborhood) || 0) + 1);
    }
  }

  const topHoods = [...neighborhoods.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  for (const hood of topHoods) {
    chips.push({
      label: hood,
      kind: "neighborhood",
      patch: { neighborhood: hood },
    });
  }

  // Michelin refinement
  if (!query.michelinOnly && results.some((r) => r.michelin_stars && r.michelin_stars > 0)) {
    chips.push({
      label: "Michelin only",
      kind: "misc",
      patch: { michelin: true },
    });
  }

  return chips.slice(0, 8);
}

/**
 * Generate alternative suggestions for unmatched filters
 */
function generateAlternatives(
  query: EnhancedParsedQuery,
  unmatchedFilters: UnmatchedFilter[]
): AlternativeSuggestion[] {
  const alternatives: AlternativeSuggestion[] = [];

  for (const unmatched of unmatchedFilters) {
    if (unmatched.alternatives?.length) {
      for (const alt of unmatched.alternatives.slice(0, 2)) {
        if (typeof alt === "string" && alt.length < 30) {
          alternatives.push({
            label: `Try ${alt}`,
            description: `Alternative to ${unmatched.requestedValue}`,
            patch: { [unmatched.filter]: alt },
            reason: "alternative",
          });
        }
      }
    }
  }

  // If cuisines were unmatched, suggest removing that filter
  if (unmatchedFilters.some((f) => f.filter === "cuisine")) {
    alternatives.push({
      label: "Browse all cuisines",
      description: "Remove cuisine filter to see more options",
      patch: { cuisines: null },
      reason: "expand",
    });
  }

  // If group size was unmatched, suggest calling ahead
  if (unmatchedFilters.some((f) => f.filter === "group size")) {
    alternatives.push({
      label: "Show all restaurants",
      description: "Many restaurants can accommodate larger groups with advance notice",
      patch: { groupSize: null },
      reason: "expand",
    });
  }

  return alternatives.slice(0, 4);
}

/**
 * Generate the response text using LLM
 */
async function generateResponseText(context: ResponseContext): Promise<string> {
  const { parsedQuery, results, matchedFilters, unmatchedFilters } = context;

  const count = results.length;
  const city = parsedQuery.city;
  const category = parsedQuery.category;

  // Build context for LLM
  const matchedSummary = matchedFilters
    .map((f) => `${f.filter}: ${f.value} (${f.matchCount} matches)`)
    .join(", ");

  const unmatchedSummary = unmatchedFilters
    .map((f) => `${f.filter}: ${f.requestedValue} (${f.reason})`)
    .join(", ");

  const topResults = results.slice(0, 5).map((r) => ({
    name: r.name,
    category: r.category,
    michelin: r.michelin_stars || 0,
    rating: r.rating,
    neighborhood: r.neighborhood,
  }));

  const prompt = `Generate a brief, helpful travel concierge response (2-3 sentences max).

Query context:
- City: ${city || "not specified"}
- Category: ${category || "not specified"}
- Cuisines: ${parsedQuery.cuisines?.join(", ") || "any"}
- Vibes: ${parsedQuery.vibes?.join(", ") || "not specified"}
- Group size: ${parsedQuery.groupSize || "not specified"}
- Seating: ${parsedQuery.seatingTypes?.join(", ") || "any"}

Results: ${count} found
Matched filters: ${matchedSummary || "none specified"}
Unmatched filters: ${unmatchedSummary || "all matched"}

Top results: ${topResults.map((r) => `${r.name} (${r.neighborhood || r.category})`).join(", ")}

Guidelines:
- Be warm and helpful, not robotic
- Acknowledge what was found
- If filters couldn't be matched, briefly explain and suggest alternatives
- Mention Michelin stars if present
- Keep it concise (2-3 sentences)`;

  try {
    const response = await generateText(prompt, { maxTokens: 150, temperature: 0.7 });
    if (response) {
      return response;
    }
  } catch (error) {
    console.error("LLM response generation failed:", error);
  }

  // Fallback response
  return generateFallbackResponse(context);
}

/**
 * Generate a fallback response without LLM
 */
function generateFallbackResponse(context: ResponseContext): string {
  const { parsedQuery, results, matchedFilters, unmatchedFilters } = context;

  const count = results.length;
  const city = parsedQuery.city;
  const category = parsedQuery.category;

  if (count === 0) {
    if (unmatchedFilters.length > 0) {
      const firstUnmatched = unmatchedFilters[0];
      return `I couldn't find exact matches for ${firstUnmatched.requestedValue}. ${firstUnmatched.reason}. Try adjusting your filters.`;
    }
    return `I couldn't find any ${category || "places"} in ${city || "that area"} matching your criteria. Try broadening your search.`;
  }

  // Build response based on what was matched
  let response = `Found ${count} `;

  if (parsedQuery.vibes?.length) {
    response += `${parsedQuery.vibes.join(" and ")} `;
  }

  if (category) {
    response += `${category}${count > 1 ? "s" : ""} `;
  } else {
    response += `place${count > 1 ? "s" : ""} `;
  }

  if (city) {
    response += `in ${city}`;
  }

  response += ".";

  // Note Michelin stars
  const michelinCount = results.filter(
    (r) => r.michelin_stars && r.michelin_stars > 0
  ).length;
  if (michelinCount > 0) {
    response += ` Including ${michelinCount} Michelin-starred.`;
  }

  // Note any unmatched filters
  if (unmatchedFilters.length > 0) {
    const firstUnmatched = unmatchedFilters[0];
    if (firstUnmatched.filter === "seating" && parsedQuery.seatingTypes?.includes("outdoor")) {
      response += ` Note: Outdoor seating availability may vary - consider calling ahead.`;
    } else if (firstUnmatched.filter === "group size") {
      response += ` For groups of ${parsedQuery.groupSize}+, we recommend calling ahead.`;
    }
  }

  return response;
}
