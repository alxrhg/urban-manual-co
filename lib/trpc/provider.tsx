'use client';

import { useState } from 'react';

// Conditional imports - TRPC is optional
let QueryClient: any;
let QueryClientProvider: any;
let httpBatchLink: any;
let trpc: any;

try {
  const reactQuery = require('@tanstack/react-query');
  QueryClient = reactQuery.QueryClient;
  QueryClientProvider = reactQuery.QueryClientProvider;
  
  const trpcClient = require('@trpc/client');
  httpBatchLink = trpcClient.httpBatchLink;
  
  const { trpc: trpcInstance } = require('./client');
  trpc = trpcInstance;
} catch (error) {
  // TRPC packages not installed - provide fallback
  console.warn('TRPC packages not installed. TRPC features will be disabled.');
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // If TRPC packages aren't installed, just return children
  if (!QueryClient || !QueryClientProvider || !httpBatchLink || !trpc) {
    return <>{children}</>;
  }
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

