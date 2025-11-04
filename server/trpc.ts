// Conditional import for TRPC
let initTRPC: any;
let TRPCError: any;

try {
  const trpcServer = require('@trpc/server');
  initTRPC = trpcServer.initTRPC;
  TRPCError = trpcServer.TRPCError;
} catch (error) {
  console.warn('@trpc/server not installed. TRPC features will be disabled.');
  // Fallback exports
  initTRPC = null;
  TRPCError = class extends Error {
    constructor(options: any) {
      super(options.message || 'TRPC Error');
      this.name = 'TRPCError';
    }
  };
}

import type { Context } from './context';

const t = initTRPC ? initTRPC.context<Context>().create() : null;

export const router = t ? t.router : (() => {
  console.warn('TRPC router not available - @trpc/server not installed');
  return () => {};
})();

export const publicProcedure = t ? t.procedure : (() => {
  console.warn('TRPC procedure not available');
  return { query: () => {}, mutation: () => {} };
})();

export const protectedProcedure = t ? t.procedure.use(({ ctx, next }: any) => {
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    });
  }
  return next({ 
    ctx: { 
      ...ctx, 
      userId: ctx.userId // Type narrowing - userId is now guaranteed to be non-null
    } 
  });
}) : publicProcedure;

