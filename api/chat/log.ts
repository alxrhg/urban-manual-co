import { createServiceRoleClient } from '@/lib/supabase-server';

export interface ChatAuditLog {
  sessionId: string;
  userId?: string | null;
  request: string;
  response: string;
  model?: string;
  latencyMs?: number;
  memorySnapshot?: any;
  intent?: any;
}

const AUDIT_TABLE = 'chat_audit_logs';

export async function logChatAudit(log: ChatAuditLog) {
  try {
    const supabase = createServiceRoleClient();
    const payload = {
      session_id: log.sessionId,
      user_id: log.userId || null,
      request_text: log.request,
      response_text: log.response,
      model: log.model || null,
      latency_ms: log.latencyMs ?? null,
      memory_snapshot: log.memorySnapshot || null,
      intent: log.intent || null,
    };

    const { error } = await supabase.from(AUDIT_TABLE).insert(payload);
    if (error) {
      console.warn('[chat-audit] Failed to persist audit log', error);
    }
  } catch (error) {
    console.warn('[chat-audit] audit logging unavailable', error);
  }
}
