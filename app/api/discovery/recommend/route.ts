import { createServerClient, createServiceRoleClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * Returns ML-similar candidate destinations for the admin dashboard.
 *
 * Only authenticated admins should be able to trigger the heavy RPC, so this
 * route first validates the caller's role before using the service role client
 * (bypassing RLS) to execute the `recommend_places` function.
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('[Discovery Recommend] Failed to load user session:', userError);
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const role = (user.app_metadata as Record<string, any> | null)?.role;
    if (role !== 'admin') {
      console.warn('[Discovery Recommend] Non-admin attempted to access recommendations', { userId: user.id, role });
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient.rpc("recommend_places");

    if (error) {
      console.error('[Discovery Recommend] Error calling recommend_places:', error);
      return NextResponse.json({ error: error.message || 'Failed to load recommendations' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[Discovery Recommend] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

