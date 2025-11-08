import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/collections
 * Create a new collection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, emoji, color, is_public } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Insert collection
    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        emoji: emoji || '📍',
        color: color || '#3B82F6',
        is_public: is_public ?? false,
        destination_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating collection:', error);
      return NextResponse.json(
        { error: 'Failed to create collection', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ collection: data }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Unexpected error creating collection:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/collections
 * Get user's collections
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching collections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collections', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ collections: data || [] });
  } catch (error: any) {
    console.error('[API] Unexpected error fetching collections:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

