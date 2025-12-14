'use client';

import { useHomepageData } from './HomepageDataProvider';
import dynamic from 'next/dynamic';
import { Brain, Loader2 } from 'lucide-react';
import { useState } from 'react';

// Lazy load the chat component to reduce initial bundle size
// It will only be loaded when the user opens the chat
const AISearchChat = dynamic(
  () => import('./AISearchChat').then((mod) => mod.AISearchChat),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <span>Initializing Smart Search...</span>
          </div>
        </div>
      </div>
    ),
  }
);

/**
 * AI Search Chat Wrapper
 *
 * Connects AISearchChat to the HomepageDataProvider context.
 * Handles open/close state from the global context.
 */
export function AISearchChatWrapper() {
  const { isAIChatOpen, closeAIChat, aiChatInitialQuery } = useHomepageData();
  const [hasOpened, setHasOpened] = useState(false);

  // Once opened, keep it rendered to preserve state and allow exit animations
  if (isAIChatOpen && !hasOpened) {
    setHasOpened(true);
  }

  if (!hasOpened && !isAIChatOpen) {
    return null;
  }

  return (
    <AISearchChat
      isOpen={isAIChatOpen}
      onClose={closeAIChat}
      initialQuery={aiChatInitialQuery}
    />
  );
}

export default AISearchChatWrapper;
