'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Globe, MapPin, Utensils, Building2, Coffee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, ChatMessageProps } from '@/components/llm-chat/ChatMessage';
import { ChatSidebar, Conversation } from '@/components/llm-chat/ChatSidebar';

interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string | null;
  michelin_stars?: number | null;
  crown?: boolean;
  rating?: number | null;
  micro_description?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
  timestamp: Date;
}

interface StreamChunk {
  type: 'session' | 'status' | 'intent' | 'companion' | 'multicity' | 'destination' | 'text' | 'suggestions' | 'complete';
  data: {
    sessionId?: string;
    turnNumber?: number;
    status?: string;
    text?: string;
    index?: number;
    total?: number;
    destination?: Destination;
    reasoning?: string;
    error?: string;
  };
}

const STORAGE_KEY = 'um_chat_conversations';
const CURRENT_CONV_KEY = 'um_chat_current';

// Suggestion categories for the welcome screen
const SUGGESTION_CATEGORIES = [
  {
    icon: Utensils,
    label: 'Restaurants',
    suggestions: [
      'Best restaurants in Tokyo',
      'Michelin-starred restaurants in Paris',
      'Romantic dinner spots in Rome',
    ],
  },
  {
    icon: Building2,
    label: 'Hotels',
    suggestions: [
      'Boutique hotels in Barcelona',
      'Luxury hotels with views in NYC',
      'Design hotels in Copenhagen',
    ],
  },
  {
    icon: Coffee,
    label: 'Cafes & Bars',
    suggestions: [
      'Best coffee shops in London',
      'Rooftop bars in Bangkok',
      'Hidden speakeasies in NYC',
    ],
  },
  {
    icon: Globe,
    label: 'Discover',
    suggestions: [
      'What should I do in Lisbon?',
      'Best neighborhoods in Berlin',
      'Where to go for architecture lovers',
    ],
  },
];

export default function AIPage() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingDestinations, setStreamingDestinations] = useState<Destination[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth
  const { user } = useAuth();

  // Load conversations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConversations(parsed.map((c: Conversation) => ({
          ...c,
          updatedAt: new Date(c.updatedAt),
        })));
      }

      const currentId = localStorage.getItem(CURRENT_CONV_KEY);
      if (currentId) {
        setCurrentConversationId(currentId);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      try {
        const stored = localStorage.getItem(`um_chat_messages_${currentConversationId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(parsed.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })));
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Save conversations to localStorage
  const saveConversations = useCallback((convs: Conversation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, []);

  // Save messages to localStorage
  const saveMessages = useCallback((convId: string, msgs: Message[]) => {
    try {
      localStorage.setItem(`um_chat_messages_${convId}`, JSON.stringify(msgs));
    } catch (e) {
      console.error('Failed to save messages:', e);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConversationId]);

  // Create new conversation
  const handleNewChat = useCallback(() => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New conversation',
      updatedAt: new Date(),
    };

    const updatedConvs = [newConv, ...conversations];
    setConversations(updatedConvs);
    saveConversations(updatedConvs);

    setCurrentConversationId(newId);
    localStorage.setItem(CURRENT_CONV_KEY, newId);
    setMessages([]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }, [conversations, saveConversations]);

  // Select conversation
  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
    localStorage.setItem(CURRENT_CONV_KEY, id);
    setSidebarOpen(false);
  }, []);

  // Delete conversation
  const handleDeleteConversation = useCallback((id: string) => {
    const updatedConvs = conversations.filter((c) => c.id !== id);
    setConversations(updatedConvs);
    saveConversations(updatedConvs);

    // Remove messages
    localStorage.removeItem(`um_chat_messages_${id}`);

    // If deleted current, clear
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      localStorage.removeItem(CURRENT_CONV_KEY);
      setMessages([]);
    }
  }, [conversations, currentConversationId, saveConversations]);

  // Generate title from first message
  const generateTitle = (message: string): string => {
    const words = message.split(' ').slice(0, 6).join(' ');
    return words.length < message.length ? `${words}...` : words;
  };

  // Handle submit
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = `conv_${Date.now()}`;
      const newConv: Conversation = {
        id: convId,
        title: generateTitle(userMessage),
        updatedAt: new Date(),
      };

      const updatedConvs = [newConv, ...conversations];
      setConversations(updatedConvs);
      saveConversations(updatedConvs);
      setCurrentConversationId(convId);
      localStorage.setItem(CURRENT_CONV_KEY, convId);
    }

    // Add user message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessages(convId, updatedMessages);

    // Update conversation title if first message
    if (messages.length === 0) {
      const updatedConvs = conversations.map((c) =>
        c.id === convId ? { ...c, title: generateTitle(userMessage), updatedAt: new Date() } : c
      );
      setConversations(updatedConvs);
      saveConversations(updatedConvs);
    }

    // Start streaming
    setIsLoading(true);
    setStreamingContent('');
    setStreamingDestinations([]);

    try {
      const response = await fetch('/api/smart-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: convId,
          maxDestinations: 6,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let fullContent = '';
      let finalDestinations: Destination[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed: StreamChunk = JSON.parse(data);

              switch (parsed.type) {
                case 'text':
                  // Text comes word by word
                  fullContent += parsed.data.text || '';
                  setStreamingContent(fullContent);
                  break;

                case 'destination':
                  // Individual destination
                  if (parsed.data.destination) {
                    finalDestinations = [...finalDestinations, parsed.data.destination];
                    setStreamingDestinations([...finalDestinations]);
                  }
                  break;

                case 'session':
                case 'status':
                case 'intent':
                case 'companion':
                case 'multicity':
                case 'suggestions':
                case 'complete':
                  // These are informational, no UI update needed
                  break;
              }
            } catch (parseError) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: fullContent || "I couldn't generate a response. Please try again.",
        destinations: finalDestinations,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      saveMessages(convId, finalMessages);

      // Update conversation
      const updatedConvs = conversations.map((c) =>
        c.id === convId
          ? { ...c, lastMessage: fullContent.slice(0, 50), updatedAt: new Date() }
          : c
      );
      setConversations(updatedConvs);
      saveConversations(updatedConvs);
    } catch (error) {
      console.error('Chat error:', error);

      // Add error message
      const errorMsg: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);
      saveMessages(convId, finalMessages);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      setStreamingDestinations([]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Handle textarea resize and submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = messages.length > 0 || isLoading;

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userName={user?.email?.split('@')[0]}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 lg:ml-0 ml-12">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                Urban Manual AI
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your personal travel concierge
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Online
              </span>
            </div>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {!hasMessages ? (
              // Welcome screen
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-8 max-w-md">
                  I can help you discover restaurants, hotels, cafes, and destinations from our curated collection of 897+ places worldwide.
                </p>

                {/* Suggestion grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {SUGGESTION_CATEGORIES.map((category) => (
                    <div
                      key={category.label}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <category.icon className="w-4 h-4 text-violet-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {category.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {category.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Messages list
              <div className="space-y-6">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    destinations={message.destinations}
                    timestamp={message.timestamp}
                  />
                ))}

                {/* Streaming message */}
                {isLoading && (
                  <ChatMessage
                    role="assistant"
                    content={streamingContent}
                    destinations={streamingDestinations}
                    isStreaming
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-end gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-violet-500 dark:focus-within:border-violet-500 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about restaurants, hotels, cities..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 text-sm px-2 py-2 max-h-32"
                  style={{ minHeight: '40px' }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                Urban Manual AI may make mistakes. Verify important information.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
