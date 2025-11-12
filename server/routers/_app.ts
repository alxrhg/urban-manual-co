import { router } from '../trpc';
import { aiRouter } from './ai';
import { tripGuideRouter } from './trip-guide';

export const appRouter = router({
  ai: aiRouter,
  tripGuide: tripGuideRouter,
});

export type AppRouter = typeof appRouter;

