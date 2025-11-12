import assert from 'node:assert/strict';
import test from 'node:test';

import { SmartTripGuideAIService } from '@/services/ai/trip-guide';

const service = new SmartTripGuideAIService(null);

test('extracts city, category, and price signals from free text', async () => {
  const result = await service.parsePreferences({
    text: 'Plan a romantic dinner in Paris at price level 3 for 2 people',
  });

  assert.equal(result.city, 'Paris');
  assert.equal(result.category, 'restaurant');
  assert.equal(result.maxPriceLevel, 3);
  assert.ok(result.tags.includes('romantic'));
  assert.equal(result.groupSize, 2);
});

test('infers cafe criteria for remote work requests', async () => {
  const result = await service.parsePreferences({
    text: 'Cozy cafes with wifi for remote work in Tokyo for a 3-day stay',
  });

  assert.equal(result.category, 'cafe');
  assert.equal(result.city, 'Tokyo');
  assert.ok(result.tags.includes('wifi'));
  assert.ok(result.tags.includes('cozy'));
  assert.equal(result.durationDays, 3);
  assert.ok(result.keywords.includes('remote'));
});

