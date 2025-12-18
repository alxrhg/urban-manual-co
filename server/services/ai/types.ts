import { NLUResult } from '@/lib/ai/intent-analysis';

/**
 * Core types for the AI Service Layer
 * Abstracts the complexity of NLU, Search, and Session Management
 */

export interface ChatRequest {
  message: string;
  userId: string;
  sessionId?: string;
  context?: {
    currentPath?: string;
    timezone?: string;
  };
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  results: SearchResultItem[];
  intent: {
    type: NLUResult['intent'];
    confidence: number;
    reasoning?: string;
    needsClarification?: boolean;
  };
}

export interface SearchResultItem {
  slug: string;
  name?: string;
  city?: string;
  category?: string;
}

export interface AIService {
  /**
   * Process a chat message, including NLU analysis and search execution
   */
  processChat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Get suggested prompts for a user based on their history
   */
  getSuggestedPrompts(userId: string): Promise<string[]>;
}
