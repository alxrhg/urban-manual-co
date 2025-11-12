import { router } from '../trpc';
import { aiRouter } from './ai';
import { chatRouter } from '@/server/trpc/router/chat';

export const appRouter = router({
  ai: aiRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;

