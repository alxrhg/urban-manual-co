import assert from 'node:assert/strict';
import { buildPreferenceVector, type SavedDestinationSummary } from '@/services/intelligence/personalization';
import { applyPersonalizationRanking } from '@/services/intelligence/recommendations';
import type { DestinationCandidate, DevicePreferenceSignals, TravelerProfile } from '@/services/intelligence/personalization';

async function testHistoryInfluence() {
  const profile: TravelerProfile = {
    favoriteCategories: ['cafe'],
    favoriteCities: ['paris'],
    interests: ['coffee', 'pastry'],
    budgetRange: { min: 1, max: 3 },
    travelVibes: ['cozy'],
  };

  const saved: SavedDestinationSummary[] = [
    {
      destination_slug: 'cafe-belleville',
      destination: {
        slug: 'cafe-belleville',
        category: 'cafe',
        city: 'Paris',
        price_level: 2,
        tags: ['cozy', 'local'],
      },
    },
    {
      destination_slug: 'paris-gallery',
      destination: {
        slug: 'paris-gallery',
        category: 'gallery',
        city: 'Paris',
        price_level: 3,
        tags: ['art', 'culture'],
      },
    },
  ];

  const vector = await buildPreferenceVector({
    profile,
    savedDestinations: saved,
  });

  const candidates: DestinationCandidate[] = [
    {
      slug: 'cafe-special',
      category: 'cafe',
      city: 'Paris',
      price_level: 2,
      tags: ['cozy', 'coffee'],
      rating: 4.8,
      trending_score: 3,
      saves_count: 50,
      views_count: 600,
    },
    {
      slug: 'nightlife-spot',
      category: 'bar',
      city: 'Paris',
      price_level: 4,
      tags: ['nightlife'],
      rating: 4.7,
      trending_score: 5,
      saves_count: 100,
      views_count: 800,
    },
    {
      slug: 'art-gallery',
      category: 'gallery',
      city: 'Paris',
      price_level: 3,
      tags: ['culture', 'art'],
      rating: 4.6,
      trending_score: 2,
      saves_count: 40,
      views_count: 300,
    },
  ];

  const ranked = applyPersonalizationRanking(candidates, vector);

  assert.equal(ranked[0]?.slug, 'cafe-special', 'Cafe aligned with history should rank first');
  const cafeScore = ranked.find(item => item.slug === 'cafe-special')?.personalizationScore ?? 0;
  const nightlifeScore = ranked.find(item => item.slug === 'nightlife-spot')?.personalizationScore ?? 0;
  assert(cafeScore > nightlifeScore, 'Personalization score should boost cafe above nightlife option');
}

async function testDeviceSignalsInfluence() {
  const profile: TravelerProfile = {
    favoriteCategories: ['museum'],
    favoriteCities: ['barcelona'],
    travelVibes: ['family-friendly'],
  };

  const saved: SavedDestinationSummary[] = [
    {
      destination_slug: 'family-cafe',
      destination: {
        slug: 'family-cafe',
        category: 'cafe',
        city: 'Barcelona',
        price_level: 1,
        tags: ['family-friendly', 'cozy'],
      },
    },
  ];

  const deviceSignals: DevicePreferenceSignals = {
    activeCity: 'Barcelona',
    preferredBudget: { max: 2 },
    travelParty: ['family'],
    preferredVibes: ['relaxed'],
  };

  const vector = await buildPreferenceVector({
    profile,
    savedDestinations: saved,
    deviceSignals,
  });

  const candidates: DestinationCandidate[] = [
    {
      slug: 'family-museum',
      category: 'museum',
      city: 'Barcelona',
      price_level: 2,
      tags: ['family-friendly', 'relaxed'],
      rating: 4.2,
      trending_score: 2,
      saves_count: 20,
      views_count: 200,
    },
    {
      slug: 'luxury-bar',
      category: 'bar',
      city: 'Barcelona',
      price_level: 4,
      tags: ['nightlife', 'exclusive'],
      rating: 4.6,
      trending_score: 4,
      saves_count: 80,
      views_count: 400,
    },
    {
      slug: 'budget-cafe',
      category: 'cafe',
      city: 'Barcelona',
      price_level: 1,
      tags: ['cozy', 'relaxed'],
      rating: 4.3,
      trending_score: 1,
      saves_count: 10,
      views_count: 120,
    },
  ];

  const ranked = applyPersonalizationRanking(candidates, vector);

  assert.equal(ranked[0]?.slug, 'family-museum', 'Family museum should rank first with family signals');
  const museumScore = ranked.find(item => item.slug === 'family-museum')?.personalizationScore ?? 0;
  const barScore = ranked.find(item => item.slug === 'luxury-bar')?.personalizationScore ?? 0;
  assert(museumScore > barScore, 'Family aligned destination must outrank luxury bar under family signals');
}

(async () => {
  await testHistoryInfluence();
  await testDeviceSignalsInfluence();
  console.log('✅ personalization scoring integration tests passed');
})().catch(error => {
  console.error('❌ personalization scoring integration tests failed');
  console.error(error);
  process.exit(1);
});
