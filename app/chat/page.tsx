'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, SlidersHorizontal, Loader2, Pin, PinOff, Trash2 } from 'lucide-react';
import { ConversationBubble } from '@/app/components/chat/ConversationBubble';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc/client';
import { Sheet, SheetHeader, SheetBody } from '@/app/components/Sheet';
// Analytics tracking via API
async function trackPageView(page: string, userId?: string) {
  fetch('/api/analytics/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'page_view',
      userId,
      payload: { page },
    }),
  }).catch(() => {
    // Ignore errors
  });
}

async function trackChatMessage(userId: string | undefined, payload: { messageLength: number }) {
  fetch('/api/analytics/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'chat_message',
      userId,
      payload,
    }),
  }).catch(() => {
    // Ignore errors
  });
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp?: Date;
}

function getOrCreateChatSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.sessionStorage;
    const existing = storage.getItem('travel_intel_chat_session');
    if (existing) return existing;
    const newToken = crypto.randomUUID();
    storage.setItem('travel_intel_chat_session', newToken);
    return newToken;
  } catch (error) {
    console.warn('Unable to access sessionStorage for chat session token:', error);
    return null;
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [memorySelection, setMemorySelection] = useState<Record<string, boolean>>({});
  const [memoryDrafts, setMemoryDrafts] = useState<Record<string, string>>({});
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const memoryQuery = trpc.chat.getMemoryBundle.useQuery(
    { sessionId: sessionId ?? undefined, sessionToken: sessionToken ?? undefined },
    { enabled: Boolean(user?.id || sessionToken) }
  );

  const updateMemoryMutation = trpc.chat.updateMemory.useMutation({
    onSuccess: () => {
      memoryQuery.refetch();
    },
  });

  const deleteMemoryMutation = trpc.chat.deleteMemory.useMutation({
    onSuccess: () => {
      memoryQuery.refetch();
    },
  });

  const memoryBundle = memoryQuery.data?.bundle;

  const memoryItems = useMemo(() => {
    if (!memoryBundle) return [] as Array<{
      id: string;
      kind: string;
      title: string;
      summary: string;
      lastUpdated?: string;
      editable?: boolean;
      isPinned?: boolean;
    }>;

    const aggregate: Array<{
      id: string;
      kind: string;
      title: string;
      summary: string;
      lastUpdated?: string;
      editable?: boolean;
      isPinned?: boolean;
    }> = [];

    const pushItems = (items: any[] | undefined, kind: string) => {
      (items || []).forEach((item) => {
        aggregate.push({
          id: item.id,
          kind,
          title: item.title || 'Memory item',
          summary: item.summary,
          lastUpdated: item.lastUpdated,
          editable: item.editable,
          isPinned: item.isPinned,
        });
      });
    };

    pushItems(memoryBundle.pinnedPreferences, 'pinnedPreference');
    pushItems(memoryBundle.recentTrips, 'recentTrip');
    pushItems(memoryBundle.priorSuggestions, 'priorSuggestion');
    pushItems(memoryBundle.turnSummaries, 'turnSummary');

    return aggregate;
  }, [memoryBundle]);

  useEffect(() => {
    if (!memoryItems.length) return;

    setMemorySelection((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const item of memoryItems) {
        if (updated[item.id] === undefined) {
          updated[item.id] = true;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });

    setMemoryDrafts((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const item of memoryItems) {
        if (updated[item.id] === undefined) {
          updated[item.id] = item.summary;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [memoryItems]);

  const selectedMemoryIds = useMemo(
    () => Object.entries(memorySelection).filter(([, enabled]) => enabled).map(([id]) => id),
    [memorySelection]
  );

  const memorySections = useMemo(() => {
    if (!memoryBundle) return [] as Array<{
      key: string;
      title: string;
      description: string;
      items: any[];
    }>;

    return [
      {
        key: 'pinnedPreferences',
        title: 'Pinned preferences',
        description: 'High-signal tastes, constraints, and preferences shared with every request.',
        items: memoryBundle.pinnedPreferences || [],
      },
      {
        key: 'recentTrips',
        title: 'Recent trips',
        description: 'Latest itineraries help the assistant stay aware of current plans.',
        items: memoryBundle.recentTrips || [],
      },
      {
        key: 'priorSuggestions',
        title: 'Prior suggestions',
        description: 'Recent recommendations that resonated with you.',
        items: memoryBundle.priorSuggestions || [],
      },
      {
        key: 'turnSummaries',
        title: 'Conversation highlights',
        description: 'Summaries of earlier turns to maintain continuity.',
        items: memoryBundle.turnSummaries || [],
      },
    ];
  }, [memoryBundle]);

  const memoryActionDisabled = updateMemoryMutation.isPending || deleteMemoryMutation.isPending;

  const formatMemoryDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const findMemoryItem = (id: string) => memoryItems.find((item) => item.id === id);

  const handleMemoryToggle = (id: string, enabled: boolean) => {
    setMemorySelection((prev) => ({ ...prev, [id]: enabled }));
  };

  const handleDraftChange = (id: string, value: string) => {
    setMemoryDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleMemorySave = async (id: string) => {
    const item = findMemoryItem(id);
    if (!item || !item.editable || !user?.id) return;

    const draft = memoryDrafts[id]?.trim();
    if (!draft || draft === item.summary) return;

    setMemoryError(null);
    try {
      await updateMemoryMutation.mutateAsync({ id, summary: draft });
    } catch (error) {
      console.error('Failed to update memory', error);
      setMemoryError('Failed to update memory. Please try again.');
    }
  };

  const handleMemoryPinToggle = async (id: string) => {
    const item = findMemoryItem(id);
    if (!item || !user?.id) return;

    setMemoryError(null);
    try {
      await updateMemoryMutation.mutateAsync({ id, isPinned: !item.isPinned });
    } catch (error) {
      console.error('Failed to toggle pinned state', error);
      setMemoryError('Unable to update pinned state right now.');
    }
  };

  const handleMemoryDelete = async (id: string) => {
    const item = findMemoryItem(id);
    if (!item || item.kind === 'recentTrip' || !user?.id) return;

    setMemoryError(null);
    try {
      await deleteMemoryMutation.mutateAsync({ id });
      setMemorySelection((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setMemoryDrafts((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete memory item', error);
      setMemoryError('Failed to delete memory item.');
    }
  };

  useEffect(() => {
    trackPageView('chat', user?.id);
  }, [user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Ensure session token exists (for anonymous users as well)
  useEffect(() => {
    if (!sessionToken) {
      setSessionToken(getOrCreateChatSessionToken());
    }
  }, [sessionToken]);

  // Load conversation history
  useEffect(() => {
    if (sessionToken || user?.id) {
      loadConversationHistory();
    }
  }, [user?.id, sessionToken]);

  async function loadConversationHistory() {
    try {
      if (!sessionToken && !user?.id) return;
      const userId = user?.id || 'guest';
      const query = sessionToken ? `?session_token=${sessionToken}` : '';
      const response = await fetch(`/api/conversation/${userId}${query}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setSessionId(data.session_id || null);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  async function handleSubmitStreaming(userMessage: string) {
    setIsStreaming(true);
    setStreamingContent('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    trackChatMessage(user?.id, { messageLength: userMessage.length });

    try {
      let activeSessionToken = sessionToken;
      if (!activeSessionToken && !user?.id) {
        activeSessionToken = getOrCreateChatSessionToken();
        if (activeSessionToken) {
          setSessionToken(activeSessionToken);
        }
      }

      const userId = user?.id || 'guest';
      const response = await fetch(`/api/conversation-stream/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_token: user?.id ? sessionToken : activeSessionToken,
          memory_overrides: {
            includeIds: selectedMemoryIds,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Streaming conversation failed');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let fullResponse = '';
      let lastSuggestions: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'chunk':
                  fullResponse += data.content;
                  setStreamingContent(fullResponse);
                  break;

                case 'complete':
                  setSessionId(data.session_id || sessionId);
                  lastSuggestions = data.suggestions || [];
                  break;

                case 'error':
                  console.error('Streaming error:', data.error, data.details);
                  fullResponse = data.error || "Sorry, I encountered an error. Please try again.";
                  setStreamingContent(fullResponse);
                  setIsStreaming(false);
                  break;
              }
            } catch (e) {
              // Ignore parsing errors for partial chunks
            }
          }
        }
      }

      // Add the complete message to history
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fullResponse,
          suggestions: lastSuggestions,
        },
      ]);
    } catch (error) {
      console.error('Streaming conversation error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    await handleSubmitStreaming(userMessage);
  }

  async function handleSuggestionClick(suggestion: string) {
    // Track suggestion acceptance (fire and forget)
    if (sessionId) {
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'suggestion_accepted',
          userId: user?.id,
          payload: { sessionId, suggestion },
        }),
      }).catch(() => {
        // Ignore errors
      });
    }
    setInput(suggestion);
    inputRef.current?.focus();
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = inputRef.current?.form;
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }, 100);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Travel Chat
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ask me anything about restaurants, hotels, cities, and travel destinations.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Travel Intelligence ⚡ Streaming
                </span>
              </div>
              {(memorySections.length > 0 || memoryQuery.isFetching) && (
                <button
                  type="button"
                  onClick={() => setIsMemoryOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Memory ({selectedMemoryIds.length})
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && !isStreaming && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Start a conversation by asking about destinations, restaurants, or travel recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Best restaurants in Tokyo', 'Hotels in Paris', 'Cafes with good WiFi', 'Romantic dinner spots'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-dark-blue-700 rounded-lg transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, idx) => (
                <ConversationBubble
                  key={idx}
                  role={message.role}
                  content={message.content}
                  suggestions={message.suggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
              {(isLoading || isStreaming) && (
                <ConversationBubble
                  role="assistant"
                  content={streamingContent}
                  isTyping={isLoading && !isStreaming}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about restaurants, hotels, cities..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100"
                  disabled={isLoading || isStreaming}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || isStreaming}
                  className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
        </div>
      </div>
      <Sheet open={isMemoryOpen} onOpenChange={setIsMemoryOpen} side="right" className="max-w-2xl">
        <SheetHeader
          title="Conversation memory"
          description="Control which long-term memories accompany your next request."
          actions={
            <button
              type="button"
              onClick={() => setIsMemoryOpen(false)}
              className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Close
            </button>
          }
        />
        <SheetBody>
          {memoryError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
              {memoryError}
            </div>
          )}

          {memoryQuery.isFetching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : memorySections.every((section) => section.items.length === 0) ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No long-term memory has been captured for this conversation yet. Ask a few questions or pin preferences to see them here.
            </p>
          ) : (
            <div className="space-y-6">
              {memorySections.map((section) => (
                <section key={section.key} className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{section.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
                    </div>
                  </div>
                  {section.items.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-500">No {section.title.toLowerCase()} yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {section.items.map((item: any) => {
                        const isSelected = memorySelection[item.id] ?? false;
                        const draft = memoryDrafts[item.id] ?? item.summary;
                        const lastUpdated = formatMemoryDate(item.lastUpdated);
                        const canEdit = Boolean(item.editable && user?.id);
                        const canPin = Boolean(item.editable && user?.id);
                        const canDelete = Boolean(user?.id && item.kind !== 'recentTrip' && !item.id.startsWith('preferences-'));

                        return (
                          <div key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(event) => handleMemoryToggle(item.id, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-gray-500 dark:border-gray-600 dark:text-white"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
                                    {lastUpdated ? (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Updated {lastUpdated}</p>
                                    ) : null}
                                  </div>
                                  {user?.id && (canPin || canDelete) && (
                                    <div className="flex items-center gap-2">
                                      {canPin && (
                                        <button
                                          type="button"
                                          onClick={() => handleMemoryPinToggle(item.id)}
                                          className="rounded-full border border-gray-200 dark:border-gray-700 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                                          disabled={memoryActionDisabled}
                                        >
                                          {item.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          type="button"
                                          onClick={() => handleMemoryDelete(item.id)}
                                          className="rounded-full border border-gray-200 dark:border-gray-700 p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-300"
                                          disabled={memoryActionDisabled}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {canEdit ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={draft}
                                      onChange={(event) => handleDraftChange(item.id, event.target.value)}
                                      rows={3}
                                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                                    />
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleMemorySave(item.id)}
                                        disabled={memoryActionDisabled || draft.trim() === (item.summary || '').trim()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                                      >
                                        {updateMemoryMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : null}
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{item.summary}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </SheetBody>
      </Sheet>
    </div>
  );
}

