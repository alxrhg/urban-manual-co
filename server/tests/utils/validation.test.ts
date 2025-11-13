import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { coordinatesSchema, paginationSchema, filtersSchema, parseSearchParams, parseJsonBody } from '@/lib/utils/validation';
import { CustomError, ErrorCode } from '@/lib/errors';

const nearbySchema = coordinatesSchema.extend({
  radius: z.coerce.number().positive().default(5),
});

test('coordinates schema accepts valid values', () => {
  const result = coordinatesSchema.parse({ lat: '35.0', lng: '-120.5' });
  assert.equal(result.lat, 35);
  assert.equal(result.lng, -120.5);
});

test('coordinates schema rejects invalid latitude', () => {
  assert.throws(
    () => coordinatesSchema.parse({ lat: 200, lng: 10 }),
    /Latitude must be less than or equal to 90/
  );
});

test('pagination schema provides sensible defaults', () => {
  const result = paginationSchema.parse({});
  assert.equal(result.limit, 20);
  assert.equal(result.offset, 0);
});

test('filters schema trims and validates city names', () => {
  const result = filtersSchema.parse({ city: '  Tokyo  ' });
  assert.equal(result.city, 'Tokyo');
});

test('parseSearchParams returns typed numbers from URLs', () => {
  const result = parseSearchParams('https://example.com?lat=51.5&lng=-0.12&radius=12', nearbySchema);
  assert.deepEqual(result, { lat: 51.5, lng: -0.12, radius: 12 });
});

test('parseSearchParams throws CustomError on invalid data', () => {
  assert.throws(() => parseSearchParams('https://example.com?lat=abc&lng=10', nearbySchema), (error: any) => {
    assert.ok(error instanceof CustomError);
    assert.equal(error.code, ErrorCode.VALIDATION_ERROR);
    assert.match(error.message, /Invalid query parameters/);
    return true;
  });
});

test('parseJsonBody coerces payloads and rejects invalid fields', async () => {
  const schema = z.object({
    page: paginationSchema.shape.limit,
  });

  const validRequest = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({ page: 5 }),
    headers: { 'content-type': 'application/json' },
  });

  const result = await parseJsonBody(validRequest, schema, { errorMessage: 'Invalid pagination payload' });
  assert.equal(result.page, 5);

  const invalidRequest = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({ page: 0 }),
    headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(
    () => parseJsonBody(invalidRequest, schema, { errorMessage: 'Invalid pagination payload' }),
    (error: any) => {
      assert.ok(error instanceof CustomError);
      assert.equal(error.code, ErrorCode.VALIDATION_ERROR);
      assert.match(error.message, /Invalid pagination payload/);
      return true;
    }
  );
});
