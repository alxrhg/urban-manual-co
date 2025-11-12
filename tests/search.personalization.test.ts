import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CATEGORY_SEEDS,
  DEFAULT_CITY_SEEDS,
  createPlannerRuntimePayload,
  extractPreferenceSeeds,
} from '../lib/personalization/preferences.ts';

test('extractPreferenceSeeds returns defaults when no preferences are stored', () => {
  const result = extractPreferenceSeeds(null);
  assert.deepStrictEqual(result.categories, Array.from(DEFAULT_CATEGORY_SEEDS));
  assert.deepStrictEqual(result.cities, Array.from(DEFAULT_CITY_SEEDS));
  assert.equal(result.source, 'default');
  assert.equal(result.vector.categories.length, DEFAULT_CATEGORY_SEEDS.length);
  assert.equal(result.vector.cities.length, DEFAULT_CITY_SEEDS.length);
});

test('extractPreferenceSeeds sorts and normalizes preference scores', () => {
  const result = extractPreferenceSeeds(
    {
      category_scores: { ramen: 2, sushi: 1, karaoke: 0.5 },
      city_scores: { tokyo: 5, kyoto: 3, osaka: 1 },
    },
    { limit: 2 }
  );

  assert.deepStrictEqual(result.categories, ['Ramen', 'Sushi']);
  assert.deepStrictEqual(result.cities, ['Tokyo', 'Kyoto']);
  assert.equal(result.source, 'user');
  assert.equal(result.vector.categories[0].score, 1);
  assert.equal(result.vector.categories[1].score, 0.5);
  assert.equal(result.vector.cities[0].score, 1);
  assert.equal(result.vector.cities[1].score, 0.6);
});

test('createPlannerRuntimePayload injects the preference vector', () => {
  const seeds = extractPreferenceSeeds(
    {
      category_scores: { ramen: 3, sushi: 2 },
      city_scores: { tokyo: 4, kyoto: 1 },
    },
    { limit: 2 }
  );

  const baseRequest = { action: 'generate', destinations: [1, 2, 3], days: 2 };
  const payload = createPlannerRuntimePayload(baseRequest, 'user-123', seeds);

  assert.equal(payload.userId, 'user-123');
  assert.equal(payload.action, 'generate');
  assert.equal(payload.destinations.length, 3);
  assert.deepStrictEqual(payload.preferenceVector, seeds.vector);
  assert.equal(payload.preferenceVectorSource, seeds.source);
});

