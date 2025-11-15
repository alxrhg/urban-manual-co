import assert from 'node:assert/strict';
import { fetchWithRetry, deriveWarningMessage } from '@/hooks/useIntelligentSearch';

async function testRetriesTransientResponses() {
  let attempts = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    attempts += 1;
    if (attempts < 3) {
      return new Response('error', { status: attempts === 1 ? 500 : 429 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  const response = await fetchWithRetry('https://example.com/search', {});
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(attempts, 3, 'should retry twice before succeeding');
  global.fetch = originalFetch;
}

async function testAbortStopsRetries() {
  const controller = new AbortController();
  const originalFetch = global.fetch;
  global.fetch = async () => {
    controller.abort();
    throw new DOMException('Aborted', 'AbortError');
  };

  await assert.rejects(
    () => fetchWithRetry('https://example.com/search', { signal: controller.signal }),
    (error: any) => error?.name === 'AbortError',
    'abort controller should stop retries'
  );
  global.fetch = originalFetch;
}

function testWarningMessages() {
  const warning = deriveWarningMessage({ warnings: ['Results may be stale'] });
  assert.equal(warning, 'Results may be stale');

  const staleFlag = deriveWarningMessage({ stale: true });
  assert.equal(staleFlag?.includes('stale'), true);

  const none = deriveWarningMessage();
  assert.equal(none, null);
}

async function run() {
  try {
    await testRetriesTransientResponses();
    await testAbortStopsRetries();
    testWarningMessages();
    console.log('useIntelligentSearch helper tests passed');
  } catch (error) {
    console.error('useIntelligentSearch helper tests failed');
    console.error(error);
    process.exit(1);
  }
}

run();
