import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string; versionNumber: string }>;
}

// POST /api/cms/pages/[id]/versions/[versionNumber]/restore - Restore a version
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionNumber } = await params;
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

    // Get the version snapshot
    const { data: version, error: versionError } = await supabase
      .from('cms_page_versions')
      .select('snapshot')
      .eq('page_id', id)
      .eq('version_number', parseInt(versionNumber))
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const snapshot = version.snapshot as { page: Record<string, unknown>; blocks: Record<string, unknown>[] };

    // Delete current blocks
    await supabase.from('cms_blocks').delete().eq('page_id', id);

    // Restore blocks from snapshot
    if (snapshot.blocks && snapshot.blocks.length > 0) {
      const blocksToInsert = snapshot.blocks.map((block) => ({
        id: block.id,
        page_id: id,
        parent_id: block.parent_id || null,
        type: block.type,
        name: block.name,
        props: block.props || {},
        styles: block.styles || { desktop: {}, tablet: {}, mobile: {} },
        position: block.position,
        is_locked: block.is_locked || false,
        is_hidden: block.is_hidden || false,
      }));

      const { error: blocksError } = await supabase
        .from('cms_blocks')
        .insert(blocksToInsert);

      if (blocksError) {
        throw blocksError;
      }
    }

    // Update page timestamp
    await supabase
      .from('cms_pages')
      .update({
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', id);

    // Fetch updated page and blocks
    const { data: page } = await supabase
      .from('cms_pages')
      .select('*')
      .eq('id', id)
      .single();

    const { data: blocks } = await supabase
      .from('cms_blocks')
      .select('*')
      .eq('page_id', id)
      .order('position', { ascending: true });

    return NextResponse.json({
      page,
      blocks: blocks || [],
      restored_from_version: parseInt(versionNumber),
    });
  } catch (error) {
    console.error('Error in POST /api/cms/pages/[id]/versions/[versionNumber]/restore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
