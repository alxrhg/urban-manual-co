import { router } from '../trpc';
import { aiRouter } from './ai';
import { itineraryRouter } from './itinerary';

export const appRouter = router({
  ai: aiRouter,
  itinerary: itineraryRouter,
});

export type AppRouter = typeof appRouter;

