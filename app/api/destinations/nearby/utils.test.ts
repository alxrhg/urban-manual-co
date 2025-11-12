import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterNearbyResultsByRadius, parseLatitude, parseLongitude, parseRadius, MAX_RADIUS_KM, DEFAULT_RADIUS_KM } from './utils';
import { CustomError } from '@/lib/errors';

test('parseLatitude allows latitude of 0', () => {
  assert.equal(parseLatitude('0'), 0);
});

test('parseLatitude throws when latitude is missing', () => {
  assert.throws(() => parseLatitude(null), CustomError);
});

test('parseLatitude throws when latitude is out of bounds', () => {
  assert.throws(() => parseLatitude('120'), CustomError);
});

test('parseLongitude allows longitude of 0', () => {
  assert.equal(parseLongitude('0'), 0);
});

test('parseLongitude throws when longitude is NaN', () => {
  assert.throws(() => parseLongitude('abc'), CustomError);
});

test('parseLongitude throws when longitude is out of bounds', () => {
  assert.throws(() => parseLongitude('-190'), CustomError);
});

test('parseRadius uses the default when radius is not provided', () => {
  assert.equal(parseRadius(null), DEFAULT_RADIUS_KM);
});

test('parseRadius allows numeric radius within bounds', () => {
  assert.equal(parseRadius('12.5'), 12.5);
});

test('parseRadius allows a radius of 0', () => {
  assert.equal(parseRadius('0'), 0);
});

test('parseRadius throws when the radius is not numeric', () => {
  assert.throws(() => parseRadius('abc'), CustomError);
});

test('parseRadius throws when the radius exceeds the maximum', () => {
  assert.throws(() => parseRadius(String(MAX_RADIUS_KM + 1)), CustomError);
});

test('filterNearbyResultsByRadius keeps results within the requested radius', () => {
  const results = [
    { slug: 'a', distanceMeters: 100, durationMinutes: 2 },
    { slug: 'b', distanceMeters: 1500, durationMinutes: 5 },
    { slug: 'c', distanceMeters: 3000, durationMinutes: 10 },
  ];

  const filtered = filterNearbyResultsByRadius(results, 1.5);

  assert.deepEqual(filtered, [
    { slug: 'a', distanceMeters: 100, durationMinutes: 2 },
    { slug: 'b', distanceMeters: 1500, durationMinutes: 5 },
  ]);
});

test('filterNearbyResultsByRadius removes results that exceed the radius', () => {
  const results = [
    { slug: 'a', distanceMeters: 500, durationMinutes: 2 },
    { slug: 'b', distanceMeters: 2500, durationMinutes: 5 },
  ];

  const filtered = filterNearbyResultsByRadius(results, 1);

  assert.deepEqual(filtered, [{ slug: 'a', distanceMeters: 500, durationMinutes: 2 }]);
});
