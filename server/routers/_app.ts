import { router } from '../trpc';
import { aiRouter } from './ai';
import { tripsRouter } from './trips';

export const appRouter = router({
  ai: aiRouter,
  trips: tripsRouter,
});

export type AppRouter = typeof appRouter;

