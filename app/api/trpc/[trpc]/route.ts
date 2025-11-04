// Conditional import for TRPC
let fetchRequestHandler: any;

try {
  const adapter = require('@trpc/server/adapters/fetch');
  fetchRequestHandler = adapter.fetchRequestHandler;
} catch (error) {
  console.warn('@trpc/server/adapters/fetch not installed.');
  fetchRequestHandler = null;
}

import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) => {
  if (!fetchRequestHandler) {
    return new Response(
      JSON.stringify({ error: 'TRPC is not configured. Please install @trpc/server and related packages.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };

