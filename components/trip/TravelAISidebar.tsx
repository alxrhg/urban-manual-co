'use client';

import { useState, useCallback } from 'react';
import { Sparkles, ExternalLink, Plus, Send, Loader2 } from 'lucide-react';

interface Suggestion {
  id: string;
  text: string;
  label?: string;
  category?: string;
  dayNumber?: number;
}

interface TravelAISidebarProps {
  suggestions?: Suggestion[];
  onAddSuggestion?: (suggestion: Suggestion) => void;
  onAskQuestion?: (question: string) => Promise<string>;
  onOpenChat?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * TravelAISidebar - AI assistant panel for trip suggestions
 * Features: AI message, clickable suggestions, natural language input
 */
export default function TravelAISidebar({
  suggestions = [],
  onAddSuggestion,
  onAskQuestion,
  onOpenChat,
  isLoading = false,
  className = '',
}: TravelAISidebarProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiMessage, setAiMessage] = useState(
    'Here are a few suggestions for your free time on Day 2. Would you like to book any?'
  );

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !onAskQuestion) return;

    setIsProcessing(true);
    try {
      const response = await onAskQuestion(input);
      setAiMessage(response);
      setInput('');
    } catch (error) {
      console.error('AI question error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [input, onAskQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Default suggestions if none provided
  const displaySuggestions = suggestions.length > 0 ? suggestions : [
    { id: '1', text: 'Add a morning cafe', label: 'Recommended', category: 'cafe' },
    { id: '2', text: 'Add museum for Day 2', label: 'Recommended', category: 'museum', dayNumber: 2 },
    { id: '3', text: 'Day 2 needs more', label: 'Recommended', dayNumber: 2 },
  ];

  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white text-sm">Travel AI</span>
        </div>
        <button
          onClick={onOpenChat}
          className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Open full chat"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* AI Message */}
      <div className="p-4">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white dark:text-gray-900">AI</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {aiMessage}
          </p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-4 space-y-2">
        {displaySuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onAddSuggestion?.(suggestion)}
            disabled={isLoading}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left group disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
              <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {suggestion.text}
              </span>
              {suggestion.label && (
                <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {suggestion.label}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-4 pt-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for recommendations..."
            disabled={isProcessing}
            className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-900 dark:text-white hover:opacity-70 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-opacity"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
