import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireRole, AuthError, type AdminRole, type AuthContext } from '@/lib/auth';

type GuardableRequest = NextRequest | Request;

interface GuardSuccess {
  context: AuthContext;
  response?: never;
}

interface GuardFailure {
  context?: never;
  response: NextResponse;
}

export type GuardResult = GuardSuccess | GuardFailure;

export async function adminGuard(
  request: GuardableRequest,
  allowedRoles: AdminRole[] = ['admin']
): Promise<GuardResult> {
  try {
    const context = await requireRole({
      request: request as Request,
      allowedRoles,
      withServiceRole: true,
    });

    return { context };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        response: NextResponse.json(
          { error: error.message },
          { status: error.status }
        ),
      };
    }

    console.error('[adminGuard] Unexpected error', error);
    return {
      response: NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      ),
    };
  }
}

export async function requireAdminRoles(
  request: GuardableRequest,
  allowedRoles: AdminRole[]
): Promise<AuthContext> {
  const result = await adminGuard(request, allowedRoles);
  if ('context' in result) {
    return result.context;
  }
  const status = result.response.status;
  const message = status === 401 ? 'Unauthorized' : 'Forbidden';
  throw new AuthError(message, status);
}
