import { cache } from 'react';

import { createServerClient } from '@/lib/supabase-server';
import { SupabaseConfigError } from '@/lib/supabase/config';

const getSupabaseForRequest = cache(async () => {
  return createServerClient();
});

export type Context = {
  supabase: Awaited<ReturnType<typeof createServerClient>> | null;
  userId: string | null;
  configHealthy: boolean;
  configError?: SupabaseConfigError;
};

export async function createContext(): Promise<Context> {
  try {
    const supabase = await getSupabaseForRequest();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return {
      supabase,
      userId: session?.user?.id || null,
      configHealthy: true,
    };
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return {
        supabase: null,
        userId: null,
        configHealthy: false,
        configError: error,
      };
    }

    throw error;
  }
}

