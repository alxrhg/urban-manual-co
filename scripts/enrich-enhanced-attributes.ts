/**
 * CLI Script to enrich destinations with enhanced attributes
 *
 * Populates the new attribute columns for AI response improvements:
 * - cuisines, dining_style, meal_types
 * - dietary_options, seating_types, amenities
 * - vibe_tags, max_group_size, kid_friendly, etc.
 *
 * Uses a combination of:
 * 1. Keyword extraction from existing description/content
 * 2. LLM analysis for complex attribute inference
 * 3. Category-based defaults
 *
 * Usage:
 *   npx tsx scripts/enrich-enhanced-attributes.ts              - Enrich all
 *   npx tsx scripts/enrich-enhanced-attributes.ts --limit 10   - First 10 only
 *   npx tsx scripts/enrich-enhanced-attributes.ts --city Tokyo - Only Tokyo
 *   npx tsx scripts/enrich-enhanced-attributes.ts --use-llm    - Use LLM for inference
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Keyword Mappings (same as enhanced-query-parser.ts)
// ============================================================================

const CUISINE_KEYWORDS: Record<string, string[]> = {
  japanese: ["japanese", "sushi", "ramen", "izakaya", "omakase", "kaiseki", "tempura", "udon", "soba", "yakitori", "wagyu", "tonkatsu"],
  italian: ["italian", "pasta", "pizza", "trattoria", "osteria", "risotto", "gelato", "neapolitan"],
  french: ["french", "bistro", "brasserie", "patisserie", "croissant", "crepes"],
  chinese: ["chinese", "dim sum", "cantonese", "szechuan", "sichuan", "dumpling", "peking", "shanghainese"],
  korean: ["korean", "bbq", "kbbq", "bibimbap", "kimchi"],
  thai: ["thai", "pad thai", "thai curry", "som tam", "tom yum"],
  mexican: ["mexican", "tacos", "taqueria", "mezcal", "oaxacan"],
  indian: ["indian", "curry", "tandoori", "naan", "biryani", "masala"],
  mediterranean: ["mediterranean", "greek", "hummus", "falafel", "mezze", "levantine"],
  american: ["american", "burger", "bbq", "steakhouse", "diner", "southern"],
  seafood: ["seafood", "fish", "oyster", "lobster", "crab", "sashimi", "ceviche"],
  fusion: ["fusion", "contemporary", "innovative", "new american"],
  vietnamese: ["vietnamese", "pho", "banh mi", "bun"],
  spanish: ["spanish", "tapas", "paella", "pintxos"],
  middle_eastern: ["middle eastern", "lebanese", "persian", "turkish", "kebab"],
};

const DINING_STYLE_KEYWORDS: Record<string, string[]> = {
  "fine-dining": ["fine dining", "tasting menu", "prix fixe", "michelin", "starred", "elegant"],
  "casual": ["casual", "relaxed", "laid back", "informal", "neighborhood"],
  "fast-casual": ["fast casual", "counter service", "quick"],
  "cafe": ["cafe", "coffee", "bakery", "pastry"],
  "bar": ["bar", "cocktails", "speakeasy", "wine bar", "sake bar"],
  "izakaya": ["izakaya", "pub", "tavern"],
};

const MEAL_TYPE_KEYWORDS: Record<string, string[]> = {
  breakfast: ["breakfast", "morning", "brunch"],
  brunch: ["brunch", "weekend brunch", "sunday brunch"],
  lunch: ["lunch", "midday"],
  dinner: ["dinner", "evening", "supper"],
  "late-night": ["late night", "after hours", "midnight", "24 hour"],
};

const DIETARY_KEYWORDS: Record<string, string[]> = {
  vegetarian: ["vegetarian", "veggie", "meat-free"],
  vegan: ["vegan", "plant-based", "plant based"],
  "gluten-free": ["gluten free", "gluten-free", "celiac"],
  halal: ["halal"],
  kosher: ["kosher"],
};

const SEATING_KEYWORDS: Record<string, string[]> = {
  outdoor: ["outdoor", "outside", "patio", "terrace", "al fresco", "garden seating"],
  rooftop: ["rooftop", "roof", "sky bar"],
  garden: ["garden", "courtyard", "backyard"],
  bar: ["bar seating", "counter", "bar seats"],
  private: ["private room", "private dining"],
};

const AMENITY_KEYWORDS: Record<string, string[]> = {
  wifi: ["wifi", "wi-fi", "internet"],
  parking: ["parking", "valet"],
  "wheelchair-accessible": ["wheelchair", "accessible"],
  "live-music": ["live music", "live band", "jazz", "dj"],
  "pet-friendly": ["dog friendly", "pet friendly"],
  "kid-friendly": ["kid friendly", "kids menu", "family friendly", "highchair", "children"],
};

const VIBE_KEYWORDS: Record<string, string[]> = {
  romantic: ["romantic", "intimate", "cozy", "date night", "anniversary", "candlelit"],
  trendy: ["trendy", "hip", "cool", "instagram", "hot spot", "buzzy", "scene"],
  "hidden-gem": ["hidden gem", "local", "secret", "off the beaten path", "authentic", "undiscovered"],
  upscale: ["upscale", "fancy", "luxury", "elegant", "high-end", "splurge"],
  casual: ["casual", "relaxed", "laid back", "chill", "easy going"],
  lively: ["lively", "energetic", "fun", "vibrant", "bustling"],
  quiet: ["quiet", "peaceful", "serene", "calm", "tranquil"],
  design: ["design", "architecture", "beautiful space", "aesthetic", "minimalist", "interior"],
};

// ============================================================================
// Extraction Functions
// ============================================================================

function extractFromKeywords(text: string, keywords: Record<string, string[]>): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const [key, variations] of Object.entries(keywords)) {
    for (const variation of variations) {
      if (lowerText.includes(variation)) {
        found.push(key);
        break;
      }
    }
  }

  return found;
}

function inferFromCategory(category: string): Partial<EnrichedAttributes> {
  const lowerCategory = category.toLowerCase();
  const attrs: Partial<EnrichedAttributes> = {};

  if (lowerCategory.includes("restaurant") || lowerCategory.includes("dining")) {
    attrs.dining_style = ["casual"];
    attrs.meal_types = ["lunch", "dinner"];
    attrs.accepts_reservations = true;
  } else if (lowerCategory.includes("hotel")) {
    attrs.amenities = ["wifi", "parking"];
    attrs.accepts_reservations = true;
  } else if (lowerCategory.includes("cafe") || lowerCategory.includes("coffee")) {
    attrs.dining_style = ["cafe"];
    attrs.meal_types = ["breakfast"];
    attrs.kid_friendly = true;
  } else if (lowerCategory.includes("bar")) {
    attrs.dining_style = ["bar"];
    attrs.meal_types = ["late-night"];
    attrs.kid_friendly = false;
  } else if (lowerCategory.includes("shop")) {
    attrs.amenities = [];
  }

  return attrs;
}

interface EnrichedAttributes {
  cuisines: string[];
  dining_style: string[];
  meal_types: string[];
  dietary_options: string[];
  seating_types: string[];
  amenities: string[];
  vibe_tags: string[];
  max_group_size: number | null;
  has_private_dining: boolean;
  accepts_reservations: boolean;
  kid_friendly: boolean | null;
  pet_friendly: boolean | null;
  suitable_for_business: boolean | null;
  suitable_for_date: boolean | null;
  suitable_for_groups: boolean | null;
}

function enrichDestinationAttributes(dest: {
  name: string;
  city: string;
  category: string;
  description?: string | null;
  content?: string | null;
  micro_description?: string | null;
  michelin_stars?: number | null;
}): EnrichedAttributes {
  // Combine all text for analysis
  const textToAnalyze = [
    dest.name,
    dest.description || "",
    dest.content || "",
    dest.micro_description || "",
  ].join(" ");

  // Extract attributes from text
  const cuisines = extractFromKeywords(textToAnalyze, CUISINE_KEYWORDS);
  const diningStyle = extractFromKeywords(textToAnalyze, DINING_STYLE_KEYWORDS);
  const mealTypes = extractFromKeywords(textToAnalyze, MEAL_TYPE_KEYWORDS);
  const dietary = extractFromKeywords(textToAnalyze, DIETARY_KEYWORDS);
  const seating = extractFromKeywords(textToAnalyze, SEATING_KEYWORDS);
  const amenities = extractFromKeywords(textToAnalyze, AMENITY_KEYWORDS);
  const vibes = extractFromKeywords(textToAnalyze, VIBE_KEYWORDS);

  // Get category-based defaults
  const categoryDefaults = inferFromCategory(dest.category);

  // Merge with extracted (extracted takes precedence)
  const result: EnrichedAttributes = {
    cuisines,
    dining_style: diningStyle.length > 0 ? diningStyle : (categoryDefaults.dining_style || []),
    meal_types: mealTypes.length > 0 ? mealTypes : (categoryDefaults.meal_types || []),
    dietary_options: dietary,
    seating_types: seating,
    amenities: amenities.length > 0 ? amenities : (categoryDefaults.amenities || []),
    vibe_tags: vibes,
    max_group_size: null, // Would need specific data
    has_private_dining: seating.includes("private"),
    accepts_reservations: categoryDefaults.accepts_reservations ?? true,
    kid_friendly: amenities.includes("kid-friendly") ? true : categoryDefaults.kid_friendly ?? null,
    pet_friendly: amenities.includes("pet-friendly") ? true : null,
    suitable_for_business: vibes.includes("upscale") || vibes.includes("quiet") ? true : null,
    suitable_for_date: vibes.includes("romantic") || vibes.includes("upscale") ? true : null,
    suitable_for_groups: null,
  };

  // Infer from Michelin stars
  if (dest.michelin_stars && dest.michelin_stars > 0) {
    if (!result.dining_style.includes("fine-dining")) {
      result.dining_style.push("fine-dining");
    }
    if (!result.vibe_tags.includes("upscale")) {
      result.vibe_tags.push("upscale");
    }
    result.suitable_for_date = true;
    result.suitable_for_business = true;
  }

  return result;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.findIndex((arg) => arg === "--limit");
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : null;
  const cityIndex = args.findIndex((arg) => arg === "--city");
  const city = cityIndex >= 0 ? args[cityIndex + 1] : null;
  const dryRun = args.includes("--dry-run");

  console.log("🚀 Starting enhanced attributes enrichment...\n");

  if (dryRun) {
    console.log("📋 DRY RUN MODE - no changes will be saved\n");
  }

  // Fetch destinations
  let query = supabase
    .from("destinations")
    .select("id, slug, name, city, category, description, content, micro_description, michelin_stars, cuisines, vibe_tags");

  // Only enrich destinations that don't have cuisines or vibe_tags populated
  query = query.or("cuisines.is.null,cuisines.eq.{},vibe_tags.is.null,vibe_tags.eq.{}");

  if (city) {
    query = query.ilike("city", `%${city}%`);
    console.log(`📍 Filtering to city: ${city}`);
  }

  if (limit) {
    query = query.limit(limit);
    console.log(`📊 Limiting to ${limit} destinations`);
  }

  const { data: destinations, error } = await query;

  if (error) {
    console.error("❌ Error fetching destinations:", error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log("✅ All destinations already have enhanced attributes!");
    process.exit(0);
  }

  console.log(`\n📊 Found ${destinations.length} destinations to enrich\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    const progress = `[${i + 1}/${destinations.length}]`;

    try {
      console.log(`${progress} Enriching: ${dest.name} (${dest.city})`);

      const attributes = enrichDestinationAttributes(dest);

      if (dryRun) {
        console.log(`   📋 Would update with:`);
        console.log(`      Cuisines: ${attributes.cuisines.join(", ") || "none"}`);
        console.log(`      Vibes: ${attributes.vibe_tags.join(", ") || "none"}`);
        console.log(`      Seating: ${attributes.seating_types.join(", ") || "none"}`);
        console.log(`      Dietary: ${attributes.dietary_options.join(", ") || "none"}`);
      } else {
        // Update the destination
        const { error: updateError } = await supabase
          .from("destinations")
          .update({
            cuisines: attributes.cuisines,
            dining_style: attributes.dining_style,
            meal_types: attributes.meal_types,
            dietary_options: attributes.dietary_options,
            seating_types: attributes.seating_types,
            amenities: attributes.amenities,
            vibe_tags: attributes.vibe_tags,
            max_group_size: attributes.max_group_size,
            has_private_dining: attributes.has_private_dining,
            accepts_reservations: attributes.accepts_reservations,
            kid_friendly: attributes.kid_friendly,
            pet_friendly: attributes.pet_friendly,
            suitable_for_business: attributes.suitable_for_business,
            suitable_for_date: attributes.suitable_for_date,
            suitable_for_groups: attributes.suitable_for_groups,
          })
          .eq("id", dest.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`   ✅ Updated with ${attributes.cuisines.length} cuisines, ${attributes.vibe_tags.length} vibes`);
      }

      successCount++;
    } catch (err) {
      console.error(`${progress} ❌ Error enriching ${dest.name}:`, err);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Enrichment Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
