import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCors, corsOptionsResponse, corsPolicy } from '../../lib/cors';

test('CORS helper returns the documented headers for production origins', () => {
  const request = new Request('https://www.urbanmanual.co/api/search', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://www.urbanmanual.co',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });

  const response = corsOptionsResponse(request);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://www.urbanmanual.co');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), corsPolicy.allowedMethods);
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type, Authorization');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(response.headers.get('Access-Control-Max-Age'), String(corsPolicy.maxAgeSeconds));
});

test('CORS helper rejects origins that are not on the allowlist', () => {
  const request = new Request('https://www.urbanmanual.co/api/search', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://not-allowed.example.com',
    },
  });

  const response = corsOptionsResponse(request);
  assert.equal(response.status, 403);
});

test('Preview deployments inherit the same policy headers', () => {
  const previewOrigin = 'https://urbanmanual-git-feature-abc123.vercel.app';
  const request = new Request('https://www.urbanmanual.co/api/search', {
    method: 'GET',
    headers: {
      Origin: previewOrigin,
    },
  });

  const response = applyCors(request, new Response('ok'));
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), previewOrigin);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), corsPolicy.allowedMethods);
  assert.ok(response.headers.get('Access-Control-Allow-Headers'));
  assert.equal(response.headers.get('Access-Control-Expose-Headers'), corsPolicy.exposedHeaders);
});
