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
  const { isAIChatOpen, closeAIChat, aiChatInitialQuery } = useHomepageData();

  return (
    <AISearchChat
      isOpen={isAIChatOpen}
      onClose={closeAIChat}
      initialQuery={aiChatInitialQuery}
    />
  );
}

export default AISearchChatWrapper;
