import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cms/pages/[id]/versions - Get version history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: versions, error } = await supabase
      .from('cms_page_versions')
      .select('id, version_number, change_description, created_at, created_by')
      .eq('page_id', id)
      .order('version_number', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (error) {
    console.error('Error in GET /api/cms/pages/[id]/versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cms/pages/[id]/versions - Create a version snapshot
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const { change_description } = body;

    // Get the current page and blocks
    const { data: page, error: pageError } = await supabase
      .from('cms_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (pageError) {
      if (pageError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      throw pageError;
    }

    const { data: blocks } = await supabase
      .from('cms_blocks')
      .select('*')
      .eq('page_id', id)
      .order('position', { ascending: true });

    // Get the next version number
    const { data: latestVersion } = await supabase
      .from('cms_page_versions')
      .select('version_number')
      .eq('page_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

    // Create the snapshot
    const snapshot = {
      page,
      blocks: blocks || [],
    };

    const { data: version, error: versionError } = await supabase
      .from('cms_page_versions')
      .insert({
        page_id: id,
        version_number: nextVersionNumber,
        snapshot,
        change_description,
        created_by: user.id,
      })
      .select()
      .single();

    if (versionError) {
      throw versionError;
    }

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cms/pages/[id]/versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
