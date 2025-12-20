import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods';

const VALID_TYPES: DataType[] = ['brands', 'cities', 'countries', 'neighborhoods'];

// Helper to extract error message from various error types
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as DataType;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  try {
    // Use regular client for auth check
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for data operations
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from(type).select('*').order('name');

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('[Admin Data API] GET error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, data: itemData } = await request.json();

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Use regular client for auth check
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for data operations
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from(type).insert(itemData).select().single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('[Admin Data API] POST error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { type, id, data: itemData } = await request.json();

    if (!type || !VALID_TYPES.includes(type) || !id) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Use regular client for auth check
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for data operations
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from(type).update(itemData).eq('id', id).select().single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('[Admin Data API] PUT error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as DataType;
  const id = searchParams.get('id');

  if (!type || !VALID_TYPES.includes(type) || !id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    // Use regular client for auth check
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS for data operations
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from(type).delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Admin Data API] DELETE error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
