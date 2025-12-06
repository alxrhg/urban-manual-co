'use client';

import { useHomepageData } from './HomepageDataProvider';
import { AISearchChat } from './AISearchChat';

/**
 * AI Search Chat Wrapper
 *
 * Connects AISearchChat to the HomepageDataProvider context.
 * Handles open/close state from the global context.
 */
export function AISearchChatWrapper() {
  const { isAIChatOpen, closeAIChat } = useHomepageData();

  return <AISearchChat isOpen={isAIChatOpen} onClose={closeAIChat} />;
}

export default AISearchChatWrapper;
