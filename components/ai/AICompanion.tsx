'use client';

import { useAI } from '@/contexts/AIContext';
import AICompanionTrigger from './AICompanionTrigger';
import AICompanionChat from './AICompanionChat';
import AICompanionSuggestions from './AICompanionSuggestions';

/**
 * AICompanion - Unified AI interface for the entire application
 *
 * Features:
 * - Floating trigger button (always visible)
 * - Full chat interface when opened
 * - Proactive suggestions based on context
 * - Trip-aware responses
 * - Works on homepage, trip pages, destination pages
 */
export default function AICompanion() {
  const { isOpen, isMinimized, suggestions } = useAI();

  return (
    <>
      {/* Proactive Suggestions - shown when closed or minimized */}
      {(!isOpen || isMinimized) && suggestions.length > 0 && (
        <AICompanionSuggestions />
      )}

      {/* Chat Interface - shown when open and not minimized */}
      {isOpen && !isMinimized && (
        <AICompanionChat />
      )}

      {/* Trigger Button - always visible */}
      <AICompanionTrigger />
    </>
  );
}

// Re-export sub-components for flexibility
export { default as AICompanionTrigger } from './AICompanionTrigger';
export { default as AICompanionChat } from './AICompanionChat';
export { default as AICompanionSuggestions } from './AICompanionSuggestions';
