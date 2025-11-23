interface HistoryItem {
  city?: string;
  category?: string;
  priceLevel?: number | string;
  michelin?: boolean;
  [key: string]: any;
}

interface UserPreferences {
  cities: Record<string, number>;
  categories: Record<string, number>;
  priceLevels: Record<string, number>;
  michelinBias: number;
}

/**
 * Learn user preferences from their interaction history
 * Analyzes cities, categories, price levels, and Michelin preferences
 * @param history Array of user interaction history items
 * @returns User preferences object with counts and biases
 */
export function learnUserPreferences(history: HistoryItem[]): UserPreferences {
  const output: UserPreferences = {
    cities: {},
    categories: {},
    priceLevels: {},
    michelinBias: 0,
  };

  history.forEach((h) => {
    // Track city preferences
    const c = h.city;
    if (c) {
      if (!output.cities[c]) output.cities[c] = 0;
      output.cities[c]++;
    }

    // Track category preferences
    const cat = h.category;
    if (cat) {
      if (!output.categories[cat]) output.categories[cat] = 0;
      output.categories[cat]++;
    }

    // Track price level preferences
    const price = h.priceLevel || 'unknown';
    const priceKey = String(price);
    if (!output.priceLevels[priceKey]) output.priceLevels[priceKey] = 0;
    output.priceLevels[priceKey]++;

    // Track Michelin bias
    if (h.michelin) output.michelinBias++;
  });

  return output;
}

