/**
 * Destination-based color gradients for trip cover images
 */

export type GradientColors = [string, string];

/**
 * Color mappings for popular destinations
 * [start color, end color] for a 135deg gradient
 */
export const destinationColors: Record<string, GradientColors> = {
  // Americas
  'miami': ['#fda4af', '#fb923c'],      // rose to orange (warm, tropical)
  'new-york': ['#fcd34d', '#f59e0b'],   // amber tones (city lights)
  'los-angeles': ['#fbbf24', '#ea580c'], // gold to deep orange (sunset)
  'san-francisco': ['#f97316', '#dc2626'], // orange to red (golden gate)
  'chicago': ['#60a5fa', '#3b82f6'],    // blue tones (windy city)
  'boston': ['#dc2626', '#7f1d1d'],     // red brick tones
  'seattle': ['#059669', '#0f766e'],    // evergreen tones
  'austin': ['#f59e0b', '#ea580c'],     // warm texas tones
  'nashville': ['#facc15', '#ca8a04'],  // country gold
  'denver': ['#7dd3fc', '#0284c7'],     // mountain sky blue
  'mexico-city': ['#f472b6', '#db2777'], // vibrant pink
  'cancun': ['#22d3ee', '#0891b2'],     // caribbean turquoise

  // Europe
  'paris': ['#c4b5fd', '#a5b4fc'],      // violet to indigo (romantic)
  'london': ['#94a3b8', '#64748b'],     // slate tones (classic)
  'barcelona': ['#fca5a5', '#f97316'],  // red to orange (vibrant)
  'rome': ['#fcd34d', '#dc2626'],       // gold to red (imperial)
  'florence': ['#fbbf24', '#b45309'],   // renaissance gold
  'venice': ['#67e8f9', '#0e7490'],     // lagoon blue
  'milan': ['#a1a1aa', '#52525b'],      // fashion gray
  'amsterdam': ['#fb923c', '#f97316'],  // orange (dutch)
  'berlin': ['#71717a', '#3f3f46'],     // industrial gray
  'munich': ['#60a5fa', '#2563eb'],     // bavarian blue
  'vienna': ['#fcd34d', '#eab308'],     // imperial gold
  'prague': ['#f87171', '#b91c1c'],     // red rooftops
  'lisbon': ['#fcd34d', '#f59e0b'],     // warm yellows
  'porto': ['#60a5fa', '#1d4ed8'],      // azulejo blue
  'madrid': ['#f87171', '#dc2626'],     // spanish red
  'seville': ['#fb923c', '#ea580c'],    // flamenco orange
  'dublin': ['#4ade80', '#16a34a'],     // emerald green
  'edinburgh': ['#6366f1', '#4338ca'],  // scottish purple
  'copenhagen': ['#38bdf8', '#0284c7'], // scandinavian blue
  'stockholm': ['#facc15', '#0284c7'],  // blue & yellow
  'oslo': ['#67e8f9', '#0e7490'],       // fjord blue
  'helsinki': ['#e2e8f0', '#94a3b8'],   // nordic white
  'reykjavik': ['#a5f3fc', '#06b6d4'],  // ice blue
  'athens': ['#fef3c7', '#fbbf24'],     // mediterranean gold
  'santorini': ['#3b82f6', '#f8fafc'],  // blue & white
  'mykonos': ['#60a5fa', '#f8fafc'],    // cycladic blue
  'nice': ['#06b6d4', '#0891b2'],       // riviera turquoise
  'monaco': ['#fbbf24', '#dc2626'],     // luxury gold & red
  'zurich': ['#e2e8f0', '#64748b'],     // alpine gray
  'geneva': ['#60a5fa', '#e2e8f0'],     // lake & snow
  'brussels': ['#fcd34d', '#000000'],   // gold & black

  // Asia
  'tokyo': ['#f0abfc', '#c084fc'],      // fuchsia to purple (neon)
  'kyoto': ['#fda4af', '#fecdd3'],      // soft pink (cherry blossom)
  'osaka': ['#fb923c', '#f97316'],      // vibrant orange
  'seoul': ['#f472b6', '#ec4899'],      // k-pop pink
  'hong-kong': ['#f87171', '#fbbf24'],  // red & gold
  'singapore': ['#4ade80', '#16a34a'],  // garden green
  'bangkok': ['#fcd34d', '#f97316'],    // golden temples
  'bali': ['#4ade80', '#22d3ee'],       // tropical green-blue
  'hanoi': ['#fcd34d', '#dc2626'],      // vietnamese red & gold
  'ho-chi-minh': ['#f97316', '#dc2626'], // vibrant orange-red
  'taipei': ['#fb923c', '#ec4899'],     // night market colors
  'shanghai': ['#fbbf24', '#dc2626'],   // modern chinese
  'beijing': ['#dc2626', '#fcd34d'],    // imperial red & gold
  'mumbai': ['#f97316', '#ec4899'],     // bollywood colors
  'delhi': ['#fb923c', '#dc2626'],      // warm spices
  'dubai': ['#fcd34d', '#f59e0b'],      // desert gold
  'abu-dhabi': ['#fef3c7', '#fbbf24'],  // sand tones
  'doha': ['#fef3c7', '#92400e'],       // desert warmth
  'tel-aviv': ['#38bdf8', '#fef3c7'],   // beach blue & sand
  'istanbul': ['#dc2626', '#0891b2'],   // east meets west

  // Oceania
  'sydney': ['#38bdf8', '#fbbf24'],     // harbour blue & sun
  'melbourne': ['#71717a', '#3f3f46'],  // urban gray
  'auckland': ['#4ade80', '#0284c7'],   // green & blue
  'queenstown': ['#67e8f9', '#22c55e'], // glacier blue & green

  // Africa & Middle East
  'cape-town': ['#38bdf8', '#4ade80'],  // ocean & mountain
  'marrakech': ['#dc2626', '#fb923c'],  // moroccan red & orange
  'cairo': ['#fcd34d', '#92400e'],      // pyramid gold

  // Caribbean & Islands
  'hawaii': ['#f97316', '#22d3ee'],     // sunset & ocean
  'maldives': ['#22d3ee', '#f0fdfa'],   // crystal clear water
  'bahamas': ['#67e8f9', '#fecdd3'],    // turquoise & pink sand
  'bermuda': ['#f472b6', '#22d3ee'],    // pink & blue

  // Default fallback
  'default': ['#f3f4f6', '#e5e7eb'],    // subtle gray gradient
};

/**
 * Get gradient colors for a destination
 * Tries to match by slug, then city name (lowercased, hyphenated)
 */
export function getDestinationColors(destination: string | null | undefined): GradientColors {
  if (!destination) return destinationColors.default;

  // Normalize the destination string
  const normalized = destination
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Try exact match first
  if (destinationColors[normalized]) {
    return destinationColors[normalized];
  }

  // Try partial match (e.g., "new york city" should match "new-york")
  for (const key of Object.keys(destinationColors)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return destinationColors[key];
    }
  }

  return destinationColors.default;
}

/**
 * Generate CSS gradient string from colors
 */
export function getGradientStyle(colors: GradientColors): string {
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}
