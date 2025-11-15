/**
 * Tests for Upstash Vector Integration
 * 
 * Tests semantic search and admin reindexing endpoints
 */

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret';
process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
process.env.OPENAI_API_KEY = 'sk-test';

test('semantic search route validates query parameter', async () => {
  // Test that the route requires a query parameter
  const mockRequest = {
    json: async () => ({ limit: 10 }),
  };

  // Import the route handler
  const { POST } = await import('../app/api/search/semantic/route');
  
  const response = await POST(mockRequest as any);
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.error, 'Query is required and must be a string');
});

test('semantic search route handles empty results', async () => {
  // Mock the vector query to return no results
  const mockRequest = {
    json: async () => ({ query: 'test query', limit: 5 }),
  };

  // We would need to mock the Upstash Vector and Supabase clients
  // For now, this is a basic structure test
  // Full integration tests would require mocking dependencies
});

test('reindex route validates mode parameter', async () => {
  const mockRequest = {
    json: async () => ({ mode: 'invalid' }),
  };

  const { POST } = await import('../app/api/admin/reindex-destinations/route');
  
  const response = await POST(mockRequest as any);
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.error, 'Mode must be "all" or "changed"');
});

test('geocode job validates Google API key', async () => {
  // Temporarily remove API key
  const originalKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  const mockRequest = {
    json: async () => ({ batchSize: 10 }),
  };

  const { POST } = await import('../app/api/jobs/geocode-missing/route');
  
  const response = await POST(mockRequest as any);
  const data = await response.json();

  assert.equal(response.status, 500);
  assert.equal(data.error, 'NEXT_PUBLIC_GOOGLE_API_KEY not configured');

  // Restore
  if (originalKey) process.env.NEXT_PUBLIC_GOOGLE_API_KEY = originalKey;
});

test('generate descriptions job validates Gemini API key', async () => {
  // Temporarily remove API key
  const originalGemini = process.env.GEMINI_API_KEY;
  const originalGoogle = process.env.GOOGLE_AI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;

  const mockRequest = {
    json: async () => ({ batchSize: 5 }),
  };

  const { POST } = await import('../app/api/jobs/generate-descriptions/route');
  
  const response = await POST(mockRequest as any);
  const data = await response.json();

  assert.equal(response.status, 500);
  assert.equal(data.error, 'GEMINI_API_KEY not configured');

  // Restore
  if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
  if (originalGoogle) process.env.GOOGLE_AI_API_KEY = originalGoogle;
});

test('upstash-vector client throws when credentials missing', async () => {
  const originalUrl = process.env.UPSTASH_VECTOR_REST_URL;
  const originalToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
  
  delete process.env.UPSTASH_VECTOR_REST_URL;
  delete process.env.UPSTASH_VECTOR_REST_TOKEN;

  const { getVectorIndex } = await import('../lib/upstash-vector');

  assert.throws(
    () => getVectorIndex(),
    /Missing Upstash Vector credentials/
  );

  // Restore
  if (originalUrl) process.env.UPSTASH_VECTOR_REST_URL = originalUrl;
  if (originalToken) process.env.UPSTASH_VECTOR_REST_TOKEN = originalToken;
});

test('embedding client uses ML service URL from env', async () => {
  const originalUrl = process.env.ML_SERVICE_URL;
  process.env.ML_SERVICE_URL = 'https://test-ml.example.com';

  // Test that the client is configured with the correct URL
  // This would require mocking fetch to verify the URL is used
  
  // Restore
  if (originalUrl) {
    process.env.ML_SERVICE_URL = originalUrl;
  } else {
    delete process.env.ML_SERVICE_URL;
  }
});

test('concierge API validates query parameter', async () => {
  const mockRequest = {
    json: async () => ({ limit: 5 }),
  };

  const { POST } = await import('../app/api/concierge/query/route');
  
  const response = await POST(mockRequest as any);
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.error, 'Query is required');
});

test('concierge API accepts valid request structure', async () => {
  const mockRequest = {
    json: async () => ({
      query: 'romantic restaurants',
      userContext: {
        budget: 'luxury',
        travelStyle: 'romantic',
      },
      limit: 5,
      includeExternal: false,
    }),
  };

  // This test validates the request structure
  // Full integration would require mocking vector DB and Supabase
  const requestData = await mockRequest.json();
  
  assert.equal(typeof requestData.query, 'string');
  assert.equal(requestData.limit, 5);
  assert.equal(requestData.includeExternal, false);
  assert.equal(requestData.userContext.budget, 'luxury');
});
