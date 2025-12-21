'use client';

import { TrendingSection } from './TrendingSection';
import { NearYouSection } from './NearYouSection';
import { PersonalizedSection } from './PersonalizedSection';

/**
 * Discovery Sections - Curated content sections between hero and main grid
 *
 * Displays in order:
 * 1. Trending Destinations (editor's picks, Michelin starred)
 * 2. Near You (if location enabled)
 * 3. Recently Viewed + Recommendations (personalized)
 */
export function DiscoverySections() {
  return (
    <div className="w-full mt-6 sm:mt-8">
      <TrendingSection />
      <NearYouSection />
      <PersonalizedSection />
    </div>
  );
}

export default DiscoverySections;
