'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  Menu,
  X,
  MessageSquare,
  Trash2,
  Sparkles,
  User,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const WELCOME_SUGGESTIONS = [
  "What are the best restaurants in Tokyo?",
  "Plan a weekend trip to Paris",
  "Find me a romantic hotel in Barcelona",
  "What's the best coffee shop in London?",
];

export default function ChatGPTPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Focus input on mount and conversation change
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConversation?.id]);

  const createNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    setMobileMenuOpen(false);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  }, [currentConversation?.id]);

  const generateTitle = (content: string): string => {
    // Generate a short title from the first message
    const words = content.split(' ').slice(0, 5).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    // Create conversation if none exists
    let conversation = currentConversation;
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        title: generateTitle(userMessage),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations(prev => [conversation!, ...prev]);
      setCurrentConversation(conversation);
    }

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMsg],
      updatedAt: new Date(),
      title: conversation.messages.length === 0 ? generateTitle(userMessage) : conversation.title,
    };

    setCurrentConversation(updatedConversation);
    setConversations(prev =>
      prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
    );

    // Start streaming response
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const userId = user?.id || 'guest';
      const response = await fetch(`/api/chatgpt/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConversation.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk' && data.content) {
                fullResponse += data.content;
                setStreamingContent(fullResponse);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullResponse || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMsg],
        updatedAt: new Date(),
      };

      setCurrentConversation(finalConversation);
      setConversations(prev =>
        prev.map(c => c.id === finalConversation.id ? finalConversation : c)
      );
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };

      const errorConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, errorMsg],
        updatedAt: new Date(),
      };

      setCurrentConversation(errorConversation);
      setConversations(prev =>
        prev.map(c => c.id === errorConversation.id ? errorConversation : c)
      );
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => handleSubmit(), 100);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || mobileMenuOpen) && (
          <>
            {/* Mobile overlay */}
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`${
                mobileMenuOpen ? 'fixed z-50' : 'hidden lg:flex'
              } w-[280px] h-full flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800`}
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={createNewConversation}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  <Plus className="h-4 w-4" />
                  New chat
                </button>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          currentConversation?.id === conv.id
                            ? 'bg-gray-200 dark:bg-gray-800'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                        onClick={() => {
                          setCurrentConversation(conv);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                          {conv.title}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {user?.email || 'Guest'}
                  </span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen(!mobileMenuOpen);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h1 className="font-semibold text-gray-900 dark:text-white">ChatGPT</h1>
          </div>

          <button className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            GPT-4
            <ChevronDown className="h-4 w-4" />
          </button>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            // Welcome Screen
            <div className="h-full flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
                Ask me anything about travel, restaurants, hotels, or destinations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {WELCOME_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {suggestion}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="max-w-3xl mx-auto py-6 px-4">
              {currentConversation.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isStreaming && (
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message ChatGPT..."
                rows={1}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 resize-none focus:outline-none max-h-[200px]"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="p-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              ChatGPT can make mistakes. Consider checking important information.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

// Chat Message Component
interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gray-900 dark:bg-gray-700 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
            {isStreaming && !message.content && (
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}
