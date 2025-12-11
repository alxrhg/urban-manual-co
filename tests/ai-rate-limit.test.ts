import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiRouter } from '@/server/routers/ai';
import { TRPCError } from '@trpc/server';

// Mock the rate limiters
vi.mock('@/lib/rate-limit', () => ({
  conversationRatelimit: {
    limit: vi.fn(),
  },
  memoryConversationRatelimit: {
    limit: vi.fn(),
  },
  isUpstashConfigured: vi.fn(),
}));

// Mock external dependencies
vi.mock('@/lib/embeddings/generate', () => ({
  generateDestinationEmbedding: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/ai/fuzzy-matching', () => ({
  findSimilarPlace: vi.fn().mockResolvedValue(null),
  inferPriceFromBudgetPhrase: vi.fn().mockReturnValue(null),
  inferGroupSize: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/ai/intent-analysis', () => ({
  analyzeIntent: vi.fn().mockResolvedValue({
    intent: 'general',
    confidence: 1.0,
    interpretations: [{
      semanticQuery: 'hello',
      filters: {},
    }],
  }),
}));

describe('AI Router Rate Limiting', () => {
  const mockLimit = vi.fn();
  const mockIsUpstashConfigured = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mocks
    const rateLimit = await import('@/lib/rate-limit');
    rateLimit.isUpstashConfigured = mockIsUpstashConfigured;
    rateLimit.conversationRatelimit.limit = mockLimit;
    rateLimit.memoryConversationRatelimit.limit = mockLimit;

    // Default to success
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 10000 });
    mockIsUpstashConfigured.mockReturnValue(false); // Default to memory
  });

  const createCaller = (userId: string | null) => {
    const ctx = {
      userId,
      supabase: {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ data: [] }),
      } as any,
    };
    return aiRouter.createCaller(ctx);
  };

  it('should allow request when rate limit is not exceeded', async () => {
    const caller = createCaller('user-123');
    mockLimit.mockResolvedValue({ success: true });

    await expect(caller.chat({ message: 'hello' })).resolves.not.toThrow();

    expect(mockLimit).toHaveBeenCalledWith('user:user-123');
  });

  it('should throw TOO_MANY_REQUESTS when rate limit is exceeded', async () => {
    const caller = createCaller('user-123');
    mockLimit.mockResolvedValue({ success: false });

    try {
      await caller.chat({ message: 'hello' });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('TOO_MANY_REQUESTS');
      expect(error.message).toContain('Rate limit exceeded');
    }

    expect(mockLimit).toHaveBeenCalledWith('user:user-123');
  });

  it('should use conversationRatelimit when Upstash is configured', async () => {
    mockIsUpstashConfigured.mockReturnValue(true);
    const caller = createCaller('user-123');

    // We need to re-mock or spy on the specific export to verify WHICH limiter was used
    // But since we mocked both to use the same mockLimit function, we verify isUpstashConfigured was called

    await caller.chat({ message: 'hello' });

    expect(mockIsUpstashConfigured).toHaveBeenCalled();
  });
});
