import { cookies } from 'next/headers';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createServerClient, createServiceRoleClient } from './supabase/server';

export type AdminRole = 'admin' | 'editor' | 'moderator' | 'support' | 'viewer';

const VALID_ROLES: AdminRole[] = ['admin', 'editor', 'moderator', 'support', 'viewer'];

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!url || !anonKey) {
    throw new Error('Supabase configuration is missing.');
  }

  return { url, anonKey };
}

function toRole(role: unknown): AdminRole | null {
  if (typeof role !== 'string') return null;
  if ((VALID_ROLES as string[]).includes(role)) {
    return role as AdminRole;
  }
  if (role === 'owner') {
    return 'admin';
  }
  return null;
}

function extractRoles(user: User): AdminRole[] {
  const metadata = (user.app_metadata || {}) as Record<string, unknown>;
  const roles = new Set<AdminRole>();

  const primary = toRole(metadata.role);
  if (primary) {
    roles.add(primary);
  }

  const rolesValue = metadata.roles;
  if (Array.isArray(rolesValue)) {
    rolesValue.forEach(value => {
      const normalized = toRole(value);
      if (normalized) {
        roles.add(normalized);
      }
    });
  }

  if (metadata.is_admin === true) {
    roles.add('admin');
  }

  if (roles.size === 0) {
    roles.add('viewer');
  }

  return Array.from(roles);
}

function shouldUseBearerAuth(request?: Request) {
  if (!request) return false;
  const authorization = request.headers.get('authorization') || request.headers.get('Authorization');
  return Boolean(authorization && authorization.toLowerCase().startsWith('bearer '));
}

function createSupabaseWithBearer(request: Request): SupabaseClient {
  const authorization =
    request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authorization?.slice(7).trim();

  if (!token) {
    throw new AuthError('Unauthorized', 401);
  }

  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export interface AuthContext {
  user: User;
  roles: AdminRole[];
  supabase: SupabaseClient;
  serviceClient?: SupabaseClient;
}

export async function getAuthContext(request?: Request): Promise<AuthContext> {
  let supabase: SupabaseClient;

  if (shouldUseBearerAuth(request)) {
    supabase = createSupabaseWithBearer(request!);
  } else {
    // In API routes, cookies() must be awaited lazily to avoid midflight issues
    await cookies();
    supabase = await createServerClient();
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Unauthorized', 401);
  }

  const roles = extractRoles(user);

  return { user, roles, supabase };
}

function hasRequiredRole(userRoles: AdminRole[], allowedRoles: AdminRole[]): boolean {
  const roleSet = new Set(allowedRoles);
  if (roleSet.size === 0) return true;

  return userRoles.some(role => roleSet.has(role) || role === 'admin');
}

interface RequireRoleOptions {
  request?: Request;
  allowedRoles: AdminRole[];
  withServiceRole?: boolean;
}

export async function requireRole({
  request,
  allowedRoles,
  withServiceRole = false,
}: RequireRoleOptions): Promise<AuthContext> {
  const context = await getAuthContext(request);
  if (!hasRequiredRole(context.roles, allowedRoles)) {
    throw new AuthError('Forbidden', 403);
  }

  if (withServiceRole) {
    context.serviceClient = createServiceRoleClient();
  }

  return context;
}

export async function optionalAuth(request?: Request): Promise<AuthContext | null> {
  try {
    return await getAuthContext(request);
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function ensureRoleOrThrow(roles: AdminRole[], required: AdminRole | AdminRole[]): void {
  const requiredArray = Array.isArray(required) ? required : [required];
  if (!hasRequiredRole(roles, requiredArray)) {
    throw new AuthError('Forbidden', 403);
  }
}
