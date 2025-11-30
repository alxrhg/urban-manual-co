import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/cms/block-definitions - Get all block definitions
export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('cms_block_definitions')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching block definitions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ definitions: data || [] });
  } catch (error) {
    console.error('Error in GET /api/cms/block-definitions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cms/block-definitions - Create a custom block definition
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      type,
      label,
      description,
      icon,
      category,
      props_schema,
      default_props,
      default_styles,
      supports_children,
      max_children,
      allowed_children,
    } = body;

    if (!type || !label || !category) {
      return NextResponse.json(
        { error: 'Type, label, and category are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cms_block_definitions')
      .insert({
        type,
        label,
        description,
        icon: icon || 'Box',
        category,
        props_schema: props_schema || { type: 'object', properties: {} },
        default_props: default_props || {},
        default_styles: default_styles || { desktop: {}, tablet: {}, mobile: {} },
        supports_children: supports_children || false,
        max_children,
        allowed_children,
        is_builtin: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A block with this type already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ definition: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cms/block-definitions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
