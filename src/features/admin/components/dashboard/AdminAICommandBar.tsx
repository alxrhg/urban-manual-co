'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  HelpCircle,
  PenLine,
  Wand2,
  Search,
  Loader2,
  ArrowRight,
  X,
  MapPin,
  TrendingUp,
  Database,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  action: () => void;
}

interface AIResponse {
  message: string;
  suggestions?: string[];
  actions?: { label: string; href: string }[];
}

export function AdminAICommandBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'help',
      label: 'What can I do?',
      icon: <HelpCircle className="w-4 h-4" />,
      action: () => handleQuickAction('What can I do in this admin dashboard?'),
    },
    {
      id: 'write',
      label: 'Help me write',
      icon: <PenLine className="w-4 h-4" />,
      action: () => handleQuickAction('Help me write a description for a destination'),
    },
    {
      id: 'generate',
      label: 'Help me generate',
      icon: <Wand2 className="w-4 h-4" />,
      action: () => handleQuickAction('Help me generate content for the homepage'),
    },
    {
      id: 'find',
      label: 'Help me find',
      icon: <Search className="w-4 h-4" />,
      action: () => handleQuickAction('Help me find destinations that need attention'),
    },
  ];

  const handleQuickAction = useCallback(async (prompt: string) => {
    setQuery(prompt);
    setIsLoading(true);
    setAIResponse(null);

    try {
      const response = await fetch('/api/admin/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: 'admin-dashboard' }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      setAIResponse(data);
    } catch (error) {
      console.error('AI assist error:', error);
      setAIResponse({
        message: 'Sorry, I encountered an error. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    await handleQuickAction(query);
  }, [query, isLoading, handleQuickAction]);

  const handleClear = useCallback(() => {
    setQuery('');
    setAIResponse(null);
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Command Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'relative flex items-center bg-gray-50 dark:bg-gray-900 rounded-full border transition-all duration-200',
            isFocused
              ? 'border-gray-300 dark:border-gray-700 shadow-sm'
              : 'border-gray-200 dark:border-gray-800'
          )}
        >
          <div className="pl-4 pr-2">
            <Sparkles className="w-4 h-4 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask Content Agent to help you manage destinations..."
            className="flex-1 h-12 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
          />
          {isLoading ? (
            <div className="pr-4">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="pr-4 flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[10px] font-medium">
                {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[10px] font-medium">
                K
              </kbd>
            </div>
          )}
        </div>
      </form>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors',
              'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
              'hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {action.icon}
            <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
          </button>
        ))}
      </div>

      {/* AI Response */}
      {aiResponse && (
        <div className="mt-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {aiResponse.message}
              </p>

              {/* Suggestions */}
              {aiResponse.suggestions && aiResponse.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiResponse.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickAction(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Links */}
              {aiResponse.actions && aiResponse.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiResponse.actions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(action.href)}
                      className="text-xs"
                    >
                      {action.label}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
