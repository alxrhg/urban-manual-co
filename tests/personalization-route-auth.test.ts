import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { createPersonalizationHandler } from '@/app/api/personalization/[user_id]/route';

const buildRequest = () =>
  new NextRequest(new Request('http://localhost/api/personalization/user-123'));

const buildContext = (userId: string) => ({
  params: Promise.resolve({ user_id: userId }),
});

type MockUser = { id: string; app_metadata?: Record<string, any> | null } | null;

const createSupabaseStub = (user: MockUser) => ({
  auth: {
    async getUser() {
      return {
        data: { user },
        error: null,
      };
    },
  },
  from() {
    throw new Error('from should not be called when request is denied');
  },
  rpc() {
    throw new Error('rpc should not be called when request is denied');
  },
});

async function testUnauthorizedWithoutSession() {
  const handler = createPersonalizationHandler({
    createClient: async () => createSupabaseStub(null) as any,
  });

  const response = await handler(buildRequest(), buildContext('user-123'));
  assert.equal(response.status, 401, 'requests without a session should return 401');
}

async function testCrossUserForbidden() {
  const handler = createPersonalizationHandler({
    createClient: async () =>
      createSupabaseStub({ id: 'user-123', app_metadata: {} }) as any,
  });

  const response = await handler(buildRequest(), buildContext('user-456'));
  assert.equal(response.status, 403, 'cross-user requests should be rejected');
}

async function run() {
  await testUnauthorizedWithoutSession();
  await testCrossUserForbidden();
  console.log('Personalization route auth tests passed');
}

run().catch(error => {
  console.error('Personalization route auth tests failed');
  console.error(error);
  process.exit(1);
});
