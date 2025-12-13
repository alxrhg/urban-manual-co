/**
 * Tests for Observability Module
 *
 * Tests search quality tracking and planner failure metrics.
 * Note: These tests verify the tracker logic without mocking Sentry
 * since module mocking requires Node.js 20.6+
 */

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// Set test environment before imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret';
process.env.NODE_ENV = 'test';

// ============================================================================
// Search Quality Tracker Tests
// ============================================================================

describe('Search Quality Observability', () => {
  test('createSearchTracker returns tracker object with expected methods', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('test query', { city: 'Tokyo' });

    assert.ok(typeof tracker.success === 'function');
    assert.ok(typeof tracker.fallback === 'function');
    assert.ok(typeof tracker.error === 'function');
  });

  test('createSearchTracker success method accepts valid tier', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('sushi in tokyo', { city: 'Tokyo' });

    // Should not throw
    tracker.success(15, 'vector-semantic');
  });

  test('createSearchTracker success with zero results', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('nonexistent query');

    // Should not throw
    tracker.success(0, 'keyword');
  });

  test('createSearchTracker fallback method accepts tier and reason', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('test query');

    // Should not throw
    tracker.fallback('fulltext', 'vector_search_failed');
  });

  test('createSearchTracker error method accepts Error object', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('error query');

    // Should not throw
    tracker.error(new Error('Database connection failed'));
  });

  test('createSearchTracker error method accepts string', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('error query');

    // Should not throw
    tracker.error('Connection timeout');
  });

  test('tracker prevents duplicate recordings via success', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('test');

    // First call should work
    tracker.success(10, 'vector-semantic');

    // Second call should be ignored (no error, just no-op)
    tracker.success(10, 'vector-semantic');
  });

  test('tracker prevents duplicate recordings via error after success', async () => {
    const { createSearchTracker } = await import('../lib/observability/index');

    const tracker = createSearchTracker('test');

    tracker.success(10, 'vector-semantic');

    // Error after success should be ignored
    tracker.error('Should be ignored');
  });
});

// ============================================================================
// Planner Tracker Tests
// ============================================================================

describe('Planner Failure Observability', () => {
  test('createPlannerTracker returns tracker object with expected methods', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Plan a trip', { userId: 'user-123' });

    assert.ok(typeof tracker.toolCalled === 'function');
    assert.ok(typeof tracker.toolError === 'function');
    assert.ok(typeof tracker.iteration === 'function');
    assert.ok(typeof tracker.success === 'function');
    assert.ok(typeof tracker.failure === 'function');
    assert.ok(typeof tracker.timeout === 'function');
    assert.ok(typeof tracker.validationError === 'function');
  });

  test('createPlannerTracker toolCalled method accepts tool name', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Plan a 3-day Tokyo trip', { userId: 'user-123' });

    // Should not throw
    tracker.toolCalled('search_destinations');
    tracker.toolCalled('create_trip');
    tracker.toolCalled('add_to_itinerary');
  });

  test('createPlannerTracker toolError method accepts tool name and error', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Test prompt');

    // Should not throw
    tracker.toolError('search_destinations', 'No results found');
    tracker.toolError('create_trip', 'User not authenticated');
  });

  test('createPlannerTracker iteration method increments count', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Test prompt');

    // Should not throw
    tracker.iteration();
    tracker.iteration();
    tracker.iteration();
  });

  test('createPlannerTracker success method works after tool calls', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Plan a trip', { userId: 'user-123' });

    tracker.toolCalled('search_destinations');
    tracker.toolCalled('create_trip');
    tracker.iteration();
    tracker.iteration();

    // Should not throw
    tracker.success();
  });

  test('createPlannerTracker failure method accepts error type and message', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Invalid prompt');

    tracker.toolCalled('search_destinations');
    tracker.toolError('search_destinations', 'No results found');

    // Should not throw
    tracker.failure('api_error', 'Gemini API returned error');
  });

  test('createPlannerTracker timeout method works', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Long running prompt');

    for (let i = 0; i < 10; i++) {
      tracker.iteration();
      tracker.toolCalled('search_destinations');
    }

    // Should not throw
    tracker.timeout();
  });

  test('createPlannerTracker validationError method works', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('');

    // Should not throw
    tracker.validationError('Prompt is required');
  });

  test('full planner flow with multiple tools and errors', async () => {
    const { createPlannerTracker } = await import('../lib/observability/index');

    const tracker = createPlannerTracker('Plan a Tokyo food tour', {
      userId: 'user-123',
      tripId: 'trip-456',
    });

    // Simulate a planning flow
    tracker.toolCalled('search_destinations');
    tracker.iteration();

    tracker.toolCalled('create_trip');
    tracker.toolError('create_trip', 'Duplicate title');
    tracker.iteration();

    tracker.toolCalled('create_trip');
    tracker.toolCalled('add_to_itinerary');
    tracker.toolCalled('add_to_itinerary');
    tracker.iteration();

    // Should not throw
    tracker.success();
  });
});

// ============================================================================
// Direct Function Tests
// ============================================================================

describe('Direct Tracking Functions', () => {
  test('trackSearchQuality function exists and is callable', async () => {
    const { trackSearchQuality } = await import('../lib/observability/index');

    assert.ok(typeof trackSearchQuality === 'function');

    // Should not throw
    await trackSearchQuality('search_performed', {
      query: 'test',
      tier: 'vector-semantic',
      resultCount: 10,
      responseTimeMs: 150,
    });
  });

  test('trackPlannerMetric function exists and is callable', async () => {
    const { trackPlannerMetric } = await import('../lib/observability/index');

    assert.ok(typeof trackPlannerMetric === 'function');

    // Should not throw
    await trackPlannerMetric('planner_request', {
      prompt: 'test',
      toolsCalled: ['search_destinations'],
      toolErrors: [],
      iterationCount: 1,
      durationMs: 500,
      success: true,
    });
  });

  test('all search quality event types are accepted', async () => {
    const { trackSearchQuality } = await import('../lib/observability/index');

    const events = [
      'search_performed',
      'search_no_results',
      'search_fallback_triggered',
      'search_slow_response',
      'search_error',
    ] as const;

    for (const event of events) {
      // Should not throw
      await trackSearchQuality(event, { query: 'test', tier: 'none', resultCount: 0, responseTimeMs: 0 });
    }
  });

  test('all planner event types are accepted', async () => {
    const { trackPlannerMetric } = await import('../lib/observability/index');

    const events = [
      'planner_request',
      'planner_success',
      'planner_failure',
      'planner_timeout',
      'planner_tool_error',
      'planner_validation_error',
    ] as const;

    for (const event of events) {
      // Should not throw
      await trackPlannerMetric(event, {
        prompt: 'test',
        toolsCalled: [],
        toolErrors: [],
        iterationCount: 0,
        durationMs: 0,
        success: false,
      });
    }
  });
});

// ============================================================================
// Type Safety Tests
// ============================================================================

describe('Type Safety', () => {
  test('SearchMetricPayload type has expected fields', async () => {
    const { trackSearchQuality } = await import('../lib/observability/index');

    const payload = {
      query: 'test query',
      tier: 'vector-semantic' as const,
      resultCount: 10,
      responseTimeMs: 250,
      city: 'Tokyo',
      category: 'Restaurant',
      userId: 'user-123',
      error: undefined,
      fallbackReason: undefined,
    };

    // Should not throw - type check at compile time
    await trackSearchQuality('search_performed', payload);
  });

  test('PlannerMetricPayload type has expected fields', async () => {
    const { trackPlannerMetric } = await import('../lib/observability/index');

    const payload = {
      prompt: 'Plan a trip',
      userId: 'user-123',
      tripId: 'trip-456',
      toolsCalled: ['search_destinations', 'create_trip'],
      toolErrors: ['create_trip: Duplicate title'],
      iterationCount: 3,
      durationMs: 2500,
      success: true,
      errorType: undefined,
      errorMessage: undefined,
    };

    // Should not throw - type check at compile time
    await trackPlannerMetric('planner_success', payload);
  });
});
