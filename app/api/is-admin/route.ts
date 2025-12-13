import { NextRequest } from 'next/server';
import { withAuth, AuthContext, createSuccessResponse } from '@/lib/errors';

export const POST = withAuth(async (_request: NextRequest, { user }: AuthContext) => {
  const role = (user.app_metadata as Record<string, any> | null)?.role;
  return createSuccessResponse({ isAdmin: role === 'admin' });
});

