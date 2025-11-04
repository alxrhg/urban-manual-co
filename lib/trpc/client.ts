// Conditional import for TRPC
let createTRPCReact: any;
let trpc: any;

try {
  const trpcReactQuery = require('@trpc/react-query');
  createTRPCReact = trpcReactQuery.createTRPCReact;
  
  import type { AppRouter } from '@/server/routers/_app';
  trpc = createTRPCReact<AppRouter>();
} catch (error) {
  console.warn('@trpc/react-query not installed. TRPC client will be unavailable.');
  // Fallback mock
  trpc = {
    ai: {
      chat: {
        useMutation: () => ({
          mutate: () => {},
          isLoading: false,
        }),
      },
      getSuggestedPrompts: {
        useQuery: () => ({ data: [] }),
      },
    },
  };
}

export { trpc };

