'use client';

import { Sparkles, MessageCircle, X } from 'lucide-react';
import { useAI } from '@/contexts/AIContext';

/**
 * AICompanionTrigger - Floating button to open/close AI chat
 */
export default function AICompanionTrigger() {
  const { isOpen, isMinimized, toggleChat, expandChat, suggestions, context } = useAI();

  // Show badge if we have suggestions
  const hasSuggestions = suggestions.length > 0;

  // Determine icon based on state
  const showClose = isOpen && !isMinimized;

  const handleClick = () => {
    if (isOpen && isMinimized) {
      expandChat();
    } else {
      toggleChat();
    }
  };

  // Get context indicator
  const getContextIndicator = () => {
    if (context.type === 'trip' && context.trip) {
      return context.trip.city.slice(0, 2).toUpperCase();
    }
    if (context.type === 'city' && context.city) {
      return context.city.slice(0, 2).toUpperCase();
    }
    return null;
  };

  const contextIndicator = getContextIndicator();

  return (
    <button
      onClick={handleClick}
      className={`
        fixed z-50 flex items-center justify-center transition-all duration-300
        ${showClose
          ? 'bottom-6 right-6 w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          : 'bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-black/80 dark:bg-white/10 backdrop-blur-xl hover:bg-black/90 dark:hover:bg-white/20'
        }
        shadow-lg hover:shadow-xl
        border border-white/10
      `}
      style={{
        boxShadow: showClose
          ? '0 4px 12px rgba(0, 0, 0, 0.1)'
          : '0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      }}
      aria-label={showClose ? 'Close AI chat' : 'Open AI chat'}
    >
      {showClose ? (
        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      ) : (
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium text-sm">AI</span>
          {contextIndicator && (
            <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded-md font-medium">
              {contextIndicator}
            </span>
          )}
          {hasSuggestions && !contextIndicator && (
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          )}
        </div>
      )}
    </button>
  );
}
