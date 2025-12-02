'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { ConversationBubble } from '@/app/components/chat/ConversationBubble';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ensureConversationSessionToken, persistConversationSessionToken } from '@/lib/chat/sessionToken';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user) {
      const token = ensureConversationSessionToken();
      if (token) setGuestSessionToken(token);
    } else {
      setGuestSessionToken(null);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && (user?.id || guestSessionToken)) {
      loadConversationHistory();
    }
  }, [isOpen, user?.id, guestSessionToken]);

  async function loadConversationHistory() {
    try {
      const isGuest = !user?.id;
      const resolvedToken = isGuest ? guestSessionToken : undefined;
      if (isGuest && !resolvedToken) return;
      const userId = user?.id || 'guest';
      const tokenQuery = resolvedToken ? `?session_token=${resolvedToken}` : '';
      const response = await fetch(`/api/conversation/${userId}${tokenQuery}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setSessionId(data.session_id || null);
        if (isGuest && data.session_token) {
          persistConversationSessionToken(data.session_token);
          setGuestSessionToken(data.session_token);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  async function handleSubmitStreaming(userMessage: string) {
    setIsStreaming(true);
    setStreamingContent('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const isGuest = !user?.id;
      let resolvedToken = isGuest ? guestSessionToken : undefined;
      if (isGuest && !resolvedToken) {
        resolvedToken = ensureConversationSessionToken();
        if (resolvedToken) setGuestSessionToken(resolvedToken);
      }
      const userId = user?.id || 'guest';
      const response = await fetch(`/api/conversation-stream/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, session_token: resolvedToken }),
      });

      if (!response.ok) throw new Error('Streaming failed');

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
              if (data.type === 'chunk') {
                fullResponse += data.content;
                setStreamingContent(fullResponse);
              } else if (data.type === 'complete') {
                setSessionId(data.session_id || sessionId);
                lastSuggestions = data.suggestions || [];
              }
            } catch {}
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullResponse, suggestions: lastSuggestions }]);
      if (isGuest && resolvedToken) persistConversationSessionToken(resolvedToken);
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
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

  function handleSuggestionClick(suggestion: string) {
    setInput(suggestion);
    inputRef.current?.focus();
    setTimeout(() => {
      const form = inputRef.current?.form;
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 100);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="card-right" className="flex flex-col p-0 w-[500px] max-md:w-full" hideCloseButton>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
              <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Travel Chat</h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Ask about destinations, restaurants, or travel tips.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Best restaurants in Tokyo', 'Hotels in Paris', 'Romantic dinner spots'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
            {isStreaming && (
              <ConversationBubble role="assistant" content={streamingContent} isTyping={!streamingContent} />
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about restaurants, hotels..."
              className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              disabled={isLoading || isStreaming}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading || isStreaming}
              size="icon"
              className="rounded-full h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
