import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withErrorHandling } from '@/lib/errors';

export const GET = withErrorHandling(async () => {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("recommend_places");

  if (error) {
    console.error('[Discovery Recommend] Error calling recommend_places:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
});

