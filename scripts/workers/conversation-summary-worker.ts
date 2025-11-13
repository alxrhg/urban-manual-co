import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { embedText } from '@/lib/llm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

interface ConversationSummaryJob {
  id: string;
  session_id: string;
  user_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  priority: number;
}

const supabase = createServiceRoleClient();
const geminiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const summaryModel = process.env.CONVERSATION_SUMMARY_MODEL || 'gemini-1.5-flash-latest';

if (!supabase) {
  console.error('Supabase service role client is not configured.');
  process.exit(1);
}

if (!genAI) {
  console.error('GOOGLE_API_KEY is required for conversation summaries.');
  process.exit(1);
}

async function claimNextJob(): Promise<ConversationSummaryJob | null> {
  const { data: job } = await supabase
    .from('conversation_summary_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return null;
  }

  const { data: updated, error } = await supabase
    .from('conversation_summary_jobs')
    .update({
      status: 'processing',
      attempts: (job.attempts || 0) + 1,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !updated) {
    return null;
  }

  return updated as ConversationSummaryJob;
}

async function fetchConversation(sessionId: string) {
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(400);

  return messages || [];
}

async function generateSummary(messages: Array<{ role: string; content: string }>): Promise<string> {
  const model = genAI!.getGenerativeModel({ model: summaryModel });
  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const prompt = `Summarize this travel planning conversation.
- Highlight budget and category preferences
- Capture destinations or neighborhoods discussed
- Mention dietary or accessibility constraints
- Keep it under 120 words

Conversation:
${conversationText}

Summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function storeSummary(
  sessionId: string,
  summary: string,
  embedding: number[] | null
): Promise<void> {
  await supabase
    .from('conversation_sessions')
    .update({
      summary,
      context_summary: summary,
      summary_embedding: embedding as unknown,
      last_updated: new Date().toISOString(),
    })
    .eq('id', sessionId);

  await supabase.from('conversation_session_summaries').insert({
    session_id: sessionId,
    summary,
    embedding: embedding as unknown,
  });
}

async function markJobCompleted(jobId: string) {
  await supabase
    .from('conversation_summary_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

async function markJobFailed(jobId: string, errorMessage: string) {
  await supabase
    .from('conversation_summary_jobs')
    .update({ status: 'failed', error: errorMessage, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

async function processJobs() {
  let processed = 0;
  while (processed < 25) {
    const job = await claimNextJob();
    if (!job) break;

    try {
      const messages = await fetchConversation(job.session_id);
      if (messages.length === 0) {
        await markJobCompleted(job.id);
        processed += 1;
        continue;
      }

      const summary = await generateSummary(messages);
      const embedding = summary ? await embedText(summary) : null;
      await storeSummary(job.session_id, summary, embedding);
      await markJobCompleted(job.id);
    } catch (error: unknown) {
      console.error('Failed to process conversation summary job', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      await markJobFailed(job.id, message);
    }

    processed += 1;
  }

  if (processed === 0) {
    console.log('No pending conversation summary jobs.');
  } else {
    console.log(`Processed ${processed} conversation summary job(s).`);
  }
}

processJobs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Conversation summary worker crashed', error);
    process.exit(1);
  });
