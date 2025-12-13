import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/errors';

export const DELETE = withAuth(async (
  _req: NextRequest,
  { user }: AuthContext,
  context?: { params: Promise<{ collection_id: string; comment_id: string }> }
) => {
  const { comment_id } = await context!.params;
  const supabase = await createServerClient();

  // Delete comment (RLS policies will ensure user owns the comment or owns the collection)
  const { error } = await supabase
    .from('collection_comments')
    .delete()
    .eq('id', comment_id);

  if (error) throw error;

  return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
});
