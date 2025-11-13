import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || (session.user.app_metadata as Record<string, unknown> | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const extraPaths: string[] = Array.isArray(body?.paths) ? body.paths : [];

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  const normalizedSlug = slug.trim().toLowerCase();

  revalidateTag(`destination:${normalizedSlug}`);
  revalidatePath(`/destination/${normalizedSlug}`);
  revalidatePath(`/destination/${normalizedSlug}/`);
  extraPaths.forEach(path => {
    if (typeof path === 'string' && path.startsWith('/')) {
      revalidatePath(path);
    }
  });

  return NextResponse.json({ revalidated: true, slug: normalizedSlug });
}
