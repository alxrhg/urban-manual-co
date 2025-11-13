import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase-server';
import { SupabaseConfigError } from '@/lib/supabase/config';

const CACHE_TTL_MS = 30_000;

type HealthPayload = {
  status: 'healthy' | 'unhealthy';
  checkedAt: string;
  error?: string;
};

let cachedResult: { expiresAt: number; payload: HealthPayload } | null = null;

export async function GET() {
  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    return respond(cachedResult.payload);
  }

  const checkedAt = new Date().toISOString();

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.getSession();

    const payload: HealthPayload = error
      ? {
          status: 'unhealthy',
          checkedAt,
          error: error.message,
        }
      : { status: 'healthy', checkedAt };

    cachedResult = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
    return respond(payload);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      const payload: HealthPayload = {
        status: 'unhealthy',
        checkedAt,
        error: error.message,
      };
      cachedResult = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
      return respond(payload);
    }

    throw error;
  }
}

function respond(payload: HealthPayload) {
  return NextResponse.json(payload, {
    status: payload.status === 'healthy' ? 200 : 503,
  });
}
