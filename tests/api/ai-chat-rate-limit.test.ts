import { beforeEach, describe, expect, it } from 'vitest';
import {
  chatLimiter,
  intelligenceLimiter,
  memoryChatLimiter,
  memoryIntelligenceLimiter,
  withRateLimit,
} from '@/lib/rate-limit';

function buildRequest(
  path: string,
  method: string,
  body?: unknown,
  ip = '203.0.113.5'
) {
  const headers: Record<string, string> = {
    'x-forwarded-for': ip,
  };

  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('rate limit middleware', () => {
  beforeEach(() => {
    memoryChatLimiter.reset();
    memoryIntelligenceLimiter.reset();
  });

  it('throttles the AI chat endpoint after three quick requests', async () => {
    const makeRequest = () =>
      withRateLimit({
        request: buildRequest('/api/ai-chat', 'POST', { query: 'hello' }),
        limiter: chatLimiter,
        fallbackLimiter: memoryChatLimiter,
        handler: okResponse,
        message: 'AI chat quota exceeded',
      });

    for (let i = 0; i < 3; i++) {
      const response = await makeRequest();
      expect(response.status).toBe(200);
    }

    const blocked = await makeRequest();
    expect(blocked.status).toBe(429);
    const payload = await blocked.json();
    expect(payload.rateLimitExceeded).toBe(true);
  });

  it('applies the stricter intelligence API quota', async () => {
    const makeRequest = () =>
      withRateLimit({
        request: buildRequest('/api/intelligence/opportunities', 'GET', undefined, '198.51.100.7'),
        limiter: intelligenceLimiter,
        fallbackLimiter: memoryIntelligenceLimiter,
        handler: okResponse,
        message: 'Intelligence quota exceeded',
      });

    for (let i = 0; i < 30; i++) {
      const response = await makeRequest();
      expect(response.status).toBe(200);
    }

    const blocked = await makeRequest();
    expect(blocked.status).toBe(429);
    const payload = await blocked.json();
    expect(payload.rateLimitExceeded).toBe(true);
  });
});
