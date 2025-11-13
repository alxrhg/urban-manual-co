import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '@/lib/supabase-server';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createServiceRoleClient();
const ttlDays = parseInt(process.env.CONVERSATION_SESSION_TTL_DAYS || '30', 10);
const batchSize = parseInt(process.env.CONVERSATION_SESSION_CLEANUP_BATCH || '25', 10);

if (!supabase) {
  console.error('Supabase service role client is not configured.');
  process.exit(1);
}

interface SessionForArchive {
  id: string;
  user_id?: string | null;
  context?: Record<string, unknown> | null;
  summary?: string | null;
  context_summary?: string | null;
}

async function fetchExpiredSessions(): Promise<SessionForArchive[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ttlDays);

  const { data } = await supabase
    .from('conversation_sessions')
    .select('id, user_id, context, summary, context_summary, last_updated, ttl_expires_at')
    .lte('ttl_expires_at', cutoff.toISOString())
    .is('archived_at', null)
    .order('ttl_expires_at', { ascending: true })
    .limit(batchSize);

  return (data as SessionForArchive[]) || [];
}

async function archiveSession(session: SessionForArchive) {
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('id')
    .eq('session_id', session.id);

  await supabase.from('conversation_session_archives').insert({
    session_id: session.id,
    user_id: session.user_id,
    summary: session.summary || session.context_summary,
    context: session.context,
    message_count: messages?.length || 0,
  });

  await supabase
    .from('conversation_sessions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', session.id);

  await supabase
    .from('conversation_sessions')
    .delete()
    .eq('id', session.id);
}

async function cleanup() {
  const sessions = await fetchExpiredSessions();
  if (sessions.length === 0) {
    console.log('No expired sessions found.');
    return;
  }

  for (const session of sessions) {
    try {
      await archiveSession(session);
      console.log(`Archived session ${session.id}`);
    } catch (error) {
      console.error('Failed to archive session', session.id, error);
    }
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Conversation session maintenance failed', error);
    process.exit(1);
  });
