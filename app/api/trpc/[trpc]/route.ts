import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';
import { applyCors, corsOptionsResponse } from '@/lib/cors';

const handler = async (req: Request) => {
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

  return applyCors(req, response);
};

const options = (request: Request) => corsOptionsResponse(request);

export { handler as GET, handler as POST, options as OPTIONS };

