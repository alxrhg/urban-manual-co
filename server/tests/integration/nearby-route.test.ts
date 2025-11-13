import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getNearby } from '@/app/api/destinations/nearby/route';
import { ErrorCode } from '@/lib/errors';

test('nearby route returns validation errors for missing coordinates', async () => {
  const request = new NextRequest('https://example.com/api/destinations/nearby');
  const response = await getNearby(request);

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.code, ErrorCode.VALIDATION_ERROR);
  assert.match(payload.error, /Invalid nearby destination query/);
  assert.ok(payload.details);
});
