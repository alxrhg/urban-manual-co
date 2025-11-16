import { router } from '../trpc';
import { aiRouter } from './ai';
import { collectionsRouter } from './collections';

export const appRouter = router({
  ai: aiRouter,
  collections: collectionsRouter,
});

export type AppRouter = typeof appRouter;

