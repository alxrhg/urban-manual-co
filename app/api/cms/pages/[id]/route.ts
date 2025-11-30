import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cms/pages/[id] - Get a page with its blocks
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    // Fetch page
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

    // Fetch blocks
    const { data: blocks, error: blocksError } = await supabase
      .from('cms_blocks')
      .select('*')
      .eq('page_id', id)
      .order('position', { ascending: true });

    if (blocksError) {
      throw blocksError;
    }

    return NextResponse.json({
      page,
      blocks: blocks || [],
    });
  } catch (error) {
    console.error('Error in GET /api/cms/pages/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/cms/pages/[id] - Update a page
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const {
      name,
      slug,
      title,
      description,
      meta_image,
      status,
      layout_config,
      seo_config,
      blocks,
    } = body;

    // Update page
    const pageUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (name !== undefined) pageUpdate.name = name;
    if (slug !== undefined) pageUpdate.slug = slug;
    if (title !== undefined) pageUpdate.title = title;
    if (description !== undefined) pageUpdate.description = description;
    if (meta_image !== undefined) pageUpdate.meta_image = meta_image;
    if (status !== undefined) {
      pageUpdate.status = status;
      if (status === 'published') {
        pageUpdate.published_at = new Date().toISOString();
      }
    }
    if (layout_config !== undefined) pageUpdate.layout_config = layout_config;
    if (seo_config !== undefined) pageUpdate.seo_config = seo_config;

    const { data: page, error: pageError } = await supabase
      .from('cms_pages')
      .update(pageUpdate)
      .eq('id', id)
      .select()
      .single();

    if (pageError) {
      if (pageError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      throw pageError;
    }

    // Update blocks if provided
    if (blocks !== undefined) {
      // Delete existing blocks
      await supabase.from('cms_blocks').delete().eq('page_id', id);

      // Insert new blocks
      if (blocks.length > 0) {
        const blocksToInsert = blocks.map((block: Record<string, unknown>) => ({
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
    }

    // Fetch updated blocks
    const { data: updatedBlocks } = await supabase
      .from('cms_blocks')
      .select('*')
      .eq('page_id', id)
      .order('position', { ascending: true });

    return NextResponse.json({
      page,
      blocks: updatedBlocks || [],
    });
  } catch (error) {
    console.error('Error in PUT /api/cms/pages/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cms/pages/[id] - Delete a page
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Delete page (blocks will be cascade deleted)
    const { error } = await supabase.from('cms_pages').delete().eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/cms/pages/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
